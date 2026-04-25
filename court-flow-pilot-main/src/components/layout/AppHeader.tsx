import { Bell, Search, User, Building2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { roleLabels } from "@/data/mockData";

const AppHeader = () => {
  const { user } = useCurrentUser();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-[hsl(213, 69.50%, 67.80%)] shadow-sm">
      {/* Логотип и название */}
<div className="flex items-center gap-3.5">
  {/* Красивый логотип с эффектом "App Icon" */}
  <img 
    src="/albom/Logo.png" 
    alt="Логотип КТЖ" 
    className="w-12 h-12 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 object-contain flex-shrink-0" 
  />
  
  {/* Текст (немного подправил отступы для идеального баланса) */}
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
      <div className="flex items-center gap-3 flex-1 max-w-md mx-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,55%)]" />
          <input
            type="text"
            placeholder="Поиск по делам, БИН, компаниям..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-[hsl(220,14%,96%)] border border-[hsl(215,35%,85%)] outline-none focus:ring-2 focus:ring-[hsl(192,72%,47%)] focus:border-[hsl(192,72%,47%)] placeholder:text-[hsl(215,20%,55%)]"
          />
        </div>
      </div>

      {/* Пользователь и уведомления */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-[hsl(220,14%,96%)] transition-colors border border-transparent hover:border-[hsl(215,35%,85%)]">
          <Bell className="w-[18px] h-[18px] text-[hsl(215,35%,35%)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(0,72%,51%)]" />
        </button>
        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[hsl(215,35%,85%)]">
          <div className="w-9 h-9 rounded-full bg-[hsl(220,14%,94%)] flex items-center justify-center border border-[hsl(215,35%,85%)]">
            <User className="w-4 h-4 text-[hsl(215,35%,35%)]" />
          </div>
          <div className="text-sm">
            <p className="font-semibold leading-none text-[hsl(215,35%,15%)]">{user.name}</p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">
              {roleLabels[user.role]}{user.branch ? ` · ${user.branch}` : ""}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
