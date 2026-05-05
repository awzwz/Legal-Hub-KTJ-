import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LegalCase, User } from "@/data/mockData";
import { canViewAllBranches } from "@/data/mockData";
import { availableUsers } from "@/data/offlineUsers";
import type { ApiUserRow } from "@/hooks/useApiUsers";
import { apiAuthHeaders } from "@/lib/api";

const LAWYER_PICKER_ROLES = new Set<ApiUserRow["role"]>(["branch_lawyer", "chief_lawyer"]);

async function fetchActiveUsers(): Promise<ApiUserRow[]> {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";
  if (forceMock) {
    return availableUsers.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      branch: u.branch,
      email: u.email,
    }));
  }
  const res = await fetch("/api/v1/users", { headers: apiAuthHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as ApiUserRow[];
}

function lawyerNamesFromApiForUser(user: User, rows: ApiUserRow[]): string[] {
  const lawyerRows = rows.filter((r) => LAWYER_PICKER_ROLES.has(r.role));
  if (canViewAllBranches(user)) {
    return lawyerRows.map((r) => r.name.trim()).filter(Boolean);
  }
  if (user.role === "branch_lawyer" && user.branch) {
    return lawyerRows
      .filter((r) => r.branch === user.branch || r.role === "chief_lawyer")
      .map((r) => r.name.trim())
      .filter(Boolean);
  }
  return [];
}

/** Активные юристы из БД (с учётом роли текущего пользователя) + любые ФИО из видимых дел. */
export function buildLawyerDirectory(user: User, apiRows: ApiUserRow[], cases: LegalCase[]): string[] {
  const set = new Set(lawyerNamesFromApiForUser(user, apiRows));
  for (const c of cases) {
    const n = c.assignedLawyer?.trim();
    if (n) set.add(n);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

export function useLawyerDirectory(user: User, cases: LegalCase[]) {
  const { data: apiRows = [] } = useQuery({
    queryKey: ["users", "active"],
    queryFn: fetchActiveUsers,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(() => buildLawyerDirectory(user, apiRows, cases), [user, apiRows, cases]);
}
