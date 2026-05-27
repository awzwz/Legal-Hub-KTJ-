import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Calendar, ExternalLink, FileText, Hash, Pencil, Trash2, User, Briefcase, Banknote, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiAuthHeaders } from "@/lib/api";
import { formatAmount } from "@/data/mockData";
import { claimStatusLabels, claimStatusBadgeClass, type Claim } from "@/lib/claims";
import { useDeleteClaim } from "@/hooks/useClaims";
import { toast } from "@/hooks/use-toast";

interface ClaimDetailProps {
  claimId: string;
  onBack: () => void;
  onEdit: (claim: Claim) => void;
  onCaseClick?: (caseId: string) => void;
}

const ClaimDetail = ({ claimId, onBack, onEdit, onCaseClick }: ClaimDetailProps) => {
  const { data: claim, isLoading, refetch } = useQuery({
    queryKey: ["claim", claimId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/claims/${claimId}`, { headers: apiAuthHeaders() });
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      return (await res.json()) as Claim;
    },
  });

  const deleteMutation = useDeleteClaim();

  // Загрузим другие претензии этого же контрагента (по БИНу или по имени)
  const { data: relatedByCounterparty = [] } = useQuery({
    queryKey: ["claims-by-counterparty", claim?.counterpartyBIN || claim?.counterpartyName],
    queryFn: async () => {
      if (!claim) return [];
      const params = new URLSearchParams();
      if (claim.counterpartyBIN) {
        params.set("counterpartyBin", claim.counterpartyBIN);
      } else {
        params.set("search", claim.counterpartyName);
      }
      const res = await fetch(`/api/v1/claims?${params.toString()}`, { headers: apiAuthHeaders() });
      if (!res.ok) return [];
      const arr = (await res.json()) as Claim[];
      return arr.filter((c) => c.id !== claim.id);
    },
    enabled: !!claim,
  });

  const statsByCounterparty = useMemo(() => {
    const arr = [...relatedByCounterparty, ...(claim ? [claim] : [])];
    const stats = {
      total: { count: 0, amount: 0 },
      collected: { count: 0, amount: 0 },
      not_collected: { count: 0, amount: 0 },
      offset: { count: 0, amount: 0 },
      recalculation: { count: 0, amount: 0 },
    };
    for (const c of arr) {
      stats.total.count++;
      stats.total.amount += c.amount;
      stats[c.status].count++;
      stats[c.status].amount += c.amount;
    }
    return stats;
  }, [relatedByCounterparty, claim]);

  const handleDelete = async () => {
    if (!claim) return;
    if (!confirm(`Удалить претензию ${claim.outgoingNumber}?`)) return;
    try {
      await deleteMutation.mutateAsync(claim.id);
      toast({ title: "Удалено" });
      onBack();
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  if (isLoading || !claim) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">Загрузка...</div>
    );
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors mb-4 font-medium">
        <ArrowLeft className="w-4 h-4" /> Назад к реестру претензий
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">ИСХ.№</span>
              <h2 className="text-xl font-bold text-blue-900">{claim.outgoingNumber}</h2>
              <span className={cn("text-xs px-2.5 py-1 rounded border font-medium", claimStatusBadgeClass[claim.status])}>
                {claimStatusLabels[claim.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {fmtDate(claim.claimDate)}</span>
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {claim.counterpartyName}</span>
              {claim.counterpartyBIN && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">БИН: {claim.counterpartyBIN}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(claim)} className="h-8 gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Редактировать
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="w-3.5 h-3.5" /> Удалить
            </Button>
          </div>
        </div>

        {/* Amount large */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-[11px] text-blue-700 uppercase tracking-wider">Сумма претензии</p>
            <p className="text-2xl font-bold text-blue-900 mt-1 tabular-nums">{formatAmount(claim.amount)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Создано</p>
            <p className="text-sm font-medium mt-1">{fmtDate(claim.createdAt)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Обновлено</p>
            <p className="text-sm font-medium mt-1">{fmtDate(claim.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Левый блок — содержание */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900">
              <FileText className="w-4 h-4" /> Сущность претензии
            </h3>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{claim.subject}</p>
          </div>

          {claim.statusDetail && (
            <div className="bg-white rounded-lg border p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900">
                <Banknote className="w-4 h-4" /> Детализация статуса
              </h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{claim.statusDetail}</p>
            </div>
          )}

          {claim.notes && (
            <div className="bg-amber-50/40 rounded-lg border border-amber-200 p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-900">
                <FileText className="w-4 h-4" /> Примечание
              </h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-amber-950">{claim.notes}</p>
            </div>
          )}

          {/* Другие претензии этого контрагента */}
          {relatedByCounterparty.length > 0 && (
            <div className="bg-white rounded-lg border p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900">
                <LinkIcon className="w-4 h-4" /> Другие претензии того же контрагента ({relatedByCounterparty.length})
              </h3>
              <div className="space-y-1">
                {relatedByCounterparty.slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      // переход — заменим claimId через onBack + повторное открытие потребует логики наверху;
                      // здесь просто навигация по URL не нужна — обновим query через ключ
                      window.dispatchEvent(new CustomEvent("claim-open", { detail: c.id }));
                    }}
                    className="w-full flex items-center gap-3 text-xs p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="font-medium text-blue-900 min-w-[180px] truncate">{c.outgoingNumber}</span>
                    <span className="text-muted-foreground tabular-nums">{c.claimDate}</span>
                    <span className="flex-1 truncate text-slate-700">{c.subject}</span>
                    <span className="tabular-nums whitespace-nowrap">{formatAmount(c.amount)}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap", claimStatusBadgeClass[c.status])}>
                      {claimStatusLabels[c.status]}
                    </span>
                  </button>
                ))}
                {relatedByCounterparty.length > 15 && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2">... и ещё {relatedByCounterparty.length - 15}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Правый блок — метаданные и сводка */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-3 text-blue-900">Параметры</h3>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3 h-3" /> ИСХ.№
                </dt>
                <dd className="font-medium mt-0.5">{claim.outgoingNumber}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Контрагент
                </dt>
                <dd className="font-medium mt-0.5">{claim.counterpartyName}</dd>
                {claim.counterpartyBIN && (
                  <dd className="text-[11px] text-muted-foreground mt-0.5">БИН: {claim.counterpartyBIN}</dd>
                )}
              </div>
              {claim.branchName && (
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">Филиал</dt>
                  <dd className="font-medium mt-0.5">{claim.branchName}</dd>
                </div>
              )}
              {claim.assignedLawyerName && (
                <div>
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> Юрист
                  </dt>
                  <dd className="font-medium mt-0.5">{claim.assignedLawyerName}</dd>
                </div>
              )}
            </dl>
          </div>

          {claim.case && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-900">
                <Briefcase className="w-4 h-4" /> Связанное дело
              </h3>
              <button
                onClick={() => claim.case && onCaseClick?.(claim.case.id)}
                className="w-full text-left bg-white rounded-md p-3 border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">{claim.case.caseNumber}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Статус: {claim.case.status}</p>
                <p className="text-[11px] text-muted-foreground">Сторона: {claim.case.partyRole}</p>
              </button>
            </div>
          )}

          {/* Сводка по контрагенту */}
          {relatedByCounterparty.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3 text-blue-900">Сводка по контрагенту</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Всего претензий</span>
                  <span className="font-semibold tabular-nums">{statsByCounterparty.total.count}</span>
                </div>
                <div className="flex items-center justify-between text-green-700">
                  <span>Взыскано</span>
                  <span className="tabular-nums">{statsByCounterparty.collected.count}</span>
                </div>
                <div className="flex items-center justify-between text-amber-700">
                  <span>Не взыскано</span>
                  <span className="tabular-nums">{statsByCounterparty.not_collected.count}</span>
                </div>
                <div className="flex items-center justify-between text-blue-700">
                  <span>Удержано безакц.</span>
                  <span className="tabular-nums">{statsByCounterparty.offset.count}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 border-t pt-1.5 mt-1">
                  <span className="font-medium">Общая сумма</span>
                  <span className="font-bold tabular-nums">{formatAmount(statsByCounterparty.total.amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ClaimDetail;
