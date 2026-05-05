import { caseStatusLabels, courtInstanceLabels, partyRoleLabels, formatAmount, type LegalCase } from "@/data/mockData";
import { AlertTriangle, ExternalLink, ShieldAlert, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const statusStyles: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 border border-blue-200",
  mediation: "bg-amber-100 text-amber-800 border border-amber-200",
  suspended: "bg-slate-100 text-slate-700 border border-slate-200",
  won: "bg-green-100 text-green-700 border border-green-200",
  lost: "bg-red-100 text-red-700 border border-red-200",
  appeal: "bg-gray-100 text-gray-600 border border-gray-200",
  cassation: "bg-gray-100 text-gray-600 border border-gray-200",
  execution: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  closed: "bg-green-100 text-green-700 border border-green-200",
};

const caseTypeAbbr: Record<string, string> = {
  civil: "Гр.",
  administrative: "Адм.",
  criminal: "Уг.",
  executive: "Исп.",
  labor: "Труд.",
  tax: "Нал.",
  corporate: "Корп.",
  other: "Иное",
};

const riskStyles: Record<string, string> = {
  low: "text-green-600",
  medium: "text-blue-600",
  high: "text-red-600",
};

const riskLabels: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий" };

interface CasesTableProps {
  onCaseClick?: (id: string) => void;
  cases?: LegalCase[];
}

const CasesTable = ({ onCaseClick, cases }: CasesTableProps) => {
  const displayCases = cases ?? [];
  const overdueCases = displayCases.filter(c => c.daysOverdue > 0);

  return (
    <div>
      {overdueCases.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Просрочено: {overdueCases.length} дел(а)</span>
          </div>
          <div className="space-y-1">
            {overdueCases.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 text-xs cursor-pointer group"
                onClick={() => onCaseClick?.(c.id)}
              >
                <p className="text-blue-600 group-hover:text-blue-800 transition-colors truncate">
                  <span className="font-medium text-blue-900">{c.caseNumber}</span> — {c.defendant} — <span className="text-red-600 font-medium">{c.daysOverdue} дн. просрочки</span>
                  {c.paymentDeadline && <span className="text-blue-500"> (срок: {c.paymentDeadline})</span>}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-white border border-red-200 px-2 py-0.5 rounded-md shrink-0">
                  <User className="w-3 h-3" />
                  {c.assignedLawyer}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">№ дела</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Ответчик</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Роль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Инстанция</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Сумма иска</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Оплачено</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Юрист</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Филиал</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Риск</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Просрочка</th>
              </tr>
            </thead>
            <tbody>
              {displayCases.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "border-b border-blue-50 last:border-0 hover:bg-blue-50/50 transition-colors cursor-pointer group",
                    c.daysOverdue > 0 && "bg-red-50/30"
                  )}
                  onClick={() => onCaseClick?.(c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-blue-900">{c.caseNumber}</span>
                      <ExternalLink className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[220px] text-blue-900" title={c.defendant}>
                      {c.defendant}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{caseTypeAbbr[c.caseType] ?? c.caseType}</td>
                  <td className="px-4 py-3 text-xs">{partyRoleLabels[c.partyRole]}</td>
                  <td className="px-4 py-3">
                    <span className={cn("status-badge", statusStyles[c.status])}>
                      {caseStatusLabels[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{courtInstanceLabels[c.courtInstance]}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-blue-900">{formatAmount(c.claimAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.paidAmount > 0 ? (
                      <span className="text-green-600 font-medium">{formatAmount(c.paidAmount)}</span>
                    ) : (
                      <span className="text-blue-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-blue-700">{c.assignedLawyer}</td>
                  <td className="px-4 py-3 text-xs text-blue-600">{c.branch}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {c.riskLevel === "high" && <ShieldAlert className="w-3 h-3 text-red-500" />}
                      <span className={cn("text-xs font-medium", riskStyles[c.riskLevel])}>{riskLabels[c.riskLevel]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.daysOverdue > 0 ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-200">{c.daysOverdue} дн.</span>
                    ) : (
                      <span className="text-blue-400 text-xs">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayCases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-blue-500">
            <p className="text-sm">Нет дел по заданным фильтрам</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesTable;
