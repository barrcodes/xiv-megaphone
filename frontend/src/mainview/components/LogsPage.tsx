import { AlertCircle, AlertTriangle, Info, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type LogLevel = "all" | "log" | "warn" | "error";

export function LogsPage() {
	const logs = useStore((s) => s.logs);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [filter, setFilter] = useState<LogLevel>("all");
	const [search, setSearch] = useState("");
	const [autoScroll, setAutoScroll] = useState(true);

	const filteredLogs = useMemo(() => {
		return logs.filter((line) => {
			if (filter !== "all" && line.level !== filter) return false;
			if (search && !line.message.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		});
	}, [logs, filter, search]);

	useEffect(() => {
		if (autoScroll) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [autoScroll]);

	const levelConfig = {
		log: {
			color: "text-foreground",
			border: "border-l-muted-foreground/30",
			icon: Info,
			label: "INFO",
		},
		warn: { color: "text-warning", border: "border-l-warning", icon: AlertTriangle, label: "WARN" },
		error: {
			color: "text-destructive",
			border: "border-l-destructive",
			icon: AlertCircle,
			label: "ERR",
		},
	};

	const filterButtons: { value: LogLevel; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "log", label: "Info" },
		{ value: "warn", label: "Warn" },
		{ value: "error", label: "Error" },
	];

	return (
		<div className="flex flex-col h-full animate-fade-in-up">
			<div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
				<div>
					<h1 className="font-display text-2xl font-bold text-foreground">Logs</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						{filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant={autoScroll ? "default" : "outline"}
						size="sm"
						className="h-7 text-xs"
						onClick={() => setAutoScroll(!autoScroll)}
					>
						Auto-scroll
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-muted-foreground"
						onClick={() => useStore.setState({ logs: [] })}
					>
						<Trash2 className="size-3" />
						Clear
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-2 px-6 py-3 border-b border-border/30 shrink-0">
				<div className="relative flex-1 max-w-xs">
					<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Filter logs..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 pl-8 text-xs"
					/>
				</div>
				<div className="flex items-center gap-1 rounded-md bg-secondary/40 p-0.5">
					{filterButtons.map((btn) => (
						<button
							type="button"
							key={btn.value}
							onClick={() => setFilter(btn.value)}
							className={cn(
								"rounded px-2.5 py-1 text-xs font-medium transition-all",
								filter === btn.value
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{btn.label}
						</button>
					))}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto font-mono text-xs">
				{filteredLogs.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full gap-2">
						<p className="text-sm text-muted-foreground">
							{logs.length === 0 ? "No logs yet." : "No matching logs."}
						</p>
					</div>
				) : (
					<div className="py-2">
						{filteredLogs.map((line) => {
							const config = levelConfig[line.level];
							return (
								<div
									key={`${line.timestamp}-${line.message}`}
									className={cn(
										"flex gap-3 px-6 py-1.5 border-l-2 transition-colors hover:bg-secondary/20",
										config.border,
									)}
								>
									<span className="shrink-0 text-muted-foreground/50 w-16">
										{line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : ""}
									</span>
									<span className={cn("shrink-0 w-10 font-semibold text-right", config.color)}>
										{config.label}
									</span>
									<span className={cn("break-all", config.color)}>{line.message}</span>
								</div>
							);
						})}
					</div>
				)}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}
