import type { CaseOutcome, PartyRole } from "@/data/mockData";

export type CompanyCaseResult = "won" | "lost" | "in_work" | "no_decision" | "third_party";

export type CaseResultInput = {
  partyRole: PartyRole;
  outcome: CaseOutcome;
};

export type CompanyResultSummary = {
  claimsTotal: number;
  won: number;
  lost: number;
  inWork: number;
  noDecision: number;
  thirdParty: number;
  winRate: number | null;
};

const SATISFIED_OUTCOMES: CaseOutcome[] = ["fully_satisfied", "partially_satisfied"];

/** Взаимоисключающий результат дела с позиции КТЖ. */
export function getCompanyCaseResult({ partyRole, outcome }: CaseResultInput): CompanyCaseResult {
  if (partyRole === "third_party") return "third_party";
  if (outcome === "pending") return "in_work";

  if (partyRole === "plaintiff") {
    if (SATISFIED_OUTCOMES.includes(outcome) || outcome === "settled") return "won";
    if (outcome === "denied") return "lost";
    return "no_decision";
  }

  if (outcome === "denied") return "won";
  if (SATISFIED_OUTCOMES.includes(outcome) || outcome === "settled") return "lost";
  return "no_decision";
}

export function summarizeCompanyResults(cases: CaseResultInput[]): CompanyResultSummary {
  const summary: CompanyResultSummary = {
    claimsTotal: 0,
    won: 0,
    lost: 0,
    inWork: 0,
    noDecision: 0,
    thirdParty: 0,
    winRate: null,
  };

  for (const item of cases) {
    const result = getCompanyCaseResult(item);
    if (result === "third_party") {
      summary.thirdParty += 1;
      continue;
    }

    summary.claimsTotal += 1;
    if (result === "won") summary.won += 1;
    else if (result === "lost") summary.lost += 1;
    else if (result === "in_work") summary.inWork += 1;
    else summary.noDecision += 1;
  }

  const completed = summary.won + summary.lost;
  summary.winRate = completed > 0 ? Math.round((summary.won / completed) * 1000) / 10 : null;
  return summary;
}
