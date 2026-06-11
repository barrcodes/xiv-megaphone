import { useFormContext } from "react-hook-form";
import type { PresetFormValues } from "./PresetForm";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
	disabled?: boolean;
}

export function GeneralTab({ disabled }: Props) {
	const { register } = useFormContext<PresetFormValues>();

	return (
		<div className="space-y-5 animate-fade-in-up">
			<Card>
				<CardHeader>
					<CardTitle>Preset Name</CardTitle>
				</CardHeader>
				<CardContent>
					<Input
						id="name"
						{...register("name", { required: true })}
						disabled={disabled}
						placeholder="My Custom Preset"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Voice Defaults</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="male">Male Voice</Label>
							<Input
								id="male"
								{...register("male", { required: true })}
								disabled={disabled}
								placeholder="e.g. Graham"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="female">Female Voice</Label>
							<Input
								id="female"
								{...register("female", { required: true })}
								disabled={disabled}
								placeholder="e.g. Wendy"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="default">Default Voice</Label>
							<Input
								id="default"
								{...register("default", { required: true })}
								disabled={disabled}
								placeholder="e.g. Luna"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="speakingRate">Speaking Speed</Label>
							<Input
								id="speakingRate"
								type="number"
								min={0.5}
								max={1.5}
								step="0.05"
								{...register("speakingRate", {
									required: true,
									valueAsNumber: true,
									min: 0.5,
									max: 1.5,
								})}
								disabled={disabled}
							/>
							<p className="text-xs text-muted-foreground">Range: 0.5x to 1.5x</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
