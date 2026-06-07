import { useMemo, useRef, useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { formatAmount, caseStatusLabels, courtInstanceLabels, partyRoleLabels, caseTypeLabels, commentTypeLabels, canEditCase, canAddPayment, canViewAllCases, disputeCategoryLabels, allowedDisputeCategoriesForRole, type CaseDocument, type LegalCase, type CaseType, type CourtInstance, type PartyRole, type CaseStatus, type CaseOutcome, type DisputeCategory } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { toast } from "@/hooks/use-toast";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";
import { ArrowLeft, Calendar, MapPin, User, Building2, Scale, FileText, Clock, MessageSquare, History, CreditCard, ThumbsUp, Send, ShieldAlert, Eye, Lock, Paperclip, Trash2, Gavel, BriefcaseBusiness, HandCoins, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProceduralDeadlinesBlock from "@/components/dashboard/ProceduralDeadlinesBlock";

interface CaseDetailProps {
  caseId: string;
  onBack: () => void;
}

type Tab = "info" | "documents" | "payments" | "comments" | "timeline" | "litigation" | "enforcement" | "debt";

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
};

type CaseInfoDraft = {
  court: string;
  judge: string;
  plaintiff: string;
  defendant: string;
  company: string;
  companyBIN: string;
  city: string;
  courtInstance: LegalCase["courtInstance"];
  caseType: LegalCase["caseType"];
  partyRole: LegalCase["partyRole"];
  opponentType: LegalCase["opponentType"];
  claimAmount: string;
  mainDebt: string;
  stateFee: string;
  fines: string;
  repExpenses: string;
  otherCosts: string;
  paidAmount: string;
  recoveredMain: string;
  recoveredFines: string;
  recoveredStateFee: string;
  recoveredRepExpenses: string;
  disputeCategory: DisputeCategory;
  filingDate: string;
  lastUpdated: string;
  branchId: string;
  assignedLawyerId: string;
  status: LegalCase["status"];
  outcome: LegalCase["outcome"];
  riskLevel: LegalCase["riskLevel"];
  nextHearing: string;
  paymentDeadline: string;
  daysOverdue: string;
};

function initCaseInfoDraft(c: LegalCase): CaseInfoDraft {
  return {
    court: c.court,
    judge: c.judge,
    plaintiff: c.plaintiff,
    defendant: c.defendant,
    company: c.company,
    companyBIN: c.companyBIN,
    city: c.city,
    courtInstance: c.courtInstance,
    caseType: c.caseType,
    partyRole: c.partyRole,
    opponentType: c.opponentType,
    claimAmount: String(c.claimAmount),
    mainDebt: String(c.mainDebt),
    stateFee: String(c.stateFee),
    fines: String(c.fines),
    repExpenses: String(c.repExpenses),
    otherCosts: String(c.otherCosts),
    paidAmount: String(c.paidAmount),
    recoveredMain: String(c.recoveredMain ?? 0),
    recoveredFines: String(c.recoveredFines ?? 0),
    recoveredStateFee: String(c.recoveredStateFee ?? 0),
    recoveredRepExpenses: String(c.recoveredRepExpenses ?? 0),
    disputeCategory: c.disputeCategory ?? "procurement",
    filingDate: c.filingDate?.slice(0, 10) ?? "",
    lastUpdated: c.lastUpdated?.slice(0, 10) ?? "",
    branchId: c.branchId ?? "",
    assignedLawyerId: c.assignedLawyerId ?? "",
    status: c.status,
    outcome: c.outcome,
    riskLevel: c.riskLevel,
    nextHearing: c.nextHearing && c.nextHearing !== "not_set" ? String(c.nextHearing) : "",
    paymentDeadline: c.paymentDeadline ? c.paymentDeadline.slice(0, 10) : "",
    daysOverdue: String(c.daysOverdue ?? 0),
  };
}

function numClose(a: string, b: number): boolean {
  return Math.abs((Number(String(a).replace(/\s/g, "").replace(",", ".")) || 0) - b) < 0.01;
}

function buildCasePatch(before: LegalCase, d: CaseInfoDraft): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (d.court.trim() !== before.court) p.court = d.court.trim();
  if (d.judge.trim() !== before.judge) p.judge = d.judge.trim();
  if (d.plaintiff.trim() !== before.plaintiff) p.plaintiff = d.plaintiff.trim();
  if (d.defendant.trim() !== before.defendant) p.defendant = d.defendant.trim();
  if (d.company.trim() !== before.company) p.company = d.company.trim();
  if (d.companyBIN.trim() !== before.companyBIN) p.companyBIN = d.companyBIN.trim();
  if (d.city.trim() !== before.city) p.city = d.city.trim();
  if (d.courtInstance !== before.courtInstance) p.courtInstance = d.courtInstance;
  if (d.caseType !== before.caseType) p.caseType = d.caseType;
  if (d.partyRole !== before.partyRole) p.partyRole = d.partyRole;
  if (d.opponentType !== before.opponentType) p.opponentType = d.opponentType;
  if (!numClose(d.claimAmount, before.claimAmount)) p.claimAmount = Number(String(d.claimAmount).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.mainDebt, before.mainDebt)) p.mainDebt = Number(String(d.mainDebt).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.stateFee, before.stateFee)) p.stateFee = Number(String(d.stateFee).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.fines, before.fines)) p.fines = Number(String(d.fines).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.repExpenses, before.repExpenses)) p.repExpenses = Number(String(d.repExpenses).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.otherCosts, before.otherCosts)) p.otherCosts = Number(String(d.otherCosts).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.paidAmount, before.paidAmount)) p.paidAmount = Number(String(d.paidAmount).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.recoveredMain, before.recoveredMain ?? 0)) p.recoveredMain = Number(String(d.recoveredMain).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.recoveredFines, before.recoveredFines ?? 0)) p.recoveredFines = Number(String(d.recoveredFines).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.recoveredStateFee, before.recoveredStateFee ?? 0)) p.recoveredStateFee = Number(String(d.recoveredStateFee).replace(/\s/g, "").replace(",", "."));
  if (!numClose(d.recoveredRepExpenses, before.recoveredRepExpenses ?? 0)) p.recoveredRepExpenses = Number(String(d.recoveredRepExpenses).replace(/\s/g, "").replace(",", "."));
  if (d.disputeCategory !== (before.disputeCategory ?? "procurement")) p.disputeCategory = d.disputeCategory;
  const fd = d.filingDate.trim();
  if (fd && fd !== before.filingDate.slice(0, 10)) p.filingDate = fd;
  const lu = d.lastUpdated.trim();
  if (lu && lu !== before.lastUpdated.slice(0, 10)) p.lastUpdated = lu;
  if (d.branchId && d.branchId !== (before.branchId ?? "")) p.branchId = d.branchId;
  if (d.assignedLawyerId && d.assignedLawyerId !== (before.assignedLawyerId ?? "")) p.assignedLawyerId = d.assignedLawyerId;
  if (d.status !== before.status) p.status = d.status;
  if (d.outcome !== before.outcome) p.outcome = d.outcome;
  if (d.riskLevel !== before.riskLevel) p.riskLevel = d.riskLevel;
  const nh = d.nextHearing.trim();
  const prevNh = before.nextHearing && before.nextHearing !== "not_set" ? String(before.nextHearing).trim() : "";
  if (nh !== prevNh) p.nextHearing = nh.length ? nh : null;
  const pd = d.paymentDeadline.trim();
  const prevPd = before.paymentDeadline ?? "";
  if (pd !== prevPd.slice(0, 10)) p.paymentDeadline = pd || null;
  const dow = Number(d.daysOverdue);
  if (!Number.isNaN(dow) && dow !== before.daysOverdue) p.daysOverdue = dow;
  return p;
}

const commentTypeStyles: Record<string, string> = {
  question: "bg-blue-100 text-blue-700",
  clarify: "bg-orange-100 text-orange-700",
  problem: "bg-red-100 text-red-700",
  info: "bg-gray-100 text-gray-600",
};

const CaseDetail = ({ caseId, onBack }: CaseDetailProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentDeleteId, setDocumentDeleteId] = useState<string | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [litClaim, setLitClaim] = useState("");
  const [litJ1, setLitJ1] = useState("");
  const [litAppeal, setLitAppeal] = useState("");
  const [litCass, setLitCass] = useState("");
  const [litDamage, setLitDamage] = useState("");
  const [litWritReq, setLitWritReq] = useState("");
  const [litWritDisp, setLitWritDisp] = useState("");
  const [litExecProof, setLitExecProof] = useState("");
  const [litDefendantExec, setLitDefendantExec] = useState("");
  const [litThirdPartyNote, setLitThirdPartyNote] = useState("");
  const [savingLit, setSavingLit] = useState(false);
  const [enfDebtor, setEnfDebtor] = useState("");
  const [enfTotal, setEnfTotal] = useState("");
  const [enfStatus, setEnfStatus] = useState("");
  const [enfDate, setEnfDate] = useState("");
  const [savingEnf, setSavingEnf] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmt, setDebtAmt] = useState("");
  const [debtWork, setDebtWork] = useState("");
  const [debtDate, setDebtDate] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);
  const [infoEditing, setInfoEditing] = useState(false);
  const [infoDraft, setInfoDraft] = useState<CaseInfoDraft | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const { data: branchOptions = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const r = await fetch("/api/v1/branches", { headers: apiAuthHeaders() });
      if (!r.ok) return [];
      return (await r.json()) as { id: string; name: string; city: string | null }[];
    },
    staleTime: 5 * 60_000,
  });
  const { data: userOptions = [] } = useQuery({
    queryKey: ["directoryUsers"],
    queryFn: async () => {
      const r = await fetch("/api/v1/users", { headers: apiAuthHeaders() });
      if (!r.ok) return [];
      return (await r.json()) as { id: string; name: string; role: string; branch: string | null; email: string }[];
    },
    staleTime: 5 * 60_000,
  });
  const casesFromApi = useCases();
  const caseData = useMemo(
    () => casesFromApi.find((c) => c.id === caseId),
    [casesFromApi, caseId],
  );
  const { user } = useCurrentUser();

  useEffect(() => {
    const L = caseData?.litigation;
    setLitClaim(L?.claimSummary ?? "");
    setLitJ1(L?.judgmentFirst ?? "");
    setLitAppeal(L?.judgmentAppeal ?? "");
    setLitCass(L?.judgmentCassation ?? "");
    setLitDamage(L?.damageRecoveryNote ?? "");
    setLitWritReq(L?.writRequestNote ?? "");
    setLitWritDisp(L?.writDispatchNote ?? "");
    setLitExecProof(L?.executionProofNote ?? "");
    setLitDefendantExec(L?.defendantExecutionNote ?? "");
    setLitThirdPartyNote(L?.thirdPartyNote ?? "");
  }, [caseData?.id, caseData?.litigation]);

  useEffect(() => {
    setInfoEditing(false);
    setInfoDraft(null);
  }, [caseId]);

  const submitComment = async () => {
    const text = newComment.trim();
    if (!text || !caseData) return;
    setPostingComment(true);
    try {
      const r = await fetch(`/api/v1/cases/${caseData.id}/comments`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ text, type: "info" }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setNewComment("");
      await qc.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Комментарий сохранён" });
    } catch {
      toast({ variant: "destructive", title: "Не удалось отправить комментарий" });
    } finally {
      setPostingComment(false);
    }
  };

  if (!caseData) {
    return (
      <div className="max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Назад к реестру
        </button>
        <div className="rounded-xl border border-blue-100 bg-white p-6 text-sm text-blue-800 shadow-sm">
          <p className="font-semibold">Дело не найдено</p>
          <p className="mt-2 text-blue-600">
            Нет дела с таким идентификатором в текущем списке. Обновите реестр или откройте дело снова из таблицы.
          </p>
        </div>
      </div>
    );
  }

  const canEdit = canEditCase(user, caseData);
  const canViewAll = canViewAllCases(user);
  const isRestricted = !canViewAll && caseData.branch !== user.branch;
  const canDeleteCase = user.role === "director" || user.role === "chief_lawyer";

  const handleDeleteCase = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}`, {
        method: "DELETE",
        headers: apiAuthHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || `Ошибка ${res.status}`);
      }
      await qc.invalidateQueries({ queryKey: ["cases"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Дело удалено", description: `Дело ${caseData.caseNumber} и все связанные данные удалены.` });
      setDeleteOpen(false);
      onBack();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Не удалось удалить",
        description: e instanceof Error ? e.message : "Неизвестная ошибка",
      });
    } finally {
      setDeleting(false);
    }
  };

  const canUserDeleteDocument = (doc: CaseDocument) =>
    user.role === "director" || doc.author.trim() === user.name.trim();

  const showDocumentDeleteColumn =
    (caseData.documents?.length ?? 0) > 0 &&
    caseData.documents!.some((d) => canUserDeleteDocument(d));

  const docPendingDelete =
    documentDeleteId == null ? undefined : caseData.documents?.find((x) => x.id === documentDeleteId);
  const canConfirmDocumentDelete = docPendingDelete ? canUserDeleteDocument(docPendingDelete) : false;

  const downloadDocument = async (doc: CaseDocument) => {
    const downloadUrl =
      doc.downloadUrl || `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(doc.id)}/download`;
    try {
      const res = await fetch(downloadUrl, { headers: apiAuthHeaders() });
      if (!res.ok) {
        let msg = `Ошибка ${res.status}`;
        try {
          const j = (await res.json()) as { detail?: string; message?: string };
          msg = j.detail || j.message || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = doc.fileName || doc.title || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Не удалось скачать",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
      });
    }
  };

  const readMoney = (s: string) => Number(String(s).replace(/\s/g, "").replace(",", ".")) || 0;
  const finView =
    infoEditing && infoDraft
      ? {
          mainDebt: readMoney(infoDraft.mainDebt),
          stateFee: readMoney(infoDraft.stateFee),
          fines: readMoney(infoDraft.fines),
          repExpenses: readMoney(infoDraft.repExpenses),
          otherCosts: readMoney(infoDraft.otherCosts),
          paidAmount: readMoney(infoDraft.paidAmount),
          recoveredMain: readMoney(infoDraft.recoveredMain),
          recoveredFines: readMoney(infoDraft.recoveredFines),
          recoveredStateFee: readMoney(infoDraft.recoveredStateFee),
          recoveredRepExpenses: readMoney(infoDraft.recoveredRepExpenses),
        }
      : {
          mainDebt: caseData.mainDebt,
          stateFee: caseData.stateFee,
          fines: caseData.fines,
          repExpenses: caseData.repExpenses,
          otherCosts: caseData.otherCosts,
          paidAmount: caseData.paidAmount,
          recoveredMain: caseData.recoveredMain ?? 0,
          recoveredFines: caseData.recoveredFines ?? 0,
          recoveredStateFee: caseData.recoveredStateFee ?? 0,
          recoveredRepExpenses: caseData.recoveredRepExpenses ?? 0,
        };

  const totalDebt = finView.mainDebt + finView.stateFee + finView.fines + finView.repExpenses + finView.otherCosts;
  const remaining = totalDebt - finView.paidAmount;
  const paymentProgress = totalDebt > 0 ? (finView.paidAmount / totalDebt) * 100 : 0;

  const debtBreakdown = [
    { label: "Основной долг", value: finView.mainDebt, pct: (finView.mainDebt / totalDebt) * 100 || 0 },
    { label: "Госпошлина", value: finView.stateFee, pct: (finView.stateFee / totalDebt) * 100 || 0 },
    { label: "Штрафные санкции", value: finView.fines, pct: (finView.fines / totalDebt) * 100 || 0 },
    { label: "Представительские расходы", value: finView.repExpenses, pct: (finView.repExpenses / totalDebt) * 100 || 0 },
    { label: "Прочие издержки", value: finView.otherCosts, pct: (finView.otherCosts / totalDebt) * 100 || 0 },
  ];

  const caseTypeKeys: CaseType[] = ["civil", "labor", "administrative", "criminal", "other"];
  const courtInstKeys = Object.keys(courtInstanceLabels) as CourtInstance[];
  const partyRoleKeys = Object.keys(partyRoleLabels) as PartyRole[];
  const statusKeys: CaseStatus[] = ["active", "execution"]; // только два видимых статуса
  const outcomeKeys: CaseOutcome[] = ["fully_satisfied", "partially_satisfied", "denied", "settled", "dismissed", "pending", "returned"];
  const outcomeLabels: Record<CaseOutcome, string> = {
    fully_satisfied: "Полностью удовлетворено",
    partially_satisfied: "Частично",
    denied: "Отказано",
    settled: "Медиативное/мировое соглашение",
    dismissed: "Прекращено",
    pending: "Решение не вынесено",
    returned: "Иск возвращён",
  };
  const riskKeys = ["low", "medium", "high"] as const;

  const branchSelectRows =
    user.role === "branch_lawyer"
      ? branchOptions.filter((b) => b.id === (caseData.branchId ?? "") || b.name === caseData.branch).length > 0
        ? branchOptions.filter((b) => b.id === (caseData.branchId ?? "") || b.name === caseData.branch)
        : [{ id: caseData.branchId ?? "", name: caseData.branch, city: null as string | null }]
      : branchOptions;

  const saveInfo = async () => {
    if (!infoDraft) return;
    const patch = buildCasePatch(caseData, infoDraft);
    if (Object.keys(patch).length === 0) {
      toast({ title: "Нет изменений" });
      setInfoEditing(false);
      setInfoDraft(null);
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/v1/cases/${encodeURIComponent(caseData.id)}`, {
        method: "PATCH",
        headers: apiJsonHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      await qc.invalidateQueries({ queryKey: ["cases"] });
      setInfoEditing(false);
      setInfoDraft(null);
      toast({ title: "Сохранено", description: "Изменения записаны в журнал аудита." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Не удалось сохранить",
        description: e instanceof Error ? e.message.slice(0, 240) : "Ошибка",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "info", label: "Информация", icon: FileText },
    { id: "litigation", label: "Судебные материалы", icon: Gavel },
    { id: "enforcement", label: "Исполнительное производство", icon: BriefcaseBusiness, count: caseData.enforcementProceedings?.length ?? 0 },
    { id: "debt", label: "Дебиторка", icon: HandCoins, count: caseData.debtRecoveryEntries?.length ?? 0 },
    { id: "documents", label: "Документы", icon: Paperclip, count: caseData.documents?.length || 0 },
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
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border",
            caseData.status === "closed" ? "bg-green-100 text-green-700 border-green-200" :
            caseData.outcome === "fully_satisfied" ? "bg-green-100 text-green-700 border-green-200" :
            caseData.outcome === "denied" ? "bg-red-100 text-red-700 border-red-200" :
            "bg-blue-100 text-blue-700 border-blue-200"
          )}>
            {caseStatusLabels[caseData.status]}
          </span>
          {canDeleteCase && !isRestricted && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
              onClick={() => setDeleteOpen(true)}
              title="Удалить дело и все связанные данные"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить дело
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить дело {caseData.caseNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут удалены сразу и навсегда: финансы, комментарии, документы, процедурные дедлайны,
              исполнительные производства, история событий и связанные претензии. Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCase}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Удаление…" : "Удалить безвозвратно"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProceduralDeadlinesBlock caseId={caseData.id} />
      <RelatedClaimsBlock caseId={caseData.id} />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center whitespace-nowrap gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Детали дела
                </h3>
                {canEdit && !isRestricted && (
                  <div className="flex gap-2 shrink-0">
                    {!infoEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInfoDraft(initCaseInfoDraft(caseData));
                          setInfoEditing(true);
                        }}
                      >
                        Редактировать
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInfoEditing(false);
                            setInfoDraft(null);
                          }}
                          disabled={savingInfo}
                        >
                          Отмена
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)] text-white"
                          disabled={savingInfo || !infoDraft}
                          onClick={() => void saveInfo()}
                        >
                          {savingInfo ? "Сохранение…" : "Сохранить"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!infoEditing || !infoDraft ? (
                <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-blue-500 text-xs">Тип дела</p><p className="font-medium text-blue-900">{caseTypeLabels[caseData.caseType] || caseData.caseType}</p></div>
                <div><p className="text-blue-500 text-xs">Инстанция</p><p className="font-medium text-blue-900">{courtInstanceLabels[caseData.courtInstance]}</p></div>
                <div><p className="text-blue-500 text-xs">Сторона в суде</p><p className="font-medium text-blue-900">{partyRoleLabels[caseData.partyRole]}</p></div>
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
                  <div><p className="text-blue-500 text-xs">Ближайшее заседание</p>
                    <p className={cn("font-medium", caseData.nextHearing && caseData.nextHearing !== "not_set" ? "text-blue-700" : "text-blue-400")}>
                      {caseData.nextHearing === "not_set" ? "Не назначено" : (caseData.nextHearing || "Не назначено")}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex items-start gap-2">
                  <Gavel className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div><p className="text-blue-500 text-xs">Наименование суда</p><p className="font-medium text-blue-900">{caseData.court || "—"}</p></div>
                </div>
              </div>

              {/* BIN info */}
              <div className="border-t border-blue-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-500 text-xs">Контрагент:</span>
                  <span className="font-medium text-blue-900">{caseData.company}</span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">БИН/ИИН: {caseData.companyBIN}</span>
                </div>
              </div>
                </>
              ) : (
                <div className="space-y-4 border-t border-blue-100 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-blue-600">Тип дела</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.caseType}
                        onChange={(e) => setInfoDraft({ ...infoDraft, caseType: e.target.value as CaseType })}
                      >
                        {caseTypeKeys.map((k) => (
                          <option key={k} value={k}>
                            {caseTypeLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Инстанция</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.courtInstance}
                        onChange={(e) => setInfoDraft({ ...infoDraft, courtInstance: e.target.value as CourtInstance })}
                      >
                        {courtInstKeys.map((k) => (
                          <option key={k} value={k}>
                            {courtInstanceLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Сторона в суде</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.partyRole}
                        onChange={(e) => setInfoDraft({ ...infoDraft, partyRole: e.target.value as PartyRole })}
                      >
                        {partyRoleKeys.map((k) => (
                          <option key={k} value={k}>
                            {partyRoleLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Тип ответчика</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.opponentType}
                        onChange={(e) =>
                          setInfoDraft({ ...infoDraft, opponentType: e.target.value as LegalCase["opponentType"] })
                        }
                      >
                        <option value="juridical">Юридическое лицо</option>
                        <option value="physical">Физическое лицо</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Статус</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.status}
                        onChange={(e) => setInfoDraft({ ...infoDraft, status: e.target.value as CaseStatus })}
                      >
                        {statusKeys.map((k) => (
                          <option key={k} value={k}>
                            {caseStatusLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Исход</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.outcome}
                        onChange={(e) => setInfoDraft({ ...infoDraft, outcome: e.target.value as CaseOutcome })}
                      >
                        {outcomeKeys.map((k) => (
                          <option key={k} value={k}>
                            {outcomeLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Риск</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.riskLevel}
                        onChange={(e) =>
                          setInfoDraft({ ...infoDraft, riskLevel: e.target.value as LegalCase["riskLevel"] })
                        }
                      >
                        {riskKeys.map((k) => (
                          <option key={k} value={k}>
                            {riskLabels[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Сумма иска (₸)</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.claimAmount}
                        onChange={(e) => setInfoDraft({ ...infoDraft, claimAmount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Дата подачи иска</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={infoDraft.filingDate}
                        onChange={(e) => setInfoDraft({ ...infoDraft, filingDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Обновлено (дата)</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={infoDraft.lastUpdated}
                        onChange={(e) => setInfoDraft({ ...infoDraft, lastUpdated: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-blue-600">Суд</Label>
                      <Textarea
                        className="mt-1 min-h-[60px]"
                        value={infoDraft.court}
                        onChange={(e) => setInfoDraft({ ...infoDraft, court: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Судья</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.judge}
                        onChange={(e) => setInfoDraft({ ...infoDraft, judge: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Истец</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.plaintiff}
                        onChange={(e) => setInfoDraft({ ...infoDraft, plaintiff: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Ответчик</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.defendant}
                        onChange={(e) => setInfoDraft({ ...infoDraft, defendant: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Контрагент</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.company}
                        onChange={(e) => setInfoDraft({ ...infoDraft, company: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">БИН/ИИН</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.companyBIN}
                        onChange={(e) => setInfoDraft({ ...infoDraft, companyBIN: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Город</Label>
                      <Input className="mt-1" value={infoDraft.city} onChange={(e) => setInfoDraft({ ...infoDraft, city: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Филиал</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.branchId}
                        onChange={(e) => setInfoDraft({ ...infoDraft, branchId: e.target.value })}
                      >
                        {branchSelectRows.map((b) => (
                          <option key={b.id || b.name} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Ответственный юрист</Label>
                      <select
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={infoDraft.assignedLawyerId}
                        onChange={(e) => setInfoDraft({ ...infoDraft, assignedLawyerId: e.target.value })}
                      >
                        <option value="">—</option>
                        {userOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Следующее заседание</Label>
                      <Input
                        type="datetime-local"
                        className="mt-1"
                        value={infoDraft.nextHearing ? infoDraft.nextHearing.slice(0, 16) : ""}
                        onChange={(e) => setInfoDraft({ ...infoDraft, nextHearing: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Срок оплаты</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={infoDraft.paymentDeadline}
                        onChange={(e) => setInfoDraft({ ...infoDraft, paymentDeadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Дней просрочки</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={infoDraft.daysOverdue}
                        onChange={(e) => setInfoDraft({ ...infoDraft, daysOverdue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financial breakdown */}
            <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-blue-900">Финансовый блок</h3>
              {infoEditing && infoDraft && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <div>
                    <Label className="text-xs text-blue-600">Основной долг</Label>
                    <Input className="mt-1" value={infoDraft.mainDebt} onChange={(e) => setInfoDraft({ ...infoDraft, mainDebt: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Госпошлина</Label>
                    <Input className="mt-1" value={infoDraft.stateFee} onChange={(e) => setInfoDraft({ ...infoDraft, stateFee: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Штрафы</Label>
                    <Input className="mt-1" value={infoDraft.fines} onChange={(e) => setInfoDraft({ ...infoDraft, fines: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Предст. расходы</Label>
                    <Input className="mt-1" value={infoDraft.repExpenses} onChange={(e) => setInfoDraft({ ...infoDraft, repExpenses: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Прочие</Label>
                    <Input className="mt-1" value={infoDraft.otherCosts} onChange={(e) => setInfoDraft({ ...infoDraft, otherCosts: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Оплачено</Label>
                    <Input className="mt-1" value={infoDraft.paidAmount} onChange={(e) => setInfoDraft({ ...infoDraft, paidAmount: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 text-xs font-medium text-emerald-800 pt-1">
                    Взыскано по ПИР {caseData.partyRole === "plaintiff" ? "(кол. 13–15)" : caseData.partyRole === "defendant" ? "(кол. 14–17)" : "(кол. 15–18)"}
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Взыскано — основная</Label>
                    <Input className="mt-1" value={infoDraft.recoveredMain} onChange={(e) => setInfoDraft({ ...infoDraft, recoveredMain: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Взыскано — штрафы</Label>
                    <Input className="mt-1" value={infoDraft.recoveredFines} onChange={(e) => setInfoDraft({ ...infoDraft, recoveredFines: e.target.value })} />
                  </div>
                  {caseData.partyRole !== "plaintiff" && (
                    <div>
                      <Label className="text-xs text-blue-600">Взыскано — представительские</Label>
                      <Input
                        className="mt-1"
                        value={infoDraft.recoveredRepExpenses}
                        onChange={(e) => setInfoDraft({ ...infoDraft, recoveredRepExpenses: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-blue-600">Взыскано — госпошлина</Label>
                    <Input className="mt-1" value={infoDraft.recoveredStateFee} onChange={(e) => setInfoDraft({ ...infoDraft, recoveredStateFee: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <Label className="text-xs text-blue-600">Раздел в отчёте ПИР</Label>
                    <Select
                      value={infoDraft.disputeCategory}
                      onValueChange={(v) => setInfoDraft({ ...infoDraft, disputeCategory: v as DisputeCategory })}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allowedDisputeCategoriesForRole[infoDraft.partyRole].map((k) => (
                          <SelectItem key={k} value={k}>{disputeCategoryLabels[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
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
                {finView.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Оплачено</span>
                    <span className="text-green-600 font-medium tabular-nums">{formatAmount(finView.paidAmount)}</span>
                  </div>
                )}
                <div className="border-t border-emerald-100 pt-2 space-y-1 text-sm">
                  <p className="text-xs font-medium text-emerald-800">
                    Взыскано по ПИР {caseData.partyRole === "plaintiff"
                      ? "(кол. 13–15)"
                      : caseData.partyRole === "defendant"
                      ? "(кол. 14–17)"
                      : "(кол. 15–18)"}
                  </p>
                  <div className="flex justify-between">
                    <span className="text-blue-500">Основная</span>
                    <span className="font-medium tabular-nums text-blue-900">{formatAmount(finView.recoveredMain)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-500">Штрафные санкции</span>
                    <span className="font-medium tabular-nums text-blue-900">{formatAmount(finView.recoveredFines)}</span>
                  </div>
                  {caseData.partyRole !== "plaintiff" && (
                    <div className="flex justify-between">
                      <span className="text-blue-500">Представительские</span>
                      <span className="font-medium tabular-nums text-blue-900">{formatAmount(finView.recoveredRepExpenses ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-blue-500">Госпошлина</span>
                    <span className="font-medium tabular-nums text-blue-900">{formatAmount(finView.recoveredStateFee)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-blue-500 border-t border-blue-100 pt-2">
                  <span>Раздел ПИР</span>
                  <span className="font-medium text-blue-900">
                    {disputeCategoryLabels[(caseData.disputeCategory ?? "procurement") as DisputeCategory]}
                  </span>
                </div>
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

        {activeTab === "litigation" && (
          <motion.div key="litigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-blue-600" /> Тексты для отчёта ПИР
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-blue-600">Краткое содержание иска</Label>
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    value={litClaim}
                    onChange={(e) => setLitClaim(e.target.value)}
                    disabled={!canEdit || isRestricted}
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-600">Решение первой инстанции</Label>
                  <Textarea className="mt-1 min-h-[80px]" value={litJ1} onChange={(e) => setLitJ1(e.target.value)} disabled={!canEdit || isRestricted} />
                </div>
                <div>
                  <Label className="text-xs text-blue-600">Дата рассмотрения в апелляционном порядке и результат</Label>
                  <Textarea className="mt-1 min-h-[60px]" value={litAppeal} onChange={(e) => setLitAppeal(e.target.value)} disabled={!canEdit || isRestricted} />
                </div>
                <div>
                  <Label className="text-xs text-blue-600">Дата рассмотрения дела в кассационной порядке и результат</Label>
                  <Textarea className="mt-1 min-h-[60px]" value={litCass} onChange={(e) => setLitCass(e.target.value)} disabled={!canEdit || isRestricted} />
                </div>
                <div>
                  <Label className="text-xs text-blue-600">Возмещение ущерба</Label>
                  <Textarea className="mt-1 min-h-[50px]" value={litDamage} onChange={(e) => setLitDamage(e.target.value)} disabled={!canEdit || isRestricted} />
                </div>
                {caseData.partyRole === "plaintiff" && (
                  <>
                    <div>
                      <Label className="text-xs text-blue-600">Дата направления в суд заявления о выписке исполнительного листа</Label>
                      <Textarea className="mt-1 min-h-[50px]" value={litWritReq} onChange={(e) => setLitWritReq(e.target.value)} disabled={!canEdit || isRestricted} />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Сопроводительного письма суда о направлении исполнительного листа</Label>
                      <Textarea className="mt-1 min-h-[50px]" value={litWritDisp} onChange={(e) => setLitWritDisp(e.target.value)} disabled={!canEdit || isRestricted} />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-600">Дата и № документа, подтверждающего исполнение</Label>
                      <Textarea className="mt-1 min-h-[50px]" value={litExecProof} onChange={(e) => setLitExecProof(e.target.value)} disabled={!canEdit || isRestricted} />
                    </div>
                  </>
                )}
                {caseData.partyRole === "defendant" && (
                  <div>
                    <Label className="text-xs text-blue-600">Информация об исполнении (ПИР «ответчик» кол. 18) — № и дата документа</Label>
                    <Textarea
                      className="mt-1 min-h-[50px]"
                      value={litDefendantExec}
                      onChange={(e) => setLitDefendantExec(e.target.value)}
                      disabled={!canEdit || isRestricted}
                      placeholder="Например: пл.поручение №1509 от 03.02.2025"
                    />
                  </div>
                )}
                {caseData.partyRole === "third_party" && (
                  <div>
                    <Label className="text-xs text-blue-600">Примечание (ПИР «3-лицо/в качестве 3 лица» кол. 19)</Label>
                    <Textarea
                      className="mt-1 min-h-[50px]"
                      value={litThirdPartyNote}
                      onChange={(e) => setLitThirdPartyNote(e.target.value)}
                      disabled={!canEdit || isRestricted}
                      placeholder="Например: Участие в качестве заинтересованного лица"
                    />
                  </div>
                )}
              </div>
              {canEdit && !isRestricted && (
                <Button
                  type="button"
                  className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)]"
                  disabled={savingLit}
                  onClick={() => {
                    void (async () => {
                      setSavingLit(true);
                      try {
                        const res = await fetch(`/api/v1/cases/${encodeURIComponent(caseData.id)}/litigation`, {
                          method: "PUT",
                          headers: apiJsonHeaders(),
                          body: JSON.stringify({
                            claimSummary: litClaim,
                            judgmentFirst: litJ1,
                            judgmentAppeal: litAppeal,
                            judgmentCassation: litCass,
                            damageRecoveryNote: litDamage,
                            writRequestNote: litWritReq,
                            writDispatchNote: litWritDisp,
                            executionProofNote: litExecProof,
                            defendantExecutionNote: litDefendantExec,
                            thirdPartyNote: litThirdPartyNote,
                          }),
                        });
                        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                        await qc.invalidateQueries({ queryKey: ["cases"] });
                        toast({ title: "Сохранено" });
                      } catch {
                        toast({ variant: "destructive", title: "Не удалось сохранить" });
                      } finally {
                        setSavingLit(false);
                      }
                    })();
                  }}
                >
                  {savingLit ? "Сохранение…" : "Сохранить"}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "enforcement" && (
          <motion.div key="enforcement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {canEdit && !isRestricted && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-blue-900">Новая строка ИП</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">Должник</Label>
                    <Input className="mt-1" value={enfDebtor} onChange={(e) => setEnfDebtor(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Сумма к взысканию</Label>
                    <Input className="mt-1" type="number" value={enfTotal} onChange={(e) => setEnfTotal(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Статус ИП</Label>
                    <Input className="mt-1" value={enfStatus} onChange={(e) => setEnfStatus(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Дата учёта</Label>
                    <Input className="mt-1" type="date" value={enfDate} onChange={(e) => setEnfDate(e.target.value)} />
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)]"
                  disabled={savingEnf}
                  onClick={() => {
                    void (async () => {
                      setSavingEnf(true);
                      try {
                        const recordedAt = enfDate || new Date().toISOString().slice(0, 10);
                        const res = await fetch(`/api/v1/cases/${encodeURIComponent(caseData.id)}/enforcement-proceedings`, {
                          method: "POST",
                          headers: apiJsonHeaders(),
                          body: JSON.stringify({
                            debtorName: enfDebtor,
                            amountTotal: Number(enfTotal) || 0,
                            statusLabel: enfStatus,
                            recordedAt,
                          }),
                        });
                        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                        setEnfDebtor("");
                        setEnfTotal("");
                        setEnfStatus("");
                        setEnfDate("");
                        await qc.invalidateQueries({ queryKey: ["cases"] });
                        toast({ title: "Строка добавлена" });
                      } catch {
                        toast({ variant: "destructive", title: "Не удалось добавить" });
                      } finally {
                        setSavingEnf(false);
                      }
                    })();
                  }}
                >
                  {savingEnf ? "Сохранение…" : "Добавить"}
                </Button>
              </div>
            )}
            {(caseData.enforcementProceedings?.length ?? 0) === 0 ? (
              <div className="bg-white rounded-xl border border-blue-100 p-8 text-center text-sm text-blue-500">Нет записей исполнительного производства</div>
            ) : (
              <div className="space-y-2">
                {caseData.enforcementProceedings!.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-100 p-4 text-sm shadow-sm">
                    <div className="font-medium text-blue-900">{r.debtorName}</div>
                    <div className="text-blue-600 mt-1">Сумма: {formatAmount(r.amountTotal)} · {r.statusLabel}</div>
                    <div className="text-xs text-blue-400 mt-1">Дата: {r.recordedAt}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "debt" && (
          <motion.div key="debt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {canEdit && !isRestricted && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-blue-900">Новая запись по дебиторке</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-blue-600">Дебитор</Label>
                    <Input className="mt-1" value={debtName} onChange={(e) => setDebtName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Сумма задолженности</Label>
                    <Input className="mt-1" type="number" value={debtAmt} onChange={(e) => setDebtAmt(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-blue-600">Проводимая работа</Label>
                    <Textarea className="mt-1 min-h-[60px]" value={debtWork} onChange={(e) => setDebtWork(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-600">Дата учёта</Label>
                    <Input className="mt-1" type="date" value={debtDate} onChange={(e) => setDebtDate(e.target.value)} />
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)]"
                  disabled={savingDebt}
                  onClick={() => {
                    void (async () => {
                      setSavingDebt(true);
                      try {
                        const recordedAt = debtDate || new Date().toISOString().slice(0, 10);
                        const res = await fetch(`/api/v1/cases/${encodeURIComponent(caseData.id)}/debt-recovery-entries`, {
                          method: "POST",
                          headers: apiJsonHeaders(),
                          body: JSON.stringify({
                            debtorName: debtName,
                            debtAmount: Number(debtAmt) || 0,
                            workSummary: debtWork,
                            recordedAt,
                          }),
                        });
                        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                        setDebtName("");
                        setDebtAmt("");
                        setDebtWork("");
                        setDebtDate("");
                        await qc.invalidateQueries({ queryKey: ["cases"] });
                        toast({ title: "Запись добавлена" });
                      } catch {
                        toast({ variant: "destructive", title: "Не удалось добавить" });
                      } finally {
                        setSavingDebt(false);
                      }
                    })();
                  }}
                >
                  {savingDebt ? "Сохранение…" : "Добавить"}
                </Button>
              </div>
            )}
            {(caseData.debtRecoveryEntries?.length ?? 0) === 0 ? (
              <div className="bg-white rounded-xl border border-blue-100 p-8 text-center text-sm text-blue-500">Нет записей по снижению дебиторки</div>
            ) : (
              <div className="space-y-2">
                {caseData.debtRecoveryEntries!.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-100 p-4 text-sm shadow-sm">
                    <div className="font-medium text-blue-900">{r.debtorName}</div>
                    <div className="text-blue-600 mt-1">Долг: {formatAmount(r.debtAmount)} · Погашено: {formatAmount(r.paidAmount)}</div>
                    {r.workSummary ? <p className="text-xs text-blue-700 mt-2">{r.workSummary}</p> : null}
                    <div className="text-xs text-blue-400 mt-1">Дата: {r.recordedAt}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "documents" && (
          <motion.div key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            
            {/* Document upload form */}
            {canEdit && (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600" /> Прикрепить документ
                </h3>
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,.jpg,.jpeg"
                    aria-hidden
                    tabIndex={-1}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPendingFile(f ?? null);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={newDocumentTitle}
                      onChange={(e) => setNewDocumentTitle(e.target.value)}
                      placeholder="Название документа (например: Исковое заявление)"
                      className="flex-1"
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4" />
                        Выбрать файл
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            const titleStem =
                              newDocumentTitle.trim() ||
                              (pendingFile ? pendingFile.name.replace(/\.[^/.]+$/, "") : "") ||
                              (pendingFile?.name ?? "");
                            if (!pendingFile || !titleStem.trim()) return;
                            const body = new FormData();
                            body.append("title", titleStem);
                            body.append("file", pendingFile);
                            setSavingDoc(true);
                            try {
                              const res = await fetch(
                                `/api/v1/cases/${encodeURIComponent(caseId)}/documents`,
                                {
                                  method: "POST",
                                  headers: apiAuthHeaders(),
                                  body,
                                },
                              );
                              if (!res.ok) {
                                let msg = `Ошибка ${res.status}`;
                                try {
                                  const j = (await res.json()) as { detail?: string; message?: string };
                                  msg = j.detail || j.message || msg;
                                } catch {
                                  /* ignore */
                                }
                                throw new Error(msg);
                              }
                              setNewDocumentTitle("");
                              setPendingFile(null);
                              await qc.invalidateQueries({ queryKey: ["cases"] });
                              toast({
                                title: "Документ прикреплён",
                                description: "Файл сохранён в деле и доступен для скачивания.",
                              });
                            } catch (e) {
                              toast({
                                variant: "destructive",
                                title: "Не удалось сохранить",
                                description: e instanceof Error ? e.message : "Неизвестная ошибка",
                              });
                            } finally {
                              setSavingDoc(false);
                            }
                          })();
                        }}
                        className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)] whitespace-nowrap"
                        disabled={!pendingFile || savingDoc}
                      >
                        {savingDoc ? "Сохранение…" : "Сохранить"}
                      </Button>
                    </div>
                  </div>
                  {pendingFile && (
                    <p className="text-xs text-blue-600">
                      Выбран файл: <span className="font-medium text-blue-900">{pendingFile.name}</span>
                      {formatFileSize(pendingFile.size) ? ` · ${formatFileSize(pendingFile.size)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Document list */}
            {!caseData.documents || caseData.documents.length === 0 ? (
              <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm flex flex-col items-center justify-center py-12 text-blue-400">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Нет прикрепленных документов</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-blue-100 bg-blue-50/50 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Название</div>
                  <div className="w-24 shrink-0 hidden sm:block">Дата</div>
                  <div className="w-32 shrink-0 hidden md:block">Автор</div>
                  <div className="w-10 shrink-0 text-center" aria-hidden />
                  {showDocumentDeleteColumn && <div className="w-10 shrink-0 text-center" aria-hidden />}
                </div>
                <div className="divide-y divide-blue-50">
                  {caseData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0 font-medium text-blue-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate">{doc.title}</div>
                          {(doc.fileName || doc.sizeBytes) && (
                            <div className="text-xs font-normal text-blue-500 truncate">
                              {doc.fileName}
                              {doc.fileName && doc.sizeBytes ? " · " : ""}
                              {formatFileSize(doc.sizeBytes)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-24 shrink-0 text-blue-600 text-xs sm:text-sm tabular-nums hidden sm:block">
                        {doc.uploadDate}
                      </div>
                      <div className="w-32 shrink-0 text-blue-600 text-xs truncate hidden md:block">{doc.author}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        aria-label="Скачать документ"
                        disabled={!doc.downloadUrl}
                        onClick={() => void downloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canUserDeleteDocument(doc) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Удалить документ"
                          onClick={() => setDocumentDeleteId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AlertDialog
              open={documentDeleteId !== null}
              onOpenChange={(open) => {
                if (!open) setDocumentDeleteId(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {!docPendingDelete
                      ? "Документ будет убран из списка."
                      : !canConfirmDocumentDelete
                        ? "У вас нет прав на удаление этого документа (только автор или директор)."
                        : `«${docPendingDelete.title}» будет удалён из дела вместе с прикреплённым файлом.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
                    disabled={!canConfirmDocumentDelete || deletingDoc}
                    onClick={(e) => {
                      e.preventDefault();
                      void (async () => {
                        if (!documentDeleteId || !canConfirmDocumentDelete) return;
                        setDeletingDoc(true);
                        try {
                          const res = await fetch(
                            `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentDeleteId)}`,
                            { method: "DELETE", headers: apiAuthHeaders() },
                          );
                          if (!res.ok) {
                            let msg = `Ошибка ${res.status}`;
                            try {
                              const j = (await res.json()) as { message?: string };
                              if (j?.message) msg = j.message;
                            } catch {
                              /* ignore */
                            }
                            throw new Error(msg);
                          }
                          setDocumentDeleteId(null);
                          await qc.invalidateQueries({ queryKey: ["cases"] });
                          toast({ title: "Документ удалён" });
                        } catch (err) {
                          toast({
                            variant: "destructive",
                            title: "Не удалось удалить",
                            description: err instanceof Error ? err.message : "Неизвестная ошибка",
                          });
                        } finally {
                          setDeletingDoc(false);
                        }
                      })();
                    }}
                  >
                    {deletingDoc ? "Удаление…" : "Удалить"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={postingComment}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
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

/** Компактный блок со списком связанных претензий по делу. */
function RelatedClaimsBlock({ caseId }: { caseId: string }) {
  const { data: claims = [] } = useQuery({
    queryKey: ["claims-for-case", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/claims`, { headers: apiAuthHeaders() });
      if (!res.ok) return [];
      const all = (await res.json()) as Array<{ id: string; outgoingNumber: string; claimDate: string; subject: string; amount: number; status: string; caseId: string | null }>;
      return all.filter((c) => c.caseId === caseId);
    },
    staleTime: 60_000,
  });

  if (claims.length === 0) return null;

  const statusLabel: Record<string, string> = {
    collected: "Взыскано",
    not_collected: "Не взыскано",
    offset: "Удержано безакц.",
    recalculation: "Перерасчёт",
  };
  const statusCls: Record<string, string> = {
    collected: "bg-green-100 text-green-700 border-green-200",
    not_collected: "bg-amber-100 text-amber-700 border-amber-200",
    offset: "bg-blue-100 text-blue-700 border-blue-200",
    recalculation: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="mb-6 bg-amber-50/40 border border-amber-200 rounded-lg p-3">
      <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Связанные претензии ({claims.length})
      </h4>
      <div className="space-y-1">
        {claims.map((c) => (
          <div key={c.id} className="flex items-center gap-3 text-xs bg-white rounded-md px-2 py-1.5 border border-amber-100">
            <span className="font-medium text-blue-900 min-w-[180px]">{c.outgoingNumber}</span>
            <span className="text-muted-foreground">{c.claimDate}</span>
            <span className="flex-1 truncate text-slate-700">{c.subject}</span>
            <span className="tabular-nums">{formatAmount(c.amount)}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", statusCls[c.status] || "")}>
              {statusLabel[c.status] || c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
