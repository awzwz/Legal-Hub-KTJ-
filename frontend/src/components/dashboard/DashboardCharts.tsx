import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { caseStatusLabels, formatAmountShort, getLawyerStats, canViewLawyerStats, canViewAllBranches, isRealBranchNameForStats, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { Trophy, Award, Medal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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

function buildSixMonthTrend(cases: LegalCase[]) {
  const end = new Date();
  const rows: { month: string; won: number; lost: number; active: number }[] = [];
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

const DashboardCharts = ({ cases }: { cases?: LegalCase[] }) => {
  const { user } = useCurrentUser();
  const userCases = cases ?? [];
  const monthlyTrend = useMemo(() => buildSixMonthTrend(userCases), [userCases]);
  const canViewAll = canViewAllBranches(user);
  const showLawyerStats = canViewLawyerStats(user);

  const statusData = Object.entries(
    userCases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: caseStatusLabels[status as keyof typeof caseStatusLabels] || status,
    value: count,
    color: statusColors[status] || "#ccc",
  }));

  const branchChartRows = useMemo(() => {
    const map = userCases.reduce((acc, c) => {
      if (!isRealBranchNameForStats(c.branch)) return acc;
      acc[c.branch] = (acc[c.branch] || 0) + c.claimAmount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(map)
      .map(([branchFull, amount], i) => ({
        branchFull,
        branch: branchChartLabel(branchFull, 38),
        amount,
        fill: BRANCH_BAR_PALETTE[i % BRANCH_BAR_PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [userCases]);

  const branchChartHeight = Math.min(440, Math.max(260, branchChartRows.length * 36 + 72));
  const lawyerStats = useMemo(() => getLawyerStats(userCases), [userCases]);
  const trophyIcons = [Trophy, Award, Medal];

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
          <h3 className="text-sm font-semibold mb-4">Дела по статусам</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Динамика дел (6 мес.)</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="won" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Выиграно" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="lost" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Проиграно" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="active" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="В работе" dot={{ r: 3 }} />
                <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {showLawyerStats && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card">
            <h3 className="text-sm font-semibold mb-4">Топ юристов</h3>
            <div className="space-y-3">
              {lawyerStats.map((l, i) => {
                const TrophyIcon = trophyIcons[i] || null;
                return (
                  <div key={l.name} className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      i === 0 ? "bg-primary/20 text-primary" : i === 1 ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {TrophyIcon ? <TrophyIcon className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{l.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{l.totalCases} дел</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${l.winRate}%` }} />
                        </div>
                        <span className="text-xs font-medium text-success">{l.winRate}%</span>
                      </div>
                      <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span>✓ {l.won}</span>
                        <span>✗ {l.lost}</span>
                        <span>⧖ {l.active} актив.</span>
                        <span>~{l.avgDays} дн.</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;
