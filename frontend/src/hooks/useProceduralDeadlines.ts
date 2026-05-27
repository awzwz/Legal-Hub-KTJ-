import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";
import type { ProceduralDeadline, ProceduralDeadlineCreate } from "@/lib/proceduralKinds";

export interface DeadlineFilters {
  caseId?: string;
  overdueOnly?: boolean;
  dueWithinDays?: number;
}

export function useProceduralDeadlines(filters: DeadlineFilters = {}) {
  const params = new URLSearchParams();
  if (filters.caseId) params.set("caseId", filters.caseId);
  if (filters.overdueOnly) params.set("overdueOnly", "true");
  if (filters.dueWithinDays !== undefined) params.set("dueWithinDays", String(filters.dueWithinDays));
  const qs = params.toString();
  return useQuery({
    queryKey: ["procedural-deadlines", filters],
    queryFn: async () => {
      const r = await fetch(`/api/v1/procedural-deadlines${qs ? `?${qs}` : ""}`, { headers: apiAuthHeaders() });
      if (!r.ok) return [] as ProceduralDeadline[];
      return (await r.json()) as ProceduralDeadline[];
    },
    staleTime: 30_000,
  });
}

export function useCreateDeadline(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProceduralDeadlineCreate) => {
      const r = await fetch(`/api/v1/cases/${caseId}/deadlines`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify(payload),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((b as { message?: string; detail?: string }).message
        || (b as { detail?: string }).detail || `Ошибка ${r.status}`);
      return b as ProceduralDeadline;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedural-deadlines"] });
    },
  });
}

export function useUpdateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; payload: Partial<ProceduralDeadlineCreate> & { completedAt?: string | null } }) => {
      const r = await fetch(`/api/v1/deadlines/${vars.id}`, {
        method: "PATCH",
        headers: apiJsonHeaders(),
        body: JSON.stringify(vars.payload),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((b as { message?: string; detail?: string }).message
        || (b as { detail?: string }).detail || `Ошибка ${r.status}`);
      return b as ProceduralDeadline;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedural-deadlines"] });
    },
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/deadlines/${id}`, { method: "DELETE", headers: apiAuthHeaders() });
      if (!r.ok && r.status !== 204) throw new Error(`Ошибка ${r.status}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedural-deadlines"] });
    },
  });
}
