import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { checkPolicyStatus } from "@/api";
import { PolicyAcceptanceDialog } from "@/components/PolicyAcceptanceDialog";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAuthState = useRef<boolean | null>(null);
  const [policiesAccepted, setPoliciesAccepted] = useState<boolean | null>(null);

  const checkPolicies = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (!currentSession) return;
    try {
      const accepted = await checkPolicyStatus();
      setPoliciesAccepted(accepted);
    } catch (err) {
      console.error("Failed to check policy acceptance:", err);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const normalizeSession = (session: Session | null) => {
      const expired =
        session?.expires_at != null && session.expires_at <= Date.now() / 1000;
      return expired ? null : session;
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!alive) return;
        const session = normalizeSession(nextSession);
        const authenticated = session != null;
        setSession(session);
        setLoading(false);
        if (lastAuthState.current !== authenticated) {
          lastAuthState.current = authenticated;
          window.electronAPI.setAuthState(authenticated);
        }
        if (authenticated) {
          checkPolicies();
        }
      },
    );

    const handleFocus = () => {
      checkPolicies();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkPolicies]);

  useEffect(() => {
    if (policiesAccepted === false) {
      window.electronAPI?.showPolicyDialog();
    }
  }, [policiesAccepted]);

  const handleAccepted = useCallback(() => {
    setPoliciesAccepted(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        setPoliciesAccepted(null);
      },
    }),
    [session, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PolicyAcceptanceDialog
        open={policiesAccepted === false}
        onAccepted={handleAccepted}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
