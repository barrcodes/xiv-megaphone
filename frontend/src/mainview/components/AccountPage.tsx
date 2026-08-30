import { Clock, CreditCard, Crown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { createCheckoutSession, createPortalSession } from "../api";
import { DISCORD_INVITE_URL } from "../lib/links";
import { useAccountStatus } from "../queries/useAccountStatus";
import { useBalance } from "../queries/useBalance";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const MICROCENTS_PER_DOLLAR = 100_000_000;

function formatDollars(microcents: number): string {
  return `$${(microcents / MICROCENTS_PER_DOLLAR).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountPage() {
  const { t } = useTranslation();
  const {
    data: balance,
    isLoading: balanceLoading,
    isFetching: balanceFetching,
    refetch: refetchBalance,
  } = useBalance();
  const {
    data: accountStatus,
    isLoading: statusLoading,
    isFetching: statusFetching,
    refetch: refetchAccountStatus,
  } = useAccountStatus();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchaseCredits = async () => {
    setPurchasing(true);
    try {
      const url = await createCheckoutSession("payment");
      await window.electronAPI.shellOpenExternal(url);
    } catch (err) {
      console.error("Failed to create checkout session:", err);
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const url = await createCheckoutSession("subscription");
      await window.electronAPI.shellOpenExternal(url);
    } catch (err) {
      console.error("Failed to create subscription checkout:", err);
    } finally {
      setPurchasing(false);
    }
  };

  const handleManage = async () => {
    try {
      const url = await createPortalSession();
      await window.electronAPI.shellOpenExternal(url);
    } catch (err) {
      console.error("Failed to create portal session:", err);
    }
  };

  const loading = balanceLoading || statusLoading;
  const refreshing = balanceFetching || statusFetching;

  const handleRefresh = async () => {
    await Promise.all([refetchBalance(), refetchAccountStatus()]);
  };

  const accountTypeBadge = {
    free: <Badge variant="secondary">{t("account.free")}</Badge>,
    premium: (
      <Badge className="bg-primary/15 text-primary border-primary/20">{t("account.premium")}</Badge>
    ),
    subscriber: (
      <Badge className="bg-accent/15 text-accent border-accent/20">{t("account.subscriber")}</Badge>
    ),
  }[accountStatus?.accountType ?? "free"];

  const isSubscriber = accountStatus?.accountType === "subscriber";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.description")}</p>
        </div>
        {accountTypeBadge}
      </div>

      <Card className="glow-border animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("account.creditBalance")}
                </p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {loading ? "..." : formatDollars(balance ?? 0)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={t("account.refreshCreditBalance")}
              title={t("account.refreshCreditBalance")}
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
              <span className="sr-only">{t("account.refreshCreditBalance")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {accountStatus?.accountType === "free" && (
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <Crown className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("account.tryBeforeSubscribing")}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="account.joinDiscordTrial"
                    components={{
                      discord: (
                        <button
                          type="button"
                          onClick={() => window.electronAPI.shellOpenExternal(DISCORD_INVITE_URL)}
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {t("account.buyCredits")}
            </CardTitle>
            <CardDescription>{t("account.payAsYouGo")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePurchaseCredits} disabled={purchasing} className="w-full">
              {purchasing ? t("account.opening") : t("account.purchaseCredits")}
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="size-4 text-accent" />
              {t("account.subscription")}
            </CardTitle>
            {isSubscriber && accountStatus?.subscription && (
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="size-3" />
                {t("account.nextBilling", {
                  date: formatDate(accountStatus.subscription.current_period_end),
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isSubscriber ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("account.activeSubscription")}</p>
                <Button variant="outline" onClick={handleManage} className="w-full">
                  {t("account.manageSubscription")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("account.monthlyPrice")}</p>
                <Button
                  variant="outline"
                  onClick={handleSubscribe}
                  disabled={purchasing}
                  className="w-full"
                >
                  {purchasing ? t("account.opening") : t("account.subscribe")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
