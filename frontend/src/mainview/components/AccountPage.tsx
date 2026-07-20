import { Clock, CreditCard, Crown } from "lucide-react";
import { useState } from "react";
import { createCheckoutSession, createPortalSession } from "../api";
import { useAccountStatus } from "../queries/useAccountStatus";
import { useBalance } from "../queries/useBalance";
import { Badge } from "./ui/badge";
import { DISCORD_INVITE_URL } from "../lib/links";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

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
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: accountStatus, isLoading: statusLoading } = useAccountStatus();
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

  const accountTypeBadge = {
    free: <Badge variant="secondary">Free</Badge>,
    premium: (
      <Badge className="bg-primary/15 text-primary border-primary/20">
        Premium
      </Badge>
    ),
    subscriber: (
      <Badge className="bg-accent/15 text-accent border-accent/20">
        Subscriber
      </Badge>
    ),
  }[accountStatus?.accountType ?? "free"];

  const isSubscriber = accountStatus?.accountType === "subscriber";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your credits and subscription.
          </p>
        </div>
        {accountTypeBadge}
      </div>

      <Card
        className="glow-border animate-fade-in-up"
        style={{ animationDelay: "0.05s" }}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Credit Balance
              </p>
              <p className="font-display text-3xl font-bold text-foreground">
                {loading ? "..." : formatDollars(balance ?? 0)}
              </p>
            </div>
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
                  Want to try before subscribing?
                </p>
                <p className="text-sm text-muted-foreground">
                  Join our{" "}
                  <button
                    type="button"
                    onClick={() =>
                      window.electronAPI.shellOpenExternal(DISCORD_INVITE_URL)
                    }
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Discord
                  </button>{" "}
                  and ask for a limited trial.
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
              Buy Credits
            </CardTitle>
            <CardDescription>
              Pay-as-you-go with no subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePurchaseCredits}
              disabled={purchasing}
              className="w-full"
            >
              {purchasing ? "Opening..." : "Purchase Credits"}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="animate-fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="size-4 text-accent" />
              Subscription
            </CardTitle>
            {isSubscriber && accountStatus?.subscription && (
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="size-3" />
                Next billing:{" "}
                {formatDate(accountStatus.subscription.current_period_end)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isSubscriber ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Active subscription. Credits refresh monthly.
                </p>
                <Button
                  variant="outline"
                  onClick={handleManage}
                  className="w-full"
                >
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  $10/month for monthly credit refresh.
                </p>
                <Button
                  variant="outline"
                  onClick={handleSubscribe}
                  disabled={purchasing}
                  className="w-full"
                >
                  {purchasing ? "Opening..." : "Subscribe $10/mo"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
