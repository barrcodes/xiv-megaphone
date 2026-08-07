import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { setVolume as persistVolume } from "../lib/ipc";
import { useStore } from "../store";
import { Slider } from "./ui/slider";

const MAX_VOLUME = 2.0;
const UNITY_VOLUME = 1;
const UNITY_POSITION = UNITY_VOLUME / MAX_VOLUME;
const UNITY_SNAP_THRESHOLD = 0.1;

export function VolumeControl() {
  const { volume, muted, setVolume, setMuted } = useStore();

  return (
    <div className="rounded-md bg-secondary/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <Slider
          min={0}
          max={MAX_VOLUME}
          step={0.01}
          value={[volume]}
          onValueChange={([value]) => {
            const nextVolume =
              Math.abs(value - UNITY_VOLUME) <= UNITY_SNAP_THRESHOLD ? UNITY_VOLUME : value;
            setVolume(nextVolume);
            persistVolume(nextVolume);
          }}
          disabled={muted}
          markAt={UNITY_POSITION}
          aria-label="Volume"
          className="flex-1"
        />
        <span
          className={cn(
            "w-10 shrink-0 text-right text-xs font-medium tabular-nums",
            volume > UNITY_VOLUME ? "text-warning" : "text-muted-foreground",
          )}
        >
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
