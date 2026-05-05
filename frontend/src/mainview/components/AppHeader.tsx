import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function AppHeader() {
	const { connectionStatus } = useStore();
	const navigate = useNavigate();

	const statusBadge = {
		connected: <Badge className="bg-green-600 text-white">Connected</Badge>,
		connecting: <Badge className="bg-yellow-500 text-white">Connecting...</Badge>,
		disconnected: <Badge variant="secondary">Disconnected</Badge>,
	}[connectionStatus];

	return (
		<div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
			{statusBadge}
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => navigate("/settings")}
				aria-label="Settings"
			>
				<Settings />
			</Button>
		</div>
	);
}
