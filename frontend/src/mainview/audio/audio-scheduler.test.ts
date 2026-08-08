import { describe, expect, it } from "vitest";
import type { DialogueEvent, PlaybackRequest } from "../../shared/playback";
import { DialogueEventReason } from "../../shared/playback";
import {
  AudioScheduler,
  type IPlayer,
  type StreamPlayback,
  type StreamPlayerResult,
} from "./audio-scheduler";

function makeRequest(overrides: Partial<PlaybackRequest> = {}): PlaybackRequest {
  return {
    id: `req_${Math.random().toString(36).slice(2, 9)}`,
    receivedAt: Date.now(),
    audioClass: "chat",
    source: "Chat",
    chatType: null,
    tts: { text: "hello", voiceOverrides: {} },
    ...overrides,
  };
}

function makeDialogueEvent(overrides: Partial<DialogueEvent> = {}): DialogueEvent {
  return {
    eventType: "NpcDialogueSession",
    sessionId: "session_1",
    source: "AddonTalk",
    reason: DialogueEventReason.AddonShown,
    ...overrides,
  };
}

/**
 * Flush pending microtasks so Promise .then() callbacks run.
 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

class FakePlayer implements IPlayer {
  private currentPlayback: {
    request: PlaybackRequest;
    resolve: (result: StreamPlayerResult) => void;
  } | null = null;
  private playbacks = new Map<string, (result: StreamPlayerResult) => void>();
  currentRequest: PlaybackRequest | null = null;
  cancelled = false;
  cancelledJobIds: string[] = [];

  play(request: PlaybackRequest): StreamPlayback {
    this.currentPlayback?.resolve({ kind: "cancelled" });
    this.currentRequest = request;
    this.cancelled = false;
    let resolve = (_result: StreamPlayerResult) => {
      throw new Error("fake playback resolver was not initialized");
    };
    const finished = new Promise<StreamPlayerResult>((r) => {
      resolve = r;
    });
    this.currentPlayback = { request, resolve };
    this.playbacks.set(request.id, resolve);

    return {
      jobId: request.id,
      finished,
      cancel: () => {
        this.cancelled = true;
        this.cancelledJobIds.push(request.id);
        resolve({ kind: "cancelled" });
        if (this.currentPlayback?.request.id === request.id) {
          this.currentPlayback = null;
          this.currentRequest = null;
        }
      },
    };
  }

  cancel(): void {
    this.currentPlayback?.resolve({ kind: "cancelled" });
    if (this.currentPlayback) {
      this.cancelled = true;
      this.cancelledJobIds.push(this.currentPlayback.request.id);
    }
    this.currentPlayback = null;
    this.currentRequest = null;
  }

  completeNext(): void {
    const playback = this.currentPlayback;
    if (!playback) return;
    playback.resolve({ kind: "completed" });
    this.playbacks.delete(playback.request.id);
    this.currentPlayback = null;
    this.currentRequest = null;
  }

  complete(jobId: string): void {
    const resolve = this.playbacks.get(jobId);
    if (!resolve) return;
    resolve({ kind: "completed" });
    this.playbacks.delete(jobId);
    if (this.currentPlayback?.request.id === jobId) {
      this.currentPlayback = null;
      this.currentRequest = null;
    }
  }

  failNext(error?: Error): void {
    const playback = this.currentPlayback;
    if (!playback) return;
    playback.resolve({ kind: "errored", error: error ?? new Error("fake error") });
    this.playbacks.delete(playback.request.id);
    this.currentPlayback = null;
    this.currentRequest = null;
  }
}

function makeScheduler() {
  const npcPlayer = new FakePlayer();
  const chatPlayer = new FakePlayer();
  const flavorPlayers = [new FakePlayer(), new FakePlayer(), new FakePlayer()];
  let now = 1000;

  const scheduler = new AudioScheduler(npcPlayer, chatPlayer, flavorPlayers, {
    maxChatQueue: 3,
    maxChatAgeMs: 5000,
    maxChatResumeAttempts: 2,
    flavorPoolSize: 3,
    now: () => now,
  });

  return {
    npcPlayer,
    chatPlayer,
    flavorPlayers,
    scheduler,
    advanceTime: (ms: number) => {
      now += ms;
    },
  };
}

describe("AudioScheduler", () => {
  describe("NPC lane", () => {
    it("starts NPC immediately", () => {
      const { scheduler, npcPlayer } = makeScheduler();
      const req = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(req);

      expect(npcPlayer.currentRequest?.id).toBe(req.id);
    });

    it("replaces old NPC with new NPC", () => {
      const { scheduler, npcPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "npc" });
      const req2 = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);

      expect(npcPlayer.currentRequest?.id).toBe(req2.id);
      expect(npcPlayer.cancelled).toBe(false);
    });

    it("cancels previous NPC when replaced", async () => {
      const { scheduler, npcPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "npc" });
      const req2 = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);

      expect(npcPlayer.cancelledJobIds).toContain(req1.id);
    });

    it("NPC completion alone does not trigger chat drain", () => {
      const { scheduler, npcPlayer, chatPlayer } = makeScheduler();
      const chatReq = makeRequest({ audioClass: "chat" });
      const npcReq = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(chatReq);
      expect(chatPlayer.currentRequest?.id).toBe(chatReq.id);

      scheduler.enqueue(npcReq);
      expect(chatPlayer.currentRequest).toBeNull();

      npcPlayer.completeNext();
      expect(chatPlayer.currentRequest).toBeNull();
    });

    it("cancels active flavor when NPC starts", () => {
      const { scheduler, flavorPlayers, npcPlayer } = makeScheduler();

      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));
      scheduler.enqueue(makeRequest({ audioClass: "npc" }));

      expect(scheduler.activeFlavorCount).toBe(0);
      expect(flavorPlayers[0].cancelled).toBe(true);
      expect(flavorPlayers[1].cancelled).toBe(true);
      expect(npcPlayer.currentRequest?.audioClass).toBe("npc");
    });

    it("discards flavor while NPC is active and accepts it after NPC ends", async () => {
      const { scheduler, npcPlayer, flavorPlayers } = makeScheduler();
      const npc = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(npc);
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));

      expect(scheduler.activeFlavorCount).toBe(0);
      expect(flavorPlayers[0].currentRequest).toBeNull();

      npcPlayer.completeNext();
      await flush();
      const accepted = makeRequest({ audioClass: "flavor" });
      scheduler.enqueue(accepted);

      expect(flavorPlayers[0].currentRequest?.id).toBe(accepted.id);
    });

    it("accepts flavor after NPC cancellation", () => {
      const { scheduler, flavorPlayers } = makeScheduler();

      scheduler.enqueue(makeRequest({ audioClass: "npc" }));
      scheduler.cancel("npc");
      const flavor = makeRequest({ audioClass: "flavor" });
      scheduler.enqueue(flavor);

      expect(flavorPlayers[0].currentRequest?.id).toBe(flavor.id);
    });
  });

  describe("Chat lane", () => {
    it("starts chat immediately when idle", () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const req = makeRequest({ audioClass: "chat" });

      scheduler.enqueue(req);

      expect(chatPlayer.currentRequest?.id).toBe(req.id);
    });

    it("queues chat when another chat is active", () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "chat" });
      const req2 = makeRequest({ audioClass: "chat" });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);

      expect(chatPlayer.currentRequest?.id).toBe(req1.id);
      expect(scheduler.chatQueueLength).toBe(1);
    });

    it("maintains FIFO order", async () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "chat", tts: { text: "first", voiceOverrides: {} } });
      const req2 = makeRequest({ audioClass: "chat", tts: { text: "second", voiceOverrides: {} } });
      const req3 = makeRequest({ audioClass: "chat", tts: { text: "third", voiceOverrides: {} } });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      scheduler.enqueue(req3);

      chatPlayer.completeNext();
      await flush();
      expect(chatPlayer.currentRequest?.tts.text).toBe("second");

      chatPlayer.completeNext();
      await flush();
      expect(chatPlayer.currentRequest?.tts.text).toBe("third");
    });

    it("drops oldest queued chat on overflow", async () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "chat", tts: { text: "first", voiceOverrides: {} } });
      const req2 = makeRequest({ audioClass: "chat", tts: { text: "second", voiceOverrides: {} } });
      const req3 = makeRequest({ audioClass: "chat", tts: { text: "third", voiceOverrides: {} } });
      const req4 = makeRequest({ audioClass: "chat", tts: { text: "fourth", voiceOverrides: {} } });
      const req5 = makeRequest({ audioClass: "chat", tts: { text: "fifth", voiceOverrides: {} } });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      scheduler.enqueue(req3);

      // queue is full (maxChatQueue = 3), req4 drops oldest (req2)
      scheduler.enqueue(req4);
      scheduler.enqueue(req5);

      chatPlayer.completeNext();
      await flush();
      // req1 finishes, should play req3 next (req2 was dropped)
      expect(chatPlayer.currentRequest?.tts.text).toBe("third");
    });

    it("expires stale queued chat", () => {
      const { scheduler, chatPlayer, advanceTime } = makeScheduler();
      const req1 = makeRequest({ audioClass: "chat", tts: { text: "fresh", voiceOverrides: {} } });
      const req2 = makeRequest({ audioClass: "chat", tts: { text: "stale", voiceOverrides: {} } });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      advanceTime(6000); // exceeds maxChatAgeMs (5000)

      chatPlayer.completeNext();
      // req2 should be expired, nothing left to play
      expect(chatPlayer.currentRequest).toBeNull();
    });

    it("enqueues chat during NPC dialogue session", () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const chatReq = makeRequest({ audioClass: "chat" });
      const dialogueEvent = makeDialogueEvent({ reason: DialogueEventReason.AddonShown });

      scheduler.handleDialogueEvent(dialogueEvent);
      scheduler.enqueue(chatReq);

      expect(chatPlayer.currentRequest).toBeNull();
      expect(scheduler.chatQueueLength).toBe(1);
    });

    it("interrupts active chat when NPC starts", () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const chatReq = makeRequest({ audioClass: "chat" });
      const npcReq = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(chatReq);
      expect(chatPlayer.currentRequest?.id).toBe(chatReq.id);

      scheduler.enqueue(npcReq);
      expect(chatPlayer.currentRequest).toBeNull();
      expect(scheduler.interruptedChatRequest?.id).toBe(chatReq.id);
    });

    it("resumes interrupted chat before queued chat", async () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const chat1 = makeRequest({
        audioClass: "chat",
        tts: { text: "interrupted", voiceOverrides: {} },
      });
      const chat2 = makeRequest({
        audioClass: "chat",
        tts: { text: "queued", voiceOverrides: {} },
      });
      const npcReq = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(chat1);
      scheduler.enqueue(chat2);
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.enqueue(npcReq);

      // NPC session ends
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );
      await flush();

      expect(chatPlayer.currentRequest?.tts.text).toBe("interrupted");
    });

    it("limits interrupted chat resume attempts", async () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const chatReq = makeRequest({ audioClass: "chat" });
      const npc1 = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(chatReq);
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.enqueue(npc1);

      // NPC session ends, chat resumes (attempt 1)
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );
      await flush();
      expect(chatPlayer.currentRequest?.id).toBe(chatReq.id);

      // Interrupted again by another NPC
      const npc2 = makeRequest({ audioClass: "npc" });
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ sessionId: "session_2", reason: DialogueEventReason.AddonShown }),
      );
      scheduler.enqueue(npc2);

      // Session ends again, chat resumes (attempt 2)
      scheduler.handleDialogueEvent(
        makeDialogueEvent({
          sessionId: "session_2",
          reason: DialogueEventReason.DialogueContextEnded,
        }),
      );
      await flush();
      expect(chatPlayer.currentRequest?.id).toBe(chatReq.id);

      // Interrupted a third time
      const npc3 = makeRequest({ audioClass: "npc" });
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ sessionId: "session_3", reason: DialogueEventReason.AddonShown }),
      );
      scheduler.enqueue(npc3);

      // Session ends, should NOT resume (maxChatResumeAttempts = 2)
      scheduler.handleDialogueEvent(
        makeDialogueEvent({
          sessionId: "session_3",
          reason: DialogueEventReason.DialogueContextEnded,
        }),
      );
      await flush();
      expect(chatPlayer.currentRequest).toBeNull();
    });

    it("discards interrupted chat that expired", () => {
      const { scheduler, chatPlayer, advanceTime } = makeScheduler();
      const chatReq = makeRequest({ audioClass: "chat" });
      const npcReq = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(chatReq);
      scheduler.enqueue(npcReq);

      advanceTime(6000); // exceeds maxChatAgeMs

      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );

      expect(chatPlayer.currentRequest).toBeNull();
    });
  });

  describe("Dialogue session events", () => {
    it("AddonShown activates dialogue session", () => {
      const { scheduler } = makeScheduler();
      const event = makeDialogueEvent({ reason: DialogueEventReason.AddonShown });

      scheduler.handleDialogueEvent(event);

      expect(scheduler.activeDialogueSessionId).toBe("session_1");
    });

    it("DialogueContextEnded deactivates session", () => {
      const { scheduler } = makeScheduler();
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );

      expect(scheduler.activeDialogueSessionId).toBeNull();
    });

    it("stale session ID cannot end current session", () => {
      const { scheduler } = makeScheduler();
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ sessionId: "current", reason: DialogueEventReason.AddonShown }),
      );
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ sessionId: "stale", reason: DialogueEventReason.DialogueContextEnded }),
      );

      expect(scheduler.activeDialogueSessionId).toBe("current");
    });

    it("repeated AddonShown for same session is harmless", () => {
      const { scheduler } = makeScheduler();
      const event = makeDialogueEvent({ sessionId: "s1", reason: DialogueEventReason.AddonShown });

      scheduler.handleDialogueEvent(event);
      scheduler.handleDialogueEvent(event);

      expect(scheduler.activeDialogueSessionId).toBe("s1");
    });

    it("repeated end events are harmless", () => {
      const { scheduler } = makeScheduler();
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.DialogueContextEnded }),
      );

      expect(scheduler.activeDialogueSessionId).toBeNull();
    });

    it("TerritoryChanged ends session", () => {
      const { scheduler } = makeScheduler();
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.handleDialogueEvent(
        makeDialogueEvent({ reason: DialogueEventReason.TerritoryChanged }),
      );

      expect(scheduler.activeDialogueSessionId).toBeNull();
    });

    it("LoggedOut ends session", () => {
      const { scheduler } = makeScheduler();
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.LoggedOut }));

      expect(scheduler.activeDialogueSessionId).toBeNull();
    });
  });

  describe("Flavor lane", () => {
    it("starts flavor immediately", () => {
      const { scheduler, flavorPlayers } = makeScheduler();
      const req = makeRequest({ audioClass: "flavor" });

      scheduler.enqueue(req);

      expect(flavorPlayers[0].currentRequest?.id).toBe(req.id);
    });

    it("never queues flavor", () => {
      const { scheduler } = makeScheduler();
      const req1 = makeRequest({ audioClass: "flavor" });
      const req2 = makeRequest({ audioClass: "flavor" });
      const req3 = makeRequest({ audioClass: "flavor" });
      const req4 = makeRequest({ audioClass: "flavor" });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      scheduler.enqueue(req3);
      scheduler.enqueue(req4);

      // pool of 3, 4th evicts oldest
      expect(scheduler.activeFlavorCount).toBe(3);
    });

    it("evicts oldest flavor when pool is full", () => {
      const { scheduler, flavorPlayers } = makeScheduler();
      const req1 = makeRequest({ audioClass: "flavor", tts: { text: "a", voiceOverrides: {} } });
      const req2 = makeRequest({ audioClass: "flavor", tts: { text: "b", voiceOverrides: {} } });
      const req3 = makeRequest({ audioClass: "flavor", tts: { text: "c", voiceOverrides: {} } });
      const req4 = makeRequest({ audioClass: "flavor", tts: { text: "d", voiceOverrides: {} } });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      scheduler.enqueue(req3);

      // req4 should evict oldest (req1)
      scheduler.enqueue(req4);

      const texts = new Set([0, 1, 2].map((i) => flavorPlayers[i].currentRequest?.tts.text));
      expect(texts.has("a")).toBe(false);
      expect(texts.has("d")).toBe(true);
    });

    it("discards flavor during dialogue session", () => {
      const { scheduler, flavorPlayers } = makeScheduler();
      const flavorReq = makeRequest({ audioClass: "flavor" });

      scheduler.handleDialogueEvent(makeDialogueEvent({ reason: DialogueEventReason.AddonShown }));
      scheduler.enqueue(flavorReq);

      expect(flavorPlayers[0].currentRequest).toBeNull();
      expect(scheduler.activeFlavorCount).toBe(0);
    });
  });

  describe("Cancellation", () => {
    it("cancel('npc') stops NPC only", () => {
      const { scheduler, npcPlayer, chatPlayer } = makeScheduler();
      scheduler.enqueue(makeRequest({ audioClass: "npc" }));
      scheduler.enqueue(makeRequest({ audioClass: "chat" }));

      scheduler.cancel("npc");

      expect(npcPlayer.currentRequest).toBeNull();
      expect(chatPlayer.currentRequest).not.toBeNull();
    });

    it("NPC cancellation does not stop chat or flavor", () => {
      const { scheduler, npcPlayer, chatPlayer, flavorPlayers } = makeScheduler();
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));
      scheduler.enqueue(makeRequest({ audioClass: "chat" }));

      scheduler.cancel("npc");

      expect(npcPlayer.currentRequest).toBeNull();
      expect(chatPlayer.currentRequest).not.toBeNull();
      expect(flavorPlayers[0].currentRequest).not.toBeNull();
      expect(scheduler.activeFlavorCount).toBe(1);
    });

    it("cancel('chat') stops chat and clears queue", () => {
      const { scheduler, chatPlayer, npcPlayer } = makeScheduler();
      scheduler.enqueue(makeRequest({ audioClass: "npc" }));
      scheduler.enqueue(makeRequest({ audioClass: "chat" }));

      scheduler.cancel("chat");

      expect(chatPlayer.currentRequest).toBeNull();
      expect(scheduler.chatQueueLength).toBe(0);
      expect(scheduler.interruptedChatRequest).toBeNull();
      expect(npcPlayer.currentRequest).not.toBeNull();
    });

    it("cancel('flavor') stops all flavor", () => {
      const { scheduler } = makeScheduler();
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));

      scheduler.cancel("flavor");

      expect(scheduler.activeFlavorCount).toBe(0);
    });

    it("cancel('all') stops everything", () => {
      const { scheduler, npcPlayer, chatPlayer } = makeScheduler();
      scheduler.enqueue(makeRequest({ audioClass: "npc" }));
      scheduler.enqueue(makeRequest({ audioClass: "chat" }));
      scheduler.enqueue(makeRequest({ audioClass: "flavor" }));

      scheduler.cancel("all");

      expect(npcPlayer.currentRequest).toBeNull();
      expect(chatPlayer.currentRequest).toBeNull();
      expect(scheduler.chatQueueLength).toBe(0);
      expect(scheduler.interruptedChatRequest).toBeNull();
      expect(scheduler.activeFlavorCount).toBe(0);
    });

    it("repeated cancellation is harmless", () => {
      const { scheduler } = makeScheduler();

      scheduler.cancel("all");
      scheduler.cancel("all");
      scheduler.cancel("npc");
      scheduler.cancel("chat");
      scheduler.cancel("flavor");

      // no crash
    });
  });

  describe("Stale callback safety", () => {
    it("stale NPC completion cannot clear replacement", async () => {
      const { scheduler, npcPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "npc" });
      const req2 = makeRequest({ audioClass: "npc" });

      scheduler.enqueue(req1);

      // capture the original playback then replace it
      scheduler.enqueue(req2);

      // complete the old NPC (should be harmless)
      npcPlayer.complete(req1.id);
      await flush();

      // NPC should still be active with req2
      expect(npcPlayer.currentRequest?.id).toBe(req2.id);
    });

    it("stale chat completion cannot clear replacement", async () => {
      const { scheduler, chatPlayer } = makeScheduler();
      const req1 = makeRequest({ audioClass: "chat" });
      const req2 = makeRequest({ audioClass: "chat" });

      scheduler.enqueue(req1);
      scheduler.enqueue(req2);
      chatPlayer.completeNext(); // req1 finishes
      await flush();

      expect(chatPlayer.currentRequest?.id).toBe(req2.id);
    });
  });

  describe("Job state invariant", () => {
    it("each job exists in exactly one state after enqueue", () => {
      const { scheduler } = makeScheduler();

      const npcReq = makeRequest({ audioClass: "npc" });
      const chat1 = makeRequest({ audioClass: "chat" });
      const chat2 = makeRequest({ audioClass: "chat" });
      const flavorReq = makeRequest({ audioClass: "flavor" });

      scheduler.enqueue(npcReq);
      scheduler.enqueue(chat1);
      scheduler.enqueue(chat2);
      scheduler.enqueue(flavorReq);

      // No crash from invariant assertion
    });
  });
});
