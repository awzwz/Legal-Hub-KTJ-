import { describe, expect, it } from "vitest";
import { getCompanyCaseResult } from "@/lib/companyCaseResult";

describe("getCompanyCaseResult", () => {
  it.each([
    ["fully_satisfied", "won"],
    ["partially_satisfied", "won"],
    ["settled", "won"],
    ["denied", "lost"],
    ["pending", "in_work"],
    ["dismissed", "neutral"],
    ["returned", "neutral"],
  ] as const)("classifies plaintiff outcome %s as %s", (outcome, expected) => {
    expect(getCompanyCaseResult({ partyRole: "plaintiff", outcome })).toBe(expected);
  });

  it.each([
    ["denied", "won"],
    ["fully_satisfied", "lost"],
    ["partially_satisfied", "lost"],
    ["settled", "lost"],
    ["pending", "in_work"],
    ["dismissed", "neutral"],
    ["returned", "neutral"],
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
  ] as const)("keeps third-party outcome %s neutral", (outcome) => {
    expect(getCompanyCaseResult({ partyRole: "third_party", outcome })).toBe("neutral");
  });
});
