import { useMemo } from "react";
import { formatAmountShort, getLawyerStats, caseTypeLabels, mergeBranchDirectory, getBranchNamesFromCases, getFilteredCasesForUser, canViewAllBranches, isRealBranchNameForStats } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { useLawyerDirectory } from "@/hooks/useLawyerDirectory";
import { useBranchesNames } from "@/hooks/useBranchesNames";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { DonutWithLegend } from "@/components/ui/donut-with-legend";

function pctLinear(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

function MetricBar({
  label,
  value,
  max,
  className,
  format,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
  format?: (n: number) => string;
}) {
  const pct = pctLinear(value, max);
  const shown = format ? format(value) : String(value);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="tabular-nums font-semibold text-slate-900">{shown}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-inset ring-slate-200/60">
        <div
          className={cn("h-full rounded-full transition-[width]", className)}
          style={{ width: `${pct}%`, minWidth: value > 0 ? "6px" : undefined }}
        />
      </div>
    </div>
  );
}

const AnalyticsPage = () => {
  const { user } = useCurrentUser();
  const allCases = useCases();
  const userCases = getFilteredCasesForUser(user, allCases);
  const lawyerDirectory = useLawyerDirectory(user, userCases);
  const apiBranchNames = useBranchesNames();
  const canViewAll = canViewAllBranches(user);

  const visibleBranches = useMemo(() => {
    if (canViewAll) return mergeBranchDirectory(apiBranchNames, userCases);
    return getBranchNamesFromCases(userCases);
  }, [canViewAll, apiBranchNames, userCases]);

  const chartBranches = useMemo(
    () => visibleBranches.filter((b) => isRealBranchNameForStats(b)),
    [visibleBranches],
  );

  const branchCasesRows = useMemo(() => {
    return chartBranches
      .map((b) => {
        const cases = userCases.filter((c) => c.branch === b);
        return {
          branchFull: b,
          total: cases.length,
          won: cases.filter(
            (c) => c.outcome === "fully_satisfied" || c.outcome === "partially_satisfied" || c.outcome === "settled",
          ).length,
          lost: cases.filter((c) => c.outcome === "denied" || c.outcome === "dismissed").length,
          active: cases.filter((c) => ["active", "mediation", "suspended", "execution"].includes(c.status)).length,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [chartBranches, userCases]);

  const maxWon = Math.max(1, ...branchCasesRows.map((r) => r.won));
  const maxLost = Math.max(1, ...branchCasesRows.map((r) => r.lost));
  const maxActive = Math.max(1, ...branchCasesRows.map((r) => r.active));

  // Cases by type
  const typeColors = ["hsl(38, 92%, 50%)", "hsl(200, 60%, 50%)", "hsl(0, 72%, 51%)", "hsl(25, 30%, 40%)", "hsl(280, 45%, 52%)", "hsl(142, 71%, 45%)", "hsl(220, 14%, 52%)", "hsl(180, 60%, 45%)"];
  const typeData = Object.entries(
    userCases.reduce((acc, c) => {
      acc[c.caseType] = (acc[c.caseType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count], i) => ({
    key: type,
    name: caseTypeLabels[type as keyof typeof caseTypeLabels] || type,
    value: count,
    color: typeColors[i % typeColors.length],
  }));

  // Party role distribution
  const roleColors = ["hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)"];
  const roleData = [
    { key: "plaintiff", name: "Истец", value: userCases.filter(c => c.partyRole === "plaintiff").length, color: roleColors[0] },
    { key: "defendant", name: "Ответчик", value: userCases.filter(c => c.partyRole === "defendant").length, color: roleColors[1] },
    { key: "third_party", name: "Третье лицо", value: userCases.filter(c => c.partyRole === "third_party").length, color: roleColors[2] },
  ];

  const lawyerStats = canViewAll ? getLawyerStats(userCases, lawyerDirectory) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Аналитика</h2>
        {!canViewAll && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs">
            <Eye className="w-3 h-3" />
            {user.branch} — ограниченный доступ
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Распределение по типам дел</h3>
          <DonutWithLegend data={typeData} centerLabel="всего дел" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Роль в суде</h3>
          <DonutWithLegend data={roleData} centerLabel="всего дел" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Дела по филиалам (удовлетворено / отказано / в работе)</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-2 mb-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(142,71%,45%)]" />
              Удовлетворено
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(0,72%,51%)]" />
              Отказано
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(38,92%,50%)]" />
              В работе
            </span>
          </div>
          {branchCasesRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Нет дел с указанным филиалом</p>
          ) : (
            <div className="max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain space-y-3 pr-2">
              {branchCasesRows.map((r) => (
                <div
                  key={r.branchFull}
                  className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold leading-snug text-slate-900 break-words">{r.branchFull}</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">Всего дел: {r.total}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricBar label="Удовлетворено" value={r.won} max={maxWon} className="bg-[hsl(142,71%,45%)]" />
                    <MetricBar label="Отказано" value={r.lost} max={maxLost} className="bg-[hsl(0,72%,51%)]" />
                    <MetricBar label="В работе" value={r.active} max={maxActive} className="bg-[hsl(38,92%,50%)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Lawyer efficiency table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card mt-4">
        <h3 className="text-sm font-semibold mb-4">Эффективность юристов</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="table-header text-left px-4 py-3">#</th>
                <th className="table-header text-left px-4 py-3">Юрист</th>
                <th className="table-header text-center px-4 py-3">Всего дел</th>
                <th className="table-header text-center px-4 py-3">Удовлетворено</th>
                <th className="table-header text-center px-4 py-3">Отказано</th>
                <th className="table-header text-center px-4 py-3">В работе</th>
                <th className="table-header text-center px-4 py-3">% удовлетворения</th>
                <th className="table-header text-center px-4 py-3">Ср. дней</th>
                <th className="table-header text-right px-4 py-3">Общая сумма</th>
              </tr>
            </thead>
            <tbody>
              {lawyerStats.map((l, i) => (
                <tr key={l.name} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 text-center">{l.totalCases}</td>
                  <td className="px-4 py-3 text-center text-success font-medium">{l.won}</td>
                  <td className="px-4 py-3 text-center text-overdue font-medium">{l.lost}</td>
                  <td className="px-4 py-3 text-center">{l.active}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${l.winRate}%` }} />
                      </div>
                      <span className="text-xs font-medium">{l.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{l.avgDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">{formatAmountShort(l.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;
