import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";

export function LogsPage() {
	const logs = useStore((s) => s.logs);
	const bottomRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs.length]);

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
				<ArrowLeftIcon className="cursor-pointer" onClick={() => navigate("/")} />
				<h2 className="text-lg font-semibold">Logs</h2>
			</div>
			<div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
				{logs.length === 0 && <p className="text-muted-foreground">No logs yet.</p>}
				{logs.map((line, i) => (
					<div
						key={i}
						className={
							line.level === "error"
								? "text-red-500"
								: line.level === "warn"
									? "text-yellow-500"
									: "text-foreground"
						}
					>
						<span className="text-muted-foreground">[{line.timestamp}]</span> {line.message}
					</div>
				))}
				<div ref={bottomRef} />
			</div>
		</div>
	);
}
