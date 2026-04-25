import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { mockCases, formatAmountShort, getLawyerStats, caseTypeLabels, branches, getFilteredCasesForUser, canViewAllBranches } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

const AnalyticsPage = () => {
  const { user } = useCurrentUser();
  const userCases = getFilteredCasesForUser(user);
  const canViewAll = canViewAllBranches(user);

  // Cases by type
  const typeData = Object.entries(
    userCases.reduce((acc, c) => {
      acc[c.caseType] = (acc[c.caseType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    name: caseTypeLabels[type as keyof typeof caseTypeLabels],
    value: count,
  }));

  const typeColors = ["hsl(38, 92%, 50%)", "hsl(200, 60%, 50%)", "hsl(0, 72%, 51%)", "hsl(25, 30%, 40%)"];

  // Cases by branch with won/lost (only for director)
  const visibleBranches = canViewAll ? branches : (user.branch ? [user.branch] : []);
  const branchDetail = visibleBranches.map(b => {
    const cases = userCases.filter(c => c.branch === b);
    return {
      branch: b,
      total: cases.length,
      won: cases.filter(c => c.status === "won").length,
      lost: cases.filter(c => c.status === "lost").length,
      active: cases.filter(c => ["active", "appeal", "cassation", "execution"].includes(c.status)).length,
    };
  });

  // Party role distribution
  const roleData = [
    { name: "Истец", value: userCases.filter(c => c.partyRole === "plaintiff").length },
    { name: "Ответчик", value: userCases.filter(c => c.partyRole === "defendant").length },
    { name: "Третье лицо", value: userCases.filter(c => c.partyRole === "third_party").length },
  ];
  const roleColors = ["hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)"];

  // Financial by branch
  const finBranch = visibleBranches.map(b => {
    const cases = userCases.filter(c => c.branch === b);
    return {
      branch: b,
      debt: cases.reduce((s, c) => s + c.mainDebt, 0),
      paid: cases.reduce((s, c) => s + c.paidAmount, 0),
    };
  });

  const lawyerStats = canViewAll ? getLawyerStats() : [];

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
          <h3 className="text-sm font-semibold mb-4">Распределение по типам дел</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {typeData.map((_, i) => <Cell key={i} fill={typeColors[i % typeColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Роль в суде</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {roleData.map((_, i) => <Cell key={i} fill={roleColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Дела по филиалам (выиграно / проиграно / в работе)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchDetail}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="won" fill="hsl(142, 71%, 45%)" name="Выиграно" radius={[2, 2, 0, 0]} barSize={16} />
                <Bar dataKey="lost" fill="hsl(0, 72%, 51%)" name="Проиграно" radius={[2, 2, 0, 0]} barSize={16} />
                <Bar dataKey="active" fill="hsl(38, 92%, 50%)" name="В работе" radius={[2, 2, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Долг vs Оплачено по филиалам</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 10%, 90%)" />
                <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAmountShort} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => formatAmountShort(val)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="debt" fill="hsl(0, 72%, 51%)" name="Долг" radius={[2, 2, 0, 0]} barSize={20} />
                <Bar dataKey="paid" fill="hsl(142, 71%, 45%)" name="Оплачено" radius={[2, 2, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                <th className="table-header text-center px-4 py-3">Выиграно</th>
                <th className="table-header text-center px-4 py-3">Проиграно</th>
                <th className="table-header text-center px-4 py-3">В работе</th>
                <th className="table-header text-center px-4 py-3">% побед</th>
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
