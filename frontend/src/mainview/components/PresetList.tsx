import { BookOpen, Eye, Pencil, Plus, Trash2, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Preset } from "shared/types";
import { deletePreset, setActivePreset } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useStore } from "../store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function PresetList() {
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
		const base = presets.find((p) => p.id === "default") ?? presets[0];
		const newPreset: Preset = {
			...base,
			id: globalThis.crypto.randomUUID(),
			name: "",
			isDefault: false,
		};
		navigate("/preset/new", { state: { preset: newPreset } });
	}

	const activePreset = presets.find((p) => p.id === activePresetId);
	const voiceCount = activePreset ? Object.keys(activePreset.namedVoices).length : 0;
	const lexiconCount = activePreset ? Object.keys(activePreset.lexicon ?? {}).length : 0;

	return (
		<div className="p-6 space-y-6 max-w-4xl mx-auto">
			<div className="animate-fade-in-up">
				<h1 className="font-display text-2xl font-bold text-foreground">Presets</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Configure voice assignments for your FFXIV characters.
				</p>
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
									<Badge className="bg-primary/15 text-primary border-primary/20">Active</Badge>
								</div>
								<p className="text-xs text-muted-foreground mt-0.5">
									Currently assigned to your game connection
								</p>
							</div>
						</div>
						<Select value={activePresetId} onValueChange={handleActiveChange}>
							<SelectTrigger className="min-w-[140px]">
								<SelectValue placeholder="Switch preset" />
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
							<span>{voiceCount} voices</span>
						</div>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<BookOpen className="size-3.5" />
							<span>{lexiconCount} lexicon entries</span>
						</div>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<span>Speed: {activePreset.speakingRate}x</span>
						</div>
					</div>
				</div>
			)}

			<div className="space-y-3">
				<h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					All Presets
				</h2>

				<div className="grid gap-3 sm:grid-cols-2">
					{presets.map((preset, i) => {
						const isActive = preset.id === activePresetId;
						const presetVoiceCount = Object.keys(preset.namedVoices).length;

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
											{preset.isDefault && (
												<Badge variant="secondary" className="text-[10px] px-1.5">
													Default
												</Badge>
											)}
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{presetVoiceCount} voices assigned
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
										{preset.isDefault ? (
											<>
												<Eye className="size-3" />
												View
											</>
										) : (
											<>
												<Pencil className="size-3" />
												Edit
											</>
										)}
									</Button>
									{!preset.isDefault && (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
											onClick={() => handleDelete(preset.id)}
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
						New Preset
					</button>
				</div>
			</div>
		</div>
	);
}
