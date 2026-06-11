import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const from = (location.state as any)?.from?.pathname ?? "/";

	useEffect(() => {
		window.electronAPI.authCallback(async ({ access_token, refresh_token }) => {
			const { error } = await supabase.auth.setSession({
				access_token,
				refresh_token,
			});
			if (error) {
				console.error("Error setting session:", error);
				return;
			}
			navigate("/", { replace: true });
		});
	}, []);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const result =
			mode === "sign-in"
				? await supabase.auth.signInWithPassword({ email, password })
				: await supabase.auth.signUp({
						email,
						password,
						options: { emailRedirectTo: "xiv-megaphone://auth/callback" },
					});

		setLoading(false);

		if (result.error) {
			setError(result.error.message);
			return;
		}

		if (mode === "sign-up" && !result.data.session) {
			setError("Check your email to confirm your account.");
			return;
		}

		navigate(from, { replace: true });
	}

	const handlePasswordReset = async () => {
		if (!email) {
			setError("Please enter your email address.");
			return;
		}

		setLoading(true);
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: "xiv-megaphone://auth/callback",
		});
		setLoading(false);

		if (error) {
			setError(error.message);
		} else {
			setError("Check your email for password reset instructions.");
		}
	};

	return (
		<main className="relative flex min-h-screen items-center justify-center mesh-bg p-6">
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
				<div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/[0.03] blur-3xl" />
			</div>

			<div className="relative w-full max-w-sm animate-fade-in-up">
				<div className="flex flex-col items-center mb-8">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
						<Megaphone className="size-7 text-primary" />
					</div>
					<h1 className="font-display text-2xl font-bold text-foreground">XIV Megaphone</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{mode === "sign-in" ? "Welcome back" : "Create your account"}
					</p>
				</div>

				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label
							htmlFor="email"
							className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							Email
						</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
							className="h-11"
						/>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="password"
							className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							Password
						</Label>
						<Input
							id="password"
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
							className="h-11"
						/>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<Button type="submit" disabled={loading} className="w-full h-11 font-medium">
						{loading ? "Working..." : mode === "sign-in" ? "Sign In" : "Create Account"}
					</Button>

					<div className="flex items-center justify-between pt-2">
						<button
							type="button"
							className="text-sm text-muted-foreground hover:text-primary transition-colors"
							onClick={() => setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))}
						>
							{mode === "sign-in" ? "Need an account? Sign up" : "Already have an account?"}
						</button>
						{mode === "sign-in" && (
							<button
								type="button"
								className="text-sm text-muted-foreground hover:text-primary transition-colors"
								onClick={handlePasswordReset}
							>
								Reset Password
							</button>
						)}
					</div>
				</form>
			</div>
		</main>
	);
}
