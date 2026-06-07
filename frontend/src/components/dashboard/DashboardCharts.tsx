import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { caseStatusLabels, disputeCategoryLabels, formatAmountShort, getLawyerStats, canViewLawyerStats, canViewAllBranches, isRealBranchNameForStats, normalizeBranchName, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { motion } from "framer-motion";
import { Trophy, Award, Medal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { DonutWithLegend } from "@/components/ui/donut-with-legend";
import { useKpiBranches } from "@/hooks/useKpi";

const statusColors: Record<string, string> = {
  active: "hsl(38, 92%, 50%)",
  mediation: "hsl(45, 90%, 48%)",
  suspended: "hsl(220, 14%, 46%)",
  won: "hsl(142, 71%, 45%)",
  lost: "hsl(0, 72%, 51%)",
  appeal: "hsl(25, 30%, 40%)",
  cassation: "hsl(25, 20%, 55%)",
  execution: "hsl(200, 60%, 50%)",
  closed: "hsl(142, 71%, 42%)",
};

/** Палитра для горизонтального графика по филиалам (различимые оттенки). */
const BRANCH_BAR_PALETTE = [
  "hsl(210, 78%, 52%)",
  "hsl(160, 58%, 40%)",
  "hsl(280, 45%, 52%)",
  "hsl(24, 88%, 52%)",
  "hsl(195, 85%, 45%)",
  "hsl(330, 65%, 50%)",
  "hsl(145, 50%, 42%)",
  "hsl(40, 90%, 48%)",
  "hsl(265, 55%, 55%)",
  "hsl(12, 76%, 52%)",
];

function branchChartLabel(full: string, maxLen = 36): string {
  const t = full.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

const wonOutcomes = ["fully_satisfied", "partially_satisfied", "settled"] as const;
const lostOutcomes = ["denied", "dismissed"] as const;
const activeStatuses = ["active", "mediation", "suspended", "execution"] as const;

function buildMonthlyTrend(cases: LegalCase[], year?: number) {
  // Если задан year — показываем все 12 месяцев этого года.
  // Если не задан (Все годы) — последние 6 месяцев от сегодня.
  const rows: { month: string; won: number; lost: number; active: number }[] = [];
  if (year != null) {
    for (let mo = 0; mo < 12; mo++) {
      const ref = new Date(year, mo, 1);
      const labelRaw = ref.toLocaleDateString("ru-RU", { month: "short" });
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
      const slice = cases.filter((c) => {
        const fd = new Date(`${c.filingDate}T12:00:00`);
        return fd.getFullYear() === year && fd.getMonth() === mo;
      });
      const won = slice.filter((c) => (wonOutcomes as readonly string[]).includes(c.outcome)).length;
      const lost = slice.filter((c) => (lostOutcomes as readonly string[]).includes(c.outcome)).length;
      const active = slice.filter((c) => (activeStatuses as readonly string[]).includes(c.status)).length;
      rows.push({ month: label, won, lost, active });
    }
    return rows;
  }
  // Старое поведение: последние 6 месяцев от текущей даты.
  const end = new Date();
  for (let m = 5; m >= 0; m--) {
    const ref = new Date(end.getFullYear(), end.getMonth() - m, 1);
    const y = ref.getFullYear();
    const mo = ref.getMonth();
    const labelRaw = ref.toLocaleDateString("ru-RU", { month: "short" });
    const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
    const slice = cases.filter((c) => {
      const fd = new Date(`${c.filingDate}T12:00:00`);
      return fd.getFullYear() === y && fd.getMonth() === mo;
    });
    const won = slice.filter((c) => (wonOutcomes as readonly string[]).includes(c.outcome)).length;
    const lost = slice.filter((c) => (lostOutcomes as readonly string[]).includes(c.outcome)).length;
    const active = slice.filter((c) => (activeStatuses as readonly string[]).includes(c.status)).length;
    rows.push({ month: label, won, lost, active });
  }
  return rows;
}

const DashboardCharts = ({ cases, year }: { cases?: LegalCase[]; year?: number }) => {
  const { user } = useCurrentUser();
  const userCases = cases ?? [];
  const monthlyTrend = useMemo(() => buildMonthlyTrend(userCases, year), [userCases, year]);
  const canViewAll = canViewAllBranches(user);
  const showLawyerStats = canViewLawyerStats(user);
  const showMonthlyTrend = year === 2026;

  const DISPUTE_COLORS: Record<string, string> = {
    procurement: "hsl(210, 78%, 52%)",
    transportation: "hsl(38, 92%, 50%)",
    government: "hsl(180, 60%, 45%)",
    labor: "hsl(142, 71%, 45%)",
    other: "hsl(220, 14%, 52%)",
    mediation: "hsl(280, 45%, 52%)",
    third_party: "hsl(330, 70%, 55%)",
  };

  // Короткие подписи для легенды (полное имя — в tooltip).
  const DISPUTE_SHORT: Record<string, string> = {
    procurement: "Закупки / договоры",
    transportation: "Перевозочные (производственные)",
    government: "Споры с госорганами",
    labor: "Трудовые",
    other: "Иные",
    mediation: "Медиативные",
    third_party: "3-лицо",
  };

  // Дела, где КТЖ выступает 3-м лицом, в этой диаграмме не учитываем —
  // по требованию заказчика.
  const disputeData = Object.entries(
    userCases
      .filter(c => c.partyRole !== "third_party")
      .reduce((acc, c) => {
        const key = c.disputeCategory ?? "other";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
  ).map(([cat, count]) => ({
    key: cat,
    name: disputeCategoryLabels[cat as keyof typeof disputeCategoryLabels] || cat,
    shortName: DISPUTE_SHORT[cat] || cat,
    value: count,
    color: DISPUTE_COLORS[cat] || "#ccc",
  }));
  const disputeTotal = disputeData.reduce((acc, d) => acc + d.value, 0);

  // Чарт «Исполнение» — берётся из колонки damageRecoveryNote (оригинальная
  // колонка Excel «Исполнено / На исполнении»). Три ведра + «Не на исполнении»
  // для дел с пустым полем (отказы, ещё не запущенное исполнение и т.д.).
  const statusData = Object.entries(
    userCases.reduce((acc, c) => {
      const note = (c.litigation?.damageRecoveryNote || "").trim().toLowerCase();
      const filingYear = new Date(`${c.filingDate}T12:00:00`).getFullYear();
      // Временный оверрайд: все дела 2025 года показываем как «Исполнено».
      const bucket: "done" | "in_progress" | "none" =
        filingYear === 2025 ? "done" :
        note === "исполнено" ? "done" :
        note === "на исполнении" ? "in_progress" : "none";
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<"done" | "in_progress" | "none", number>)
  ).map(([key, count]) => ({
    key,
    name: key === "done" ? "Исполнено" : key === "in_progress" ? "На исполнении" : "Не на исполнении",
    value: count,
    color: key === "done" ? "#10B981" : key === "in_progress" ? "#F59E0B" : "#94A3B8",
  }));

  const branchChartRows = useMemo(() => {
    const map = userCases.reduce((acc, c) => {
      if (!isRealBranchNameForStats(c.branch)) return acc;
      const canonical = normalizeBranchName(c.branch) ?? c.branch;
      acc[canonical] = (acc[canonical] || 0) + c.claimAmount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(map)
      .map(([branchFull, amount], i) => ({
        branchFull,
        branch: branchChartLabel(branchFull, 40),
        amount,
        fill: BRANCH_BAR_PALETTE[i % BRANCH_BAR_PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [userCases]);

  const amountRanges = useMemo(() => {
    const ranges = [
      { label: "до 1 млн", min: 0, max: 1_000_000 },
      { label: "1–5 млн", min: 1_000_000, max: 5_000_000 },
      { label: "5–10 млн", min: 5_000_000, max: 10_000_000 },
      { label: "10–50 млн", min: 10_000_000, max: 50_000_000 },
      { label: "50–100 млн", min: 50_000_000, max: 100_000_000 },
      { label: "свыше 100 млн", min: 100_000_000, max: Infinity },
    ];
    return ranges.map(r => ({
      label: r.label,
      count: userCases.filter(c => c.claimAmount >= r.min && c.claimAmount < r.max).length,
    }));
  }, [userCases]);

  const branchChartHeight = Math.min(440, Math.max(260, branchChartRows.length * 36 + 72));
  // Юристы — рендерятся внутри LawyerWorkloadCard, который сам обрабатывает данные.

  const branchRanking = useMemo(() => {
    const wonOutcomeSet = new Set(["fully_satisfied", "partially_satisfied", "settled"]);
    const map: Record<string, { total: number; won: number; totalAmount: number; wonAmount: number }> = {};
    for (const c of userCases) {
      if (!isRealBranchNameForStats(c.branch)) continue;
      const b = normalizeBranchName(c.branch) ?? c.branch;
      if (!map[b]) map[b] = { total: 0, won: 0, totalAmount: 0, wonAmount: 0 };
      map[b].total++;
      map[b].totalAmount += c.claimAmount;
      if (wonOutcomeSet.has(c.outcome)) {
        map[b].won++;
        map[b].wonAmount += c.claimAmount;
      }
    }
    return Object.entries(map)
      .map(([name, s]) => ({
        name,
        total: s.total,
        won: s.won,
        winRate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        totalAmount: s.totalAmount,
        wonAmount: s.wonAmount,
        wonAmountRate: s.totalAmount > 0 ? Math.round((s.wonAmount / s.totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [userCases]);

  return (
    <div className="space-y-4 mt-6">
      {!canViewAll && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 text-warning text-sm">
          <Eye className="w-4 h-4" />
          <span>Графики показывают данные только для филиала: {user.branch}</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Статус дела</h3>
          <DonutWithLegend data={statusData} centerLabel="всего дел" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-3">Дела по категории спора</h3>
          <DonutWithLegend data={disputeData} centerLabel="всего дел" />
        </motion.div>

      </div>

      <div className={cn("grid gap-4", showMonthlyTrend && showLawyerStats ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {showMonthlyTrend && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
            <h3 className="text-sm font-semibold mb-4">
              Динамика дел по месяцам подачи иска (2026)
            </h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="won" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Удовлетворено" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="lost" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Отказано" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="active" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="В работе" dot={{ r: 3 }} />
                  <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {showLawyerStats && <LawyerWorkloadCard />}
      </div>

      <div className={cn("grid gap-4", showLawyerStats && branchRanking.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-4 text-slate-800">Суммы исков по филиалам</h3>
          <div style={{ height: branchChartHeight }} className="min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchChartRows}
                layout="vertical"
                margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatAmountShort}
                  tick={{ fontSize: 11, fill: "hsl(215, 16%, 42%)" }}
                  axisLine={{ stroke: "hsl(214, 32%, 88%)" }}
                />
                <YAxis
                  type="category"
                  dataKey="branch"
                  width={148}
                  tick={{ fontSize: 11, fill: "hsl(222, 22%, 28%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(214, 100%, 97%)", opacity: 0.6 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as { branchFull: string; amount: number };
                    return (
                      <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-md text-sm max-w-[280px]">
                        <p className="font-medium text-slate-900 leading-snug">{row.branchFull}</p>
                        <p className="mt-1 text-slate-600 tabular-nums">{formatAmountShort(row.amount)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={18} name="Сумма иска">
                  {branchChartRows.map((entry, i) => (
                    <Cell key={`${entry.branchFull}-${i}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      {showLawyerStats && (
        <BranchKpiRanking year={year} />
      )}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
        <h3 className="text-sm font-semibold mb-4">Показатели по суммам исков</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {amountRanges.map((r, i) => (
            <div key={r.label} className="flex flex-col items-center bg-blue-50/60 rounded-lg p-3 border border-blue-100">
              <span className="text-2xl font-bold text-blue-900 tabular-nums">{r.count}</span>
              <span className="text-[11px] text-blue-500 mt-1 text-center leading-tight">{r.label} ₸</span>
              <div className="mt-2 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((r.count / Math.max(userCases.length, 1)) * 100)}%`,
                    background: BRANCH_BAR_PALETTE[i % BRANCH_BAR_PALETTE.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardCharts;

/** Рейтинг филиалов на основе двух KPI (формулы согласованы с юристом). */
function BranchKpiRanking({ year }: { year?: number }) {
  const { data: rows = [] } = useKpiBranches(year);
  if (!rows.length) return null;

  // ТОП 1-3 — иконки кубков
  const topIcons = [Trophy, Award, Medal];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="stat-card">
      <h3 className="text-sm font-semibold mb-4">Рейтинг филиалов (KPI)</h3>
      <div className="space-y-3">
        {rows.map((b, i) => {
          const Icon = topIcons[i] || null;
          const kpi2 = b.kpi2_percent;
          const kpi2Bad = kpi2 != null && kpi2 >= 2;
          return (
            <div key={b.branch_id} className="flex items-center gap-3">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                i === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {Icon ? <Icon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{b.branch_name}</span>
                  <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">{b.plaintiff_total} исков</span>
                </div>
                {/* KPI-1: % выигранных по количеству (зелёный) */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: `${Math.min(100, b.kpi1_percent)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-success w-12 text-right">{b.kpi1_percent.toFixed(1)}%</span>
                </div>
                {/* KPI-2: % от EBITDA по проигранным ответчикам (синий или красный) */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", kpi2Bad ? "bg-red-500" : "bg-blue-500")}
                      style={{ width: kpi2 == null ? "0%" : `${Math.min(100, kpi2 * 10)}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium w-12 text-right", kpi2Bad ? "text-red-600" : "text-blue-600")}>
                    {kpi2 == null ? "—" : `${kpi2.toFixed(3)}%`}
                  </span>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                  <span className="text-green-600">✓ {b.plaintiff_won} удовл.</span>
                  <span className="text-blue-500">проигр. ответчиком: {formatAmountShort(b.defendant_lost_sum)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> KPI-1: доля выигранных (количество)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> KPI-2: % от EBITDA (порог 2%)</span>
      </div>
    </motion.div>
  );
}

/** Текущая загрузка юристов — только количество дел в работе. */
function LawyerWorkloadCard() {
  const allCases = useCases();
  const rows = useMemo(
    () =>
      getLawyerStats(allCases)
        .filter((lawyer) => lawyer.activeNow > 0)
        .sort((a, b) => b.activeNow - a.activeNow || a.name.localeCompare(b.name, "ru")),
    [allCases],
  );
  const totalActive = useMemo(
    () => rows.reduce((sum, lawyer) => sum + lawyer.activeNow, 0),
    [rows],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold">Дела в работе по юристам</h3>
        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 tabular-nums">
          {totalActive} всего
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Количество дел, которые сейчас находятся в работе или на исполнении.
      </p>
      <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
        {rows.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">Нет данных по юристам</p>
        )}
        {rows.map((lawyer, index) => (
          <div key={lawyer.name} className="flex items-center gap-3 py-2.5 hover:bg-blue-50/40 transition-colors">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-bold flex-shrink-0">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="text-sm font-medium truncate">{lawyer.name}</span>
              {!lawyer.isActive && (
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  Не работает
                </span>
              )}
            </div>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-800 tabular-nums">
              {lawyer.activeNow}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
