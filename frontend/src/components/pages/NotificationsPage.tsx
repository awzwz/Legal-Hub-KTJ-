import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/data/mockData";
import {
  Bell,
  CreditCard,
  AlertTriangle,
  Clock,
  Gavel,
  Check,
  RefreshCcw,
  Trash2,
  Loader2,
  CalendarDays,
  ShieldAlert,
  UserPlus,
  ArrowRightLeft,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { apiAuthHeaders, currentUserCacheKey } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ───────────────────────────────────────────────────────────────────────────
// Конфигурация типов уведомлений: иконка, цвет, лейбл, группа для таба.
// ───────────────────────────────────────────────────────────────────────────

type TabKey = "all" | "hearings" | "deadlines" | "changes" | "digests";

interface TypeConfig {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  tab: TabKey;
}

const typeConfig: Record<string, TypeConfig> = {
  hearing: {
    icon: Gavel,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    label: "Заседание",
    tab: "hearings",
  },
  deadline_upcoming: {
    icon: Clock,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    label: "Дедлайн",
    tab: "deadlines",
  },
  deadline_overdue: {
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
    label: "Просрочка дедлайна",
    tab: "deadlines",
  },
  case_assigned: {
    icon: UserPlus,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    label: "Назначение",
    tab: "changes",
  },
  case_status_changed: {
    icon: ArrowRightLeft,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    label: "Смена статуса",
    tab: "changes",
  },
  status: {
    icon: ShieldAlert,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
    label: "Высокая значимость",
    tab: "changes",
  },
  overdue: {
    icon: CreditCard,
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
    label: "Просрочка оплаты",
    tab: "deadlines",
  },
  daily_digest: {
    icon: BarChart3,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    label: "Дневная сводка",
    tab: "digests",
  },
  info: {
    icon: ClipboardList,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    label: "Информация",
    tab: "changes",
  },
};

const fallbackConfig: TypeConfig = {
  icon: Bell,
  iconBg: "bg-slate-100",
  iconColor: "text-slate-700",
  label: "Уведомление",
  tab: "changes",
};

const getTypeConfig = (t: string): TypeConfig => typeConfig[t] ?? fallbackConfig;

const tabLabels: Record<TabKey, string> = {
  all: "Все",
  hearings: "Заседания",
  deadlines: "Дедлайны",
  changes: "Изменения",
  digests: "Сводки",
};

const priorityStyles: Record<string, string> = {
  low: "border-l-slate-300",
  medium: "border-l-blue-400",
  high: "border-l-amber-500",
  urgent: "border-l-red-500",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const priorityLabels: Record<string, string> = {
  low: "Обычный",
  medium: "Средний",
  high: "Важный",
  urgent: "Срочный",
};

// ───────────────────────────────────────────────────────────────────────────
// Группировка по дате.
// ───────────────────────────────────────────────────────────────────────────

type DateGroupKey = "today" | "yesterday" | "this_week" | "earlier";
const dateGroupLabels: Record<DateGroupKey, string> = {
  today: "Сегодня",
  yesterday: "Вчера",
  this_week: "На этой неделе",
  earlier: "Раньше",
};
const dateGroupOrder: DateGroupKey[] = ["today", "yesterday", "this_week", "earlier"];

function dateGroupFor(dateStr: string): DateGroupKey {
  const t = new Date(`${dateStr}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  if (t >= today) return "today";
  if (t >= today - day) return "yesterday";
  if (t >= today - 7 * day) return "this_week";
  return "earlier";
}

// ───────────────────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/v1/notifications", { headers: apiAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
}

interface NotificationsPageProps {
  onCaseClick?: (id: string) => void;
}

const NotificationsPage = ({ onCaseClick }: NotificationsPageProps) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("all");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const cacheKey = currentUserCacheKey();
  const queryKey = ["notifications", cacheKey] as const;

  const { data: notifications = [], isFetching } = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error("read");
    },
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/notifications/read-all", {
        method: "POST",
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error("read-all");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Готово", description: "Все уведомления отмечены как прочитанные." });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/notifications/sync", {
        method: "POST",
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error("sync");
      return (await res.json()) as { ok: boolean; created: number };
    },
    onSuccess: (data) => {
      invalidate();
      toast({
        title: "Уведомления обновлены",
        description:
          data.created > 0
            ? `Добавлено новых: ${data.created}.`
            : "Новых уведомлений нет.",
      });
    },
    onError: () =>
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось обновить уведомления.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error("delete");
    },
    onSuccess: invalidate,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/notifications", {
        method: "DELETE",
        headers: apiAuthHeaders(),
      });
      if (!res.ok) throw new Error("clear");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Очищено", description: "Список уведомлений очищен." });
    },
  });

  // Счётчики непрочитанных по табам — для бейджей.
  const unreadByTab = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, hearings: 0, deadlines: 0, changes: 0, digests: 0 };
    for (const n of notifications) {
      if (n.read) continue;
      counts.all++;
      const cfg = getTypeConfig(n.type);
      counts[cfg.tab]++;
    }
    return counts;
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab !== "all" && getTypeConfig(n.type).tab !== tab) return false;
      if (filter === "unread" && n.read) return false;
      return true;
    });
  }, [notifications, tab, filter]);

  // Группировка по дате.
  const grouped = useMemo(() => {
    const out: Record<DateGroupKey, Notification[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      earlier: [],
    };
    // Сначала сортируем: urgent в первую очередь, потом по дате убывающей.
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...filtered].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 9;
      const pb = priorityOrder[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.date.localeCompare(a.date);
    });
    for (const n of sorted) out[dateGroupFor(n.date)].push(n);
    return out;
  }, [filtered]);

  const unreadCount = unreadByTab.all;
  const totalCount = notifications.length;

  const markRead = (id: string) => markReadMutation.mutate(id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Уведомления</h2>
          {unreadCount > 0 && (
            <span className="status-badge bg-overdue text-overdue-foreground">{unreadCount} новых</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              filter === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Все ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              filter === "unread" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Непрочитанные ({unreadCount})
          </button>

          <span className="mx-1 h-4 w-px bg-border" aria-hidden />

          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Пересчитать уведомления по текущим делам"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {syncMutation.isPending || isFetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="w-3.5 h-3.5" />
            )}
            Обновить
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" /> Прочитать все
            </button>
          )}

          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Удалить все уведомления?")) clearAllMutation.mutate();
              }}
              disabled={clearAllMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" /> Очистить
            </button>
          )}
        </div>
      </div>

      {/* Табы по типу */}
      <div className="flex flex-wrap items-center gap-1 mb-4 p-1 bg-muted/30 rounded-lg w-fit">
        {(Object.keys(tabLabels) as TabKey[]).map((k) => {
          const isActive = tab === k;
          const badge = unreadByTab[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                isActive
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50",
              )}
            >
              {tabLabels[k]}
              {badge > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Группированный список */}
      <div className="space-y-5">
        {dateGroupOrder.map((groupKey) => {
          const items = grouped[groupKey];
          if (items.length === 0) return null;
          return (
            <div key={groupKey}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateGroupLabels[groupKey]}
                </h3>
                <span className="text-xs text-muted-foreground">({items.length})</span>
                <div className="flex-1 h-px bg-border ml-1" />
              </div>
              <div className="space-y-2">
                {items.map((n, i) => {
                  const cfg = getTypeConfig(n.type);
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.02 }}
                      className={cn(
                        "stat-card group border-l-4 cursor-pointer transition-colors",
                        priorityStyles[n.priority],
                        !n.read && "bg-primary/[0.03]",
                      )}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        if (n.caseId) onCaseClick?.(n.caseId);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg flex-shrink-0", cfg.iconBg, cfg.iconColor)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              {cfg.label}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                priorityBadge[n.priority],
                              )}
                            >
                              {priorityLabels[n.priority]}
                            </span>
                          </div>
                          <p className={cn("text-sm mt-1", !n.read ? "font-semibold" : "font-medium")}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words whitespace-pre-line">
                            {n.description.replace(/\n+#dedup:.*$/s, "").trim()}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">{n.date}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            title="Удалить уведомление"
                            aria-label="Удалить уведомление"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="stat-card flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">
              {filter === "unread"
                ? "Все уведомления прочитаны"
                : tab !== "all"
                  ? `Нет уведомлений в категории «${tabLabels[tab]}»`
                  : "Нет уведомлений"}
            </p>
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-60"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="w-3.5 h-3.5" />
              )}
              Пересчитать сейчас
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
