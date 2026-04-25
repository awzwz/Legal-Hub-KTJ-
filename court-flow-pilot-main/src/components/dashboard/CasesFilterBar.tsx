import { useState, useMemo } from "react";
import { Search, Filter, X, ChevronDown, Eye } from "lucide-react";
import { mockCases, caseStatusLabels, courtInstanceLabels, caseTypeLabels, partyRoleLabels, branches, lawyers, canViewAllBranches, type CaseStatus, type CourtInstance, type CaseType, type PartyRole } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

export interface CaseFilters {
  search: string;
  status: CaseStatus | "all";
  courtInstance: CourtInstance | "all";
  caseType: CaseType | "all";
  partyRole: PartyRole | "all";
  branch: string;
  lawyer: string;
  overdueOnly: boolean;
}

const defaultFilters: CaseFilters = {
  search: "", status: "all", courtInstance: "all", caseType: "all", partyRole: "all", branch: "all", lawyer: "all", overdueOnly: false,
};

interface CasesFilterBarProps {
  filters: CaseFilters;
  onFiltersChange: (filters: CaseFilters) => void;
  resultCount: number;
}

const FilterSelect = ({ label, value, onChange, options, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) => (
  <div className={cn("flex flex-col gap-1", disabled && "opacity-60")}>
    <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "appearance-none w-full bg-[hsl(220,14%,96%)] border border-[hsl(215,35%,85%)] rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-[hsl(192,72%,47%)] focus:border-[hsl(192,72%,47%)] cursor-pointer text-[hsl(215,35%,15%)]",
          disabled && "cursor-not-allowed bg-[hsl(220,14%,94%)] border-[hsl(215,20%,75%)]"
        )}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(215,20%,55%)] pointer-events-none" />
    </div>
  </div>
);

const CasesFilterBar = ({ filters, onFiltersChange, resultCount }: CasesFilterBarProps) => {
  const [expanded, setExpanded] = useState(false);
  const { user } = useCurrentUser();
  const canViewAll = canViewAllBranches(user);

  // Restrict available branches for branch lawyers
  const availableBranches = canViewAll ? branches : (user.branch ? [user.branch] : []);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return v !== "";
    if (k === "overdueOnly") return v === true;
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
    <div className="bg-white rounded-xl border border-[hsl(215,35%,90%)] shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,55%)]" />
          <input
            type="text"
            placeholder="Поиск по номеру, БИН, компании..."
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-[hsl(220,14%,96%)] border border-[hsl(215,35%,85%)] outline-none focus:ring-2 focus:ring-[hsl(192,72%,47%)] focus:border-[hsl(192,72%,47%)] placeholder:text-[hsl(215,20%,55%)]"
          />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors font-medium",
            expanded || activeFilterCount > 0 ? "bg-[hsl(192,72%,47%)] text-white" : "bg-[hsl(220,14%,96%)] text-[hsl(215,35%,35%)] hover:bg-[hsl(220,14%,94%)] border border-[hsl(215,35%,85%)]"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[hsl(192,72%,47%)] text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={() => onFiltersChange(defaultFilters)}
            className="p-2 text-[hsl(215,20%,55%)] hover:text-[hsl(215,35%,35%)] transition-colors"
            title="Сбросить фильтры"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <span className="text-xs text-[hsl(215,20%,45%)] ml-auto">{resultCount} дел</span>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-[hsl(215,35%,90%)]">
          <FilterSelect label="Статус" value={filters.status} onChange={v => update({ status: v as CaseStatus | "all" })}
            options={[{ value: "all", label: "Все" }, ...Object.entries(caseStatusLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterSelect label="Инстанция" value={filters.courtInstance} onChange={v => update({ courtInstance: v as CourtInstance | "all" })}
            options={[{ value: "all", label: "Все" }, ...Object.entries(courtInstanceLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterSelect label="Тип дела" value={filters.caseType} onChange={v => update({ caseType: v as CaseType | "all" })}
            options={[{ value: "all", label: "Все" }, ...Object.entries(caseTypeLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterSelect label="Роль" value={filters.partyRole} onChange={v => update({ partyRole: v as PartyRole | "all" })}
            options={[{ value: "all", label: "Все" }, ...Object.entries(partyRoleLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <div className={cn("flex flex-col gap-1", !canViewAll && "opacity-75")}>
            <label className="text-[11px] font-medium text-[hsl(215,35%,45%)] uppercase tracking-wider">Филиал</label>
            <div className="relative">
              <select
                value={filters.branch}
                onChange={e => update({ branch: e.target.value })}
                disabled={!canViewAll}
                className={cn(
                  "appearance-none w-full bg-[hsl(220,14%,96%)] border border-[hsl(215,35%,85%)] rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-[hsl(192,72%,47%)] focus:border-[hsl(192,72%,47%)] cursor-pointer text-[hsl(215,35%,15%)]",
                  !canViewAll && "cursor-not-allowed bg-[hsl(220,14%,94%)] border-[hsl(215,20%,75%)]"
                )}
              >
                {canViewAll && <option value="all">Все</option>}
                {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(215,20%,55%)] pointer-events-none" />
              {!canViewAll && <Eye className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(38,92%,50%)]" />}
            </div>
            {!canViewAll && <p className="text-[10px] text-[hsl(38,92%,45%)]">Только ваш филиал</p>}
          </div>
          <FilterSelect label="Юрист" value={filters.lawyer} onChange={v => update({ lawyer: v })}
            options={[{ value: "all", label: "Все" }, ...lawyers.map(l => ({ value: l, label: l }))]} />
        </div>
      )}
    </div>
  );
};

export { CasesFilterBar, defaultFilters };

export const useFilteredCases = (filters: CaseFilters, cases?: typeof mockCases) => {
  const sourceCases = cases || mockCases;
  return useMemo(() => {
    return sourceCases.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = c.caseNumber.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.companyBIN.includes(q) || c.assignedLawyer.toLowerCase().includes(q) || c.defendant.toLowerCase().includes(q) || c.plaintiff.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.courtInstance !== "all" && c.courtInstance !== filters.courtInstance) return false;
      if (filters.caseType !== "all" && c.caseType !== filters.caseType) return false;
      if (filters.partyRole !== "all" && c.partyRole !== filters.partyRole) return false;
      if (filters.branch !== "all" && c.branch !== filters.branch) return false;
      if (filters.lawyer !== "all" && c.assignedLawyer !== filters.lawyer) return false;
      if (filters.overdueOnly && c.daysOverdue === 0) return false;
      return true;
    });
  }, [filters, sourceCases]);
};
