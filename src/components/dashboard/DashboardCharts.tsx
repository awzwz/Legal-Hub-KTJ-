import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { caseStatusLabels, formatAmountShort, getLawyerStats, getFilteredCasesForUser, canViewLawyerStats, canViewAllBranches, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { Trophy, Award, Medal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "hsl(38, 92%, 50%)",
  won: "hsl(142, 71%, 45%)",
  lost: "hsl(0, 72%, 51%)",
  appeal: "hsl(25, 30%, 40%)",
  cassation: "hsl(25, 20%, 55%)",
  execution: "hsl(200, 60%, 50%)",
  closed: "hsl(25, 10%, 70%)",
};

const monthlyTrend = [
  { month: "Окт", won: 1, lost: 0, active: 3 },
  { month: "Ноя", won: 2, lost: 1, active: 4 },
  { month: "Дек", won: 1, lost: 0, active: 5 },
  { month: "Янв", won: 3, lost: 1, active: 6 },
  { month: "Фев", won: 2, lost: 0, active: 7 },
  { month: "Мар", won: 2, lost: 1, active: 8 },
];

const DashboardCharts = ({ cases }: { cases?: LegalCase[] }) => {
  const { user } = useCurrentUser();
  const userCases = cases ?? getFilteredCasesForUser(user);
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

  const branchData = Object.entries(
    userCases.reduce((acc, c) => {
      acc[c.branch] = (acc[c.branch] || 0) + c.claimAmount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([branch, amount]) => ({ branch, amount })).sort((a, b) => b.amount - a.amount);

  const lawyerStats = showLawyerStats ? getLawyerStats() : [];
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
          <h3 className="text-sm font-semibold mb-4">Суммы исков по филиалам</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tickFormatter={formatAmountShort} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="branch" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(val: number) => formatAmountShort(val)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="amount" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} barSize={22} />
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
      </div>
    </div>
  );
};

export default DashboardCharts;
