import { useState, useCallback, useMemo } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import CasesTable from "@/components/dashboard/CasesTable";
import CaseDetail from "@/components/dashboard/CaseDetail";
import { CasesFilterBar, defaultFilters, useFilteredCases, type CaseFilters } from "@/components/dashboard/CasesFilterBar";
import NotificationsPage from "@/components/pages/NotificationsPage";
import CounterpartiesPage from "@/components/pages/CounterpartiesPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";
import ReportsPage from "@/components/pages/ReportsPage";
import AuditPage from "@/components/pages/AuditPage";
import SettingsPage from "@/components/pages/SettingsPage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { useLawyerDirectory } from "@/hooks/useLawyerDirectory";
import { canViewAllAnalytics, canViewAuditLog, getFilteredCasesForUser } from "@/data/mockData";
import AddCaseDialog from "@/components/dashboard/AddCaseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

type DashboardPeriod = "week" | "month" | "quarter" | "year" | "all" | "custom";

const periodLabels: Record<DashboardPeriod, string> = {
  week: "За неделю",
  month: "За месяц",
  quarter: "За квартал",
  year: "За год",
  all: "За всё время",
  custom: "Свой период",
};

const periodDays: Record<Exclude<DashboardPeriod, "all" | "custom">, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

const Index = () => {
  const { user, switchUser } = useCurrentUser();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CaseFilters>(defaultFilters);
  // Default "all": seed/API cases use fixed filing years; "month" would show zeros when system date is far ahead.
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const handleUserChange = useCallback(() => {
    setSelectedCaseId(null);
    setActiveSection("dashboard");
  }, []);

  // Filter cases based on user role
  const allCases = useCases();
  const userCases = getFilteredCasesForUser(user, allCases);
  const lawyerDirectory = useLawyerDirectory(user, userCases);
  const filteredCases = useFilteredCases(filters, userCases);

  const dashboardCases = useMemo(() => {
    if (dashboardPeriod === "all") return userCases;
    if (dashboardPeriod === "custom") {
      if (!customRange?.from) return userCases;
      const from = customRange.from.getTime();
      const to = (customRange.to ?? customRange.from).getTime() + 24 * 60 * 60 * 1000 - 1;
      return userCases.filter((c) => {
        const t = new Date(c.filingDate).getTime();
        return t >= from && t <= to;
      });
    }
    const cutoff = Date.now() - periodDays[dashboardPeriod] * 24 * 60 * 60 * 1000;
    return userCases.filter((c) => new Date(c.filingDate).getTime() >= cutoff);
  }, [userCases, dashboardPeriod, customRange]);

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
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Период:</span>
                <Select
                  value={dashboardPeriod}
                  onValueChange={(v) => {
                    const next = v as DashboardPeriod;
                    setDashboardPeriod(next);
                    if (next !== "custom") setCustomRange(undefined);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(periodLabels) as DashboardPeriod[]).map((p) => (
                      <SelectItem key={p} value={p}>{periodLabels[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dashboardPeriod === "custom" && (
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
            <DashboardStats cases={dashboardCases} />
            <DashboardCharts cases={dashboardCases} />
          </>
        );
      case "cases":
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Реестр судебных дел</h2>
              <AddCaseDialog user={user} />
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
