import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PolicyViewerModal } from "./PolicyViewerModal";
import { getPolicy, acceptPolicies, type PolicyData } from "@/api";

interface PolicyItemProps {
  label: string;
  policyId: "tos" | "privacy-policy";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function PolicyItem({ label, policyId, checked, onCheckedChange }: PolicyItemProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    setLoading(true);
    try {
      const data = await getPolicy(policyId);
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
            I accept the terms of the{" "}
            <button
              type="button"
              onClick={handleView}
              disabled={loading}
              className="text-primary underline-offset-4 hover:underline inline cursor-pointer disabled:opacity-50"
            >
              {label}
            </button>
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

export function PolicyAcceptanceDialog({
  open,
  onAccepted,
}: PolicyAcceptanceDialogProps) {
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
      if (!policyData) {
        const [tos, privacy] = await Promise.all([
          getPolicy("tos"),
          getPolicy("privacy-policy"),
        ]);
        setPolicyData({ tos, privacy });
      }

      const { tos, privacy } = policyData ?? await (async () => {
        const [t, p] = await Promise.all([
          getPolicy("tos"),
          getPolicy("privacy-policy"),
        ]);
        const data = { tos: t, privacy: p };
        setPolicyData(data);
        return data;
      })();

      await acceptPolicies(tos.versionId, privacy.versionId);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept policies");
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
          Accept Policies
        </DialogTitle>
        <p className="text-sm text-muted-foreground text-center -mt-1">
          Please review and accept the following policies to continue using XIV Megaphone.
        </p>

        <div className="space-y-4 py-4">
          <PolicyItem
            label="Terms of Service"
            policyId="tos"
            checked={tosChecked}
            onCheckedChange={setTosChecked}
          />
          <PolicyItem
            label="Privacy Policy"
            policyId="privacy-policy"
            checked={privacyChecked}
            onCheckedChange={setPrivacyChecked}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          onClick={handleAccept}
          disabled={!allChecked || accepting}
          className="w-full"
        >
          {accepting ? "Accepting..." : "Accept"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}