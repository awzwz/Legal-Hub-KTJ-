import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiAuthHeaders } from "@/lib/api";

export type BranchRow = { id: string; name: string; city?: string };

async function fetchBranches(): Promise<BranchRow[]> {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";
  if (forceMock) return [];
  const res = await fetch("/api/v1/branches", { headers: apiAuthHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as BranchRow[];
}

/** Сырой реестр филиалов из `GET /api/v1/branches` (нужен id, name, city). */
export function useBranches(): BranchRow[] {
  const { data = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

/** Только названия филиалов (legacy callers, см. AnalyticsPage). */
export function useBranchesNames(): string[] {
  const data = useBranches();
  return useMemo(
    () => data.map((b) => b.name.trim()).filter(Boolean),
    [data],
  );
}
