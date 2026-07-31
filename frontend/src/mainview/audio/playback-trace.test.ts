import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackTrace } from "./playback-trace";

const mockSpan = {
  end: vi.fn(),
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
};

function mockTracer() {
  return { startSpan: vi.fn(() => mockSpan) };
}

function mockContext() {
  return { active: vi.fn(() => "ctx") };
}

vi.mock("../telemetry", () => ({
  tracer: mockTracer(),
  context: mockContext(),
  trace: { setSpan: vi.fn(() => "parent-ctx") },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlaybackTrace", () => {
  it("creates playback and wait_for_first_packet spans on construction", () => {
    const trace = new PlaybackTrace();

    expect(tracer.startSpan).toHaveBeenCalledWith("tts.playback", {
      kind: SpanKind.CONSUMER,
    });
    expect(tracer.startSpan).toHaveBeenCalledWith(
      "tts.wait_for_first_packet",
      {
        kind: SpanKind.INTERNAL,
      },
      "parent-ctx",
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("tts.outcome", "started");
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("tts.stage.order", 1);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("tts.stage.order", 2);
    expect(trace.parentCtx).toBe("parent-ctx");
  });

  describe("chunkReceived", () => {
    it("ends wait_for_first_packet and records packet size", () => {
      const trace = new PlaybackTrace();
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(mockSpan.setAttribute).mockClear();

      trace.chunkReceived(1024);

      expect(vi.mocked(mockSpan.end)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.packet.size", 1024);
    });

    it("is idempotent on second call", () => {
      const trace = new PlaybackTrace();
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(mockSpan.setAttribute).mockClear();

      trace.chunkReceived(512);
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(mockSpan.setAttribute).mockClear();

      trace.chunkReceived(1024);

      expect(vi.mocked(mockSpan.end)).not.toHaveBeenCalled();
      expect(vi.mocked(mockSpan.setAttribute)).not.toHaveBeenCalled();
    });
  });

  describe("decoding / decoded", () => {
    it("creates decode_first_audio span with order 3", () => {
      const trace = new PlaybackTrace();
      trace.decoding();

      expect(tracer.startSpan).toHaveBeenCalledWith(
        "tts.decode_first_audio",
        {
          kind: SpanKind.INTERNAL,
        },
        "parent-ctx",
      );
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.stage.order", 3);
    });

    it("is idempotent on second call", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      vi.mocked(tracer.startSpan).mockClear();
      trace.decoding();

      const calls = vi
        .mocked(tracer.startSpan)
        .mock.calls.filter(([name]) => name === "tts.decode_first_audio");
      expect(calls).toHaveLength(0);
    });

    it("decoded ends decode span and starts wait_for_playback", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(tracer.startSpan).mockClear();

      trace.decoded();

      expect(vi.mocked(mockSpan.end)).toHaveBeenCalledTimes(1);
      expect(tracer.startSpan).toHaveBeenCalledWith(
        "tts.wait_for_playback",
        {
          kind: SpanKind.INTERNAL,
        },
        "parent-ctx",
      );
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.stage.order", 4);
    });

    it("decoded is a no-op if decoding never started", () => {
      const trace = new PlaybackTrace();
      vi.mocked(tracer.startSpan).mockClear();
      vi.mocked(mockSpan.end).mockClear();

      trace.decoded();

      expect(vi.mocked(mockSpan.end)).not.toHaveBeenCalled();
    });
  });

  describe("playing", () => {
    it("ends wait_for_playback and starts play_audio when waiting", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      trace.decoded();
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(tracer.startSpan).mockClear();

      trace.playing();

      expect(vi.mocked(mockSpan.end)).toHaveBeenCalledTimes(1);
      expect(tracer.startSpan).toHaveBeenCalledWith(
        "tts.play_audio",
        {
          kind: SpanKind.INTERNAL,
        },
        "parent-ctx",
      );
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.stage.order", 5);
    });

    it("starts play_audio directly when playing fires before decoded", () => {
      const trace = new PlaybackTrace();
      vi.mocked(mockSpan.end).mockClear();
      vi.mocked(tracer.startSpan).mockClear();

      trace.playing();
      trace.decoding();
      trace.decoded();

      const playAudioCalls = vi
        .mocked(tracer.startSpan)
        .mock.calls.filter(([name]) => name === "tts.play_audio");
      const waitCalls = vi
        .mocked(tracer.startSpan)
        .mock.calls.filter(([name]) => name === "tts.wait_for_playback");
      expect(playAudioCalls).toHaveLength(1);
      expect(waitCalls).toHaveLength(0);
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.stage.order", 5);
    });

    it("does not double-start play_audio on subsequent calls", () => {
      const trace = new PlaybackTrace();
      trace.playing();
      vi.mocked(tracer.startSpan).mockClear();

      trace.playing();

      const calls = vi
        .mocked(tracer.startSpan)
        .mock.calls.filter(([name]) => name === "tts.play_audio");
      expect(calls).toHaveLength(0);
    });
  });

  describe("complete", () => {
    it("sets completed outcome on playback span", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      trace.decoded();
      trace.playing();

      trace.complete();

      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.outcome", "completed");
      expect(vi.mocked(mockSpan.setStatus)).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    });

    it("ends play_audio span", () => {
      const trace = new PlaybackTrace();
      trace.playing();
      vi.mocked(mockSpan.end).mockClear();

      trace.complete();

      expect(vi.mocked(mockSpan.end)).toHaveBeenCalledTimes(1);
    });
  });

  describe("error", () => {
    it("records exception on all active stages and playback span", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      const err = new Error("test error");
      vi.mocked(mockSpan.recordException).mockClear();

      trace.error(err);

      expect(vi.mocked(mockSpan.recordException)).toHaveBeenCalledWith(err);
      expect(vi.mocked(mockSpan.setAttribute)).toHaveBeenCalledWith("tts.outcome", "failed");
      expect(vi.mocked(mockSpan.setStatus)).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: "test error",
      });
    });

    it("ends all active stages", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      trace.decoded();
      vi.mocked(mockSpan.end).mockClear();

      trace.error(new Error("err"));

      const endCount = vi.mocked(mockSpan.end).mock.calls.length;
      expect(endCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("finish", () => {
    it("ends playback span", () => {
      const trace = new PlaybackTrace();
      vi.mocked(mockSpan.end).mockClear();

      trace.finish();

      expect(vi.mocked(mockSpan.end)).toHaveBeenCalled();
    });

    it("ends any active stage spans", () => {
      const trace = new PlaybackTrace();
      trace.decoding();
      vi.mocked(mockSpan.end).mockClear();

      trace.finish();

      const endCallCount = vi.mocked(mockSpan.end).mock.calls.length;
      expect(endCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("happy path integration", () => {
    it("follows the expected playback lifecycle", () => {
      const trace = new PlaybackTrace();

      trace.chunkReceived(800);
      trace.decoding();
      trace.decoded();
      trace.playing();
      trace.complete();
      trace.finish();

      const spanNames = vi.mocked(tracer.startSpan).mock.calls.map(([name]) => name);
      expect(spanNames).toContain("tts.wait_for_first_packet");
      expect(spanNames).toContain("tts.decode_first_audio");
      expect(spanNames).toContain("tts.wait_for_playback");
      expect(spanNames).toContain("tts.play_audio");
    });

    it("handles playing before decoded", () => {
      const trace = new PlaybackTrace();

      trace.chunkReceived(800);
      trace.decoding();
      trace.playing();
      trace.decoded();
      trace.complete();
      trace.finish();

      const spanNames = vi.mocked(tracer.startSpan).mock.calls.map(([name]) => name);
      expect(spanNames).toContain("tts.wait_for_first_packet");
      expect(spanNames).toContain("tts.decode_first_audio");
      expect(spanNames).not.toContain("tts.wait_for_playback");
      expect(spanNames).toContain("tts.play_audio");
    });
  });
});

// Need to import these for the mock to reference them
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../telemetry";
