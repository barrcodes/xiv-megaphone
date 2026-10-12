import { Clock, CreditCard, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  changeSubscriptionPlan,
  createCheckoutSession,
  createPlanPortalAction,
  createPortalSession,
  getSubscriptionPaymentAction,
  StaleScheduledPlanChangeError,
  type SubscriptionTier,
} from "../api";
import { DISCORD_INVITE_URL } from "../lib/links";
import { useAccountStatus } from "../queries/useAccountStatus";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const MICROCENTS_PER_DOLLAR = 100_000_000;
const CHECKOUT_BLOCKING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);
const tiers: {
  id: SubscriptionTier;
  fee: number;
  monthlyCredits: number;
  discount: number | null;
}[] = [
  { id: "casual", fee: 5, monthlyCredits: 5, discount: null },
  { id: "enthusiast", fee: 10, monthlyCredits: 10, discount: 25 },
  { id: "legend", fee: 15, monthlyCredits: 15, discount: 37.5 },
];

function formatDollars(microcents: number): string {
  return `$${(microcents / MICROCENTS_PER_DOLLAR).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const {
    data: status,
    isLoading: statusLoading,
    isFetching: statusFetching,
    refetch: refetchStatus,
  } = useAccountStatus();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{
    action: "upgrade" | "cancel" | "downgrade" | "undo";
    tier?: SubscriptionTier;
  } | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadline = useRef<number | null>(null);
  const hostedReturnPending = useRef(false);
  const hostedWindowBlurred = useRef(false);
  const subscribed = status?.subscriptionTier !== null && status?.subscriptionTier !== undefined;
  const highlightedTier = subscribed ? status?.subscriptionTier : "enthusiast";
  const hasSubscription = !!status?.subscription;
  const rawSubscriptionStatus = status?.subscription?.status;
  const checkoutBlockedBySubscription =
    hasSubscription &&
    (CHECKOUT_BLOCKING_STATUSES.has(status?.billingStatus.toLowerCase() ?? "") ||
      (typeof rawSubscriptionStatus === "string" &&
        CHECKOUT_BLOCKING_STATUSES.has(rawSubscriptionStatus.toLowerCase())));
  const refreshing = statusFetching;
  const run = async (operation: () => Promise<void>) => {
    setWorking(true);
    setMessage("");
    try {
      await operation();
    } catch (err) {
      console.error("Billing action failed:", err);
      setMessage(
        err instanceof StaleScheduledPlanChangeError
          ? t("account.scheduledPlanChanged")
          : t("account.actionFailed"),
      );
    } finally {
      setWorking(false);
    }
  };
  const refresh = useCallback(async () => {
    await refetchStatus();
  }, [refetchStatus]);
  const startHostedPolling = useCallback(() => {
    pollDeadline.current = Date.now() + 60_000;
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (pollTimeout.current) clearTimeout(pollTimeout.current);
    pollInterval.current = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    pollTimeout.current = setTimeout(() => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = null;
      pollTimeout.current = null;
      pollDeadline.current = null;
    }, 60_000);
  }, [refresh]);
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") {
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = null;
        return;
      }
      void refresh();
      if (hostedReturnPending.current && hostedWindowBlurred.current) {
        hostedReturnPending.current = false;
        hostedWindowBlurred.current = false;
        startHostedPolling();
      } else if (
        pollDeadline.current &&
        Date.now() < pollDeadline.current &&
        !pollInterval.current
      ) {
        pollInterval.current = setInterval(() => {
          if (document.visibilityState === "visible") void refresh();
        }, 10_000);
      }
    };
    const noteHostedWindowBlur = () => {
      if (hostedReturnPending.current) hostedWindowBlurred.current = true;
    };
    window.addEventListener("blur", noteHostedWindowBlur);
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("blur", noteHostedWindowBlur);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
  }, [refresh, startHostedPolling]);
  const openHostedBilling = async (url: string) => {
    hostedReturnPending.current = true;
    hostedWindowBlurred.current = false;
    try {
      await window.electronAPI.shellOpenExternal(url);
      startHostedPolling();
    } catch (error) {
      hostedReturnPending.current = false;
      hostedWindowBlurred.current = false;
      throw error;
    }
  };
  const manage = () =>
    run(async () => {
      const url = await createPortalSession();
      await openHostedBilling(url);
    });
  const scheduled =
    status?.scheduledTier && status.scheduledChangeAt
      ? { tier: status.scheduledTier, changeAt: status.scheduledChangeAt }
      : undefined;
  const openPlanPortal = (action: "upgrade" | "cancel", tier?: SubscriptionTier) =>
    run(async () => {
      try {
        const url = await createPlanPortalAction(action, tier, scheduled);
        await refresh();
        await openHostedBilling(url);
      } catch (error) {
        try {
          await refresh();
        } catch (refreshError) {
          console.error("Failed to refresh account after billing action:", refreshError);
        }
        throw error;
      }
    });
  const confirmAction = () => {
    const choice = confirmation;
    setConfirmation(null);
    if (!choice) return;
    if (choice.action === "upgrade" || choice.action === "cancel") {
      void openPlanPortal(choice.action, choice.tier);
    } else if (choice.action === "downgrade" || choice.action === "undo") {
      const action = choice.action;
      void run(async () => {
        await changeSubscriptionPlan(action, choice.tier);
        await refresh();
        startHostedPolling();
      });
    }
  };
  const tierAction = (tier: SubscriptionTier) =>
    run(async () => {
      if (status?.scheduledTier === tier) {
        setConfirmation({ action: "undo" });
      } else if (!subscribed && checkoutBlockedBySubscription) {
        const url = await createPortalSession();
        await openHostedBilling(url);
      } else if (!subscribed) {
        const url = await createCheckoutSession(tier);
        await openHostedBilling(url);
      } else {
        const current = status?.subscriptionTier ?? "casual";
        setConfirmation({
          action:
            ["casual", "enthusiast", "legend"].indexOf(tier) >
            ["casual", "enthusiast", "legend"].indexOf(current)
              ? "upgrade"
              : "downgrade",
          tier,
        });
      }
    });

  const removingSchedule =
    !!scheduled && (confirmation?.action === "upgrade" || confirmation?.action === "cancel");
  const confirmationTitle = removingSchedule
    ? "account.removeDowngradeTitle"
    : confirmation?.action === "downgrade"
      ? "account.downgradeTitle"
      : confirmation?.action === "undo"
        ? "account.undoTitle"
        : confirmation?.action === "cancel"
          ? "account.cancelTitle"
          : "account.upgradeTitle";
  const confirmationDescription =
    removingSchedule && scheduled
      ? t("account.removeDowngradeDescription", {
          tier: t(`account.tiers.${scheduled.tier}.name`),
          date: formatDate(scheduled.changeAt),
        })
      : confirmation?.action === "downgrade"
        ? t("account.downgradeDescription", {
            tier: t(`account.tiers.${confirmation.tier}.name`),
            date: status?.paidThroughAt ? formatDate(status.paidThroughAt) : "",
          })
        : confirmation?.action === "undo"
          ? t("account.undoDescription", {
              tier: scheduled ? t(`account.tiers.${scheduled.tier}.name`) : "",
            })
          : confirmation?.action === "cancel"
            ? t("account.cancelDescription")
            : t("account.upgradeDescription", {
                tier: confirmation?.tier ? t(`account.tiers.${confirmation.tier}.name`) : "",
              });

  const comparisonRows: {
    label: string;
    value: (tier: (typeof tiers)[number]) => string;
    monthlyPrice?: boolean;
  }[] = [
    { label: "account.comparisonMonthly", value: (tier) => `$${tier.fee}`, monthlyPrice: true },
    {
      label: "account.comparisonUsage",
      value: (tier) => t(`account.tiers.${tier.id}.exampleUsage`),
    },
    {
      label: "account.comparisonCached",
      value: (tier) => t(tier.id === "casual" ? "account.usesCredits" : "account.unlimitedFree"),
    },
    {
      label: "account.comparisonDynamic",
      value: (tier) =>
        tier.discount === null
          ? t("account.standardRates")
          : t("account.discountValue", {
              percent: new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
                style: "percent",
                maximumFractionDigits: 1,
              }).format(tier.discount / 100),
            }),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.description")}</p>
        </div>
        <Badge className={subscribed ? "bg-accent/15 text-accent border-accent/20" : ""}>
          {subscribed
            ? t(`account.tiers.${status?.subscriptionTier}.name`)
            : checkoutBlockedBySubscription
              ? t("account.subscriptionNeedsManagement")
              : t("account.fallbackTier")}
        </Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glow-border">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="size-6 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("account.creditBalance")}
                </p>
                <p className="font-display text-3xl font-bold">
                  {statusLoading ? "..." : formatDollars(status?.balance ?? 0)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refresh}
              disabled={refreshing}
              aria-label={t("account.refreshCreditBalance")}
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              {t("account.billingDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!subscribed && !checkoutBlockedBySubscription && (
              <p className="text-muted-foreground">{t("account.notSubscribed")}</p>
            )}
            {(subscribed || checkoutBlockedBySubscription) && (
              <p>
                {t("account.billingStatus")}: <strong>{status?.billingStatus}</strong>
              </p>
            )}
            {status &&
              ["past_due", "unpaid", "incomplete"].includes(status.billingStatus.toLowerCase()) && (
                <p role="status" className="text-destructive">
                  {t("account.billingActionRequired", { status: status.billingStatus })}
                </p>
              )}
            {status?.billingStatus.toLowerCase() === "trialing" && (
              <p role="status">{t("account.trialingStatus")}</p>
            )}
            {subscribed && (
              <p>
                {t("account.paidThrough")}:{" "}
                <strong>
                  {status?.paidThroughAt
                    ? formatDate(status.paidThroughAt)
                    : t("account.notSubscribed")}
                </strong>
              </p>
            )}
            {status?.cancellationScheduled && (
              <p>
                {t("account.cancelsOn", {
                  date: status.paidThroughAt ? formatDate(status.paidThroughAt) : "",
                })}
              </p>
            )}
            {status?.scheduledTier && (
              <p>
                {t("account.scheduledChange", {
                  tier: t(`account.tiers.${status.scheduledTier}.name`),
                  date: status.scheduledChangeAt ? formatDate(status.scheduledChangeAt) : "",
                })}
              </p>
            )}
            {status?.pendingTier && (
              <div className="flex flex-wrap items-center gap-3">
                <p role="status">
                  {t("account.pendingPayment", {
                    tier: t(`account.tiers.${status.pendingTier}.name`),
                  })}
                </p>
                <Button
                  variant="outline"
                  disabled={working}
                  onClick={() =>
                    run(async () => {
                      const action = await getSubscriptionPaymentAction();
                      if (!action) {
                        setMessage(t("account.paymentActionNotFound"));
                        await refresh();
                        return;
                      }
                      await openHostedBilling(action.invoiceUrl);
                    })
                  }
                >
                  {t("account.completePayment")}
                </Button>
              </div>
            )}
            {hasSubscription && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={manage} disabled={working}>
                  {t("account.manageBilling")}
                </Button>
                {subscribed && !status?.cancellationScheduled && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmation({ action: "cancel" })}
                    disabled={working}
                  >
                    {t("account.endSubscription")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {!subscribed && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium">{t("account.tryBeforeSubscribing")}</p>
            <p className="text-sm text-muted-foreground">
              <Trans
                i18nKey="account.joinDiscordTrial"
                components={{
                  discord: (
                    <button
                      type="button"
                      onClick={() => window.electronAPI.shellOpenExternal(DISCORD_INVITE_URL)}
                      className="rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ),
                }}
              />
            </p>
          </CardContent>
        </Card>
      )}
      <section aria-label={t("account.tierLabel")} className="space-y-2">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-[22%] px-3 py-3" />
                  {tiers.map((tier) => (
                    <th
                      key={tier.id}
                      scope="col"
                      className={`w-[26%] px-3 py-3 font-display text-lg font-semibold text-foreground ${tier.id === highlightedTier ? "bg-accent/10" : ""}`}
                    >
                      <span className="flex items-center gap-1.5 leading-tight">
                        {t(`account.tiers.${tier.id}.name`)}
                      </span>
                      <span className="mt-1 block font-sans text-xs font-normal leading-snug text-muted-foreground">
                        {t(`account.tiers.${tier.id}.bestFor`)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ label, value, monthlyPrice }) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <th
                      scope="row"
                      className="px-3 py-2 align-top font-medium text-muted-foreground"
                    >
                      {t(label)}
                    </th>
                    {tiers.map((tier) => (
                      <td
                        key={tier.id}
                        className={`px-3 py-2 align-top font-medium text-foreground ${tier.id === highlightedTier ? "bg-accent/10" : ""}`}
                      >
                        {monthlyPrice ? (
                          <>
                            <span className="font-semibold">
                              {value(tier)}
                              {t("account.perMonth")}
                            </span>
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                              {t("account.monthlyCreditFootnote", {
                                amount: `$${tier.monthlyCredits}`,
                              })}
                            </span>
                          </>
                        ) : (
                          value(tier)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="px-3 py-2" />
                  {tiers.map((tier) => {
                    const current = subscribed && status?.subscriptionTier === tier.id;
                    const scheduled = status?.scheduledTier === tier.id;
                    return (
                      <td
                        key={tier.id}
                        className={`px-3 py-2 ${tier.id === highlightedTier ? "bg-accent/10" : ""}`}
                      >
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={working || !!status?.pendingTier || (current && !scheduled)}
                          onClick={() => tierAction(tier.id)}
                        >
                          {scheduled
                            ? t("account.undoChange")
                            : current
                              ? subscribed
                                ? t("account.currentPlan")
                                : t("account.casualTier")
                              : subscribed
                                ? t("account.selectPlan")
                                : checkoutBlockedBySubscription
                                  ? t("account.manageBilling")
                                  : t("account.subscribe")}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          {t("account.usageFootnote")}
        </p>
      </section>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !working) setConfirmation(null);
        }}
      >
        <DialogContent showCloseButton={!working}>
          <DialogHeader>
            <DialogTitle>{t(confirmationTitle)}</DialogTitle>
            <DialogDescription>{confirmationDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(null)} disabled={working}>
              {t("account.notNow")}
            </Button>
            <Button onClick={confirmAction} disabled={working}>
              {removingSchedule
                ? t("account.removeAndContinue")
                : confirmation?.action === "upgrade" || confirmation?.action === "cancel"
                  ? t("account.continueToStripe")
                  : t("account.confirmChange")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
