import { type Context, type Span, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { context, trace, tracer } from "../telemetry";

export class PlaybackTrace {
  readonly parentCtx: Context;
  private playbackSpan: Span;
  private stages = new Map<string, Span>();
  private decodingRecorded = false;
  private hasPlayed = false;
  private waitingForPlayback = false;

  constructor() {
    this.playbackSpan = tracer.startSpan("tts.playback", {
      kind: SpanKind.CONSUMER,
    });
    this.playbackSpan.setAttribute("tts.outcome", "started");
    this.playbackSpan.setAttribute("tts.stage.order", 1);
    this.parentCtx = trace.setSpan(context.active(), this.playbackSpan);
    this.startStage("tts.wait_for_first_packet", 2);
  }

  chunkReceived(size: number) {
    const span = this.endStage("tts.wait_for_first_packet");
    if (!span) return;
    this.playbackSpan.setAttribute("tts.packet.size", size);
  }

  decoding() {
    if (this.decodingRecorded) return;
    this.decodingRecorded = true;
    this.startStage("tts.decode_first_audio", 3);
  }

  decoded() {
    if (!this.decodingRecorded) return;
    this.endStage("tts.decode_first_audio");
    this.initializePlaybackStages();
  }

  playing() {
    this.hasPlayed = true;
    if (this.waitingForPlayback) {
      this.endStage("tts.wait_for_playback");
    }
    if (!this.stages.has("tts.play_audio")) {
      this.startStage("tts.play_audio", 5);
    }
  }

  complete() {
    this.endStage("tts.play_audio");
    this.playbackSpan.setAttribute("tts.outcome", "completed");
    this.playbackSpan.setStatus({ code: SpanStatusCode.OK });
  }

  error(err: Error) {
    for (const span of this.stages.values()) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.end();
    }
    this.stages.clear();
    this.playbackSpan.recordException(err);
    this.playbackSpan.setAttribute("tts.outcome", "failed");
    this.playbackSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });
  }

  finish() {
    for (const span of this.stages.values()) {
      span.end();
    }
    this.stages.clear();
    this.playbackSpan.end();
  }

  private initializePlaybackStages() {
    if (this.hasPlayed) {
      if (!this.stages.has("tts.play_audio")) {
        this.startStage("tts.play_audio", 5);
      }
      return;
    }
    this.waitingForPlayback = true;
    this.startStage("tts.wait_for_playback", 4);
  }

  private startStage(name: string, order: number) {
    const span = tracer.startSpan(name, { kind: SpanKind.INTERNAL }, this.parentCtx);
    span.setAttribute("tts.stage.order", order);
    this.stages.set(name, span);
    return span;
  }

  private endStage(name: string) {
    const span = this.stages.get(name);
    if (span) {
      span.end();
      this.stages.delete(name);
    }
    return span;
  }
}
