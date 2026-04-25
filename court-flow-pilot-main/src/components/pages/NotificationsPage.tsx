import { useState } from "react";
import { mockNotifications, type Notification } from "@/data/mockData";
import { Bell, CreditCard, AlertTriangle, Clock, Gavel, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

interface NotificationsPageProps {
  onCaseClick?: (id: string) => void;
}

const NotificationsPage = ({ onCaseClick }: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Уведомления</h2>
          {unreadCount > 0 && (
            <span className="status-badge bg-overdue text-overdue-foreground">{unreadCount} новых</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn("px-3 py-1.5 text-xs rounded-md transition-colors", filter === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}
          >Все</button>
          <button
            onClick={() => setFilter("unread")}
            className={cn("px-3 py-1.5 text-xs rounded-md transition-colors", filter === "unread" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}
          >Непрочитанные</button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2">
              <Check className="w-3 h-3" /> Прочитать все
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
              transition={{ delay: i * 0.03 }}
              className={cn(
                "stat-card border-l-4 cursor-pointer",
                priorityStyles[n.priority],
                !n.read && "bg-primary/[0.02]"
              )}
              onClick={() => { markRead(n.id); onCaseClick?.(n.caseId); }}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  n.type === "overdue" ? "bg-overdue/10 text-overdue" :
                  n.type === "payment" ? "bg-success/10 text-success" :
                  "bg-primary/10 text-primary"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                      n.priority === "urgent" ? "bg-overdue/10 text-overdue" :
                      n.priority === "high" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    )}>{priorityLabels[n.priority]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{n.date}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="stat-card flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Нет уведомлений</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
