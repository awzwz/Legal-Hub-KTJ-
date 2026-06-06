import { useMemo, useState } from "react";
import { formatAmountShort, getLawyerStats, caseTypeLabels, mergeBranchDirectory, getBranchNamesFromCases, getFilteredCasesForUser, canViewAllBranches, isRealBranchNameForStats } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { useLawyerDirectory } from "@/hooks/useLawyerDirectory";
import { useBranchesNames } from "@/hooks/useBranchesNames";
import LawyerRatingHelp from "@/components/dashboard/LawyerRatingHelp";
import { motion } from "framer-motion";
import { CalendarRange, Eye } from "lucide-react";
import { DonutWithLegend } from "@/components/ui/donut-with-legend";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCompanyCaseResult, type CompanyCaseResult } from "@/lib/companyCaseResult";

type AnalyticsYear = "2026" | "2025" | "all";
type AnalyticsPeriod = "full" | "q1" | "q2" | "q3" | "q4";
type BranchSort = "total" | CompanyCaseResult;

const yearLabels: Record<AnalyticsYear, string> = {
  "2026": "2026",
  "2025": "2025",
  all: "Все годы",
};

const periodLabels: Record<AnalyticsPeriod, string> = {
  full: "Весь год",
  q1: "Q1 (январь–март)",
  q2: "Q2 (апрель–июнь)",
  q3: "Q3 (июль–сентябрь)",
  q4: "Q4 (октябрь–декабрь)",
};

const quarterMonths: Record<"q1" | "q2" | "q3" | "q4", [number, number]> = {
  q1: [0, 2],
  q2: [3, 5],
  q3: [6, 8],
  q4: [9, 11],
};

const AnalyticsPage = () => {
  const { user } = useCurrentUser();
  const allCases = useCases();
  const userCasesAll = getFilteredCasesForUser(user, allCases);
  const apiBranchNames = useBranchesNames();
  const canViewAll = canViewAllBranches(user);

  // Год + Период (общий фильтр для всех графиков на странице).
  const [year, setYearState] = useState<AnalyticsYear>("2026");
  const [period, setPeriod] = useState<AnalyticsPeriod>("full");
  const [branchSort, setBranchSort] = useState<BranchSort>("total");
  const [showEmptyBranches, setShowEmptyBranches] = useState(false);
  const setYear = (y: AnalyticsYear) => {
    setYearState(y);
    if (y === "all") setPeriod("full");
  };

  const userCases = useMemo(() => {
    let base = userCasesAll;
    if (year !== "all") {
      const y = Number(year);
      base = base.filter((c) => new Date(`${c.filingDate}T12:00:00`).getFullYear() === y);
    }
    if (year === "all" || period === "full") return base;
    const [m0, m1] = quarterMonths[period];
    return base.filter((c) => {
      const m = new Date(`${c.filingDate}T12:00:00`).getMonth();
      return m >= m0 && m <= m1;
    });
  }, [userCasesAll, year, period]);

  const lawyerDirectory = useLawyerDirectory(user, userCases);

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
        const results = cases.map(getCompanyCaseResult);
        return {
          branchFull: b,
          total: cases.length,
          won: results.filter((result) => result === "won").length,
          lost: results.filter((result) => result === "lost").length,
          in_work: results.filter((result) => result === "in_work").length,
          neutral: results.filter((result) => result === "neutral").length,
        };
      });
  }, [chartBranches, userCases]);

  const visibleBranchRows = useMemo(
    () =>
      branchCasesRows
        .filter((row) => showEmptyBranches || row.total > 0)
        .sort((a, b) => b[branchSort] - a[branchSort] || b.total - a.total || a.branchFull.localeCompare(b.branchFull, "ru")),
    [branchCasesRows, branchSort, showEmptyBranches],
  );

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Аналитика</h2>
          {!canViewAll && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs">
              <Eye className="w-3 h-3" />
              {user.branch} — ограниченный доступ
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            Показано дел: <b>{userCases.length}</b> из {userCasesAll.length}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarRange className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">Год:</span>
          <Select value={year} onValueChange={(v) => setYear(v as AnalyticsYear)}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(yearLabels) as AnalyticsYear[]).map((y) => (
                <SelectItem key={y} value={y}>{yearLabels[y]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-blue-700 font-medium ml-2">Период:</span>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}
            disabled={year === "all"}
          >
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(periodLabels) as AnalyticsPeriod[]).map((p) => (
                <SelectItem key={p} value={p}>{periodLabels[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Распределение по типам дел</h3>
          <DonutWithLegend data={typeData} centerLabel="всего дел" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Стороны в суде</h3>
          <DonutWithLegend data={roleData} centerLabel="всего дел" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Результат для компании по филиалам</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={branchSort} onValueChange={(value) => setBranchSort(value as BranchSort)}>
                <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Сортировка филиалов">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">По количеству дел</SelectItem>
                  <SelectItem value="won">По выигранным</SelectItem>
                  <SelectItem value="lost">По проигранным</SelectItem>
                  <SelectItem value="in_work">По делам в работе</SelectItem>
                  <SelectItem value="neutral">По нейтральным</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <Checkbox
                  checked={showEmptyBranches}
                  onCheckedChange={(checked) => setShowEmptyBranches(checked === true)}
                />
                Показывать без дел
              </label>
            </div>
          </div>
          {visibleBranchRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Нет дел с указанным филиалом</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="table-header px-4 py-3 text-left">Филиал</th>
                    <th className="table-header w-20 px-3 py-3 text-center">Всего</th>
                    <th className="table-header w-28 px-3 py-3 text-center">Выиграно</th>
                    <th className="table-header w-28 px-3 py-3 text-center">Проиграно</th>
                    <th className="table-header w-24 px-3 py-3 text-center">В работе</th>
                    <th className="table-header w-24 px-3 py-3 text-center">Нейтрально</th>
                    <th className="table-header w-[32%] min-w-[260px] px-4 py-3 text-left">Соотношение показателей</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBranchRows.map((row) => {
                    const wonWidth = row.total > 0 ? (row.won / row.total) * 100 : 0;
                    const lostWidth = row.total > 0 ? (row.lost / row.total) * 100 : 0;
                    const inWorkWidth = row.total > 0 ? (row.in_work / row.total) * 100 : 0;
                    const neutralWidth = row.total > 0 ? (row.neutral / row.total) * 100 : 0;

                    return (
                      <tr key={row.branchFull} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/35">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.branchFull}</td>
                        <td className="px-3 py-3 text-center font-semibold tabular-nums text-slate-900">{row.total}</td>
                        <td className="px-3 py-3 text-center font-medium tabular-nums text-emerald-700">{row.won}</td>
                        <td className="px-3 py-3 text-center font-medium tabular-nums text-red-700">{row.lost}</td>
                        <td className="px-3 py-3 text-center font-medium tabular-nums text-amber-700">{row.in_work}</td>
                        <td className="px-3 py-3 text-center font-medium tabular-nums text-slate-600">{row.neutral}</td>
                        <td className="px-4 py-3">
                          <div
                            className="flex h-3 w-full overflow-hidden rounded-sm bg-slate-100 ring-1 ring-inset ring-slate-200"
                            title={`Выиграно: ${row.won}; проиграно: ${row.lost}; в работе: ${row.in_work}; нейтрально: ${row.neutral}`}
                          >
                            {row.won > 0 && (
                              <span className="h-full bg-[hsl(142,71%,45%)]" style={{ width: `${wonWidth}%` }} />
                            )}
                            {row.lost > 0 && (
                              <span className="h-full bg-[hsl(0,72%,51%)]" style={{ width: `${lostWidth}%` }} />
                            )}
                            {row.in_work > 0 && (
                              <span className="h-full bg-[hsl(38,92%,50%)]" style={{ width: `${inWorkWidth}%` }} />
                            )}
                            {row.neutral > 0 && (
                              <span className="h-full bg-slate-400" style={{ width: `${neutralWidth}%` }} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(142,71%,45%)]" />
              Выиграно
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(0,72%,51%)]" />
              Проиграно
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(38,92%,50%)]" />
              В работе
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
              Нейтрально (третьи лица и прочие исходы)
            </span>
          </div>
        </motion.div>
      </div>

      {/* Lawyer efficiency table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card mt-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Рейтинг юристов</h3>
          <LawyerRatingHelp />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="table-header text-left px-4 py-3">#</th>
                <th className="table-header text-left px-4 py-3">Юрист</th>
                <th className="table-header text-center px-4 py-3">Балл</th>
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
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2 min-w-[220px]">
                      <span>{l.name}</span>
                      {!l.isActive && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Не работает
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-10 justify-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold tabular-nums text-blue-800">
                      {l.ratingScore}
                    </span>
                  </td>
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
