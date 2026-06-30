import { LayoutList, LogOut, Megaphone, ScrollText, Settings, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import { useStore } from "../store";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const navItems = [
	{ path: "/", label: "Presets", icon: LayoutList },
	{ path: "/account", label: "Account", icon: User },
	{ path: "/logs", label: "Logs", icon: ScrollText },
	{ path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
	const { connectionStatus } = useStore();
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const statusConfig = {
		connected: { color: "bg-success", label: "Connected", pulse: false },
		connecting: { color: "bg-warning", label: "Connecting...", pulse: true },
		disconnected: { color: "bg-muted-foreground", label: "Disconnected", pulse: false },
	}[connectionStatus];

	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	return (
		<aside className="flex h-full w-52 shrink-0 flex-col border-r border-border/40 bg-sidebar">
			<div className="flex items-center gap-2.5 px-5 py-5">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
					<Megaphone className="size-4 text-primary" />
				</div>
				<div className="flex flex-col">
					<span className="font-display text-base font-bold leading-tight tracking-wide text-foreground">
						XIV Megaphone
					</span>
					<span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
						TTS Client
					</span>
				</div>
			</div>

			<div className="px-4 pb-3">
				<div className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-1.5">
					<span
						className={cn(
							"size-2 rounded-full",
							statusConfig.color,
							statusConfig.pulse && "animate-pulse-glow",
						)}
					/>
					<span className="text-xs font-medium text-muted-foreground">{statusConfig.label}</span>
				</div>
			</div>

			<Separator className="bg-border/40" />

			<nav className="flex-1 space-y-0.5 px-3 py-3">
				{navItems.map((item) => {
					const isActive =
						item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

					return (
						<button
							type="button"
							key={item.path}
							onClick={() => navigate(item.path)}
							className={cn(
								"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
							)}
						>
							{isActive && (
								<span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
							)}
							<item.icon className="size-4 shrink-0" />
							<span>{item.label}</span>
						</button>
					);
				})}
			</nav>

			<Separator className="bg-border/40" />

			<div className="flex items-center gap-3 px-4 py-4">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
					{user?.email?.[0]?.toUpperCase() ?? "?"}
				</div>
				<div className="flex-1 overflow-hidden">
					<p className="truncate text-xs font-medium text-foreground">{user?.email ?? "Unknown"}</p>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={handleLogout}
							className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						>
							<LogOut className="size-3.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">Log out</TooltipContent>
				</Tooltip>
			</div>
		</aside>
	);
}
