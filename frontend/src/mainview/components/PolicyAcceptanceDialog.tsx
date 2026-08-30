import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { acceptPolicies, getPolicy, type PolicyData } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PolicyViewerModal } from "./PolicyViewerModal";

interface PolicyItemProps {
  label: string;
  policyId: "tos" | "privacy-policy";
  language: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function PolicyItem({ label, policyId, language, checked, onCheckedChange }: PolicyItemProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    setLoading(true);
    try {
      const data = await getPolicy(language, policyId);
      setPolicyData(data);
      setViewerOpen(true);
    } catch (err) {
      console.error(`Failed to load ${policyId}:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border bg-background text-primary accent-primary cursor-pointer"
          />
          <span className="text-sm leading-relaxed text-foreground select-none">
            <Trans
              i18nKey="policies.acceptTerms"
              values={{ policy: label }}
              components={{
                policy: (
                  <button
                    type="button"
                    onClick={handleView}
                    disabled={loading}
                    className="text-primary underline-offset-4 hover:underline inline cursor-pointer disabled:opacity-50"
                  />
                ),
              }}
            />
          </span>
        </label>
      </div>
      {policyData && (
        <PolicyViewerModal
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          title={label}
          content={policyData.content}
        />
      )}
    </>
  );
}

interface PolicyAcceptanceDialogProps {
  open: boolean;
  onAccepted: () => void;
}

export function PolicyAcceptanceDialog({ open, onAccepted }: PolicyAcceptanceDialogProps) {
  const { t, i18n } = useTranslation();
  const policyLanguage = i18n.resolvedLanguage ?? "en";
  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyData, setPolicyData] = useState<{
    tos: PolicyData;
    privacy: PolicyData;
  } | null>(null);

  const allChecked = tosChecked && privacyChecked;

  const handleAccept = async () => {
    if (!allChecked) return;
    setAccepting(true);
    setError(null);

    try {
      const data =
        policyData ??
        (await (async () => {
          const [tos, privacy] = await Promise.all([
            getPolicy(policyLanguage, "tos"),
            getPolicy(policyLanguage, "privacy-policy"),
          ]);
          const data = { tos, privacy };
          setPolicyData(data);
          return data;
        })());

      await acceptPolicies(data.tos.versionId, data.privacy.versionId);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("policies.failedToAccept"));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-xl font-semibold text-center">
          {t("policies.acceptTitle")}
        </DialogTitle>
        <p className="text-sm text-muted-foreground text-center -mt-1">
          {t("policies.acceptDescription")}
        </p>

        <div className="space-y-4 py-4">
          <PolicyItem
            label={t("policies.termsOfService")}
            policyId="tos"
            language={policyLanguage}
            checked={tosChecked}
            onCheckedChange={setTosChecked}
          />
          <PolicyItem
            label={t("policies.privacyPolicy")}
            policyId="privacy-policy"
            language={policyLanguage}
            checked={privacyChecked}
            onCheckedChange={setPrivacyChecked}
          />
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <Button onClick={handleAccept} disabled={!allChecked || accepting} className="w-full">
          {accepting ? t("policies.accepting") : t("policies.accept")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
