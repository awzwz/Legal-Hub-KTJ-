import { useState, useMemo } from "react";
import { Search, Filter, X, Eye } from "lucide-react";
import { caseOutcomeLabels, courtInstanceLabels, caseTypeLabels, partyRoleLabels, branches, canViewAllBranches, disputeCategoryLabels, visibleCaseStatuses, caseStatusGroup, type CaseStatus, type CaseOutcome, type CourtInstance, type CaseType, type PartyRole, type DisputeCategory, type LegalCase } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface CaseFilters {
  search: string;
  status: CaseStatus | "all";
  outcome: CaseOutcome | "all";
  courtInstance: CourtInstance | "all";
  caseType: CaseType | "all";
  partyRole: PartyRole | "all";
  disputeCategory: DisputeCategory | "all";
  branch: string;
  lawyer: string;
  overdueOnly: boolean;
  claimAmountFrom: number | "";
  claimAmountTo: number | "";
  /** Drill-down пресеты с карточек «Обзора» — фильтр по нескольким значениям сразу.
   *  Если заданы, имеют приоритет над одиночными outcome / status. */
  outcomeIn?: CaseOutcome[];
  statusIn?: CaseStatus[];
  /** Фильтр по уровню риска (для карточки «Высокий риск»). */
  riskLevelIn?: Array<"high" | "medium" | "low">;
  /** Точечный фильтр по ID дел (для карточки «Просроченные действия» — список дел с просроченными дедлайнами). */
  caseIdIn?: string[];
  /** Заголовок-чип для UX: показывает откуда пришёл drill-down (на верхней панели фильтров). */
  presetLabel?: string;
}

const defaultFilters: CaseFilters = {
  search: "", 
  status: "all", 
  outcome: "all",
  courtInstance: "all", 
  caseType: "all", 
  partyRole: "all",
  disputeCategory: "all",
  branch: "all", 
  lawyer: "all", 
  overdueOnly: false,
  claimAmountFrom: "",
  claimAmountTo: ""
};

interface CasesFilterBarProps {
  filters: CaseFilters;
  onFiltersChange: (filters: CaseFilters) => void;
  resultCount: number;
  /** ФИО для фильтра «Юрист» (активные пользователи-юристы + ответственные по делам). */
  lawyerOptions: string[];
}

const CasesFilterBar = ({ filters, onFiltersChange, resultCount, lawyerOptions }: CasesFilterBarProps) => {
  const [expanded, setExpanded] = useState(false);
  const { user } = useCurrentUser();
  const canViewAll = canViewAllBranches(user);

  // Restrict available branches for branch lawyers
  const availableBranches = canViewAll ? branches : (user.branch ? [user.branch] : []);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return v !== "";
    if (k === "overdueOnly") return v === true;
    if (k === "claimAmountFrom") return v !== "";
    if (k === "claimAmountTo") return v !== "";
    if (k === "outcomeIn" || k === "statusIn" || k === "riskLevelIn" || k === "caseIdIn") return Array.isArray(v) && v.length > 0;
    if (k === "presetLabel") return false;
    return v !== "all";
  }).length;

  const update = (patch: Partial<CaseFilters>) => onFiltersChange({ ...filters, ...patch });

  // Auto-set branch filter for branch lawyers
  useMemo(() => {
    if (!canViewAll && user.branch && filters.branch !== user.branch) {
      update({ branch: user.branch });
    }
  }, [canViewAll, user.branch, filters.branch]);

  return (
    <div className="bg-white rounded-xl border border-[hsl(215,35%,90%)] shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,55%)]" />
          <Input
            type="text"
            placeholder="Поиск по номеру, БИН, компании..."
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
            className="w-full pl-9"
          />
        </div>

        <Button
          variant={expanded || activeFilterCount > 0 ? "default" : "outline"}
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-2 px-3 transition-colors font-medium",
            expanded || activeFilterCount > 0 
              ? "bg-[hsl(192,72%,47%)] text-white hover:bg-[hsl(192,72%,42%)]" 
              : "text-[hsl(215,35%,35%)]"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[hsl(192,72%,47%)] text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            onClick={() => onFiltersChange(defaultFilters)}
            className="text-[hsl(215,20%,55%)] hover:text-[hsl(215,35%,35%)] transition-colors gap-2"
            title="Сбросить фильтры"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Сбросить</span>
          </Button>
        )}

        <span className="text-xs text-[hsl(215,20%,45%)] ml-auto">{resultCount} дел</span>
      </div>

      {filters.presetLabel && (
        <div className="flex items-center gap-2 -mt-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
            Из карточки: {filters.presetLabel}
            <button
              onClick={() => onFiltersChange(defaultFilters)}
              className="ml-0.5 hover:text-blue-900"
              title="Сбросить фильтр"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[hsl(215,35%,90%)] items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Статус дела</label>
            <Select value={filters.status} onValueChange={(v) => update({ status: v as CaseStatus | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {visibleCaseStatuses.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Результат</label>
            <Select value={filters.outcome} onValueChange={(v) => update({ outcome: v as CaseOutcome | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите результат" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(caseOutcomeLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Инстанция</label>
            <Select value={filters.courtInstance} onValueChange={(v) => update({ courtInstance: v as CourtInstance | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите инстанцию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(courtInstanceLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Тип дела</label>
            <Select value={filters.caseType} onValueChange={(v) => update({ caseType: v as CaseType | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {(["civil", "criminal", "administrative", "executive", "other"] as CaseType[]).map(v => (
                  <SelectItem key={v} value={v}>{caseTypeLabels[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Сторона</label>
            <Select value={filters.partyRole} onValueChange={(v) => update({ partyRole: v as PartyRole | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(partyRoleLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Категория иска</label>
            <Select value={filters.disputeCategory} onValueChange={(v) => update({ disputeCategory: v as DisputeCategory | "all" })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {(["procurement", "transportation", "government", "labor", "other"] as DisputeCategory[]).map(v => (
                  <SelectItem key={v} value={v}>{disputeCategoryLabels[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("flex flex-col gap-1.5", !canViewAll && "opacity-75")}>
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Участник</label>
            <Select disabled={!canViewAll} value={filters.branch} onValueChange={(v) => update({ branch: v })}>
              <SelectTrigger className={cn(!canViewAll && "cursor-not-allowed bg-[hsl(220,14%,94%)] opacity-100")}>
                {canViewAll ? <SelectValue placeholder="Выберите филиал" /> : <span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-[hsl(38,92%,50%)]" />Только ваш филиал</span>}
              </SelectTrigger>
              <SelectContent>
                {canViewAll && <SelectItem value="all">Все</SelectItem>}
                {availableBranches.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Юрист</label>
            <Select value={filters.lawyer} onValueChange={(v) => update({ lawyer: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите юриста" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {lawyerOptions.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider whitespace-nowrap">Сумма иска</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="От (₸)"
                value={filters.claimAmountFrom}
                onChange={(e) => update({ claimAmountFrom: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-9 text-sm px-2 w-full min-w-[80px]"
              />
              <span className="text-[hsl(215,20%,55%)]">-</span>
              <Input
                type="number"
                placeholder="До (₸)"
                value={filters.claimAmountTo}
                onChange={(e) => update({ claimAmountTo: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-9 text-sm px-2 w-full min-w-[80px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { CasesFilterBar, defaultFilters };

export const useFilteredCases = (filters: CaseFilters, cases?: LegalCase[]) => {
  const sourceCases = cases ?? [];
  return useMemo(() => {
    return sourceCases.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = c.caseNumber.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.companyBIN.includes(q) || c.assignedLawyer.toLowerCase().includes(q) || c.defendant.toLowerCase().includes(q) || c.plaintiff.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.statusIn && filters.statusIn.length > 0) {
        if (!filters.statusIn.includes(c.status)) return false;
      } else if (filters.status !== "all") {
        const targetGroup = caseStatusGroup[filters.status as CaseStatus];
        if (caseStatusGroup[c.status] !== targetGroup) return false;
      }
      if (filters.outcomeIn && filters.outcomeIn.length > 0) {
        if (!filters.outcomeIn.includes(c.outcome)) return false;
      } else if (filters.outcome !== "all" && c.outcome !== filters.outcome) return false;
      if (filters.riskLevelIn && filters.riskLevelIn.length > 0) {
        if (!filters.riskLevelIn.includes(c.riskLevel as "high" | "medium" | "low")) return false;
      }
      if (filters.caseIdIn && filters.caseIdIn.length > 0) {
        if (!filters.caseIdIn.includes(c.id)) return false;
      }
      if (filters.courtInstance !== "all" && c.courtInstance !== filters.courtInstance) return false;
      if (filters.caseType !== "all" && c.caseType !== filters.caseType) return false;
      if (filters.partyRole !== "all" && c.partyRole !== filters.partyRole) return false;
      if (filters.disputeCategory !== "all" && (c.disputeCategory ?? "procurement") !== filters.disputeCategory) return false;
      if (filters.branch !== "all" && c.branch !== filters.branch) return false;
      if (filters.lawyer !== "all" && c.assignedLawyer !== filters.lawyer) return false;
      if (filters.overdueOnly && c.daysOverdue === 0) return false;
      if (filters.claimAmountFrom !== "" && c.claimAmount < Number(filters.claimAmountFrom)) return false;
      if (filters.claimAmountTo !== "" && c.claimAmount > Number(filters.claimAmountTo)) return false;
      return true;
    });
  }, [filters, sourceCases]);
};
