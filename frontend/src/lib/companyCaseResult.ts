import type { CaseOutcome, PartyRole } from "@/data/mockData";

export type CompanyCaseResult = "won" | "lost" | "in_work" | "neutral";

type CaseResultInput = {
  partyRole: PartyRole;
  outcome: CaseOutcome;
};

const SATISFIED_OUTCOMES: CaseOutcome[] = ["fully_satisfied", "partially_satisfied"];

/** Взаимоисключающий результат дела с позиции КТЖ. */
export function getCompanyCaseResult({ partyRole, outcome }: CaseResultInput): CompanyCaseResult {
  if (partyRole === "third_party") return "neutral";
  if (outcome === "pending") return "in_work";

  if (partyRole === "plaintiff") {
    if (SATISFIED_OUTCOMES.includes(outcome) || outcome === "settled") return "won";
    if (outcome === "denied") return "lost";
    return "neutral";
  }

  if (outcome === "denied") return "won";
  if (SATISFIED_OUTCOMES.includes(outcome) || outcome === "settled") return "lost";
  return "neutral";
}
