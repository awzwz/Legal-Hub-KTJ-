import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Search,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  Briefcase,
  AlertTriangle,
  Clock,
  Gavel,
  CreditCard,
  Inbox,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCases } from "@/hooks/useCases";
import { roleLabels, type Notification } from "@/data/mockData";
import { apiAuthHeaders, currentUserCacheKey } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ACCESS_TOKEN_KEY = "legalhub_access_token";

interface AppHeaderProps {
  onCaseClick?: (id: string) => void;
  onSectionChange?: (section: string) => void;
}

const notifIcons: Record<string, React.ElementType> = {
  payment: CreditCard,
  deadline: Clock,
  status: Gavel,
  overdue: AlertTriangle,
  hearing: Bell,
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

const AppHeader = ({ onCaseClick, onSectionChange }: AppHeaderProps) => {
  const { user } = useCurrentUser();
  const cases = useCases();
  const qc = useQueryClient();
  const cacheKey = currentUserCacheKey();

  // ---- Поиск ----
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const queryNorm = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!queryNorm) return [];
    const out: typeof cases = [];
    for (const c of cases) {
      const hay = [
        c.caseNumber,
        c.company,
        c.companyBIN,
        c.plaintiff,
        c.defendant,
        c.judge,
        c.court,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hay.includes(queryNorm)) out.push(c);
      if (out.length >= 8) break;
    }
    return out;
  }, [cases, queryNorm]);

  // Закрытие выпадашки поиска по клику вне.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handlePickCase = (id: string) => {
    setSearchOpen(false);
    setQuery("");
    onCaseClick?.(id);
  };

  // ---- Уведомления ----
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", cacheKey],
    queryFn: async (): Promise<Notification[]> => {
      const r = await fetch("/api/v1/notifications", { headers: apiAuthHeaders() });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: apiAuthHeaders(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/v1/notifications/read-all", {
        method: "POST",
        headers: apiAuthHeaders(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleNotifClick = (n: Notification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    setNotifOpen(false);
    if (n.caseId) {
      onCaseClick?.(n.caseId);
    } else {
      onSectionChange?.("notifications");
    }
  };

  // ---- Logout ----
  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    qc.clear();
    window.location.assign("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-[hsl(213,69.5%,67.8%)] shadow-sm">
      {/* Логотип и название */}
      <div className="flex items-center gap-3.5">
        <img
          src="/albom/Logo.png"
          alt="Логотип КТЖ"
          className="w-12 h-12 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 object-contain flex-shrink-0"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-[19px] font-bold text-[hsl(215,35%,15%)] leading-tight tracking-tight">
            LegalHub КТЖ
          </h1>
          <p className="text-[13px] font-medium text-[hsl(215,20%,45%)] opacity-90">
            Система управления судебными делами
          </p>
        </div>
      </div>

      {/* Поиск */}
      <div ref={searchRef} className="flex items-center gap-3 flex-1 max-w-md mx-8 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,55%)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Enter" && searchResults.length > 0) {
                handlePickCase(searchResults[0].id);
              }
            }}
            placeholder="Поиск по делам, БИН, компаниям..."
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg bg-[hsl(220,14%,96%)] border border-[hsl(215,35%,85%)] outline-none focus:ring-2 focus:ring-[hsl(192,72%,47%)] focus:border-[hsl(192,72%,47%)] placeholder:text-[hsl(215,20%,55%)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSearchOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[hsl(220,14%,90%)] text-[hsl(215,20%,55%)]"
              aria-label="Очистить поиск"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchOpen && queryNorm.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[hsl(215,35%,85%)] rounded-lg shadow-lg z-40 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено по запросу «{query}»
              </div>
            ) : (
              <>
                <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-[hsl(220,14%,98%)] border-b border-[hsl(215,35%,90%)]">
                  Найдено дел: {searchResults.length}
                </div>
                <ul className="max-h-[420px] overflow-auto">
                  {searchResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handlePickCase(c.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[hsl(220,14%,96%)] focus:bg-[hsl(220,14%,96%)] focus:outline-none transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{c.caseNumber}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {c.partyRole === "plaintiff" ? "Истец" : c.partyRole === "defendant" ? "Ответчик" : "3-лицо"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.company}
                              {c.companyBIN ? ` · БИН ${c.companyBIN}` : ""}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {c.plaintiff} → {c.defendant}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {formatMoney(c.claimAmount)} ₸
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* Уведомления + профиль */}
      <div className="flex items-center gap-3">
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Уведомления${unreadCount ? ` (${unreadCount} новых)` : ""}`}
              className="relative p-2 rounded-lg hover:bg-[hsl(220,14%,96%)] transition-colors border border-transparent hover:border-[hsl(215,35%,85%)]"
            >
              <Bell className="w-[18px] h-[18px] text-[hsl(215,35%,35%)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(0,72%,51%)] text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[380px] p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Уведомления</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-overdue/10 text-overdue font-medium">
                    {unreadCount} новых
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-[11px] text-primary hover:underline disabled:opacity-60"
                >
                  Прочитать все
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Inbox className="w-7 h-7 opacity-50 mb-2" />
                  <p className="text-sm">Нет уведомлений</p>
                </div>
              ) : (
                <ul>
                  {notifications.slice(0, 6).map((n) => {
                    const Icon = notifIcons[n.type] || Bell;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleNotifClick(n)}
                          className={cn(
                            "w-full text-left px-4 py-3 hover:bg-[hsl(220,14%,96%)] transition-colors border-b last:border-b-0 border-[hsl(215,35%,92%)]",
                            !n.read && "bg-primary/[0.03]",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "p-1.5 rounded-md flex-shrink-0 mt-0.5",
                                n.type === "overdue"
                                  ? "bg-overdue/10 text-overdue"
                                  : n.type === "hearing"
                                    ? "bg-warning/10 text-warning"
                                    : n.type === "payment"
                                      ? "bg-success/10 text-success"
                                      : "bg-primary/10 text-primary",
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm leading-tight", !n.read ? "font-semibold" : "font-medium")}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                {n.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">{n.date}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t px-4 py-2 bg-[hsl(220,14%,98%)]">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  onSectionChange?.("notifications");
                }}
                className="w-full text-center text-xs text-primary hover:underline py-1"
              >
                Открыть все уведомления →
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 ml-2 pl-3 border-l border-[hsl(215,35%,85%)] hover:opacity-90 transition-opacity"
              aria-label="Меню пользователя"
            >
              <div className="w-9 h-9 rounded-full bg-[hsl(220,14%,94%)] flex items-center justify-center border border-[hsl(215,35%,85%)]">
                <UserIcon className="w-4 h-4 text-[hsl(215,35%,35%)]" />
              </div>
              <div className="text-sm text-left">
                <p className="font-semibold leading-none text-[hsl(215,35%,15%)]">{user.name}</p>
                <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">
                  {roleLabels[user.role]}
                  {user.branch ? ` · ${user.branch}` : ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">{user.name}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSectionChange?.("settings")} className="cursor-pointer">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Настройки и пароль
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Выйти из аккаунта
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
