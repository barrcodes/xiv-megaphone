import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { AudioPlayer } from "./audio-player";

type PlaybackState = {
  id: number;
  process: ChildProcessWithoutNullStreams;
  stopped: boolean;
};

export class WavBufferPlayer extends AudioPlayer {
  private state: PlaybackState | null = null;
  private nextId = 0;

  supportsStreaming = false;

  async _play(requestId: number, wav: Buffer): Promise<void> {
    this.stop();

    const process = spawn("ffplay", [
      "-nodisp",
      "-autoexit",
      "-loglevel",
      "warning",
      "-i",
      "pipe:0",
    ]);

    const state: PlaybackState = {
      id: ++this.nextId,
      process,
      stopped: false,
    };

    this.state = state;

    try {
      await this._runProcess(state, wav);
    } catch (error: any) {
      if (error.code === "EOF") {
        return;
      }
      console.error("Error playing audio:", error);
    }
  }

  private _runProcess(state: PlaybackState, wav: Buffer) {
    const process = state.process;
    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        fn();
      };

      const clearIfCurrent = (): void => {
        if (this.state?.id === state.id) {
          this.state = null;
        }
      };

      process.on("error", (error) => {
        clearIfCurrent();

        if (state.stopped) {
          settle(resolve);
          return;
        }

        settle(() => reject(error));
      });

      process.on("exit", (code, signal) => {
        clearIfCurrent();

        if (state.stopped) {
          settle(resolve);
          return;
        }

        if (code === 0) {
          settle(resolve);
          return;
        }

        if (signal) {
          settle(() => reject(new Error(`ffplay exited via signal ${signal}`)));
          return;
        }

        settle(() => reject(new Error(`ffplay exited with code ${code}`)));
      });

      process.stdin.on("error", (error: NodeJS.ErrnoException) => {
        if (state.stopped && error.code === "EPIPE") {
          return;
        }

        clearIfCurrent();
        settle(() => reject(error));
      });

      process.stderr.on("data", (data: Buffer) => {
        const text = data.toString().trim();
        if (text) console.warn("[ffplay]", text);
      });

      if (process.stdin.destroyed || !process.stdin.writable) {
        clearIfCurrent();
        settle(() => reject(new Error("ffplay stdin is not writable")));
        return;
      }

      process.stdin.end(wav);
    });
  }

  stop(): void {
    const state = this.state;
    if (!state) return;

    state.stopped = true;

    if (!state.process.killed) {
      this._kill(state);
    }
  }

  private _kill(state: PlaybackState): void {
    const pid = state.process.pid;
    if (!pid) return;

    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return;
    }

    state.process.kill("SIGKILL");
  }
}
