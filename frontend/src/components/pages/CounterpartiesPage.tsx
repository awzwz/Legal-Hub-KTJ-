import { getCounterparties, formatAmount, formatAmountShort, getFilteredCasesForUser, canViewAllCases, caseStatusLabels, courtInstanceLabels, caseTypeLabels } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { Building2, Search, ExternalLink, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Публичная проверка по БИН — на `adata.kz` путь `/company/…` даёт 404; карточки на поддомене `pk.adata.kz`. */
const adataCompanyUrl = (bin: string) => `https://pk.adata.kz/company/${bin}`;

interface CounterpartiesPageProps {
  onCaseClick?: (id: string) => void;
}

const CounterpartiesPage = ({ onCaseClick }: CounterpartiesPageProps) => {
  const [search, setSearch] = useState("");
  const [expandedBIN, setExpandedBIN] = useState<string | null>(null);
  const [detailBIN, setDetailBIN] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const allCases = useCases();
  const userCases = getFilteredCasesForUser(user, allCases);
  const canViewAll = canViewAllCases(user);

  const counterparties = useMemo(() => getCounterparties(userCases), [userCases]);

  const filtered = counterparties.filter(cp =>
    cp.name.toLowerCase().includes(search.toLowerCase()) || cp.bin.includes(search)
  );

  const detailCP = detailBIN ? counterparties.find(cp => cp.bin === detailBIN) : null;
  const detailCases = detailBIN
    ? userCases.filter(c => c.companyBIN === detailBIN && (canViewAll || c.branch === user.branch))
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

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по названию или БИН..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-md bg-muted border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((cp, i) => {
          const isExpanded = expandedBIN === cp.bin;
          const debtRemaining = cp.totalDebt - cp.totalPaid;

          return (
            <motion.div
              key={cp.bin}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50 flex-shrink-0">
                    <Building2 className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{cp.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">БИН: {cp.bin}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
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
                      onClick={() => setDetailBIN(cp.bin)}
                    >
                      <Eye className="w-3 h-3" />
                      Посмотреть
                    </Button>
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
                    <button
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => setExpandedBIN(isExpanded ? null : cp.bin)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 pt-3 border-t space-y-2">
                    {userCases.filter(c => c.companyBIN === cp.bin && (canViewAll || c.branch === user.branch)).map(c => (
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
                            c.status === "closed" ? "bg-green-100 text-green-700 border border-green-200" :
                            c.outcome === "fully_satisfied" ? "bg-success/10 text-success" :
                            c.outcome === "denied" ? "bg-overdue/10 text-overdue" :
                            "bg-primary/10 text-primary"
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
      <Dialog open={!!detailBIN} onOpenChange={(open) => !open && setDetailBIN(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailCP && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {detailCP.name}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground">БИН: {detailCP.bin}</p>
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
                <span className="text-sm font-medium text-overdue">Остаток долга</span>
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
                        onClick={() => { setDetailBIN(null); onCaseClick?.(c.id); }}
                      >
                        <td className="px-3 py-2 font-medium text-blue-900">{c.caseNumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{caseTypeLabels[c.caseType]}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                            c.outcome === "fully_satisfied" ? "bg-success/10 text-success" :
                            c.outcome === "denied" ? "bg-overdue/10 text-overdue" :
                            "bg-primary/10 text-primary"
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
