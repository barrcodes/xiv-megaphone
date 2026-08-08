import { useEffect, useRef } from "react";
import { createStream, streamAudio } from "../api";
import { useStore } from "../store";
import { AudioScheduler } from "./audio-scheduler";
import { PlaybackTrace } from "./playback-trace";
import { StreamPlayer } from "./stream-player";

export function AudioPlayer() {
  const schedulerRef = useRef<AudioScheduler | null>(null);

  useEffect(() => {
    const makePlayer = () =>
      new StreamPlayer({
        createStream,
        streamAudio,
        createMediaSource: () => new MediaSource(),
        createObjectURL: (mediaSource) => URL.createObjectURL(mediaSource),
        revokeObjectURL: (url) => URL.revokeObjectURL(url),
        createTrace: () => new PlaybackTrace(),
        getSpeakingRate: () => {
          const { presets, activePresetId } = useStore.getState();
          return presets.find((preset) => preset.id === activePresetId)?.speakingRate ?? 1;
        },
        getVolume: () => useStore.getState().volume,
        getMuted: () => useStore.getState().muted,
        subscribeAudioSettings: (listener) => useStore.subscribe(listener),
        onPlaybackEvent: (event) => {
          window.dispatchEvent(new CustomEvent("xiv:stream-event", { detail: event }));
        },
      });

    const scheduler = new AudioScheduler(makePlayer(), makePlayer(), [
      makePlayer(),
      makePlayer(),
      makePlayer(),
    ]);
    schedulerRef.current = scheduler;

    const removeCreateStream = window.electronAPI.createStream((request) => {
      scheduler.enqueue(request);
    });
    const removeCancelStream = window.electronAPI.cancelStream(({ scope }) => {
      scheduler.cancel(scope);
    });
    const removeDialogueEvent = window.electronAPI.dialogueEvent((event) => {
      scheduler.handleDialogueEvent(event);
    });

    return () => {
      removeCreateStream();
      removeCancelStream();
      removeDialogueEvent();
      scheduler.cancel("all");
      schedulerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions = [
      "play",
      "pause",
      "stop",
      "seekbackward",
      "seekforward",
      "seekto",
      "previoustrack",
      "nexttrack",
    ] as const;
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, () => {});
      } catch {
        // Some platforms do not support every media-session action.
      }
    }
  }, []);

  return null;
}
