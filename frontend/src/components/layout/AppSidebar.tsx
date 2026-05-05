import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Briefcase, FileText, Users, BarChart3, Settings, Bell, ChevronLeft, ChevronRight, Scale, Shield, User, ChevronDown } from "lucide-react";
import { roleLabels, canViewAuditLog, canViewAllAnalytics } from "@/data/mockData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { User as UserType } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiAuthHeaders, currentUserCacheKey } from "@/lib/api";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
  badge?: number;
}

const getNavItems = (user: UserType, notifUnread: number): NavItem[] => {
  const items: NavItem[] = [
    { icon: LayoutDashboard, label: "Дашборд", id: "dashboard" },
    { icon: Briefcase, label: "Реестр дел", id: "cases" },
    { icon: Users, label: "Контрагенты", id: "counterparties" },
  ];

  if (canViewAllAnalytics(user)) {
    items.push({ icon: BarChart3, label: "Аналитика", id: "analytics" });
  }

  items.push(
    { icon: FileText, label: "Отчёты", id: "reports" },
    { icon: Bell, label: "Уведомления", id: "notifications", badge: notifUnread || undefined },
  );

  if (canViewAuditLog(user)) {
    items.push({ icon: Shield, label: "Журнал аудита", id: "audit" });
  }

  items.push({ icon: Settings, label: "Настройки", id: "settings" });
  return items;
};

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onUserChange?: () => void;
}

const AppSidebar = ({ activeSection, onSectionChange, onUserChange }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, switchUser, usersForSwitcher } = useCurrentUser();

  const cacheKey = currentUserCacheKey();
  const { data: notifList = [] } = useQuery({
    queryKey: ["notifications", cacheKey],
    queryFn: async () => {
      const r = await fetch("/api/v1/notifications", { headers: apiAuthHeaders() });
      if (!r.ok) return [];
      return r.json() as { read: boolean }[];
    },
    staleTime: 60_000,
  });
  const notifUnread = notifList.filter((n) => !n.read).length;

  const navItems = getNavItems(user, notifUnread);

  const handleUserChange = (userId: string) => {
    switchUser(userId);
    setUserMenuOpen(false);
    onUserChange?.();
  };

  return (
    <aside className={cn(
      "flex flex-col bg-[hsl(215,35%,15%)] text-white transition-all duration-300 min-h-screen flex-shrink-0 border-r border-[hsl(215,35%,20%)]",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
<div className="flex items-center gap-3 px-4 py-5 border-b border-[hsl(215,35%,20%)]">
  {/* Наш премиум-логотип, адаптированный под сайдбар */}
  <img 
    src="/albom/Logo.png" 
    alt="Логотип" 
    className="w-10 h-10 p-1 bg-white rounded-lg shadow-sm transition-all duration-300 hover:scale-105 object-contain flex-shrink-0" 
  />
  
  {/* Текст (показывается только если меню не свернуто) */}
  {!collapsed && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden flex flex-col justify-center">
      <span className="font-bold text-base tracking-tight whitespace-nowrap text-white">
        LegalHub КТЖ
      </span>
      <p className="text-[10px] text-[hsl(215,20%,65%)] whitespace-nowrap">
        Корпоративная система
      </p>
    </motion.div>
  )}
</div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeSection === item.id
                ? "bg-[hsl(192,72%,47%)] text-white shadow-md"
                : "text-[hsl(210,40%,90%)] hover:bg-[hsl(215,35%,22%)] hover:text-white"
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-[hsl(47,91%,36%)] text-white text-[10px] min-w-[18px] h-[18px] px-1">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {collapsed && item.badge && item.badge > 0 && (
              <span className="absolute ml-5 -mt-4 w-2 h-2 rounded-full bg-[hsl(47,91%,36%)]" />
            )}
          </button>
        ))}
      </nav>

      {/* User Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-[hsl(215,35%,20%)] relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[hsl(215,35%,22%)] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[hsl(215,35%,22%)] flex items-center justify-center flex-shrink-0 border border-[hsl(215,35%,28%)]">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-[11px] text-[hsl(215,20%,65%)] truncate">
                {roleLabels[user.role]}{user.branch ? ` · ${user.branch}` : " · Все филиалы"}
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[hsl(215,20%,65%)] transition-transform", userMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-blue-200 rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-2 text-xs text-blue-600 border-b border-blue-100 bg-blue-50">Выберите пользователя</div>
                {usersForSwitcher.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleUserChange(u.id)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 text-left hover:bg-blue-50 transition-colors",
                      u.id === user.id && "bg-blue-50"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 truncate">{u.name}</p>
                      <p className="text-[10px] text-blue-600 truncate">
                        {roleLabels[u.role]}{u.branch ? ` · ${u.branch}` : ""}
                      </p>
                    </div>
                    {u.id === user.id && <div className="w-2 h-2 rounded-full bg-green-500" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-[hsl(215,35%,20%)] text-[hsl(215,20%,65%)] hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
