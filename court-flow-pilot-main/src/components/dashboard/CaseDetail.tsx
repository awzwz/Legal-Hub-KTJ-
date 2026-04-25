import { useState } from "react";
import { mockCases, formatAmount, caseStatusLabels, courtInstanceLabels, partyRoleLabels, caseTypeLabels, commentTypeLabels, canEditCase, canAddPayment, canViewAllCases } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeft, Calendar, MapPin, User, Building2, Scale, FileText, Clock, MessageSquare, History, CreditCard, ThumbsUp, Send, ShieldAlert, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CaseDetailProps {
  caseId: string;
  onBack: () => void;
}

type Tab = "info" | "payments" | "comments" | "timeline";

const commentTypeStyles: Record<string, string> = {
  question: "bg-blue-100 text-blue-700",
  clarify: "bg-orange-100 text-orange-700",
  problem: "bg-red-100 text-red-700",
  info: "bg-gray-100 text-gray-600",
};

const CaseDetail = ({ caseId, onBack }: CaseDetailProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [newComment, setNewComment] = useState("");
  const caseData = mockCases.find(c => c.id === caseId);
  const { user } = useCurrentUser();

  if (!caseData) return null;

  const canEdit = canEditCase(user, caseData);
  const canViewAll = canViewAllCases(user);
  const isRestricted = !canViewAll && caseData.branch !== user.branch;

  const totalDebt = caseData.mainDebt + caseData.stateFee + caseData.penalty + caseData.lawyerFee + caseData.executionFee;
  const remaining = totalDebt - caseData.paidAmount;
  const paymentProgress = totalDebt > 0 ? (caseData.paidAmount / totalDebt) * 100 : 0;

  const debtBreakdown = [
    { label: "Основной долг", value: caseData.mainDebt, pct: (caseData.mainDebt / totalDebt * 100) },
    { label: "Госпошлина", value: caseData.stateFee, pct: (caseData.stateFee / totalDebt * 100) },
    { label: "Пеня", value: caseData.penalty, pct: (caseData.penalty / totalDebt * 100) },
    { label: "Услуги адвоката", value: caseData.lawyerFee, pct: (caseData.lawyerFee / totalDebt * 100) },
    { label: "Исполнительский сбор", value: caseData.executionFee, pct: (caseData.executionFee / totalDebt * 100) },
  ];

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "info", label: "Информация", icon: FileText },
    { id: "payments", label: "Оплаты", icon: CreditCard, count: caseData.payments.length },
    { id: "comments", label: "Комментарии", icon: MessageSquare, count: caseData.comments.length },
    { id: "timeline", label: "История", icon: History, count: caseData.events.length },
  ];

  const riskColors = { low: "bg-green-100 text-green-700 border border-green-200", medium: "bg-blue-100 text-blue-700 border border-blue-200", high: "bg-red-100 text-red-700 border border-red-200" };
  const riskLabels = { low: "Низкий риск", medium: "Средний риск", high: "Высокий риск" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mb-4 font-medium">
        <ArrowLeft className="w-4 h-4" /> Назад к реестру
      </button>

      {/* Access Warning */}
      {isRestricted && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
          <Lock className="w-4 h-4" />
          <p className="text-sm font-medium">Ограниченный доступ: дело другого филиала (только просмотр)</p>
        </div>
      )}
      {!isRestricted && !canEdit && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-2 text-orange-700">
          <Eye className="w-4 h-4" />
          <p className="text-sm font-medium">Режим просмотра: редактирование запрещено</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-900">Дело {caseData.caseNumber}</h1>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", riskColors[caseData.riskLevel])}>
              <ShieldAlert className="w-3 h-3 mr-1" />
              {riskLabels[caseData.riskLevel]}
            </span>
          </div>
          <p className="text-sm text-blue-600 mt-1">{caseData.court} · Судья: {caseData.judge}</p>
        </div>
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border",
          caseData.status === "won" ? "bg-green-100 text-green-700 border-green-200" :
          caseData.status === "lost" ? "bg-red-100 text-red-700 border-red-200" :
          "bg-blue-100 text-blue-700 border-blue-200"
        )}>
          {caseStatusLabels[caseData.status]}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id ? "border-blue-600 text-blue-900" : "border-transparent text-blue-500 hover:text-blue-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "info" && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main info */}
            <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Детали дела</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-blue-500 text-xs">Тип дела</p><p className="font-medium text-blue-900">{caseTypeLabels[caseData.caseType]}</p></div>
                <div><p className="text-blue-500 text-xs">Инстанция</p><p className="font-medium text-blue-900">{courtInstanceLabels[caseData.courtInstance]}</p></div>
                <div><p className="text-blue-500 text-xs">Роль в суде</p><p className="font-medium text-blue-900">{partyRoleLabels[caseData.partyRole]}</p></div>
                <div><p className="text-blue-500 text-xs">Сумма иска</p><p className="font-medium text-blue-900">{formatAmount(caseData.claimAmount)}</p></div>
                <div><p className="text-blue-500 text-xs">Дата подачи</p><p className="font-medium text-blue-900">{caseData.filingDate}</p></div>
                <div><p className="text-blue-500 text-xs">Обновлено</p><p className="font-medium text-blue-900">{caseData.lastUpdated}</p></div>
              </div>

              <div className="border-t border-blue-100 pt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div><p className="text-blue-500 text-xs">Истец</p><p className="font-medium text-blue-900">{caseData.plaintiff}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div><p className="text-blue-500 text-xs">Ответчик</p><p className="font-medium text-blue-900">{caseData.defendant}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div><p className="text-blue-500 text-xs">Юрист</p><p className="font-medium text-blue-900">{caseData.assignedLawyer}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <Scale className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div><p className="text-blue-500 text-xs">Судья</p><p className="font-medium text-blue-900">{caseData.judge}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div><p className="text-blue-500 text-xs">Филиал / Город</p><p className="font-medium text-blue-900">{caseData.branch} · {caseData.city}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-500 text-xs">Ближайшее заседание</p>
                    <p className={cn("font-medium", caseData.nextHearing ? "text-blue-700" : "text-blue-400")}>
                      {caseData.nextHearing || "Не назначено"}
                    </p>
                  </div>
                </div>
              </div>

              {/* BIN info */}
              <div className="border-t border-blue-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-500 text-xs">Контрагент:</span>
                  <span className="font-medium text-blue-900">{caseData.company}</span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">БИН: {caseData.companyBIN}</span>
                </div>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-blue-900">Финансовый блок</h3>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-500">Оплата</span>
                  <span className="font-medium text-blue-900">{paymentProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${paymentProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-green-500 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {debtBreakdown.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-500">{item.label}</span>
                      <span className="font-medium tabular-nums text-blue-900">{formatAmount(item.value)}</span>
                    </div>
                    <div className="h-1 bg-blue-100 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-blue-400/50 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="border-t border-blue-100 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-blue-900">Итого</span>
                  <span className="tabular-nums text-blue-900">{formatAmount(totalDebt)}</span>
                </div>
                {caseData.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Оплачено</span>
                    <span className="text-green-600 font-medium tabular-nums">{formatAmount(caseData.paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-blue-100 pt-2">
                  <span className={remaining > 0 ? "text-red-600" : "text-green-600"}>{remaining > 0 ? "Остаток" : "Полностью погашено"}</span>
                  <span className={cn("tabular-nums", remaining > 0 ? "text-red-600" : "text-green-600")}>{formatAmount(Math.abs(remaining))}</span>
                </div>
              </div>

              {caseData.paymentDeadline && (
                <div className={cn("text-xs p-2.5 rounded-lg flex items-center gap-2 border", caseData.daysOverdue > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-600 border-blue-200")}>
                  <Clock className="w-3.5 h-3.5" />
                  <div>
                    <p>Срок оплаты: {caseData.paymentDeadline}</p>
                    {caseData.daysOverdue > 0 && <p className="font-bold mt-0.5">{caseData.daysOverdue} дн. просрочки!</p>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "payments" && (
          <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {caseData.payments.length === 0 ? (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm flex flex-col items-center justify-center py-12 text-blue-400">
                <CreditCard className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Оплаты отсутствуют</p>
              </div>
            ) : (
              <div className="space-y-3">
                {caseData.payments.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-blue-900">{p.description}</p>
                        <p className="text-xs text-blue-500 mt-1">Документ: {p.documentNumber}</p>
                        <p className="text-xs text-blue-500">От: {p.payer} → {p.payee}</p>
                        <p className="text-xs text-blue-500">Дата: {p.date}</p>
                      </div>
                      <span className="text-lg font-bold text-green-600 tabular-nums">{formatAmount(p.amount)}</span>
                    </div>
                  </motion.div>
                ))}
                <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-green-800">Итого оплачено</span>
                    <span className="text-green-600 tabular-nums">{formatAmount(caseData.paidAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "comments" && (
          <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {caseData.comments.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                      <User className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{c.author}</p>
                      <p className="text-[11px] text-blue-500">{c.role} · {c.date}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium", commentTypeStyles[c.type])}>
                    {commentTypeLabels[c.type]}
                  </span>
                </div>
                <p className="text-sm text-blue-800/90 ml-9">{c.text}</p>
                <div className="flex items-center gap-3 ml-9 mt-2">
                  <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600 transition-colors">
                    <ThumbsUp className="w-3 h-3" /> {c.likes > 0 && c.likes}
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Add comment - only for users with edit permission */}
            {canEdit && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Написать комментарий..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-blue-400"
                  />
                  <button className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative ml-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-200" />
              <div className="space-y-4">
                {caseData.events.map((e, i) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-6">
                    <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-blue-600 -translate-x-[3.5px]" />
                    <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">{e.action}</p>
                          {e.detail && <p className="text-xs text-blue-500 mt-0.5">{e.detail}</p>}
                          <p className="text-[11px] text-blue-400 mt-1">{e.user}</p>
                        </div>
                        <span className="text-xs text-blue-400">{e.date}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CaseDetail;
