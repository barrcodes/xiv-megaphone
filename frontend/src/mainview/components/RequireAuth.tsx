import { Megaphone } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";

export function RequireAuth() {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center mesh-bg">
				<div className="flex flex-col items-center gap-3 animate-fade-in-up">
					<div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 animate-glow-pulse">
						<Megaphone className="size-6 text-primary" />
					</div>
					<p className="text-sm text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <Outlet />;
}
