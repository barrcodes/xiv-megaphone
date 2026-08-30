import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PasswordValidation } from "../lib/use-password-validation";

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="size-3 shrink-0 text-green-500" />
      ) : (
        <div className="size-3 shrink-0 rounded-full border border-muted-foreground/40" />
      )}
      <span className={`text-xs ${met ? "text-green-500" : "text-muted-foreground/70"}`}>
        {label}
      </span>
    </div>
  );
}

export function PasswordRequirements({ validation }: { validation: PasswordValidation }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5 pt-1">
      <Requirement met={validation.minLength} label={t("auth.passwordRequirements.minLength")} />
      <Requirement met={validation.hasUpper} label={t("auth.passwordRequirements.uppercase")} />
      <Requirement met={validation.hasLower} label={t("auth.passwordRequirements.lowercase")} />
      <Requirement met={validation.hasNumber} label={t("auth.passwordRequirements.number")} />
      <Requirement met={validation.hasSymbol} label={t("auth.passwordRequirements.symbol")} />
    </div>
  );
}
