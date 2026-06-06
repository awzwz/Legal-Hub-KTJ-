import { describe, expect, it } from "vitest";
import { getCompanyCaseResult, summarizeCompanyResults } from "@/lib/companyCaseResult";

describe("getCompanyCaseResult", () => {
  it.each([
    ["fully_satisfied", "won"],
    ["partially_satisfied", "won"],
    ["settled", "won"],
    ["denied", "lost"],
    ["pending", "in_work"],
    ["dismissed", "no_decision"],
    ["returned", "no_decision"],
  ] as const)("classifies plaintiff outcome %s as %s", (outcome, expected) => {
    expect(getCompanyCaseResult({ partyRole: "plaintiff", outcome })).toBe(expected);
  });

  it.each([
    ["denied", "won"],
    ["fully_satisfied", "lost"],
    ["partially_satisfied", "lost"],
    ["settled", "lost"],
    ["pending", "in_work"],
    ["dismissed", "no_decision"],
    ["returned", "no_decision"],
  ] as const)("classifies defendant outcome %s as %s", (outcome, expected) => {
    expect(getCompanyCaseResult({ partyRole: "defendant", outcome })).toBe(expected);
  });

  it.each([
    "fully_satisfied",
    "partially_satisfied",
    "settled",
    "denied",
    "pending",
    "dismissed",
    "returned",
  ] as const)("keeps third-party outcome %s separate", (outcome) => {
    expect(getCompanyCaseResult({ partyRole: "third_party", outcome })).toBe("third_party");
  });

  it("calculates X and win rate without third parties or unfinished cases", () => {
    const summary = summarizeCompanyResults([
      { partyRole: "plaintiff", outcome: "fully_satisfied" },
      { partyRole: "plaintiff", outcome: "settled" },
      { partyRole: "plaintiff", outcome: "denied" },
      { partyRole: "defendant", outcome: "denied" },
      { partyRole: "defendant", outcome: "fully_satisfied" },
      { partyRole: "defendant", outcome: "pending" },
      { partyRole: "plaintiff", outcome: "returned" },
      { partyRole: "third_party", outcome: "denied" },
    ]);

    expect(summary).toEqual({
      claimsTotal: 7,
      won: 3,
      lost: 2,
      inWork: 1,
      noDecision: 1,
      thirdParty: 1,
      winRate: 60,
    });
  });

  it("returns no win rate when there are no completed cases", () => {
    expect(summarizeCompanyResults([
      { partyRole: "plaintiff", outcome: "pending" },
      { partyRole: "third_party", outcome: "denied" },
    ]).winRate).toBeNull();
  });
});
