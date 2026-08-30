import { BookOpen, Eye, Pencil, Plus, Trash2, Users, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Preset } from "shared/types";
import { deletePreset, setActivePreset } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useStore } from "../store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function PresetList() {
  const { t } = useTranslation();
  const { presets, activePresetId, setActivePresetId } = useStore();
  const navigate = useNavigate();

  async function handleDelete(id: string) {
    await deletePreset(id);
  }

  async function handleActiveChange(id: string) {
    await setActivePreset(id);
    setActivePresetId(id);
  }

  function handleNewPreset() {
    const newPreset: Preset = {
      id: globalThis.crypto.randomUUID(),
      name: "",
      speakingRate: 1.25,
      voiceOverrides: {},
    };
    navigate("/preset/new", { state: { preset: newPreset } });
  }

  const activePreset = presets.find((p) => p.id === activePresetId);
  const overrideCount = activePreset ? Object.keys(activePreset.voiceOverrides ?? {}).length : 0;
  const lexiconCount = activePreset ? Object.keys(activePreset.lexicon ?? {}).length : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("presets.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("presets.description")}</p>
      </div>

      {activePreset && (
        <div
          className="animate-fade-in-up glow-border rounded-xl bg-card p-5"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="size-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {activePreset.name}
                  </h2>
                  <Badge className="bg-primary/15 text-primary border-primary/20">
                    {t("presets.active")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("presets.assignedToGame")}
                </p>
              </div>
            </div>
            <Select value={activePresetId} onValueChange={handleActiveChange}>
              <SelectTrigger className="min-w-[140px]">
                <SelectValue placeholder={t("presets.switchPreset")} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>{t("presets.overrideCount", { count: overrideCount })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="size-3.5" />
              <span>{t("presets.lexiconEntries", { count: lexiconCount })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{t("presets.speed", { speed: activePreset.speakingRate })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("presets.allPresets")}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {presets.map((preset, i) => {
            const isActive = preset.id === activePresetId;
            const isDefault = preset.id === "default";
            const presetOverrideCount = Object.keys(preset.voiceOverrides ?? {}).length;

            return (
              <div
                key={preset.id}
                className={cn(
                  "animate-fade-in-up group relative rounded-lg border bg-card p-4 transition-all",
                  "hover:border-primary/20 hover:bg-surface-hover",
                  isActive && "border-primary/20 bg-primary/[0.03]",
                )}
                style={{ animationDelay: `${0.1 + i * 0.04}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground truncate">
                        {preset.name}
                      </h3>
                      {isDefault && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {t("presets.default")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("presets.overrideCount", { count: presetOverrideCount })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/preset/${preset.id}`)}
                  >
                    {isDefault ? (
                      <>
                        <Eye className="size-3" />
                        {t("presets.view")}
                      </>
                    ) : (
                      <>
                        <Pencil className="size-3" />
                        {t("presets.edit")}
                      </>
                    )}
                  </Button>
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(preset.id)}
                      aria-label={t("presets.delete")}
                      title={t("presets.delete")}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleNewPreset}
            className={cn(
              "animate-fade-in-up flex min-h-[100px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60",
              "text-sm font-medium text-muted-foreground transition-all",
              "hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary",
            )}
            style={{ animationDelay: `${0.1 + presets.length * 0.04}s` }}
          >
            <Plus className="size-4" />
            {t("presets.newPreset")}
          </button>
        </div>
      </div>
    </div>
  );
}
