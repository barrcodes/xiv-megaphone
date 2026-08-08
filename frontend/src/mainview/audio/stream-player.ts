import type { PlaybackRequest } from "../../shared/playback";
import { context } from "../telemetry";
import type { PlaybackTrace } from "./playback-trace";

export type StreamPlayerResult =
  | { kind: "completed" }
  | { kind: "cancelled" }
  | { kind: "errored"; error: Error };

export interface StreamPlayback {
  jobId: string;
  finished: Promise<StreamPlayerResult>;
  cancel(): void;
}

export interface StreamPlayerDeps {
  createStream(request: {
    text: string;
    speaker?: string;
    gender?: string;
    race?: string;
    voiceOverrides?: Record<string, string>;
    volume?: number;
  }): Promise<{ streamId: string; gain: number }>;

  streamAudio(
    streamId: string,
    abortController: AbortController,
  ): Promise<ReadableStreamDefaultReader<Uint8Array>>;

  createMediaSource(): MediaSource;
  revokeObjectURL(url: string): void;
  createObjectURL(mediaSource: MediaSource): string;
  createTrace(): PlaybackTrace;
  getSpeakingRate(): number;
  getVolume(): number;
  getMuted(): boolean;
  subscribeAudioSettings?: (listener: () => void) => () => void;
  onPlaybackEvent?: (event: "complete" | "cancel") => void;
}

export class StreamPlayer {
  private deps: StreamPlayerDeps;
  private gen = 0;
  private currentJob: StreamPlayback | null = null;

  constructor(deps: StreamPlayerDeps) {
    this.deps = deps;
  }

  play(job: PlaybackRequest): StreamPlayback {
    const gen = ++this.gen;
    const trace = this.deps.createTrace();
    let settled = false;
    let resolveFinished: (result: StreamPlayerResult) => void;
    const finished = new Promise<StreamPlayerResult>((resolve) => {
      resolveFinished = resolve;
    });

    const ac = new AbortController();
    const el = document.createElement("audio");
    el.style.display = "none";
    el.preload = "auto";
    document.body.appendChild(el);
    let cleanup = () => this.cleanupPlayback(el, trace);

    const playback: StreamPlayback = {
      jobId: job.id,
      finished,
      cancel: () => {
        if (settled) return;
        settled = true;
        ac.abort();
        cleanup();
        this.deps.onPlaybackEvent?.("cancel");
        resolveFinished({ kind: "cancelled" });
      },
    };

    if (this.currentJob) {
      this.currentJob.cancel();
    }
    this.currentJob = playback;

    this.startPlayback(job, gen, trace, ac, el, resolveFinished, (nextCleanup) => {
      cleanup = nextCleanup;
    });

    return playback;
  }

  cancel(): void {
    this.currentJob?.cancel();
    this.currentJob = null;
  }

  private cleanupPlayback(
    el: HTMLAudioElement,
    trace: PlaybackTrace,
    audioCtx: AudioContext | null = null,
    objectUrl: string | null = null,
  ): void {
    el.pause();
    el.removeAttribute("src");
    el.load();
    if (objectUrl) {
      this.deps.revokeObjectURL(objectUrl);
    }
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
    }
    trace.finish();
  }

  private async startPlayback(
    job: PlaybackRequest,
    gen: number,
    trace: PlaybackTrace,
    ac: AbortController,
    el: HTMLAudioElement,
    resolveFinished: (result: StreamPlayerResult) => void,
    setCleanup: (cleanup: () => void) => void,
  ): Promise<void> {
    try {
      const { streamId, gain } = await this.deps.createStream(job.tts);

      if (gen !== this.gen || ac.signal.aborted) {
        this.cleanupPlayback(el, trace);
        resolveFinished({ kind: "cancelled" });
        return;
      }

      const audioCtx = new AudioContext();
      const gainNode = audioCtx.createGain();

      const speakingRate = this.deps.getSpeakingRate();
      const updateGain = () => {
        const volume = this.deps.getVolume();
        const muted = this.deps.getMuted();
        gainNode.gain.value = gain * (muted ? 0 : volume);
      };
      updateGain();
      const unsubscribeAudioSettings = this.deps.subscribeAudioSettings?.(updateGain);

      const source = audioCtx.createMediaElementSource(el);
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      el.preservesPitch = true;

      const ms = this.deps.createMediaSource();
      const url = this.deps.createObjectURL(ms);
      setCleanup(() => {
        unsubscribeAudioSettings?.();
        this.cleanupPlayback(el, trace, audioCtx, url);
      });

      const onSourceOpen = async () => {
        if (gen !== this.gen) {
          this.cleanupPlayback(el, trace, audioCtx, url);
          return;
        }
        if (ms.readyState !== "open") return;

        const sb = ms.addSourceBuffer("audio/mpeg");
        sb.mode = "sequence";

        const onPlaying = () => trace.playing();
        el.addEventListener("playing", onPlaying);

        el.defaultPlaybackRate = speakingRate;
        el.playbackRate = speakingRate;
        el.play().catch(() => {});

        try {
          const reader = await context.with(trace.parentCtx, () =>
            this.deps.streamAudio(streamId, ac),
          );

          while (true) {
            if (gen !== this.gen) return;
            const { done, value } = await reader.read();
            if (done) break;
            if (ac.signal.aborted) return;

            if (gen === this.gen) {
              trace.chunkReceived(value.byteLength);
              trace.decoding();
            }

            if (sb.updating) {
              await new Promise<void>((resolve) => {
                sb.addEventListener(
                  "updateend",
                  () => {
                    if (gen === this.gen) trace.decoded();
                    resolve();
                  },
                  { once: true },
                );
              });
            } else if (gen === this.gen) {
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

          await new Promise<void>((resolve) => {
            if (el.ended || ac.signal.aborted) {
              resolve();
              return;
            }

            const onEnded = () => {
              ac.signal.removeEventListener("abort", onAbort);
              resolve();
            };
            const onAbort = () => {
              el.removeEventListener("ended", onEnded);
              resolve();
            };

            el.addEventListener("ended", onEnded, { once: true });
            ac.signal.addEventListener("abort", onAbort, { once: true });
          });

          if (ac.signal.aborted) {
            resolveFinished({ kind: "cancelled" });
            return;
          }

          trace.complete();

          if (gen !== this.gen) {
            this.cleanupPlayback(el, trace, audioCtx, url);
            resolveFinished({ kind: "cancelled" });
            return;
          }

          this.deps.onPlaybackEvent?.("complete");
          resolveFinished({ kind: "completed" });
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== "AbortError") {
            trace.error(err);
            resolveFinished({ kind: "errored", error: err });
          } else {
            resolveFinished({ kind: "cancelled" });
          }
        } finally {
          el.removeEventListener("playing", onPlaying);
          if (gen === this.gen) {
            this.cleanupPlayback(el, trace, audioCtx, url);
          }
        }
      };

      ms.addEventListener("sourceopen", onSourceOpen);
      el.src = url;
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        trace.error(err);
        this.cleanupPlayback(el, trace);
        resolveFinished({ kind: "errored", error: err });
      } else {
        this.cleanupPlayback(el, trace);
        resolveFinished({ kind: "cancelled" });
      }
    }
  }
}
