import { useEffect } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { queryClient } from "../lib/query-client";

export function useRefreshBalanceOnStream() {
  const debouncedRefresh = useDebounceCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["balance"] });
    queryClient.invalidateQueries({ queryKey: ["account-status"] });
  }, 5_000);

  useEffect(() => {
    const handler = () => debouncedRefresh();

    const cleanup = window.electronAPI.onCheckoutComplete((data) => {
      if (data.status === "success") {
        debouncedRefresh();
      }
    });

    window.addEventListener("xiv:stream-event", handler);
    return () => {
      window.removeEventListener("xiv:stream-event", handler);
      cleanup();
    };
  }, [debouncedRefresh]);
}
