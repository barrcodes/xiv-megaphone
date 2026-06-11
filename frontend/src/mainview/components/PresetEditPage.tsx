import { ArrowLeftIcon } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Preset } from "shared/types";
import { savePreset } from "@/lib/ipc";
import { useStore } from "../store";
import { PresetForm } from "./PresetForm";
import { Button } from "./ui/button";

export function PresetEditPage() {
	const { id } = useParams();
	const { state } = useLocation();
	const presets = useStore((s) => s.presets);
	const navigate = useNavigate();

	const preset: Preset | undefined =
		id === "new" ? state?.preset : presets.find((p) => p.id === id);

	async function handleSave(saved: Preset) {
		await savePreset(saved);
		navigate("/");
	}

	if (!preset) {
		return (
			<div className="flex flex-col items-center justify-center h-64 gap-3">
				<p className="text-sm text-muted-foreground">Preset not found.</p>
				<Button variant="outline" size="sm" onClick={() => navigate("/")}>
					<ArrowLeftIcon className="size-3.5" />
					Go Back
				</Button>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-3xl mx-auto animate-fade-in-up">
			<div className="flex items-center gap-3 mb-6">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => navigate("/")}
					className="text-muted-foreground hover:text-foreground"
				>
					<ArrowLeftIcon className="size-4" />
				</Button>
				<div>
					<h2 className="font-display text-xl font-bold text-foreground">
						{preset.name ? (preset.isDefault ? "View Preset" : "Edit Preset") : "New Preset"}
					</h2>
					{preset.name && <p className="text-xs text-muted-foreground mt-0.5">{preset.name}</p>}
				</div>
			</div>
			<PresetForm preset={preset} onSave={handleSave} onCancel={() => navigate("/")} />
		</div>
	);
}
