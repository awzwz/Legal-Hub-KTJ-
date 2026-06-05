import { useState, useCallback, useMemo } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import DashboardStats, { type DrillDownPayload } from "@/components/dashboard/DashboardStats";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import CasesTable from "@/components/dashboard/CasesTable";
import CaseDetail from "@/components/dashboard/CaseDetail";
import { CasesFilterBar, defaultFilters, useFilteredCases, type CaseFilters } from "@/components/dashboard/CasesFilterBar";
import NotificationsPage from "@/components/pages/NotificationsPage";
import CounterpartiesPage from "@/components/pages/CounterpartiesPage";
import ClaimsPage from "@/components/pages/ClaimsPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";
import ReportsPage from "@/components/pages/ReportsPage";
import AuditPage from "@/components/pages/AuditPage";
import SettingsPage from "@/components/pages/SettingsPage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { useLawyerDirectory } from "@/hooks/useLawyerDirectory";
import { canAddCase, canViewAllAnalytics, canViewAuditLog, getFilteredCasesForUser } from "@/data/mockData";
import AddCaseDialog from "@/components/dashboard/AddCaseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarRange, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { exportCasesToExcel } from "@/lib/exportCases";
import { toast } from "@/hooks/use-toast";

type DashboardYear = "2026" | "2025" | "all";
type DashboardPeriod = "full" | "q1" | "q2" | "q3" | "q4" | "month" | "custom";

const yearLabels: Record<DashboardYear, string> = {
  "2026": "2026",
  "2025": "2025",
  all: "Все годы",
};

const periodLabels: Record<DashboardPeriod, string> = {
  full: "Весь год",
  q1: "Q1 (январь–март)",
  q2: "Q2 (апрель–июнь)",
  q3: "Q3 (июль–сентябрь)",
  q4: "Q4 (октябрь–декабрь)",
  month: "За месяц",
  custom: "Свой период",
};

const quarterMonths: Record<"q1" | "q2" | "q3" | "q4", [number, number]> = {
  q1: [0, 2],
  q2: [3, 5],
  q3: [6, 8],
  q4: [9, 11],
};

const Index = () => {
  const { user, switchUser } = useCurrentUser();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CaseFilters>(defaultFilters);
  // По умолчанию показываем текущий демо-год, чтобы KPI и графики не смешивали 2025/2026.
  const [dashboardYear, setDashboardYearState] = useState<DashboardYear>("2026");
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("full");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const setDashboardYear = (y: DashboardYear) => {
    setDashboardYearState(y);
    if (y === "all") {
      setDashboardPeriod("full");
      setCustomRange(undefined);
    }
  };

  const handleUserChange = useCallback(() => {
    setSelectedCaseId(null);
    setActiveSection("dashboard");
  }, []);

  /** Клик по карточке «Обзора» — переключаемся на реестр дел с применённым пресет-фильтром. */
  const handleDrillDown = useCallback((payload: DrillDownPayload) => {
    const { key, caseIds } = payload;
    if (key === "all") {
      setFilters(defaultFilters);
    } else if (key === "won") {
      setFilters({ ...defaultFilters, outcomeIn: ["fully_satisfied", "partially_satisfied"], presetLabel: "Удовлетворено" });
    } else if (key === "lost") {
      setFilters({ ...defaultFilters, outcomeIn: ["denied", "dismissed", "returned"], presetLabel: "Отказано" });
    } else if (key === "in_progress") {
      setFilters({ ...defaultFilters, statusIn: ["active", "mediation", "suspended", "execution"], presetLabel: "В работе" });
    } else if (key === "settled") {
      setFilters({ ...defaultFilters, outcomeIn: ["settled"], presetLabel: "Медиативные соглашения" });
    } else if (key === "high_risk") {
      setFilters({ ...defaultFilters, riskLevelIn: ["high"], presetLabel: "Высокий риск" });
    } else if (key === "overdue_action") {
      setFilters({ ...defaultFilters, caseIdIn: caseIds ?? [], presetLabel: "Просроченные действия" });
    }
    setActiveSection("cases");
    setSelectedCaseId(null);
  }, []);

  // Filter cases based on user role
  const allCases = useCases();
  const userCases = getFilteredCasesForUser(user, allCases);
  const lawyerDirectory = useLawyerDirectory(user, userCases);
  const filteredCases = useFilteredCases(filters, userCases);
  const dashboardYearNum = dashboardYear === "all" ? undefined : Number(dashboardYear);

  const dashboardCases = useMemo(() => {
    // Шаг 1: фильтр по году.
    let base = userCases;
    if (dashboardYearNum !== undefined) {
      base = base.filter((c) => new Date(`${c.filingDate}T12:00:00`).getFullYear() === dashboardYearNum);
    }
    // Шаг 2: фильтр по периоду внутри года.
    if (dashboardYearNum === undefined || dashboardPeriod === "full") return base;
    if (dashboardPeriod === "custom") {
      if (!customRange?.from) return base;
      const from = customRange.from.getTime();
      const to = (customRange.to ?? customRange.from).getTime() + 24 * 60 * 60 * 1000 - 1;
      return base.filter((c) => {
        const t = new Date(c.filingDate).getTime();
        return t >= from && t <= to;
      });
    }
    if (dashboardPeriod === "month") {
      const now = new Date();
      const mo = now.getMonth();
      return base.filter((c) => new Date(`${c.filingDate}T12:00:00`).getMonth() === mo);
    }
    const [m0, m1] = quarterMonths[dashboardPeriod];
    return base.filter((c) => {
      const m = new Date(`${c.filingDate}T12:00:00`).getMonth();
      return m >= m0 && m <= m1;
    });
  }, [userCases, dashboardYearNum, dashboardPeriod, customRange]);

  const handleCaseClick = (id: string) => {
    setSelectedCaseId(id);
  };

  const renderContent = () => {
    if (selectedCaseId) {
      return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
    }

    switch (activeSection) {
      case "dashboard":
        return (
          <>
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Год:</span>
                <Select value={dashboardYear} onValueChange={(v) => setDashboardYear(v as DashboardYear)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(yearLabels) as DashboardYear[]).map((y) => (
                      <SelectItem key={y} value={y}>{yearLabels[y]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-blue-700 font-medium ml-2">Период:</span>
                <Select
                  value={dashboardPeriod}
                  onValueChange={(v) => {
                    const next = v as DashboardPeriod;
                    setDashboardPeriod(next);
                    if (next !== "custom") setCustomRange(undefined);
                  }}
                  disabled={dashboardYear === "all"}
                >
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(periodLabels) as DashboardPeriod[]).map((p) => (
                      <SelectItem key={p} value={p}>{periodLabels[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dashboardPeriod === "custom" && dashboardYear !== "all" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 font-normal">
                        <CalendarIcon className="w-4 h-4" />
                        {customRange?.from ? (
                          customRange.to ? (
                            <span>
                              {format(customRange.from, "d MMM yyyy", { locale: ru })} —{" "}
                              {format(customRange.to, "d MMM yyyy", { locale: ru })}
                            </span>
                          ) : (
                            <span>{format(customRange.from, "d MMM yyyy", { locale: ru })}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Выберите даты</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={customRange}
                        onSelect={setCustomRange}
                        numberOfMonths={2}
                        locale={ru}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            <DashboardStats cases={dashboardCases} year={dashboardYearNum} onDrillDown={handleDrillDown} />
            <DashboardCharts cases={dashboardCases} year={dashboardYearNum} />
          </>
        );
      case "cases":
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Реестр судебных дел</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  disabled={filteredCases.length === 0}
                  onClick={async () => {
                    try {
                      await exportCasesToExcel(filteredCases);
                      toast({
                        title: "Файл сформирован",
                        description: `Выгружено дел: ${filteredCases.length}.`,
                      });
                    } catch (e) {
                      toast({
                        variant: "destructive",
                        title: "Не удалось выгрузить",
                        description: e instanceof Error ? e.message : "Неизвестная ошибка",
                      });
                    }
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Экспорт в Excel
                </Button>
                {canAddCase(user) && <AddCaseDialog user={user} />}
              </div>
            </div>
            <CasesFilterBar filters={filters} onFiltersChange={setFilters} resultCount={filteredCases.length} lawyerOptions={lawyerDirectory} />
            <div className="mt-4">
              <CasesTable onCaseClick={handleCaseClick} cases={filteredCases} />
            </div>
          </div>
        );
      case "notifications":
        return <NotificationsPage onCaseClick={handleCaseClick} />;
      case "counterparties":
        return <CounterpartiesPage onCaseClick={handleCaseClick} />;

      case "claims":
        return <ClaimsPage onCaseClick={handleCaseClick} />;
      case "analytics":
        return canViewAllAnalytics(user) ? <AnalyticsPage /> : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Нет доступа к аналитике</p>
          </div>
        );
      case "reports":
        return <ReportsPage />;
      case "audit":
        return canViewAuditLog(user) ? <AuditPage /> : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Нет доступа к журналу аудита</p>
          </div>
        );
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Раздел «{activeSection}» в разработке</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar activeSection={activeSection} onSectionChange={(s) => { setActiveSection(s); setSelectedCaseId(null); }} onUserChange={handleUserChange} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          onCaseClick={handleCaseClick}
          onSectionChange={(s) => {
            setActiveSection(s);
            setSelectedCaseId(null);
          }}
        />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
