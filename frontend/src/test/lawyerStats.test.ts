import { describe, expect, it } from "vitest";
import { getLawyerStats, type LegalCase } from "@/data/mockData";

const makeCase = (
  id: string,
  partyRole: LegalCase["partyRole"],
  outcome: LegalCase["outcome"],
) => ({
  id,
  assignedLawyer: "Тестовый Юрист",
  assignedLawyerIsActive: true,
  partyRole,
  outcome,
  status: outcome === "pending" ? "active" : "closed",
  claimAmount: 1_000_000,
  riskLevel: "medium",
  daysOverdue: 0,
  filingDate: "2026-01-01",
  lastUpdated: "2026-02-01",
} as LegalCase);

describe("getLawyerStats company-result logic", () => {
  it("calculates lawyer figures from the company's perspective", () => {
    const cases = [
      makeCase("p-full", "plaintiff", "fully_satisfied"),
      makeCase("p-settled", "plaintiff", "settled"),
      makeCase("p-denied", "plaintiff", "denied"),
      makeCase("d-denied", "defendant", "denied"),
      makeCase("d-full", "defendant", "fully_satisfied"),
      makeCase("d-settled", "defendant", "settled"),
      makeCase("pending", "plaintiff", "pending"),
      makeCase("dismissed", "plaintiff", "dismissed"),
      makeCase("third", "third_party", "denied"),
    ];

    const [stats] = getLawyerStats(cases);

    expect(stats).toMatchObject({
      totalCases: 8,
      won: 3,
      lost: 3,
      active: 1,
      noDecision: 1,
      thirdParty: 1,
      decidedCases: 6,
      winRate: 50,
      totalAmount: 8_000_000,
    });
  });

  it("counts a defendant denial as a win and a defendant satisfaction as a loss", () => {
    const [stats] = getLawyerStats([
      makeCase("defendant-win", "defendant", "denied"),
      makeCase("defendant-loss", "defendant", "partially_satisfied"),
    ]);

    expect(stats.won).toBe(1);
    expect(stats.lost).toBe(1);
    expect(stats.winRate).toBe(50);
  });

  it("does not award rating volume for third-party cases", () => {
    const [stats] = getLawyerStats([
      makeCase("third-1", "third_party", "fully_satisfied"),
      makeCase("third-2", "third_party", "denied"),
    ]);

    expect(stats.totalCases).toBe(0);
    expect(stats.thirdParty).toBe(2);
    expect(stats.won).toBe(0);
    expect(stats.lost).toBe(0);
    expect(stats.ratingScore).toBe(0);
  });
});
