import { TrendingUp, TrendingDown, Briefcase, CheckCircle2, AlertTriangle, DollarSign, ShieldAlert, Scale, Gavel, Eye } from "lucide-react";
import { formatAmountShort, formatAmount, getFilteredCasesForUser, canViewAllCases, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, sub, trend, variant = "default", delay = 0, footer }: {
  icon: React.ElementType; label: string; value: string; sub?: string; trend?: { value: string; up: boolean }; variant?: "default" | "success" | "warning" | "overdue"; delay?: number; footer?: React.ReactNode;
}) => {
  const iconColors = {
    default: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-orange-100 text-orange-700",
    overdue: "bg-red-100 text-red-700",
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", iconColors[variant])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", trend.up ? trendColors.up : trendColors.down)}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-blue-900">{value}</p>
      <p className="text-xs text-blue-600 mt-1 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-blue-400 mt-0.5">{sub}</p>}
      {footer && <div className="mt-2 pt-2 border-t border-blue-50">{footer}</div>}
    </motion.div>
  );
};

const DashboardStats = ({ cases }: { cases?: LegalCase[] }) => {
  const { user } = useCurrentUser();
  const userCases = cases ?? getFilteredCasesForUser(user);

  const totalCases = userCases.length;
  const activeCases = userCases.filter(c => ["active", "appeal", "cassation", "execution"].includes(c.status)).length;
  const wonCases = userCases.filter(c => c.status === "won").length;
  const lostCases = userCases.filter(c => c.status === "lost").length;
  const overdueCasesList = userCases.filter(c => c.daysOverdue > 0);
  const overdueCases = overdueCasesList.length;
  const overdueByLawyer = Object.entries(
    overdueCasesList.reduce((acc, c) => {
      acc[c.assignedLawyer] = (acc[c.assignedLawyer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);
  const highRiskCases = userCases.filter(c => c.riskLevel === "high").length;

  const defendantCases = userCases.filter(c => c.partyRole === "defendant");
  const plaintiffCases = userCases.filter(c => c.partyRole === "plaintiff");
  const defendantClaim = defendantCases.reduce((s, c) => s + c.claimAmount, 0);
  const defendantPaid = defendantCases.reduce((s, c) => s + c.paidAmount, 0);
  const plaintiffDebt = plaintiffCases.reduce((s, c) => s + c.mainDebt, 0);
  const plaintiffPaid = plaintiffCases.reduce((s, c) => s + c.paidAmount, 0);
  const plaintiffRemaining = plaintiffDebt - plaintiffPaid;

  const winRate = Math.round((wonCases / Math.max(wonCases + lostCases, 1)) * 100);
  const isRestricted = !canViewAllCases(user);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-blue-900">Обзор</h2>
          {isRestricted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200">
              <Eye className="w-3 h-3" />
              {user.branch} — ограниченный доступ
            </span>
          )}
        </div>
        <span className="text-xs text-blue-500">Обновлено: {new Date().toLocaleDateString("ru-RU")}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Briefcase} label="Всего дел" value={totalCases.toString()} sub={`${activeCases} в работе`} trend={{ value: "+3 за мес.", up: true }} delay={0} />
        <StatCard icon={CheckCircle2} label="Выиграно" value={wonCases.toString()} sub={`${winRate}% побед`} variant="success" trend={{ value: `${winRate}%`, up: true }} delay={0.05} />
        <StatCard icon={Scale} label="Проиграно" value={lostCases.toString()} delay={0.1} />
        <StatCard icon={Gavel} label="На рассмотрении" value={activeCases.toString()} sub="Первая + апелляция + кассация" variant="warning" delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-3 rounded-xl border border-red-200 bg-red-50/40 p-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-red-700">Требует внимания</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-red-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-900">{overdueCases}</p>
                <p className="text-xs font-medium text-red-700 mt-0.5">Просрочено</p>
              </div>
              <div className="p-1.5 rounded-md bg-red-100 text-red-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            {overdueByLawyer.length > 0 && (
              <div className="mt-2 pt-2 border-t border-red-50 space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-red-600 font-semibold">Юристы</p>
                {overdueByLawyer.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-blue-900 truncate">{name}</span>
                    <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg border border-red-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-900">{highRiskCases}</p>
                <p className="text-xs font-medium text-red-700 mt-0.5">Высокий риск</p>
                <p className="text-[11px] text-blue-400 mt-0.5">Крупные суммы под угрозой</p>
              </div>
              <div className="p-1.5 rounded-md bg-red-100 text-red-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <h2 className="text-lg font-semibold text-[hsl(215,35%,15%)] mb-2 mt-6">Финансы</h2>

      <p className="text-xs uppercase tracking-wide text-blue-500 font-semibold mb-2">Ответчик ({defendantCases.length})</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <StatCard icon={DollarSign} label="Общая сумма" value={formatAmountShort(defendantClaim)} sub={formatAmount(defendantClaim)} variant="warning" delay={0.3} />
        <StatCard icon={DollarSign} label="Оплачено" value={formatAmountShort(defendantPaid)} variant="success" sub={defendantClaim > 0 ? `${((defendantPaid / defendantClaim) * 100).toFixed(1)}% погашено` : undefined} delay={0.35} />
      </div>

      <p className="text-xs uppercase tracking-wide text-blue-500 font-semibold mb-2 mt-4">Истец ({plaintiffCases.length})</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <StatCard icon={DollarSign} label="Остаток долга" value={formatAmountShort(plaintiffRemaining)} variant="overdue" sub={formatAmount(plaintiffRemaining)} delay={0.4} />
      </div>
    </div>
  );
};

export default DashboardStats;
