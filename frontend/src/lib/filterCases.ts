import { caseStatusGroup, type CaseStatus, type LegalCase } from "@/data/mockData";
import type { CaseFilters } from "@/components/dashboard/CasesFilterBar";

const quarterMonths: Record<"q1" | "q2" | "q3" | "q4", [number, number]> = {
  q1: [0, 2],
  q2: [3, 5],
  q3: [6, 8],
  q4: [9, 11],
};

export const filterCases = (filters: CaseFilters, sourceCases: LegalCase[]) =>
  sourceCases.filter((legalCase) => {
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matches =
        legalCase.caseNumber.toLowerCase().includes(query) ||
        legalCase.company.toLowerCase().includes(query) ||
        legalCase.companyBIN.includes(query) ||
        legalCase.assignedLawyer.toLowerCase().includes(query) ||
        legalCase.defendant.toLowerCase().includes(query) ||
        legalCase.plaintiff.toLowerCase().includes(query);
      if (!matches) return false;
    }
    if (filters.statusIn && filters.statusIn.length > 0) {
      if (!filters.statusIn.includes(legalCase.status)) return false;
    } else if (filters.status !== "all") {
      const targetGroup = caseStatusGroup[filters.status as CaseStatus];
      if (caseStatusGroup[legalCase.status] !== targetGroup) return false;
    }
    if (filters.outcomeIn && filters.outcomeIn.length > 0) {
      if (!filters.outcomeIn.includes(legalCase.outcome)) return false;
    } else if (filters.outcome !== "all" && legalCase.outcome !== filters.outcome) {
      return false;
    }
    if (
      filters.riskLevelIn &&
      filters.riskLevelIn.length > 0 &&
      !filters.riskLevelIn.includes(legalCase.riskLevel as "high" | "medium" | "low")
    ) {
      return false;
    }
    if (filters.caseIdIn !== undefined && !filters.caseIdIn.includes(legalCase.id)) return false;
    if (filters.courtInstance !== "all" && legalCase.courtInstance !== filters.courtInstance) return false;
    if (filters.caseType !== "all" && legalCase.caseType !== filters.caseType) return false;
    if (filters.partyRole !== "all" && legalCase.partyRole !== filters.partyRole) return false;
    if (
      filters.disputeCategory !== "all" &&
      (legalCase.disputeCategory ?? "procurement") !== filters.disputeCategory
    ) {
      return false;
    }
    if (filters.branch !== "all" && legalCase.branch !== filters.branch) return false;
    if (filters.lawyer !== "all" && legalCase.assignedLawyer !== filters.lawyer) return false;
    if (filters.overdueOnly && legalCase.daysOverdue === 0) return false;
    if (filters.claimAmountFrom !== "" && legalCase.claimAmount < Number(filters.claimAmountFrom)) return false;
    if (filters.claimAmountTo !== "" && legalCase.claimAmount > Number(filters.claimAmountTo)) return false;

    if (filters.year !== "all") {
      const filing = new Date(`${legalCase.filingDate}T12:00:00`);
      if (filing.getFullYear() !== Number(filters.year)) return false;
      if (filters.period !== "full") {
        const [firstMonth, lastMonth] = quarterMonths[filters.period];
        const filingMonth = filing.getMonth();
        if (filingMonth < firstMonth || filingMonth > lastMonth) return false;
      }
    }

    return true;
  });
