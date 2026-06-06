import { describe, expect, it } from "vitest";
import type { LegalCase } from "@/data/mockData";
import { defaultFilters } from "@/components/dashboard/CasesFilterBar";
import { getDashboardOverviewCases, type DashboardOverviewKey } from "@/lib/dashboardOverview";
import { filterCases } from "@/lib/filterCases";

const makeCase = (
  id: string,
  partyRole: LegalCase["partyRole"],
  outcome: LegalCase["outcome"],
  status: LegalCase["status"] = "closed",
  damageRecoveryNote = "",
) => ({
  id,
  partyRole,
  outcome,
  status,
  filingDate: "2026-02-01",
  litigation: { damageRecoveryNote },
} as LegalCase);

const cases = [
  makeCase("p-full", "plaintiff", "fully_satisfied"),
  makeCase("p-partial", "plaintiff", "partially_satisfied"),
  makeCase("p-denied", "plaintiff", "denied"),
  makeCase("p-dismissed", "plaintiff", "dismissed"),
  makeCase("p-returned", "plaintiff", "returned"),
  makeCase("p-settled", "plaintiff", "settled"),
  makeCase("p-execution", "plaintiff", "fully_satisfied", "execution", " На исполнении "),
  makeCase("p-other-execution", "plaintiff", "fully_satisfied", "execution", "Завершено"),
  makeCase("d-denied", "defendant", "denied"),
  makeCase("d-settled", "defendant", "settled"),
];

describe("dashboard overview drill-down", () => {
  it.each([
    ["all", ["p-full", "p-partial", "p-denied", "p-dismissed", "p-returned", "p-settled", "p-execution", "p-other-execution"]],
    ["won", ["p-full", "p-partial", "p-execution", "p-other-execution"]],
    ["lost", ["p-denied", "p-dismissed", "p-returned"]],
    ["settled", ["p-settled"]],
    ["in_progress", ["p-execution"]],
  ] as Array<[DashboardOverviewKey, string[]]>)(
    "uses the same plaintiff cases for the %s card and its drill-down",
    (key, expectedIds) => {
      const cardCases = getDashboardOverviewCases(cases, "plaintiff", key);
      expect(cardCases.map(({ id }) => id)).toEqual(expectedIds);

      const filtered = filterCases(
        {
          ...defaultFilters,
          year: "all",
          partyRole: "plaintiff",
          caseIdIn: cardCases.map(({ id }) => id),
        },
        cases,
      );
      expect(filtered.map(({ id }) => id)).toEqual(expectedIds);
    },
  );

  it("never mixes defendant cases into a plaintiff drill-down", () => {
    expect(getDashboardOverviewCases(cases, "defendant", "lost").map(({ id }) => id))
      .toEqual(["d-denied"]);
  });

  it("returns no cases when a zero-value card is opened", () => {
    expect(filterCases({ ...defaultFilters, year: "all", caseIdIn: [] }, cases)).toEqual([]);
  });
});
