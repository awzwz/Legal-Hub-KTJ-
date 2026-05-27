/** Типы и константы для раздела «Претензии». */

export type ClaimStatus = "collected" | "not_collected" | "offset" | "recalculation";

export const claimStatusLabels: Record<ClaimStatus, string> = {
  collected: "Взыскано",
  not_collected: "Не взыскано",
  offset: "Удержано в безакцептном порядке",
  recalculation: "Перерасчёт",
};

export const claimStatusShortLabels: Record<ClaimStatus, string> = {
  collected: "Взыскано",
  not_collected: "Не взыскано",
  offset: "Удержано безакц.",
  recalculation: "Перерасчёт",
};

export const claimStatusBadgeClass: Record<ClaimStatus, string> = {
  collected: "bg-green-100 text-green-700 border-green-200",
  not_collected: "bg-amber-100 text-amber-700 border-amber-200",
  offset: "bg-blue-100 text-blue-700 border-blue-200",
  recalculation: "bg-slate-100 text-slate-700 border-slate-200",
};

export interface ClaimCaseShort {
  id: string;
  caseNumber: string;
  status: string;
  partyRole: string;
}

export interface Claim {
  id: string;
  counterpartyName: string;
  counterpartyBIN: string | null;
  outgoingNumber: string;
  claimDate: string; // ISO YYYY-MM-DD
  subject: string;
  amount: number;
  status: ClaimStatus;
  statusDetail: string | null;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  assignedLawyerId: string | null;
  assignedLawyerName: string | null;
  caseId: string | null;
  case: ClaimCaseShort | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimCreatePayload {
  counterpartyName: string;
  counterpartyBIN?: string | null;
  outgoingNumber: string;
  claimDate: string;
  subject: string;
  amount: number;
  status: ClaimStatus;
  statusDetail?: string | null;
  notes?: string | null;
  branchId?: string | null;
  assignedLawyerId?: string | null;
  caseId?: string | null;
}
