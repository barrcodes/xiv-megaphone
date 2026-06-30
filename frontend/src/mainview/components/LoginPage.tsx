import { Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { usePasswordValidation } from "../lib/use-password-validation";
import { PasswordRequirements } from "./password-requirements";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [submittedResetEmail, setSubmittedResetEmail] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname ?? "/";
  const passwordValidation = usePasswordValidation(password);

  useEffect(() => {
    window.electronAPI.authCallback(
      async ({ access_token, refresh_token, type }) => {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error("Error setting session:", error);
          return;
        }
        navigate(type === "recovery" ? "/reset-password" : "/", {
          replace: true,
        });
      },
    );
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "sign-up") {
      if (!passwordValidation.isValid) {
        setError("Password does not meet all requirements.");
        return;
      }
    }

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
      setSubmittedEmail(email);
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
      setSubmittedResetEmail(email);
    }
  };

  async function handleResend() {
    if (!submittedEmail) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: submittedEmail,
      options: { emailRedirectTo: "xiv-megaphone://auth/callback" },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  async function handleResendReset() {
    if (!submittedResetEmail) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(submittedResetEmail, {
      redirectTo: "xiv-megaphone://auth/callback",
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
		<main className="relative flex h-dvh flex-col mesh-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute w-96 h-96 rounded-full blur-3xl transition-all duration-700 ${
            mode === "sign-in"
              ? "top-1/4 left-1/4 bg-primary/[0.03]"
              : "top-1/3 right-1/3 bg-accent/[0.03]"
          }`}
        />
        <div
          className={`absolute w-96 h-96 rounded-full blur-3xl transition-all duration-700 ${
            mode === "sign-in"
              ? "bottom-1/4 right-1/4 bg-accent/[0.03]"
              : "bottom-1/3 left-1/3 bg-primary/[0.03]"
          }`}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1" />
        <div className="w-full max-w-sm mx-auto p-6 animate-fade-in-up">
          {submittedResetEmail ? (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <KeyRound className="size-7 text-primary" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Check your email
                </h1>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  We sent a password reset link to<br />
                  <span className="font-medium text-foreground">{submittedResetEmail}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                  Click the link in that email to reset your password.
                </p>
              </div>

              <div className="space-y-3">
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button
                  onClick={handleResendReset}
                  disabled={loading}
                  className="w-full h-11 font-medium"
                >
                  {loading ? "Sending..." : "Resend email"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedResetEmail(null);
                    setMode("sign-in");
                    setError(null);
                  }}
                  className="w-full h-11 font-medium"
                >
                  Back to sign in
                </Button>
              </div>
            </>
          ) : submittedEmail ? (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Mail className="size-7 text-primary" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Check your email
                </h1>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  We sent a confirmation link to<br />
                  <span className="font-medium text-foreground">{submittedEmail}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                  Click the link in that email to finish creating your account.
                </p>
              </div>

              <div className="space-y-3">
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full h-11 font-medium"
                >
                  {loading ? "Sending..." : "Resend email"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedEmail(null);
                    setMode("sign-in");
                    setError(null);
                  }}
                  className="w-full h-11 font-medium"
                >
                  Back to sign in
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  {mode === "sign-in" ? (
                    <LogIn className="size-7 text-primary" />
                  ) : (
                    <UserPlus className="size-7 text-primary" />
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  XIV Megaphone
                </h1>
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "sign-in"
                          ? "Enter your password"
                          : "Create a password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {mode === "sign-up" && (
                      <PasswordRequirements validation={passwordValidation} />
                    )}
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (mode === "sign-up" && !passwordValidation.isValid)}
                  className="w-full h-11 font-medium"
                >
                  {loading
                    ? "Working..."
                    : mode === "sign-in"
                      ? "Sign In"
                      : "Create Account"}
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      setMode((current) =>
                        current === "sign-in" ? "sign-up" : "sign-in",
                      );
                      setError(null);
                    }}
                  >
                    {mode === "sign-in"
                      ? "Don't have an account? Sign up"
                      : "Back to sign in"}
                  </button>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      onClick={handlePasswordReset}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
        <div className="flex-1" />
      </div>
    </main>
  );
}


