import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";
import type { Claim, ClaimCreatePayload } from "@/lib/claims";

export interface ClaimsFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  counterpartyBin?: string;
  search?: string;
}

async function fetchClaims(filters: ClaimsFilters): Promise<Claim[]> {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.counterpartyBin) params.set("counterpartyBin", filters.counterpartyBin);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  const res = await fetch(`/api/v1/claims${qs ? `?${qs}` : ""}`, { headers: apiAuthHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as Claim[];
}

export function useClaims(filters: ClaimsFilters = {}) {
  return useQuery({
    queryKey: ["claims", filters],
    queryFn: () => fetchClaims(filters),
    staleTime: 30_000,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClaimCreatePayload) => {
      const res = await fetch("/api/v1/claims", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message || `Ошибка ${res.status}`);
      return body as Claim;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

export function useUpdateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ClaimCreatePayload> }) => {
      const res = await fetch(`/api/v1/claims/${id}`, {
        method: "PATCH",
        headers: apiJsonHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message || `Ошибка ${res.status}`);
      return body as Claim;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}

export function useDeleteClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/claims/${id}`, { method: "DELETE", headers: apiAuthHeaders() });
      if (!res.ok && res.status !== 204) throw new Error(`Ошибка ${res.status}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });
}
