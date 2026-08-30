import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-provider";
import { supabase } from "../lib/supabase";
import { usePasswordValidation } from "../lib/use-password-validation";
import { PasswordRequirements } from "./password-requirements";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordValidation = usePasswordValidation(password);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!passwordValidation.isValid) {
      setError(t("auth.passwordInvalid"));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/", { replace: true });
  }

  if (loading || !user) {
    return null;
  }

  return (
    <main className="relative flex h-dvh flex-col mesh-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/[0.03] blur-3xl" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1" />
        <div className="w-full max-w-sm mx-auto p-6 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <KeyRound className="size-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {t("auth.resetPassword")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("auth.enterNewPassword")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t("auth.newPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.enterNewPasswordPlaceholder")}
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
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <PasswordRequirements validation={passwordValidation} />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !passwordValidation.isValid}
              className="w-full h-11 font-medium"
            >
              {submitting ? t("auth.updating") : t("auth.setNewPassword")}
            </Button>
          </form>
        </div>
        <div className="flex-1" />
      </div>
    </main>
  );
}
