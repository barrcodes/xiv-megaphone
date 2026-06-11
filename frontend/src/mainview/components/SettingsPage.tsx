import { LogOut, Power, Rocket, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { disconnect, setPort, setStartOnStartup } from "@/lib/ipc";
import { supabase } from "@/lib/supabase";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";

export function SettingsPage() {
	const {
		connectionStatus,
		port,
		setPort: storeSetPort,
		startOnStartup,
		setStartOnStartup: storeSetStartOnStartup,
	} = useStore();
	const { signOut } = useAuth();
	const navigate = useNavigate();

	async function handlePortChange(e: React.ChangeEvent<HTMLInputElement>) {
		const newPort = Number(e.target.value);
		if (!Number.isInteger(newPort) || newPort < 1 || newPort > 65535) return;
		storeSetPort(newPort);
		await setPort(newPort);
	}

	async function handleStartOnStartupChange(enabled: boolean) {
		storeSetStartOnStartup(enabled);
		await setStartOnStartup(enabled);
	}

	async function handleDisconnect() {
		await disconnect();
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		await signOut();
		navigate("/login");
	}

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in-up">
			<div>
				<h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Configure application behavior and connection options.
				</p>
			</div>

			<Card className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Rocket className="size-4 text-primary" />
						Application
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="startup-toggle" className="text-sm font-medium cursor-pointer">
								Launch on startup
							</Label>
							<p className="text-xs text-muted-foreground mt-0.5">
								Automatically start XIV Megaphone when your computer boots.
							</p>
						</div>
						<Switch
							id="startup-toggle"
							checked={startOnStartup}
							onCheckedChange={handleStartOnStartupChange}
						/>
					</div>

					<Separator className="bg-border/40" />

					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="port-input" className="text-sm font-medium">
								Connection Port
							</Label>
							<p className="text-xs text-muted-foreground mt-0.5">
								The port used for the FFXIV plugin connection.
							</p>
						</div>
						<Input
							id="port-input"
							type="number"
							value={port}
							onChange={handlePortChange}
							className="w-24 h-8 text-center"
							min={1}
							max={65535}
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wifi className="size-4 text-primary" />
						Connection
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Force Disconnect</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Manually disconnect the active game session.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={connectionStatus !== "connected"}
							onClick={handleDisconnect}
							className="gap-1.5"
						>
							<WifiOff className="size-3.5" />
							Disconnect
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<LogOut className="size-4 text-destructive" />
						Account
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Sign Out</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Log out of your current session.
							</p>
						</div>
						<Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5">
							<Power className="size-3.5" />
							Logout
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
