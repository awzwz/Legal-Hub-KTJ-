import { TrendingUp, TrendingDown, Briefcase, CheckCircle2, AlertTriangle, DollarSign, ShieldAlert, Scale, Gavel, Eye, Handshake, Target, Calendar as CalendarIcon } from "lucide-react";
import { formatAmountShort, formatAmount, canViewAllCases, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useKpiOverview } from "@/hooks/useKpi";
import { useProceduralDeadlines } from "@/hooks/useProceduralDeadlines";
import { cn } from "@/lib/utils";
import {
  getDashboardOverviewCases,
  type DashboardOverviewKey,
  type DashboardOverviewRole,
} from "@/lib/dashboardOverview";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, sub, trend, variant = "default", delay = 0, footer, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string; trend?: { value: string; up: boolean }; variant?: "default" | "success" | "warning" | "overdue" | "mediation"; delay?: number; footer?: React.ReactNode;
  onClick?: () => void;
}) => {
  const iconColors = {
    default: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-orange-100 text-orange-700",
    overdue: "bg-red-100 text-red-700",
    mediation: "bg-yellow-100 text-yellow-700",
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
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "bg-white rounded-xl border border-blue-100 p-5 shadow-sm transition-all min-w-0 overflow-hidden",
        onClick ? "cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300" : "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
        <div className={cn("p-2 rounded-lg shrink-0", iconColors[variant])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium shrink-0", trend.up ? trendColors.up : trendColors.down)}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold tracking-tight text-blue-900 tabular-nums leading-snug break-words min-w-0">{value}</p>
      <p className="text-xs text-blue-600 mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-blue-400/90 mt-1 tabular-nums break-words">{sub}</p>}
      {footer && <div className="mt-2 pt-2 border-t border-blue-50">{footer}</div>}
    </motion.div>
  );
};

export type DrillDownKey = DashboardOverviewKey | "high_risk" | "overdue_action";

export interface DrillDownPayload {
  key: DrillDownKey;
  partyRole?: DashboardOverviewRole;
  /** Точный набор дел, показанный карточкой с учётом роли, года и выбранного периода. */
  caseIds?: string[];
}

const DashboardStats = ({ cases, year, onDrillDown }: { cases?: LegalCase[]; year?: number; onDrillDown?: (payload: DrillDownPayload) => void }) => {
  const { user } = useCurrentUser();
  const userCases = cases ?? [];

  const totalCases = userCases.length;
  // Раскладка по исходам (3 карточки исходов в сумме = всего дел минус незакрытые-неклассифицированные):
  //   «Удовлетворено»  = полностью + частично
  //   «Отказано»       = отказано + прекращено + возвращено
  //   «Медиативные»    = settled
  // «В работе» — отдельная ось (статус), показывает текущую активность юристов:
  // дела, у которых процесс ещё не закрыт (взыскание идёт, активны, приостановлены).
  // Фактический разрез: счётчики по outcome отдельно для каждой роли.
  // Используется в блоках «ОБЗОР · ИСТЕЦ» и «ОБЗОР · ОТВЕТЧИК».
  // Агрегаты для нижних блоков (требует внимания и т.п.)
  const wonCases = userCases.filter(c => c.outcome === "fully_satisfied" || c.outcome === "partially_satisfied").length;
  const lostCases = userCases.filter(c => ["denied", "dismissed", "returned"].includes(c.outcome)).length;
  const mediationSettledCases = userCases.filter(c => c.outcome === "settled").length;
  const inProgressCases = userCases.filter(c => {
    const note = (c.litigation?.damageRecoveryNote || "").trim().toLowerCase();
    return c.status === "execution" && note === "на исполнении";
  }).length;
  // «Просроченные действия» — процедурные дедлайны где completed_at IS NULL AND due_date < today.
  // Источник правды — серверный (берёт во внимание RBAC и реальную дату).
  const { data: overdueDeadlines = [] } = useProceduralDeadlines({ overdueOnly: true });
  const { data: upcomingDeadlines = [] } = useProceduralDeadlines({ dueWithinDays: 7 });
  const overdueByCase = overdueDeadlines.reduce((acc, d) => {
    const key = d.caseNumber || d.caseId.slice(0, 8);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const overdueByCaseSorted = Object.entries(overdueByCase).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const highRiskCaseList = userCases.filter(c => c.riskLevel === "high");
  const highRiskCases = highRiskCaseList.length;

  // KPI юр. службы (формулы по согласованию с юристом).
  const { data: kpi } = useKpiOverview(year);
  const kpi2Bad = kpi?.kpi2_percent != null && kpi.kpi2_percent >= (kpi?.kpi2_threshold ?? 2);

  const defendantCases = userCases.filter(c => c.partyRole === "defendant");
  const plaintiffCases = userCases.filter(c => c.partyRole === "plaintiff");

  // Финансовый блок — соответствует листам «истец» / «ответчик» в эталонном
  // отчёте ПИР (см. «Отчет ПИР за 1 кв.2026г.xlsx»). Логика разная для ролей:
  //   ИСТЕЦ:    суммируем claim_amount по каждому исходу отдельно.
  //   ОТВЕТЧИК: «Удовл/Медиа» = ВЗЫСКАННОЕ (что реально с нас сняли),
  //             «Отказ» = остаточный принцип (Предъявлено − Удовл − Медиа).
  const recoveredOf = (c: LegalCase) =>
    (c.recoveredMain ?? 0) + (c.recoveredFines ?? 0) + (c.recoveredRepExpenses ?? 0) + (c.recoveredStateFee ?? 0);
  const calcFinancePlaintiff = (casesArr: LegalCase[]) => {
    const claimed = casesArr.reduce((s, c) => s + c.claimAmount, 0);
    const satisfied = casesArr
      .filter(c => c.outcome === "fully_satisfied" || c.outcome === "partially_satisfied")
      .reduce((s, c) => s + c.claimAmount, 0);
    const mediation = casesArr
      .filter(c => c.outcome === "settled")
      .reduce((s, c) => s + c.claimAmount, 0);
    const denied = casesArr
      .filter(c => ["denied", "dismissed", "returned"].includes(c.outcome))
      .reduce((s, c) => s + c.claimAmount, 0);
    return { claimed, satisfied, denied, mediation };
  };
  const calcFinanceDefendant = (casesArr: LegalCase[]) => {
    const claimed = casesArr.reduce((s, c) => s + c.claimAmount, 0);
    const satisfied = casesArr
      .filter(c => c.outcome !== "settled")
      .reduce((s, c) => s + recoveredOf(c), 0);
    const mediation = casesArr
      .filter(c => c.outcome === "settled")
      .reduce((s, c) => s + recoveredOf(c), 0);
    const denied = claimed - satisfied - mediation;
    return { claimed, satisfied, denied, mediation };
  };

  const defFin = calcFinanceDefendant(defendantCases);
  const plFin = calcFinancePlaintiff(plaintiffCases);

  const calcRoleGroups = (partyRole: DashboardOverviewRole) => ({
    all: getDashboardOverviewCases(userCases, partyRole, "all"),
    won: getDashboardOverviewCases(userCases, partyRole, "won"),
    lost: getDashboardOverviewCases(userCases, partyRole, "lost"),
    settled: getDashboardOverviewCases(userCases, partyRole, "settled"),
    in_progress: getDashboardOverviewCases(userCases, partyRole, "in_progress"),
  });
  const plGroups = calcRoleGroups("plaintiff");
  const defGroups = calcRoleGroups("defendant");
  const isRestricted = !canViewAllCases(user);

  const pctOf = (n: number, d: number) => `${Math.round((n / Math.max(d, 1)) * 100)}% от решённых`;

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
      {[
        { label: "Истец", partyRole: "plaintiff" as const, groups: plGroups, baseDelay: 0 },
        { label: "Ответчик", partyRole: "defendant" as const, groups: defGroups, baseDelay: 0.2 },
      ].map(({ label, partyRole, groups, baseDelay }) => {
        const decided = groups.won.length + groups.lost.length + groups.settled.length;
        const pct = (n: number) => `${Math.round((n / Math.max(decided, 1)) * 100)}%`;
        const drillDown = (key: DashboardOverviewKey) => onDrillDown?.({
          key,
          partyRole,
          caseIds: groups[key].map((legalCase) => legalCase.id),
        });
        return (
          <div key={label} className="mb-4">
            <p className="text-xs uppercase tracking-wide text-blue-500 font-semibold mb-2">{label} ({groups.all.length})</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon={Briefcase} label="Всего дел" value={groups.all.length.toString()} delay={baseDelay} onClick={onDrillDown ? () => drillDown("all") : undefined} />
              <StatCard icon={CheckCircle2} label="Удовлетворено" value={groups.won.length.toString()} variant="success" trend={{ value: pct(groups.won.length), up: true }} delay={baseDelay + 0.05} onClick={onDrillDown ? () => drillDown("won") : undefined} />
              <StatCard icon={Scale} label="Отказано" value={groups.lost.length.toString()} variant="overdue" trend={{ value: pct(groups.lost.length), up: false }} delay={baseDelay + 0.1} onClick={onDrillDown ? () => drillDown("lost") : undefined} />
              <StatCard icon={Handshake} label="Медиативные соглашения" value={groups.settled.length.toString()} variant="mediation" trend={{ value: pct(groups.settled.length), up: true }} delay={baseDelay + 0.15} onClick={onDrillDown ? () => drillDown("settled") : undefined} />
              <StatCard icon={Gavel} label="В работе" value={groups.in_progress.length.toString()} variant="warning" delay={baseDelay + 0.2} onClick={onDrillDown ? () => drillDown("in_progress") : undefined} />
            </div>
          </div>
        );
      })}

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
          {(() => {
            const overdueCaseIds = Array.from(new Set(overdueDeadlines.map(d => d.caseId)));
            const overdueClick = onDrillDown && overdueDeadlines.length > 0
              ? () => onDrillDown({ key: "overdue_action", caseIds: overdueCaseIds })
              : undefined;
            return (
          <div
            onClick={overdueClick}
            role={overdueClick ? "button" : undefined}
            tabIndex={overdueClick ? 0 : undefined}
            onKeyDown={overdueClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); overdueClick(); } } : undefined}
            className={cn(
              "bg-white rounded-lg border border-red-100 p-4 transition-all",
              overdueClick && "cursor-pointer hover:shadow-md hover:border-red-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-300"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-900">{overdueDeadlines.length}</p>
                <p className="text-xs font-medium text-red-700 mt-0.5">Просроченные действия</p>
                <p className="text-[11px] text-blue-400 mt-0.5">
                  процессуальные дедлайны (отзывы, апелляции и т.д.)
                </p>
              </div>
              <div className="p-1.5 rounded-md bg-red-100 text-red-700">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            {overdueByCaseSorted.length > 0 && (
              <div className="mt-2 pt-2 border-t border-red-50 space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-red-600 font-semibold">По делам</p>
                {overdueByCaseSorted.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-blue-900 truncate">{name}</span>
                    <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
            {upcomingDeadlines.length > 0 && (
              <p className="mt-2 pt-2 border-t border-red-50 text-[11px] text-amber-700">
                + {upcomingDeadlines.length} приближается (≤ 7 дней)
              </p>
            )}
          </div>
            );
          })()}
          {(() => {
            const riskClick = onDrillDown && highRiskCases > 0
              ? () => onDrillDown({ key: "high_risk", caseIds: highRiskCaseList.map((legalCase) => legalCase.id) })
              : undefined;
            return (
          <div
            onClick={riskClick}
            role={riskClick ? "button" : undefined}
            tabIndex={riskClick ? 0 : undefined}
            onKeyDown={riskClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); riskClick(); } } : undefined}
            className={cn(
              "bg-white rounded-lg border border-red-100 p-4 transition-all",
              riskClick && "cursor-pointer hover:shadow-md hover:border-red-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-300"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-900">{highRiskCases}</p>
                <p className="text-xs font-medium text-red-700 mt-0.5">Высокий риск</p>
                <p className="text-[11px] text-blue-400 mt-0.5">Дела высокой значимости(репутационные риски / крупные суммы)</p>
              </div>
              <div className="p-1.5 rounded-md bg-red-100 text-red-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      </motion.div>

      {/* KPI юр. службы — формулы согласованы с юристом */}
      <h2 className="text-lg font-semibold text-[hsl(215,35%,15%)] mb-2 mt-6">KPI юридической службы {kpi ? `(${kpi.year})` : ""}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">KPI-1 · Доля выигранных исков</p>
              <p className="text-3xl font-bold text-green-700 mt-2 tabular-nums">
                {kpi ? `${kpi.kpi1_percent.toFixed(2)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi ? `${kpi.plaintiff_won}/${kpi.plaintiff_total} предъявленных обществом исков` : "Загрузка..."}
              </p>
              <p className="text-[11px] text-blue-500 mt-1">Эффективность взыскания в качестве истца</p>
            </div>
            <div className="p-2 rounded-md bg-green-100 text-green-700">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={cn("bg-white rounded-xl border p-5 shadow-sm", kpi2Bad ? "border-red-300" : "border-blue-200")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">KPI-2 · % от EBITDA</p>
              {kpi && kpi.kpi2_percent !== null ? (
                <p className={cn("text-3xl font-bold mt-2 tabular-nums", kpi2Bad ? "text-red-700" : "text-blue-700")}>
                  {kpi.kpi2_percent.toFixed(4)}%
                </p>
              ) : (
                <p className="text-2xl font-medium text-muted-foreground mt-2">EBITDA не задана</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {kpi ? `Сумма ущерба по предъявленным к Обществу искам: ${formatAmountShort(kpi.defendant_lost_sum)}` : "..."}
                {kpi?.ebitda != null && ` · EBITDA: ${formatAmountShort(kpi.ebitda)}`}
              </p>
              <p className="text-[11px] text-blue-500 mt-1">
                Порог недопущения ущерба: ≤ {kpi?.kpi2_threshold ?? 2}% годовой EBITDA
                {kpi2Bad && " · ⚠ ПОРОГ ПРЕВЫШЕН"}
              </p>
            </div>
            <div className={cn("p-2 rounded-md", kpi2Bad ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
      </div>

      <h2 className="text-lg font-semibold text-[hsl(215,35%,15%)] mb-2 mt-6">Финансы</h2>

      {[
        { label: "Истец", count: plaintiffCases.length, fin: plFin, baseDelay: 0.3 },
        { label: "Ответчик", count: defendantCases.length, fin: defFin, baseDelay: 0.45 },
      ].map(({ label, count, fin, baseDelay }) => {
        const denom = fin.claimed > 0 ? fin.claimed : 1;
        const pct = (x: number) => `${formatAmountShort(x)} · ${(x / denom * 100).toFixed(1)}%`;
        return (
          <div key={label} className="mb-4">
            <p className="text-xs uppercase tracking-wide text-blue-500 font-semibold mb-2">{label} ({count})</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Всего предъявлено" value={formatAmount(fin.claimed)} sub={formatAmountShort(fin.claimed)} variant="warning" delay={baseDelay} />
              <StatCard icon={Handshake} label="Медиативное соглашение" value={formatAmount(fin.mediation)} sub={pct(fin.mediation)} variant="mediation" delay={baseDelay + 0.05} />
              <StatCard icon={CheckCircle2} label="Удовлетворено" value={formatAmount(fin.satisfied)} sub={pct(fin.satisfied)} variant="success" delay={baseDelay + 0.1} />
              <StatCard icon={Scale} label="Отказано" value={formatAmount(fin.denied)} sub={pct(fin.denied)} variant="overdue" delay={baseDelay + 0.15} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
