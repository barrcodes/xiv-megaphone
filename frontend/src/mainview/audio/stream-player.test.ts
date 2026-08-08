import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackRequest } from "../../shared/playback";
import { PlaybackTrace } from "./playback-trace";
import { StreamPlayer, type StreamPlayerDeps } from "./stream-player";

vi.mock("../telemetry", () => ({
  tracer: {
    startSpan: vi.fn(() => ({
      end: vi.fn(),
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
    })),
  },
  context: { active: vi.fn(() => "ctx"), with: (_ctx: unknown, fn: () => unknown) => fn() },
  trace: { setSpan: vi.fn(() => "parent-ctx") },
}));

let mockGainNode: { gain: { value: number }; connect: ReturnType<typeof vi.fn> };

beforeAll(() => {
  const fakeElementProto = () => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    return {
      style: {},
      preload: "",
      src: "",
      ended: true,
      preservesPitch: false,
      playbackRate: 1,
      defaultPlaybackRate: 1,
      parentNode: null,
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      play: vi.fn(() => {
        setTimeout(() => {
          const endedHandlers = listeners.get("ended") ?? [];
          for (const handler of endedHandlers) handler();
        }, 0);
        return Promise.resolve();
      }),
      addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const arr = listeners.get(event) ?? [];
        arr.push(handler);
        listeners.set(event, arr);
      }),
      removeEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const arr = listeners.get(event) ?? [];
        listeners.set(
          event,
          arr.filter((h) => h !== handler),
        );
      }),
      __listeners: listeners,
    };
  };
  vi.stubGlobal("document", {
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    createElement: vi.fn(() => fakeElementProto()),
  });

  mockGainNode = { gain: { value: 0 }, connect: vi.fn() };
  vi.stubGlobal("AudioContext", function FakeAudioContext() {
    return {
      createGain: vi.fn(() => mockGainNode),
      createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })),
      destination: "dest",
      close: vi.fn(() => Promise.resolve()),
    };
  });
});

function makeRequest(overrides?: Partial<PlaybackRequest>): PlaybackRequest {
  return {
    id: "req_1",
    receivedAt: 1000,
    audioClass: "npc",
    source: "AddonTalk",
    chatType: null,
    tts: { text: "hello" },
    ...overrides,
  };
}

function createFakeSourceBuffer() {
  let updating = false;
  let onUpdateEnd: (() => void) | null = null;
  return {
    mode: "",
    get updating() {
      return updating;
    },
    appendBuffer: vi.fn((_data: BufferSource) => {
      updating = true;
      setTimeout(() => {
        updating = false;
        onUpdateEnd?.();
      }, 0);
    }),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === "updateend") onUpdateEnd = handler;
    }),
    removeEventListener: vi.fn(),
    __onUpdateEnd: () => onUpdateEnd,
  };
}

function createFakeMediaSource() {
  let readyState = "closed";
  const sb = createFakeSourceBuffer();
  let onSourceOpen: (() => void) | null = null;
  return {
    get readyState() {
      return readyState;
    },
    addSourceBuffer: vi.fn(() => sb),
    endOfStream: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === "sourceopen") onSourceOpen = handler;
    }),
    removeEventListener: vi.fn(),
    __open() {
      readyState = "open";
      onSourceOpen?.();
    },
    __sb: sb,
  };
}

function makeDeps() {
  let readerResolve: ((reader: ReadableStreamDefaultReader<Uint8Array>) => void) | null = null;
  const readerPromise = new Promise<ReadableStreamDefaultReader<Uint8Array>>((resolve) => {
    readerResolve = resolve;
  });

  const ms = createFakeMediaSource();
  let audioSettingsListener: (() => void) | null = null;

  const deps: StreamPlayerDeps & {
    __ms: ReturnType<typeof createFakeMediaSource>;
    __resolveReader: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
  } = {
    createStream: vi.fn(() => Promise.resolve({ streamId: "s1", gain: 0.8 })),
    streamAudio: vi.fn(() => readerPromise),
    createMediaSource: vi.fn(() => ms as unknown as MediaSource),
    revokeObjectURL: vi.fn(),
    createObjectURL: vi.fn(() => "blob:fake"),
    createTrace: vi.fn(() => new PlaybackTrace()),
    getSpeakingRate: vi.fn(() => 1.0),
    getVolume: vi.fn(() => 0.5),
    getMuted: vi.fn(() => false),
    subscribeAudioSettings: vi.fn((listener: () => void) => {
      audioSettingsListener = listener;
      return () => {
        audioSettingsListener = null;
      };
    }),
    __ms: ms,
    __resolveReader: (reader) => readerResolve?.(reader),
    __notifyAudioSettings: () => audioSettingsListener?.(),
  };

  return deps;
}

function createFakeReader() {
  let done = false;
  return {
    read: vi.fn(() => {
      if (done) return Promise.resolve({ done: true, value: undefined as unknown as Uint8Array });
      done = true;
      return Promise.resolve({ done: false, value: new Uint8Array([1, 2, 3]) });
    }),
    cancel: vi.fn(() => Promise.resolve()),
    releaseLock: vi.fn(),
    get closed() {
      return Promise.resolve();
    },
  };
}

describe("StreamPlayer", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe("play", () => {
    it("returns a StreamPlayback with cancel and finished", () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      expect(pb.jobId).toBe("req_1");
      expect(typeof pb.cancel).toBe("function");
      expect(pb.finished).toBeInstanceOf(Promise);
    });

    it("cancels previous active playback when play is called again", () => {
      const player = new StreamPlayer(deps);
      const pb1 = player.play(makeRequest({ id: "req_1" }));
      player.play(makeRequest({ id: "req_2" }));

      return expect(pb1.finished).resolves.toEqual({ kind: "cancelled" });
    });
  });

  describe("successful playback", () => {
    it("creates stream and plays audio", async () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      // yield to let startPlayback reach createMediaSource / sourceopen listener setup
      await new Promise((r) => setTimeout(r, 0));

      deps.__ms.__open();
      const reader = createFakeReader();
      deps.__resolveReader(reader as unknown as ReadableStreamDefaultReader<Uint8Array>);

      const result = await pb.finished;
      expect(result).toEqual({ kind: "completed" });
      expect(deps.createStream).toHaveBeenCalledWith({ text: "hello" });
      expect(deps.streamAudio).toHaveBeenCalledWith("s1", expect.any(AbortController));
      expect(deps.__ms.__sb.appendBuffer).toHaveBeenCalled();
    });

    it("applies speaking rate, gain, and volume", async () => {
      deps.getSpeakingRate = vi.fn(() => 1.5);
      deps.getVolume = vi.fn(() => 0.7);
      deps.getMuted = vi.fn(() => false);
      deps.createStream = vi.fn(() => Promise.resolve({ streamId: "s1", gain: 0.5 }));

      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      await new Promise((r) => setTimeout(r, 0));

      deps.__ms.__open();
      const reader = createFakeReader();
      deps.__resolveReader(reader as unknown as ReadableStreamDefaultReader<Uint8Array>);

      await pb.finished;
      expect(mockGainNode.gain.value).toBe(0.35);
    });

    it("mutes audio when muted is true", async () => {
      deps.getMuted = vi.fn(() => true);
      deps.createStream = vi.fn(() => Promise.resolve({ streamId: "s1", gain: 0.5 }));
      deps.getVolume = vi.fn(() => 0.7);

      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      await new Promise((r) => setTimeout(r, 0));

      deps.__ms.__open();
      const reader = createFakeReader();
      deps.__resolveReader(reader as unknown as ReadableStreamDefaultReader<Uint8Array>);

      await pb.finished;
      expect(mockGainNode.gain.value).toBe(0);
    });

    it("updates gain when volume or mute changes during playback", async () => {
      let volume = 0.5;
      let muted = false;
      deps.getVolume = vi.fn(() => volume);
      deps.getMuted = vi.fn(() => muted);
      deps.createStream = vi.fn(() => Promise.resolve({ streamId: "s1", gain: 0.8 }));

      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      await new Promise((r) => setTimeout(r, 0));
      deps.__ms.__open();
      expect(mockGainNode.gain.value).toBe(0.4);

      volume = 0.25;
      deps.__notifyAudioSettings();
      expect(mockGainNode.gain.value).toBe(0.2);

      muted = true;
      deps.__notifyAudioSettings();
      expect(mockGainNode.gain.value).toBe(0);

      deps.__resolveReader(
        createFakeReader() as unknown as ReadableStreamDefaultReader<Uint8Array>,
      );
      await pb.finished;
    });
  });

  describe("cancellation", () => {
    it("resolves as cancelled when cancel is called before createStream resolves", async () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      pb.cancel();
      const result = await pb.finished;

      expect(result).toEqual({ kind: "cancelled" });
    });

    it("cleans up after cancellation", async () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      pb.cancel();

      await pb.finished;
      expect(deps.revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe("cancel() method", () => {
    it("cancels the current job", () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      player.cancel();

      return expect(pb.finished).resolves.toEqual({ kind: "cancelled" });
    });

    it("is safe to call when no active job", () => {
      const player = new StreamPlayer(deps);
      expect(() => player.cancel()).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("resolves as errored when createStream fails", async () => {
      const err = new Error("stream creation failed");
      deps.createStream = vi.fn(() => Promise.reject(err));

      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      const result = await pb.finished;
      expect(result).toEqual({ kind: "errored", error: err });
    });

    it("resolves as cancelled when createStream rejects with AbortError", async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      deps.createStream = vi.fn(() => Promise.reject(err));

      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      const result = await pb.finished;
      expect(result).toEqual({ kind: "cancelled" });
    });

    it("resolves as errored when stream audio fails", async () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      await new Promise((r) => setTimeout(r, 0));
      deps.__ms.__open();
      const err = new Error("stream read failed");
      const badReader = {
        read: vi.fn(() => Promise.reject(err)),
        cancel: vi.fn(() => Promise.resolve()),
        releaseLock: vi.fn(),
        get closed() {
          return Promise.resolve();
        },
      };
      deps.__resolveReader(badReader as unknown as ReadableStreamDefaultReader<Uint8Array>);

      const result = await pb.finished;
      expect(result).toEqual({ kind: "errored", error: err });
    });

    it("resolves as cancelled when stream audio AbortError occurs", async () => {
      const player = new StreamPlayer(deps);
      const pb = player.play(makeRequest());

      await new Promise((r) => setTimeout(r, 0));
      deps.__ms.__open();
      const err = new Error("aborted");
      err.name = "AbortError";
      const badReader = {
        read: vi.fn(() => Promise.reject(err)),
        cancel: vi.fn(() => Promise.resolve()),
        releaseLock: vi.fn(),
        get closed() {
          return Promise.resolve();
        },
      };
      deps.__resolveReader(badReader as unknown as ReadableStreamDefaultReader<Uint8Array>);

      const result = await pb.finished;
      expect(result).toEqual({ kind: "cancelled" });
    });
  });
});
