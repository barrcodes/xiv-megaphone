import { Navigate, Outlet } from "react-router-dom";
import { env } from "../../shared/env";

export function RequireDebug() {
	if (!env.VITE_DEBUG) return <Navigate to="/" replace />;
	return <Outlet />;
}
