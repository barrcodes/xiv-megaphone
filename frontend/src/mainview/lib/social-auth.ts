import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type SocialProvider = Extract<Provider, "google" | "discord" | "twitch">;

const providerScopes: Partial<Record<SocialProvider, string>> = {
  google: "openid email profile",
  discord: "identify email",
  twitch: "user:read:email",
};

export async function signInWithProvider(provider: SocialProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: "https://megaphone.barr.codes/callback/auth/redirect",
      scopes: providerScopes[provider],
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("No OAuth URL returned");

  return data.url;
}
