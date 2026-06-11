import { supabase } from "./lib/supabase";
import { CreateStreamRequest } from "../shared/models";
import { env } from "../shared/env";

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export const createStream = async (request: CreateStreamRequest) => {
  console.log("Creating stream with request:", request, "Base URL:", env.VITE_BACKEND_URL);
  const res = await authFetch(`${env.VITE_BACKEND_URL}/tts/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Failed to create stream: ${res.status}`);
  }

  const { streamId }: { streamId: string } = await res.json();
  return streamId;
};

export async function streamAudio(
  streamId: string,
  abortController: AbortController,
) {
  console.log("Starting audio stream with ID:", streamId, "Base URL:", env.VITE_BACKEND_URL);
  const res = await authFetch(`${env.VITE_BACKEND_URL}/tts/stream/${streamId}`, {
    signal: abortController.signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch audio stream: ${res.status}`);
  }

  if (!res.body) {
    throw new Error("Failed to fetch audio stream: Response body is null");
  }

  return res.body.getReader();
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

export async function getUsageLog(
  limit = 20,
  offset = 0,
): Promise<{ entries: UsageEntry[] }> {
  const res = await authFetch(
    `${env.VITE_BACKEND_URL}/credits/usage?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch usage log: ${res.status}`);
  return res.json();
}

export interface AccountStatus {
  accountType: "free" | "premium" | "subscriber";
  balance: number;
  subscription: { status: string; current_period_end: string } | null;
}

export async function getAccountStatus(): Promise<AccountStatus> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/credits/status`);
  if (!res.ok) throw new Error(`Failed to fetch account status: ${res.status}`);
  return res.json();
}

export async function createCheckoutSession(
  mode: "payment" | "subscription",
): Promise<string> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/checkout?mode=${mode}`, {
    method: "POST",
  });
  if (!res.ok)
    throw new Error(`Failed to create checkout session: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export async function createPortalSession(): Promise<string> {
  const res = await authFetch(`${env.VITE_BACKEND_URL}/shop/portal`, {
    method: "POST",
  });
  if (!res.ok)
    throw new Error(`Failed to create portal session: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export interface PolicyData {
  content: string;
  version: string;
  versionId: string;
}

export async function getPolicy(
  policyId: "tos" | "privacy-policy",
): Promise<PolicyData> {
  const res = await fetch(`${env.VITE_BACKEND_URL}/policies/${policyId}`);
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