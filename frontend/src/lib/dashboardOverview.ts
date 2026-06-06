import type { LegalCase, PartyRole } from "@/data/mockData";

export type DashboardOverviewKey = "all" | "won" | "lost" | "in_progress" | "settled";
export type DashboardOverviewRole = Extract<PartyRole, "plaintiff" | "defendant">;

const isInProgress = (legalCase: LegalCase) => {
  const note = (legalCase.litigation?.damageRecoveryNote || "").trim().toLowerCase();
  return legalCase.status === "execution" && note === "на исполнении";
};

export const getDashboardOverviewCases = (
  cases: LegalCase[],
  partyRole: DashboardOverviewRole,
  key: DashboardOverviewKey,
) => {
  const roleCases = cases.filter((legalCase) => legalCase.partyRole === partyRole);

  if (key === "all") return roleCases;
  if (key === "won") {
    return roleCases.filter(
      (legalCase) =>
        legalCase.outcome === "fully_satisfied" || legalCase.outcome === "partially_satisfied",
    );
  }
  if (key === "lost") {
    return roleCases.filter((legalCase) =>
      ["denied", "dismissed", "returned"].includes(legalCase.outcome),
    );
  }
  if (key === "settled") {
    return roleCases.filter((legalCase) => legalCase.outcome === "settled");
  }

  return roleCases.filter(isInProgress);
};
