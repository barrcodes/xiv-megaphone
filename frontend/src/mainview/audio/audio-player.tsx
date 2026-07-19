import { useEffect, useRef } from "react";
import { createStream, streamAudio } from "../api";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const getAudioGraph = () => {
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
  };

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
      console.log("Creating stream with request:", request);
      const { streamId, gain } = await createStream(request);

      const gen = ++genRef.current;
      cleanup();

      const el = audioRef.current;
      if (!el) return;

      const { gainNode } = getAudioGraph();
      gainNode.gain.value = gain;

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

        el.play().catch(() => {});

        try {
          const reader = await streamAudio(streamId, ac);

          while (true) {
            if (gen !== genRef.current) return;
            const { done, value } = await reader.read();
            if (done) break;
            if (ac.signal.aborted) return;

            if (sb.updating) {
              await new Promise<void>((resolve) => {
                sb.addEventListener("updateend", () => resolve(), {
                  once: true,
                });
              });
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

          window.dispatchEvent(
            new CustomEvent("xiv:stream-event", { detail: "complete" }),
          );
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.warn("stream error:", err);
          }
        }
        return () => {
          ms.removeEventListener("sourceopen", onSourceOpen);
        };
      };

      ms.addEventListener("sourceopen", onSourceOpen);
      el.src = url;
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
        gainNodeRef.current.gain.value = 1.0;
      }
      window.dispatchEvent(
        new CustomEvent("xiv:stream-event", { detail: "cancel" }),
      );
    });
  }, []);

  return <audio ref={audioRef} preload="auto" style={{ display: "none" }} />;
}
