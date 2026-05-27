import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useClaims, useDeleteClaim } from "@/hooks/useClaims";
import { canViewAllCases, formatAmount, formatAmountShort } from "@/data/mockData";
import { claimStatusShortLabels, claimStatusBadgeClass, type Claim, type ClaimStatus } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Search, Trash2, ExternalLink, ChevronRight } from "lucide-react";
import AddClaimDialog from "@/components/dashboard/AddClaimDialog";
import ClaimDetail from "@/components/dashboard/ClaimDetail";
import { toast } from "@/hooks/use-toast";
import { apiAuthHeaders } from "@/lib/api";

interface ClaimsPageProps {
  onCaseClick?: (caseId: string) => void;
}

type YearFilter = "all" | "2025" | "2026";

const ClaimsPage = ({ onCaseClick }: ClaimsPageProps) => {
  const { user } = useCurrentUser();
  const canViewAll = canViewAllCases(user);
  const [year, setYear] = useState<YearFilter>("all");
  const [status, setStatus] = useState<"all" | ClaimStatus>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Claim | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Глобальное событие «открыть претензию» — используется из ClaimDetail для перехода
  // на другую претензию того же контрагента.
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === "string") setSelectedClaimId(id);
    };
    window.addEventListener("claim-open", handler);
    return () => window.removeEventListener("claim-open", handler);
  }, []);

  const filters = useMemo(() => {
    const f: { dateFrom?: string; dateTo?: string; status?: string; search?: string } = {};
    if (year === "2025") { f.dateFrom = "2025-01-01"; f.dateTo = "2025-12-31"; }
    if (year === "2026") { f.dateFrom = "2026-01-01"; f.dateTo = "2026-12-31"; }
    if (status !== "all") f.status = status;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [year, status, search]);

  const { data: claims = [], isLoading } = useClaims(filters);
  const deleteMutation = useDeleteClaim();

  const stats = useMemo(() => {
    const init = {
      total: { count: 0, amount: 0 },
      collected: { count: 0, amount: 0 },
      not_collected: { count: 0, amount: 0 },
      offset: { count: 0, amount: 0 },
      recalculation: { count: 0, amount: 0 },
    };
    for (const c of claims) {
      init.total.count++;
      init.total.amount += c.amount;
      init[c.status].count++;
      init[c.status].amount += c.amount;
    }
    return init;
  }, [claims]);

  const handleExport = async () => {
    const dateFrom = filters.dateFrom || "2025-01-01";
    const dateTo = filters.dateTo || "2026-12-31";
    try {
      const res = await fetch(`/api/v1/claims/export.xlsx?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Реестр претензий ${dateFrom} — ${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ variant: "destructive", title: "Не удалось скачать", description: String((e as Error).message) });
    }
  };

  const handleDelete = async (claim: Claim) => {
    if (!confirm(`Удалить претензию ${claim.outgoingNumber}?`)) return;
    try {
      await deleteMutation.mutateAsync(claim.id);
      toast({ title: "Удалено" });
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка удаления", description: String((e as Error).message) });
    }
  };

  if (selectedClaimId) {
    return (
      <>
        <ClaimDetail
          claimId={selectedClaimId}
          onBack={() => setSelectedClaimId(null)}
          onEdit={(c) => { setEditing(c); setDialogOpen(true); }}
          onCaseClick={onCaseClick}
        />
        <AddClaimDialog open={dialogOpen} onOpenChange={setDialogOpen} claim={editing} />
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Претензии</h2>
          {!canViewAll && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs">
              <Eye className="w-3 h-3" />
              {user.branch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-2">
            <Download className="w-3.5 h-3.5" /> Скачать xlsx
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }} className="h-8 gap-2">
            <Plus className="w-3.5 h-3.5" /> Добавить претензию
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Всего</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{stats.total.count}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatAmountShort(stats.total.amount)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <p className="text-[11px] text-green-700 uppercase tracking-wider">Взыскано</p>
          <p className="text-xl font-bold text-green-700 mt-0.5">{stats.collected.count}</p>
          <p className="text-[11px] text-green-600 mt-0.5">{formatAmountShort(stats.collected.amount)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-[11px] text-amber-700 uppercase tracking-wider">Не взыскано</p>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.not_collected.count}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">{formatAmountShort(stats.not_collected.amount)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-[11px] text-blue-700 uppercase tracking-wider">Удержано безакц.</p>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.offset.count}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">{formatAmountShort(stats.offset.amount)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-[11px] text-slate-700 uppercase tracking-wider">Перерасчёт</p>
          <p className="text-xl font-bold text-slate-700 mt-0.5">{stats.recalculation.count}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{formatAmountShort(stats.recalculation.amount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по ИСХ.№, сущности или контрагенту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={year} onValueChange={(v) => setYear(v as YearFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все годы</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="collected">Взыскано</SelectItem>
            <SelectItem value="not_collected">Не взыскано</SelectItem>
            <SelectItem value="offset">Удержано безакц.</SelectItem>
            <SelectItem value="recalculation">Перерасчёт</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-2">Показано: <span className="font-medium">{claims.length}</span> {isLoading && "(загрузка...)"}</p>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">№</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ИСХ.№</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Дата</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Контрагент</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Сущность</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Сумма</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Статус</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Дело</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                  <FileSpreadsheet className="w-7 h-7 mx-auto mb-1 opacity-40" />
                  Нет претензий по выбранным фильтрам
                </td></tr>
              )}
              {claims.map((c, idx) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.005, 0.2) }}
                  onClick={() => setSelectedClaimId(c.id)}
                  className={cn(
                    "border-b last:border-0 hover:bg-blue-50/60 transition-colors cursor-pointer",
                    idx % 2 === 1 ? "bg-muted/10" : "",
                  )}
                  title="Открыть детальный просмотр"
                >
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-blue-900">
                    <span className="inline-flex items-center gap-1">
                      {c.outgoingNumber}
                      <ChevronRight className="w-3 h-3 opacity-50" />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{c.claimDate}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.counterpartyName}</div>
                    {c.counterpartyBIN && (
                      <div className="text-[10px] text-muted-foreground">БИН: {c.counterpartyBIN}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[280px]">
                    <span className="line-clamp-2" title={c.subject}>{c.subject}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatAmount(c.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] border", claimStatusBadgeClass[c.status])}>
                      {claimStatusShortLabels[c.status]}
                    </span>
                    {c.statusDetail && (
                      <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1" title={c.statusDetail}>
                        {c.statusDetail}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.case ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (c.case) onCaseClick?.(c.case.id); }}
                        className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {c.case.caseNumber}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(c); setDialogOpen(true); }}
                      className="p-1 rounded hover:bg-blue-50 text-blue-600"
                      title="Редактировать"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                      className="p-1 rounded hover:bg-red-50 text-red-600 ml-1"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddClaimDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        claim={editing}
      />
    </div>
  );
};

export default ClaimsPage;
