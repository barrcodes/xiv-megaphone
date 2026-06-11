import { useEffect, useRef } from "react";
import { createStream, streamAudio } from "../api";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);

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
      const streamId = await createStream(request);

      const gen = ++genRef.current;
      cleanup();

      const el = audioRef.current;
      if (!el) return;

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
    });
  }, []);

  return <audio ref={audioRef} preload="auto" style={{ display: "none" }} />;
}