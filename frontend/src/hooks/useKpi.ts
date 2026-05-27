import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";

export interface KpiOverview {
  year: number;
  plaintiff_total: number;
  plaintiff_won: number;
  kpi1_percent: number;
  defendant_lost_sum: number;
  ebitda: number | null;
  kpi2_percent: number | null;
  kpi2_threshold: number;
}

export interface KpiBranch {
  branch_id: string;
  branch_name: string;
  plaintiff_total: number;
  plaintiff_won: number;
  kpi1_percent: number;
  defendant_lost_sum: number;
  kpi2_percent: number | null;
}

const currentYear = () => new Date().getFullYear();

export function useKpiOverview(year?: number) {
  const y = year ?? currentYear();
  return useQuery({
    queryKey: ["kpi-overview", y],
    queryFn: async () => {
      const r = await fetch(`/api/v1/kpi/overview?year=${y}`, { headers: apiAuthHeaders() });
      if (!r.ok) throw new Error(`Ошибка ${r.status}`);
      return (await r.json()) as KpiOverview;
    },
    staleTime: 60_000,
  });
}

export function useKpiBranches(year?: number) {
  const y = year ?? currentYear();
  return useQuery({
    queryKey: ["kpi-branches", y],
    queryFn: async () => {
      const r = await fetch(`/api/v1/kpi/branches?year=${y}`, { headers: apiAuthHeaders() });
      if (!r.ok) return [] as KpiBranch[];
      return (await r.json()) as KpiBranch[];
    },
    staleTime: 60_000,
  });
}

export function useEbitda(year?: number) {
  const y = year ?? currentYear();
  return useQuery({
    queryKey: ["kpi-ebitda", y],
    queryFn: async () => {
      const r = await fetch(`/api/v1/kpi/ebitda?year=${y}`, { headers: apiAuthHeaders() });
      if (!r.ok) return { year: y, ebitda: null as number | null };
      return (await r.json()) as { year: number; ebitda: number | null };
    },
    staleTime: 60_000,
  });
}

export function useSetEbitda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { year: number; ebitda: number }) => {
      const r = await fetch(`/api/v1/kpi/ebitda`, {
        method: "PUT",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ year: vars.year, ebitda: vars.ebitda }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((b as { message?: string; detail?: string }).message
        || (b as { detail?: string }).detail || `Ошибка ${r.status}`);
      return b;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-overview"] });
      qc.invalidateQueries({ queryKey: ["kpi-branches"] });
      qc.invalidateQueries({ queryKey: ["kpi-ebitda"] });
    },
  });
}
