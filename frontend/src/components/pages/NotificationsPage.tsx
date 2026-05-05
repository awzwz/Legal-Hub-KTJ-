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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { apiAuthHeaders, currentUserCacheKey } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const notifIcons: Record<string, React.ElementType> = {
  payment: CreditCard,
  deadline: Clock,
  status: Gavel,
  overdue: AlertTriangle,
  hearing: Bell,
};

const priorityStyles: Record<string, string> = {
  low: "border-l-muted-foreground",
  medium: "border-l-primary",
  high: "border-l-warning",
  urgent: "border-l-overdue",
};

const priorityLabels: Record<string, string> = {
  low: "Обычный",
  medium: "Средний",
  high: "Важный",
  urgent: "Срочный",
};

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

  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [filter, notifications],
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

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
            Все
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              filter === "unread" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Непрочитанные
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

          {notifications.length > 0 && (
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

      <div className="space-y-2">
        {filtered.map((n, i) => {
          const Icon = notifIcons[n.type] || Bell;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.025 }}
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
                <div
                  className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    n.type === "overdue"
                      ? "bg-overdue/10 text-overdue"
                      : n.type === "payment"
                        ? "bg-success/10 text-success"
                        : n.type === "hearing"
                          ? "bg-warning/10 text-warning"
                          : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        n.priority === "urgent"
                          ? "bg-overdue/10 text-overdue"
                          : n.priority === "high"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {priorityLabels[n.priority]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.description}</p>
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

        {filtered.length === 0 && (
          <div className="stat-card flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">
              {filter === "unread"
                ? "Все уведомления прочитаны"
                : "Нет уведомлений"}
            </p>
            {filter === "all" && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
