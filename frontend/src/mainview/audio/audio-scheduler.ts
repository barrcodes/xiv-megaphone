import { env } from "../../shared/env";
import type { CancelScope, DialogueEvent, PlaybackRequest } from "../../shared/playback";
import { DialogueEventReason } from "../../shared/playback";

export type StreamPlayerResult =
  | { kind: "completed" }
  | { kind: "cancelled" }
  | { kind: "errored"; error: Error };

export interface StreamPlayback {
  jobId: string;
  finished: Promise<StreamPlayerResult>;
  cancel(): void;
}

export interface IPlayer {
  play(request: PlaybackRequest): StreamPlayback;
  cancel(): void;
}

export type JobState = "active" | "interrupted" | "queued" | "finished" | "discarded";

interface ActiveJob {
  request: PlaybackRequest;
  playback: StreamPlayback;
  resumeAttempts: number;
}

interface QueuedJob {
  request: PlaybackRequest;
  enteredAt: number;
}

interface InterruptedJob {
  request: PlaybackRequest;
  enteredAt: number;
  resumeAttempts: number;
}

interface FlavorSlot {
  request: PlaybackRequest;
  playback: StreamPlayback;
  player: IPlayer;
  startedAt: number;
}

export interface SchedulerOptions {
  maxChatQueue: number;
  maxChatAgeMs: number;
  maxChatResumeAttempts: number;
  flavorPoolSize: number;
  now?: () => number;
}

const DEFAULT_OPTIONS: SchedulerOptions = {
  maxChatQueue: 10,
  maxChatAgeMs: 30_000,
  maxChatResumeAttempts: 3,
  flavorPoolSize: 3,
  now: () => Date.now(),
};

export class AudioScheduler {
  private npcPlayer: IPlayer;
  private chatPlayer: IPlayer;
  private flavorPlayers: IPlayer[];
  private opts: Required<SchedulerOptions>;

  private activeNpc: ActiveJob | null = null;
  private activeDialogueSession: {
    sessionId: string;
    source: string;
  } | null = null;
  private activeChat: ActiveJob | null = null;
  private interruptedChat: InterruptedJob | null = null;
  private chatQueue: QueuedJob[] = [];
  private activeFlavor: FlavorSlot[] = [];

  constructor(
    npcPlayer: IPlayer,
    chatPlayer: IPlayer,
    flavorPlayers: IPlayer[],
    opts?: Partial<SchedulerOptions>,
  ) {
    this.npcPlayer = npcPlayer;
    this.chatPlayer = chatPlayer;
    this.flavorPlayers = flavorPlayers;
    this.opts = { ...DEFAULT_OPTIONS, ...opts } as Required<SchedulerOptions>;
  }

  get activeDialogueSessionId(): string | null {
    return this.activeDialogueSession?.sessionId ?? null;
  }

  get chatQueueLength(): number {
    return this.chatQueue.length;
  }

  get interruptedChatRequest(): PlaybackRequest | null {
    return this.interruptedChat?.request ?? null;
  }

  get activeFlavorCount(): number {
    return this.activeFlavor.length;
  }

  enqueue(request: PlaybackRequest): void {
    switch (request.audioClass) {
      case "npc":
        this.enqueueNpc(request);
        break;
      case "chat":
        this.enqueueChat(request);
        break;
      case "flavor":
        this.enqueueFlavor(request);
        break;
    }
    this.assertInvariant();
  }

  handleDialogueEvent(event: DialogueEvent): void {
    switch (event.reason) {
      case DialogueEventReason.AddonShown:
        this.handleSessionStart(event);
        break;
      case DialogueEventReason.TextReceived:
        this.handleSessionActivity(event);
        break;
      case DialogueEventReason.DialogueContextEnded:
      case DialogueEventReason.TerritoryChanged:
      case DialogueEventReason.LoggedOut:
      case DialogueEventReason.PluginStopped:
        this.handleSessionEnd(event);
        break;
    }
    this.assertInvariant();
  }

  cancel(scope: CancelScope): void {
    switch (scope) {
      case "npc":
        this.cancelNpc();
        break;
      case "chat":
        this.cancelChat();
        break;
      case "flavor":
        this.cancelFlavor();
        break;
      case "all":
        this.cancelNpc();
        this.cancelChat();
        this.cancelFlavor();
        break;
    }
    this.assertInvariant();
  }

  private cancelNpc(): void {
    if (this.activeNpc) {
      this.activeNpc.playback.cancel();
      this.activeNpc = null;
    }
  }

  private cancelChat(): void {
    if (this.activeChat) {
      this.activeChat.playback.cancel();
      this.activeChat = null;
    }
    if (this.interruptedChat) {
      this.interruptedChat = null;
    }
    this.chatQueue = [];
  }

  private cancelFlavor(): void {
    for (const slot of this.activeFlavor) {
      slot.playback.cancel();
    }
    this.activeFlavor = [];
  }

  private enqueueNpc(request: PlaybackRequest): void {
    if (this.activeNpc?.request.id === request.id) return;

    this.cancelNpc();
    this.cancelFlavor();

    const playback = this.npcPlayer.play(request);
    this.activeNpc = { request, playback, resumeAttempts: 0 };

    this.watchNpcCompletion(playback);

    if (this.activeChat) {
      this.interruptActiveChat(this.activeChat);
    }
  }

  private watchNpcCompletion(playback: StreamPlayback): void {
    const jobId = playback.jobId;
    playback.finished.then(() => {
      if (this.activeNpc?.playback.jobId !== jobId || this.activeNpc.playback !== playback) return;
      this.activeNpc = null;
      this.assertInvariant();
    });
  }

  private enqueueChat(request: PlaybackRequest): void {
    if (this.activeDialogueSession) {
      this.enqueueChatInternal(request);
      return;
    }

    if (!this.activeChat) {
      this.startChat(request);
      return;
    }

    this.enqueueChatInternal(request);
  }

  private startChat(request: PlaybackRequest, resumeAttempts = 0): void {
    const playback = this.chatPlayer.play(request);
    this.activeChat = { request, playback, resumeAttempts };

    const jobId = playback.jobId;
    playback.finished.then((result) => {
      if (this.activeChat?.playback.jobId !== jobId || this.activeChat.playback !== playback)
        return;
      this.activeChat = null;

      if (result.kind !== "cancelled" && this.interruptedChat) {
        this.resumeInterruptedChat();
      } else {
        this.drainChatQueue();
      }
      this.assertInvariant();
    });
  }

  private drainChatQueue(): void {
    if (this.activeNpc || this.activeDialogueSession) return;
    if (this.activeChat) return;

    this.expireStaleChat();

    if (this.interruptedChat) {
      this.resumeInterruptedChat();
      return;
    }

    const next = this.chatQueue.shift();
    if (next) {
      this.startChat(next.request);
    }
  }

  private enqueueChatInternal(request: PlaybackRequest): void {
    this.expireStaleChat();

    if (this.chatQueue.length >= this.opts.maxChatQueue) {
      this.chatQueue.shift();
    }

    this.chatQueue.push({
      request,
      enteredAt: this.opts.now(),
    });
  }

  private interruptActiveChat(active: ActiveJob): void {
    if (this.interruptedChat) {
      this.interruptedChat = null;
    }

    this.interruptedChat = {
      request: active.request,
      enteredAt: this.opts.now(),
      resumeAttempts: active.resumeAttempts,
    };

    active.playback.cancel();
    this.activeChat = null;
  }

  private resumeInterruptedChat(): void {
    if (!this.interruptedChat) return;
    if (this.activeDialogueSession) return;

    const job = this.interruptedChat;
    this.interruptedChat = null;

    const age = this.opts.now() - job.enteredAt;
    if (age > this.opts.maxChatAgeMs) return;
    if (job.resumeAttempts >= this.opts.maxChatResumeAttempts) return;

    this.startChat(job.request, job.resumeAttempts + 1);
  }

  private expireStaleChat(): void {
    const now = this.opts.now();
    this.chatQueue = this.chatQueue.filter((j) => now - j.enteredAt < this.opts.maxChatAgeMs);
  }

  private enqueueFlavor(request: PlaybackRequest): void {
    if (this.activeNpc || this.activeDialogueSession) return;

    const existing = this.activeFlavor.find((s) => s.request.id === request.id);
    if (existing) return;

    if (this.activeFlavor.length < this.opts.flavorPoolSize) {
      const player = this.flavorPlayers.find(
        (candidate) => !this.activeFlavor.some((slot) => slot.player === candidate),
      );
      if (!player) return;
      this.startFlavor(request, player);
      return;
    }

    const oldest = this.activeFlavor.reduce((a, b) => (a.startedAt <= b.startedAt ? a : b));
    oldest.playback.cancel();
    this.activeFlavor = this.activeFlavor.filter((s) => s !== oldest);

    this.startFlavor(request, oldest.player);
  }

  private startFlavor(request: PlaybackRequest, player: IPlayer): void {
    const playback = player.play(request);
    const slot: FlavorSlot = {
      request,
      playback,
      player,
      startedAt: this.opts.now(),
    };
    this.activeFlavor.push(slot);

    const jobId = playback.jobId;
    playback.finished.then(() => {
      this.activeFlavor = this.activeFlavor.filter(
        (s) => s.playback.jobId !== jobId || s.playback !== playback,
      );
      this.assertInvariant();
    });
  }

  private handleSessionStart(event: DialogueEvent): void {
    if (this.activeDialogueSession?.sessionId === event.sessionId) return;

    this.activeDialogueSession = {
      sessionId: event.sessionId,
      source: event.source,
    };

    if (this.activeChat) {
      this.interruptActiveChat(this.activeChat);
    }
  }

  private handleSessionActivity(event: DialogueEvent): void {
    if (this.activeDialogueSession?.sessionId !== event.sessionId) {
      this.activeDialogueSession = {
        sessionId: event.sessionId,
        source: event.source,
      };
    }
  }

  private handleSessionEnd(event: DialogueEvent): void {
    if (this.activeDialogueSession?.sessionId !== event.sessionId) return;

    this.activeDialogueSession = null;

    if (this.interruptedChat) {
      this.resumeInterruptedChat();
    } else {
      this.drainChatQueue();
    }
  }

  private assertInvariant(): void {
    if (env.VITE_DEBUG) {
      const jobIds = new Set<string>();
      let count = 0;

      if (this.activeNpc) {
        jobIds.add(this.activeNpc.request.id);
        count++;
      }
      if (this.activeChat) {
        jobIds.add(this.activeChat.request.id);
        count++;
      }
      if (this.interruptedChat) {
        jobIds.add(this.interruptedChat.request.id);
        count++;
      }
      for (const q of this.chatQueue) {
        jobIds.add(q.request.id);
        count++;
      }
      for (const s of this.activeFlavor) {
        jobIds.add(s.request.id);
        count++;
      }

      if (jobIds.size !== count) {
        console.warn("Invariant violation: duplicate job IDs detected", {
          activeNpc: this.activeNpc?.request.id,
          activeChat: this.activeChat?.request.id,
          interruptedChat: this.interruptedChat?.request.id,
          chatQueue: this.chatQueue.map((q) => q.request.id),
          activeFlavor: this.activeFlavor.map((s) => s.request.id),
        });
      }
    }
  }
}
