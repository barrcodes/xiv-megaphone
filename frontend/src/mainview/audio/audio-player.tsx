import { useCallback, useEffect, useRef } from "react";
import { createStream, streamAudio } from "../api";
import { useStore } from "../store";
import { context } from "../telemetry";
import { PlaybackTrace } from "./playback-trace";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const { volume, muted } = useStore();

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const getAudioGraph = useCallback(() => {
    if (audioCtxRef.current && gainNodeRef.current) {
      return { audioCtx: audioCtxRef.current, gainNode: gainNodeRef.current };
    }

    const audioCtx = new AudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0;

    const el = audioRef.current;
    if (el) {
      const source = audioCtx.createMediaElementSource(el);
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }

    audioCtxRef.current = audioCtx;
    gainNodeRef.current = gainNode;
    return { audioCtx, gainNode };
  }, []);

  /**
   * Disable Media Session API action handlers to prevent the OS from interfering with playback.
   * This is necessary to avoid our app being controlled by keyboard media keys or other system-level media controls.
   */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions = [
      "play",
      "pause",
      "stop",
      "seekbackward",
      "seekforward",
      "seekto",
      "previoustrack",
      "nexttrack",
    ] as const;
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, () => {});
      } catch {
        /* action not supported */
      }
    }
  }, []);

  useEffect(() => {
    const cleanup = () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };

    window.electronAPI.createStream(async (request) => {
      const trace = new PlaybackTrace();

      try {
        const { streamId, gain } = await context.with(trace.parentCtx, () => createStream(request));

        const gen = ++genRef.current;
        cleanup();

        const el = audioRef.current;
        if (!el) return;

        const { gainNode } = getAudioGraph();
        const { volume, muted, presets, activePresetId } = useStore.getState();
        const speakingRate = presets.find((p) => p.id === activePresetId)?.speakingRate ?? 1.0;
        gainNode.gain.value = gain * (muted ? 0 : volume);

        el.preservesPitch = true;

        const ms = new MediaSource();
        const url = URL.createObjectURL(ms);
        urlRef.current = url;

        const ac = new AbortController();
        abortRef.current = ac;

        const onSourceOpen = async () => {
          if (gen !== genRef.current) return;
          if (ms.readyState !== "open") return;

          const sb = ms.addSourceBuffer("audio/mpeg");
          sb.mode = "sequence";

          const onPlaying = () => trace.playing();
          el.addEventListener("playing", onPlaying);

          el.defaultPlaybackRate = speakingRate;
          el.playbackRate = speakingRate;
          el.play().catch(() => {});

          try {
            const reader = await context.with(trace.parentCtx, () => streamAudio(streamId, ac));

            while (true) {
              if (gen !== genRef.current) return;
              const { done, value } = await reader.read();
              if (done) break;
              if (ac.signal.aborted) return;

              if (gen === genRef.current) {
                trace.chunkReceived(value.byteLength);
                trace.decoding();
              }

              if (sb.updating) {
                await new Promise<void>((resolve) => {
                  sb.addEventListener(
                    "updateend",
                    () => {
                      if (gen === genRef.current) trace.decoded();
                      resolve();
                    },
                    { once: true },
                  );
                });
              } else if (gen === genRef.current) {
                trace.decoded();
              }

              sb.appendBuffer(value);
            }

            if (sb.updating) {
              await new Promise<void>((resolve) => {
                sb.addEventListener("updateend", () => resolve(), { once: true });
              });
            }

            if (ms.readyState === "open") {
              ms.endOfStream();
            }

            trace.complete();

            window.dispatchEvent(
              new CustomEvent("xiv:stream-event", {
                detail: "complete",
              }),
            );
          } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") {
              trace.error(err);
              console.warn("stream error:", err);
            }
          } finally {
            el.removeEventListener("playing", onPlaying);
            trace.finish();
          }
        };

        ms.addEventListener("sourceopen", onSourceOpen);
        el.src = url;
      } catch (err) {
        trace.error(err as Error);
        trace.finish();
        console.error("createStream failed:", err);
      }
    });

    window.electronAPI.cancelStream(() => {
      genRef.current++;
      cleanup();
      const el = audioRef.current;
      if (!el) return;
      el.pause();
      el.removeAttribute("src");
      el.load();
      if (gainNodeRef.current) {
        const { muted } = useStore.getState();
        gainNodeRef.current.gain.value = muted ? 0 : 1.0;
      }
      window.dispatchEvent(new CustomEvent("xiv:stream-event", { detail: "cancel" }));
    });
  }, [getAudioGraph]);

  return (
    // biome-ignore lint/a11y/useMediaCaption: hidden TTS audio element, not user-facing content
    <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
  );
}
