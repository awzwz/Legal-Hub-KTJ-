import { getCounterparties, formatAmount, formatAmountShort, getFilteredCasesForUser, canViewAllCases, caseStatusLabels, courtInstanceLabels, caseTypeLabels, type Counterparty } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { Building2, Search, ExternalLink, Eye, ChevronDown, ChevronUp, TrendingDown, Trophy, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Публичная проверка по БИН — на `adata.kz` путь `/company/…` даёт 404; карточки на поддомене `pk.adata.kz`. */
const adataCompanyUrl = (bin: string) => `https://pk.adata.kz/company/${bin}`;

type SortKey = "debt" | "cases" | "active" | "paid";
type FilterKey = "all" | "with_debt" | "with_active" | "paid_off";

function riskLevel(cp: Counterparty): "high" | "medium" | "low" {
  const remaining = cp.totalDebt - cp.totalPaid;
  if (remaining > 50_000_000 && cp.activeCases > 0) return "high";
  if (remaining > 5_000_000 || cp.activeCases >= 3) return "medium";
  return "low";
}

const riskBadge: Record<"high" | "medium" | "low", { label: string; cls: string }> = {
  high: { label: "Высокий риск", cls: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Средний", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Низкий", cls: "bg-green-100 text-green-700 border-green-200" },
};

interface CounterpartiesPageProps {
  onCaseClick?: (id: string) => void;
}

const CounterpartiesPage = ({ onCaseClick }: CounterpartiesPageProps) => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("debt");
  const [filterBy, setFilterBy] = useState<FilterKey>("all");
  const { user } = useCurrentUser();
  const allCases = useCases();
  const userCases = getFilteredCasesForUser(user, allCases);
  const canViewAll = canViewAllCases(user);

  const counterparties = useMemo(() => getCounterparties(userCases), [userCases]);

  const top5 = useMemo(() =>
    [...counterparties]
      .filter(cp => cp.totalDebt - cp.totalPaid > 0)
      .sort((a, b) => (b.totalDebt - b.totalPaid) - (a.totalDebt - a.totalPaid))
      .slice(0, 5),
    [counterparties],
  );

  const totalAcrossAll = useMemo(() => {
    return counterparties.reduce((acc, cp) => ({
      debt: acc.debt + (cp.totalDebt - cp.totalPaid),
      cases: acc.cases + cp.totalCases,
      active: acc.active + cp.activeCases,
      paid: acc.paid + cp.totalPaid,
    }), { debt: 0, cases: 0, active: 0, paid: 0 });
  }, [counterparties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counterparties
      .filter(cp => {
        if (q && !(cp.name.toLowerCase().includes(q) || cp.bin.includes(q))) return false;
        const remaining = cp.totalDebt - cp.totalPaid;
        if (filterBy === "with_debt" && remaining <= 0) return false;
        if (filterBy === "with_active" && cp.activeCases === 0) return false;
        if (filterBy === "paid_off" && remaining > 0) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "debt": return (b.totalDebt - b.totalPaid) - (a.totalDebt - a.totalPaid);
          case "cases": return b.totalCases - a.totalCases;
          case "active": return b.activeCases - a.activeCases;
          case "paid": return b.totalPaid - a.totalPaid;
        }
      });
  }, [counterparties, search, filterBy, sortBy]);

  const detailCP = detailId ? counterparties.find(cp => cp.id === detailId) : null;
  const detailCases = detailCP
    ? userCases.filter(c => {
        const matchesCompany = detailCP.bin 
          ? c.companyBIN === detailCP.bin 
          : (c.company === detailCP.name && !c.companyBIN);
        return matchesCompany && (canViewAll || c.branch === user.branch);
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Контрагенты</h2>
          {!canViewAll && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs">
              <Eye className="w-3 h-3" />
              {user.branch}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{counterparties.length} компаний</span>
      </div>

      {/* Сводные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Всего контрагентов</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{counterparties.length}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Всего дел</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{totalAcrossAll.cases} <span className="text-sm text-muted-foreground font-medium">({totalAcrossAll.active} актив.)</span></p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <p className="text-[11px] text-red-700 uppercase tracking-wider">Совокупный остаток долга</p>
          <p className="text-xl font-bold text-red-700 mt-0.5">{formatAmountShort(totalAcrossAll.debt)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <p className="text-[11px] text-green-700 uppercase tracking-wider">Совокупно оплачено</p>
          <p className="text-xl font-bold text-green-700 mt-0.5">{formatAmountShort(totalAcrossAll.paid)}</p>
        </div>
      </div>

      {/* ТОП-5 по остатку долга */}
      {top5.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/60 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-900">ТОП-5 по остатку долга</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {top5.map((cp, idx) => (
              <button
                key={cp.id}
                onClick={() => setDetailId(cp.id)}
                className="text-left bg-white rounded-md p-2.5 border border-red-100 hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex-shrink-0">{idx + 1}</span>
                  <span className="text-xs font-medium text-gray-800 truncate" title={cp.name}>{cp.name}</span>
                </div>
                <p className="text-sm font-bold text-red-700 mt-1.5">{formatAmountShort(cp.totalDebt - cp.totalPaid)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{cp.activeCases} активных · {cp.totalCases} всего</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по названию или БИН..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md bg-muted border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterBy} onValueChange={v => setFilterBy(v as FilterKey)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все контрагенты</SelectItem>
            <SelectItem value="with_debt">С остатком долга</SelectItem>
            <SelectItem value="with_active">С активными делами</SelectItem>
            <SelectItem value="paid_off">Полностью погасили</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="debt">По остатку долга ↓</SelectItem>
            <SelectItem value="cases">По числу дел ↓</SelectItem>
            <SelectItem value="active">По активным делам ↓</SelectItem>
            <SelectItem value="paid">По оплаченному ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-2">Показано: <span className="font-medium">{filtered.length}</span> из {counterparties.length}</p>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Ничего не найдено. Попробуй изменить фильтры.
          </div>
        )}
        {filtered.map((cp, i) => {
          const isExpanded = expandedId === cp.id;
          const debtRemaining = cp.totalDebt - cp.totalPaid;
          const risk = riskLevel(cp);

          return (
            <motion.div
              key={cp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50 flex-shrink-0">
                    <Building2 className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{cp.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                        {cp.bin ? `БИН: ${cp.bin}` : "БИН отсутствует"}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded border flex-shrink-0", riskBadge[risk].cls)}>{riskBadge[risk].label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>{cp.totalCases} дел ({cp.activeCases} актив.)</span>
                      <span>Долг: <span className={cn("font-medium", debtRemaining > 0 ? "text-overdue" : "text-success")}>{formatAmount(debtRemaining)}</span></span>
                      <span>Оплачено: <span className="font-medium text-success">{formatAmount(cp.totalPaid)}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setDetailId(cp.id)}
                    >
                      <Eye className="w-3 h-3" />
                      Посмотреть
                    </Button>
                    {cp.bin ? (
                      <a
                        href={adataCompanyUrl(cp.bin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Карточка контрагента на pk.adata.kz (по БИН из дела)"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                          <ExternalLink className="w-3 h-3" />
                          aData
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-muted-foreground border-border bg-muted/20 opacity-50 cursor-not-allowed" disabled>
                        <ExternalLink className="w-3 h-3" />
                        aData
                      </Button>
                    )}
                    <button
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : cp.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 pt-3 border-t space-y-2">
                    {userCases.filter(c => (cp.bin ? c.companyBIN === cp.bin : (c.company === cp.name && !c.companyBIN)) && (canViewAll || c.branch === user.branch)).map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => onCaseClick?.(c.id)}
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{c.caseNumber}</span>
                          <span className="text-[10px] text-muted-foreground">{c.branch}</span>
                          <span className={cn("status-badge text-[10px]",
                            (c.status === "closed" || c.status === "execution")
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          )}>{caseStatusLabels[c.status]}</span>
                        </div>
                        <span className="text-xs tabular-nums">{formatAmount(c.claimAmount)}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailCP && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {detailCP.name}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {detailCP.bin ? `БИН: ${detailCP.bin}` : "БИН отсутствует"}
                  </p>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded border", riskBadge[riskLevel(detailCP)].cls)}>
                    {riskBadge[riskLevel(detailCP)].label}
                  </span>
                  {detailCP.bin && (
                    <a
                      href={adataCompanyUrl(detailCP.bin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Карточка контрагента на pk.adata.kz"
                    >
                      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                        <ExternalLink className="w-3 h-3" />
                        Открыть в aData
                      </Button>
                    </a>
                  )}
                </div>
              </DialogHeader>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Всего дел", value: detailCP.totalCases.toString() },
                  { label: "Активных", value: detailCP.activeCases.toString() },
                  { label: "Общий долг", value: formatAmountShort(detailCP.totalDebt) },
                  { label: "Оплачено", value: formatAmountShort(detailCP.totalPaid) },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold text-blue-900 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Остаток */}
              <div className="flex items-center justify-between bg-overdue/5 border border-overdue/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-sm font-medium text-overdue flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" /> Остаток долга
                </span>
                <span className="text-lg font-bold text-overdue">{formatAmountShort(detailCP.totalDebt - detailCP.totalPaid)}</span>
              </div>

              {/* Cases table */}
              <p className="text-sm font-semibold text-blue-900 mb-2">Дела ({detailCases.length})</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">№ дела</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Тип</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Статус</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Инстанция</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Юрист</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Филиал</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Сумма иска</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Оплачено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailCases.map((c, idx) => (
                      <tr
                        key={c.id}
                        className={cn("border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors", idx % 2 === 0 ? "" : "bg-muted/20")}
                        onClick={() => { setDetailId(null); onCaseClick?.(c.id); }}
                      >
                        <td className="px-3 py-2 font-medium text-blue-900">{c.caseNumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{caseTypeLabels[c.caseType]}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                            (c.status === "closed" || c.status === "execution")
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          )}>
                            {caseStatusLabels[c.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{courtInstanceLabels[c.courtInstance]}</td>
                        <td className="px-3 py-2">{c.assignedLawyer}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.branch}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatAmount(c.claimAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-success">{formatAmount(c.paidAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CounterpartiesPage;
