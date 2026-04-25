import { useState } from "react";
import { mockAuditLog, roleLabels, availableUsers } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Shield, Search, Filter, Download, User, Clock, Eye, Edit, MessageSquare, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const actionIcons = {
  view: Eye,
  edit: Edit,
  create: FileText,
  comment: MessageSquare,
  payment: DollarSign,
  export: Download,
};

const actionLabels = {
  view: "Просмотр",
  edit: "Редактирование",
  create: "Создание",
  comment: "Комментарий",
  payment: "Оплата",
  export: "Экспорт",
};

const actionColors = {
  view: "bg-muted text-muted-foreground",
  edit: "bg-warning/10 text-warning",
  create: "bg-success/10 text-success",
  comment: "bg-primary/10 text-primary",
  payment: "bg-success/10 text-success",
  export: "bg-muted text-muted-foreground",
};

const AuditPage = () => {
  const { user: currentUser } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredLog = mockAuditLog.filter((entry) => {
    const matchesSearch =
      searchTerm === "" ||
      entry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.caseNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUser = filterUser === "all" || entry.userId === filterUser;
    const matchesAction = filterAction === "all" || entry.action === filterAction;

    return matchesSearch && matchesUser && matchesAction;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Журнал аудита</h2>
            <p className="text-sm text-muted-foreground">
              Отслеживание всех действий пользователей в системе
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" />
          Экспорт
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по действиям, делам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md bg-muted border-0 outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3 py-2 text-sm rounded-md bg-muted border-0 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Все пользователи</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-sm rounded-md bg-muted border-0 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Все действия</option>
            <option value="view">Просмотр</option>
            <option value="edit">Редактирование</option>
            <option value="create">Создание</option>
            <option value="comment">Комментарий</option>
            <option value="payment">Оплата</option>
            <option value="export">Экспорт</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <p className="text-2xl font-bold">{mockAuditLog.length}</p>
          <p className="text-xs text-muted-foreground">Всего записей</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-primary">
            {mockAuditLog.filter((e) => e.action === "edit").length}
          </p>
          <p className="text-xs text-muted-foreground">Изменений</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-success">
            {mockAuditLog.filter((e) => e.action === "payment").length}
          </p>
          <p className="text-xs text-muted-foreground">Платежей</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-warning">
            {new Set(mockAuditLog.map((e) => e.userId)).size}
          </p>
          <p className="text-xs text-muted-foreground">Активных пользователей</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Время</th>
                <th className="text-left px-4 py-3 font-medium">Пользователь</th>
                <th className="text-left px-4 py-3 font-medium">Действие</th>
                <th className="text-left px-4 py-3 font-medium">Объект</th>
                <th className="text-left px-4 py-3 font-medium">Детали</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map((entry, i) => {
                const Icon = actionIcons[entry.action];
                return (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">
                          {new Date(entry.timestamp).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.userName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {roleLabels[entry.userRole]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                          actionColors[entry.action]
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {actionLabels[entry.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground uppercase">
                        {entry.entityType}
                      </span>
                      {entry.caseNumber && entry.caseNumber !== "-" && (
                        <p className="text-sm font-medium">{entry.caseNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{entry.details}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ID: {entry.entityId}
                      </p>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLog.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Нет записей по заданным фильтрам</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPage;
