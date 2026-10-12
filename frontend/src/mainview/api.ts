import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { env } from "../shared/env";
import type { CreateStreamRequest } from "../shared/models";
import { supabase } from "./lib/supabase";
import { context, propagation, tracer } from "./telemetry";

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  for (const [key, value] of Object.entries(carrier)) {
    headers.set(key, value);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

interface CreateStreamResponse {
  streamId: string;
  gain: number;
}

export const createStream = async (request: CreateStreamRequest): Promise<CreateStreamResponse> => {
  return tracer.startActiveSpan("POST /tts/stream", { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttributes({
      "tts.provider": "inworld",
      "http.request.method": "POST",
      "http.route": "/tts/stream",
      "url.scheme": new URL(env.VITE_BACKEND_URL).protocol.replace(":", ""),
      "server.address": new URL(env.VITE_BACKEND_URL).hostname,
    });
    try {
      const res = await authFetch(`${env.VITE_BACKEND_URL}/tts/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      span.setAttribute("http.response.status_code", res.status);

      if (!res.ok) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.setAttribute("tts.outcome", "rejected");
        throw new Error(`Failed to create stream: ${res.status}`);
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute("tts.outcome", "created");

      return await res.json();
    } catch (err) {
      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      }
      throw err;
    } finally {
      span.end();
    }
  });
};

export async function streamAudio(streamId: string, abortController: AbortController) {
  return tracer.startActiveSpan(
    "GET /tts/stream/:streamId",
    { kind: SpanKind.CLIENT },
    async (span) => {
      span.setAttributes({
        "http.request.method": "GET",
        "http.route": "/tts/stream/:streamId",
        "url.scheme": new URL(env.VITE_BACKEND_URL).protocol.replace(":", ""),
        "server.address": new URL(env.VITE_BACKEND_URL).hostname,
        "tts.stream_id": streamId,
      });
      try {
        const res = await authFetch(`${env.VITE_BACKEND_URL}/tts/stream/${streamId}`, {
          signal: abortController.signal,
        });

        span.setAttribute("http.response.status_code", res.status);

        if (!res.ok) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw new Error(`Failed to fetch audio stream: ${res.status}`);
        }

        if (!res.body) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw new Error("Failed to fetch audio stream: Response body is null");
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute("tts.outcome", "streaming");

        return res.body.getReader();
      } catch (err) {
        if (err instanceof Error) {
          span.recordException(err);
          span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        }
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

export async function getBalance(): Promise<number> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/credits/balance`);
  if (!res.ok) throw new Error(`Failed to fetch balance: ${res.status}`);
  const { ttsBalance } = await res.json();
  return ttsBalance;
}

export interface UsageEntry {
  id: string;
  amount_microcents: number;
  currency: string;
  usage_type: string;
  description: string | null;
  created_at: string;
}

export async function getUsageLog(limit = 20, offset = 0): Promise<{ entries: UsageEntry[] }> {
  const res = await authFetch(
    `${env.VITE_BACKEND_URL}/credits/usage?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch usage log: ${res.status}`);
  return res.json();
}

export type SubscriptionTier = "casual" | "enthusiast" | "legend";

export class StaleScheduledPlanChangeError extends Error {
  readonly code = "SCHEDULED_PLAN_CHANGE_STALE";

  constructor() {
    super("Scheduled plan change is stale");
    this.name = "StaleScheduledPlanChangeError";
  }
}

export interface AccountStatus {
  balance: number;
  subscriptionTier: SubscriptionTier | null;
  effectiveUsageTier: SubscriptionTier;
  paidThroughAt: string | null;
  billingStatus: string;
  cancellationScheduled: boolean;
  scheduledTier: SubscriptionTier | null;
  scheduledChangeAt: string | null;
  pendingTier: SubscriptionTier | null;
  subscriptionCreditBalance: number;
  subscriptionCreditExpiresAt: string | null;
  permanentCreditBalance: number;
  otherCreditBalance: number;
  subscription: Record<string, unknown> | null;
}

export async function getAccountStatus(): Promise<AccountStatus> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/credits/status`);
  if (!res.ok) throw new Error(`Failed to fetch account status: ${res.status}`);
  return res.json();
}

export async function createCheckoutSession(tier: SubscriptionTier): Promise<string> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "subscription", tier }),
  });
  if (!res.ok) throw new Error(`Failed to create checkout session: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export async function changeSubscriptionPlan(
  action: "downgrade" | "undo",
  tier?: SubscriptionTier,
): Promise<{
  state: "paid" | "payment_required" | "pending" | "scheduled";
  pendingTier: SubscriptionTier | null;
  invoiceUrl: string | null;
  paymentIntentStatus: string | null;
}> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...(tier ? { tier } : {}) }),
  });
  if (!res.ok) throw new Error(`Failed to change subscription plan: ${res.status}`);
  return res.json();
}

export async function createPlanPortalAction(
  action: "upgrade" | "cancel",
  tier?: SubscriptionTier,
  scheduled?: { tier: SubscriptionTier; changeAt: string },
): Promise<string> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/plan/portal-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(tier ? { tier } : {}),
      ...(scheduled
        ? { expectedScheduledTier: scheduled.tier, expectedScheduledChangeAt: scheduled.changeAt }
        : {}),
    }),
  });
  if (!res.ok) {
    if (res.status === 409) {
      const responseBody: unknown = await res.json().catch(() => null);
      if (
        typeof responseBody === "object" &&
        responseBody !== null &&
        "code" in responseBody &&
        responseBody.code === "SCHEDULED_PLAN_CHANGE_STALE"
      ) {
        throw new StaleScheduledPlanChangeError();
      }
    }
    throw new Error(`Failed to open plan confirmation: ${res.status}`);
  }
  const { url } = await res.json();
  return url;
}

export async function getSubscriptionPaymentAction(): Promise<{
  state: "payment_required";
  pendingTier: SubscriptionTier;
  invoiceUrl: string;
  paymentIntentStatus: string | null;
} | null> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/plan/payment-action`);
  if (!res.ok) throw new Error(`Failed to retrieve subscription payment action: ${res.status}`);
  return res.json();
}

export async function createPortalSession(): Promise<string> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/portal`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to create portal session: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export interface PolicyData {
  content: string;
  version: string;
  versionId: string;
  language: string;
}

export async function getPolicy(
  language: string,
  policyId: "tos" | "privacy-policy",
): Promise<PolicyData> {
  const res = await fetch(`${env.VITE_BACKEND_URL}/policies/${language}/${policyId}`);
  if (!res.ok) throw new Error(`Failed to fetch policy: ${res.status}`);
  return res.json();
}

export async function checkPolicyStatus(): Promise<boolean> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/policies/status`);
  if (!res.ok) throw new Error(`Failed to check policy status: ${res.status}`);
  const { accepted } = await res.json();
  return accepted;
}

export async function acceptPolicies(
  tosVersionId: string,
  privacyPolicyVersionId: string,
): Promise<void> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/policies/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tosVersionId, privacyPolicyVersionId }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "Failed to accept policies");
  }
}
