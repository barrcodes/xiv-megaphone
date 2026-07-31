import { useQuery } from "@tanstack/react-query";
import { getAccountStatus } from "../api";

export function useAccountStatus() {
  return useQuery({
    queryKey: ["account-status"],
    queryFn: getAccountStatus,
  });
}
