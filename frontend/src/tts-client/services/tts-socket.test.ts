import type { WebContents } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { Preset } from "../../shared/types";
import { TtsSocket } from "./tts-socket";

// Mock ws module
const mockWsOn = vi.fn();
const mockWsClose = vi.fn();
const mockWsRemoveAllListeners = vi.fn();
let mockWsOnMessage: ((data: WebSocket.Data) => void) | null = null;
let mockWsOnOpen: (() => void) | null = null;

vi.mock("ws", () => ({
  default: vi.fn(function FakeWebSocket() {
    return {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (event === "message") mockWsOnMessage = handler as (data: WebSocket.Data) => void;
        if (event === "open") mockWsOnOpen = handler as () => void;
        if (event === "close") mockWsOn("close", handler);
        if (event === "error") mockWsOn("error", handler);
      }),
      close: mockWsClose,
      removeAllListeners: mockWsRemoveAllListeners,
    };
  }),
}));

const mockPlaybackIpc = {
  createStream: vi.fn(),
  cancel: vi.fn(),
  sendDialogueEvent: vi.fn(),
};

vi.mock("./playback-ipc", () => ({
  PlaybackIpc: vi.fn(function FakePlaybackIpc() {
    return mockPlaybackIpc;
  }),
}));

function makePreset(overrides?: Record<string, unknown>) {
  return {
    id: "preset_1",
    name: "Test Preset",
    lexicon: {},
    voiceOverrides: {},
    ...overrides,
  };
}

function makeWebContents() {
  return { isDestroyed: vi.fn(() => false) };
}

describe("TtsSocket", () => {
  let onConnected: ReturnType<typeof vi.fn>;
  let onDisconnected: ReturnType<typeof vi.fn>;
  let webContents: ReturnType<typeof makeWebContents>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWsOnMessage = null;
    mockWsOnOpen = null;
    onConnected = vi.fn();
    onDisconnected = vi.fn();
    webContents = makeWebContents();
  });

  function createSocket() {
    const socket = new TtsSocket({
      port: 12345,
      preset: makePreset() as Preset,
      webContents: webContents as unknown as WebContents,
      onConnected,
      onDisconnected,
    });
    // Simulate WebSocket open so connection is ready
    // SocketManager constructor calls connect() which calls new WebSocket
    // The mock WebSocket will have registered the "open" handler
    // We need to trigger it
    return socket;
  }

  describe("Say message handling", () => {
    it("classifies AddonTalk as npc", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "Hello NPC",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          audioClass: "npc",
          tts: expect.objectContaining({ text: "Hello NPC" }),
        }),
      );
    });

    it("classifies Chat as chat", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "Chat",
          Payload: "Hello chat",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({ audioClass: "chat" }),
      );
    });

    it("classifies AddonBattleTalk as flavor", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonBattleTalk",
          Payload: "Battle cry!",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({ audioClass: "flavor" }),
      );
    });

    it("discards unclassified sources", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "SomeOtherSource",
          Payload: "ignored",
        }),
      );

      expect(mockPlaybackIpc.createStream).not.toHaveBeenCalled();
    });

    it("generates unique request IDs and receivedAt timestamps", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "first",
        }),
      );
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "second",
        }),
      );

      const calls = mockPlaybackIpc.createStream.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0].id).not.toBe(calls[1][0].id);
      expect(typeof calls[0][0].receivedAt).toBe("number");
      expect(typeof calls[1][0].receivedAt).toBe("number");
    });

    it("applies lexicon replacements", () => {
      createSocket();
      const _socket = new TtsSocket({
        port: 12345,
        preset: makePreset({ lexicon: { foo: "bar", hello: "hi" } }) as Preset,
        webContents: webContents as unknown as WebContents,
      });
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "hello foo",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          tts: expect.objectContaining({ text: "hi bar" }),
        }),
      );
    });

    it("forwards speaker, gender, race, volume, and chat metadata", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "Chat",
          ChatType: 10,
          Speaker: "PlayerName",
          Race: "Hyur",
          Voice: { Name: "en-US-Wavenet-D" },
          Volume: 0.8,
          Payload: "Hello with metadata",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "Chat",
          chatType: 10,
          tts: expect.objectContaining({
            text: "Hello with metadata",
            speaker: "playername",
            gender: "en-us-wavenet-d",
            race: "hyur",
            volume: 0.8,
          }),
        }),
      );
    });

    it("includes voiceOverrides from preset", () => {
      createSocket();
      const voiceOverrides = { Alisaie: "en-US-Wavenet-F" };
      new TtsSocket({
        port: 12345,
        preset: makePreset({ voiceOverrides }) as Preset,
        webContents: webContents as unknown as WebContents,
      });
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "override test",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          tts: expect.objectContaining({ voiceOverrides }),
        }),
      );
    });
  });

  describe("Cancel message handling", () => {
    it("sends cancel with NPC scope", () => {
      createSocket();
      mockWsOnMessage?.(JSON.stringify({ Type: "Cancel" }));

      expect(mockPlaybackIpc.cancel).toHaveBeenCalledWith({ scope: "npc" });
    });
  });

  describe("DialogueEvent message handling", () => {
    it("forwards valid dialogue events", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Event",
          EventType: "event",
          SessionId: "s1",
          Source: "AddonTalk",
          Reason: "AddonShown",
        }),
      );

      expect(mockPlaybackIpc.sendDialogueEvent).toHaveBeenCalledWith({
        eventType: "event",
        sessionId: "s1",
        source: "AddonTalk",
        reason: "AddonShown",
      });
    });

    it("accepts the plugin Event envelope for dialogue events", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Event",
          EventType: "NpcDialogueSession",
          SessionId: "s1",
          Source: "AddonTalk",
          Reason: "AddonShown",
        }),
      );

      expect(mockPlaybackIpc.sendDialogueEvent).toHaveBeenCalledWith({
        eventType: "NpcDialogueSession",
        sessionId: "s1",
        source: "AddonTalk",
        reason: "AddonShown",
      });
    });

    it("ignores dialogue events missing required fields", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "DialogueEvent",
          EventType: "event",
          // Missing SessionId
          Source: "AddonTalk",
          Reason: "AddonShown",
        }),
      );

      expect(mockPlaybackIpc.sendDialogueEvent).not.toHaveBeenCalled();
    });
  });

  describe("unknown message types", () => {
    it("ignores unknown message types", () => {
      createSocket();
      mockWsOnMessage?.(JSON.stringify({ Type: "UnknownType" }));

      expect(mockPlaybackIpc.createStream).not.toHaveBeenCalled();
      expect(mockPlaybackIpc.cancel).not.toHaveBeenCalled();
      expect(mockPlaybackIpc.sendDialogueEvent).not.toHaveBeenCalled();
    });
  });

  describe("updatePreset", () => {
    it("updates the active preset", () => {
      const socket = createSocket();
      const newPreset = makePreset({ lexicon: { old: "new" } }) as Preset;

      socket.updatePreset(newPreset);

      // Send a message to verify the new lexicon is used
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "AddonTalk",
          Payload: "old",
        }),
      );

      expect(mockPlaybackIpc.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          tts: expect.objectContaining({ text: "new" }),
        }),
      );
    });
  });

  describe("connection callbacks", () => {
    it("calls onConnected when WebSocket opens", () => {
      createSocket();
      mockWsOnOpen?.();

      expect(onConnected).toHaveBeenCalled();
    });
  });

  describe("order preservation", () => {
    it("handles messages in arrival order", () => {
      createSocket();
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "Chat",
          Payload: "first",
        }),
      );
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Cancel",
        }),
      );
      mockWsOnMessage?.(
        JSON.stringify({
          Type: "Say",
          Source: "Chat",
          Payload: "after cancel",
        }),
      );

      expect(mockPlaybackIpc.createStream.mock.calls).toHaveLength(2);
      expect(mockPlaybackIpc.createStream.mock.calls[0][0].tts.text).toBe("first");
      expect(mockPlaybackIpc.createStream.mock.calls[1][0].tts.text).toBe("after cancel");
      expect(mockPlaybackIpc.cancel).toHaveBeenCalledTimes(1);
    });
  });
});
