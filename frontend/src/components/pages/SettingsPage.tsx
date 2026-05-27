import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, UserPlus, Users, ShieldCheck, ShieldOff, Loader2, DollarSign } from "lucide-react";
import { useEbitda, useSetEbitda } from "@/hooks/useKpi";
import { formatAmountShort } from "@/data/mockData";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBranches } from "@/hooks/useBranchesNames";
import { canManageUsers, roleLabels } from "@/data/mockData";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";

interface ApiUserAdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string | null;
  branchId: string | null;
  isActive: boolean;
}

interface BranchOption {
  id: string;
  name: string;
}

const ALLOWED_ROLES: { value: string; label: string }[] = [
  { value: "director", label: roleLabels.director },
  { value: "chief_lawyer", label: roleLabels.chief_lawyer },
  { value: "branch_lawyer", label: roleLabels.branch_lawyer },
  { value: "accountant", label: roleLabels.accountant },
];

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast({ variant: "destructive", title: "Слишком короткий пароль", description: "Минимум 8 символов." });
      return;
    }
    if (next !== confirm) {
      toast({ variant: "destructive", title: "Пароли не совпадают" });
      return;
    }
    if (next === current) {
      toast({ variant: "destructive", title: "Новый пароль совпадает с текущим" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      reset();
      toast({ title: "Пароль обновлён", description: "Все прежние сессии остаются активными до повторного входа." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Не удалось сменить пароль",
        description: err instanceof Error ? err.message.slice(0, 240) : "Ошибка сервера",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm space-y-4 max-w-lg"
    >
      <div className="flex items-center gap-2 text-blue-900 font-semibold">
        <KeyRound className="w-4 h-4 text-blue-600" />
        Смена пароля
      </div>
      <div>
        <Label className="text-xs text-blue-600">Текущий пароль</Label>
        <Input
          type="password"
          autoComplete="current-password"
          className="mt-1"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div>
        <Label className="text-xs text-blue-600">Новый пароль</Label>
        <Input
          type="password"
          autoComplete="new-password"
          className="mt-1"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
        />
        <p className="text-[11px] text-blue-500 mt-1">Минимум 8 символов</p>
      </div>
      <div>
        <Label className="text-xs text-blue-600">Подтвердите пароль</Label>
        <Input
          type="password"
          autoComplete="new-password"
          className="mt-1"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Сохранить новый пароль
      </Button>
    </form>
  );
}

function CreateUserDialog({ branches }: { branches: BranchOption[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("branch_lawyer");
  const [branchId, setBranchId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requiresBranch = role === "branch_lawyer";

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("branch_lawyer");
    setBranchId("");
    setPassword("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: "destructive", title: "Пароль не короче 8 символов" });
      return;
    }
    if (requiresBranch && !branchId) {
      toast({ variant: "destructive", title: "Выберите филиал", description: "Юрист филиала должен быть привязан к филиалу." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          password,
          branchId: requiresBranch ? branchId : null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      await qc.invalidateQueries({ queryKey: ["adminUsers"] });
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["users", "active"] });
      toast({
        title: "Пользователь создан",
        description: `Сообщите ${email.trim().toLowerCase()} временный пароль для входа.`,
      });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Не удалось создать пользователя",
        description: err instanceof Error ? err.message.slice(0, 240) : "Ошибка сервера",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Добавить пользователя
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новый пользователь</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label className="text-xs text-blue-600">Email</Label>
            <Input
              type="email"
              autoComplete="off"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="lawyer@company.kz"
            />
          </div>
          <div>
            <Label className="text-xs text-blue-600">ФИО</Label>
            <Input
              className="mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              placeholder="Иванов И.И."
            />
          </div>
          <div>
            <Label className="text-xs text-blue-600">Роль</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                if (v !== "branch_lawyer") setBranchId("");
              }}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALLOWED_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requiresBranch && (
            <div>
              <Label className="text-xs text-blue-600">Филиал</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите филиал" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs text-blue-600">Временный пароль</Label>
            <Input
              type="text"
              autoComplete="off"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              placeholder="Минимум 8 символов"
            />
            <p className="text-[11px] text-blue-500 mt-1">Сообщите пользователю — он сможет сменить его в Настройках.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Отмена</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersAdminCard() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery<ApiUserAdminRow[]>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const r = await fetch("/api/v1/users/all", { headers: apiAuthHeaders() });
      if (!r.ok) throw new Error("admin users");
      return r.json();
    },
    staleTime: 60_000,
  });
  const branches = useBranches();
  const branchOptions = useMemo<BranchOption[]>(
    () => branches.map((b) => ({ id: b.id, name: b.name })),
    [branches],
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await fetch(`/api/v1/users/${id}/active`, {
        method: "PATCH",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ is_active: active }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({ title: vars.active ? "Пользователь активирован" : "Пользователь деактивирован" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Не удалось изменить статус",
        description: err instanceof Error ? err.message.slice(0, 240) : "Ошибка сервера",
      });
    },
  });

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-blue-900 font-semibold">
          <Users className="w-4 h-4 text-blue-600" />
          Пользователи системы
          <Badge variant="secondary" className="ml-2">{users.length}</Badge>
        </div>
        <CreateUserDialog branches={branchOptions} />
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-blue-500">
            <tr>
              <th className="text-left px-2 py-2">ФИО</th>
              <th className="text-left px-2 py-2">Email</th>
              <th className="text-left px-2 py-2">Роль</th>
              <th className="text-left px-2 py-2">Филиал</th>
              <th className="text-left px-2 py-2">Статус</th>
              <th className="text-right px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-2 py-4 text-blue-500">Загрузка…</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-4 text-blue-500">Пока нет пользователей</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-blue-50 hover:bg-blue-50/40">
                <td className="px-2 py-2 font-medium text-blue-900">{u.name}</td>
                <td className="px-2 py-2 text-blue-700">{u.email}</td>
                <td className="px-2 py-2">{roleLabels[u.role] ?? u.role}</td>
                <td className="px-2 py-2 text-blue-700">{u.branch ?? "—"}</td>
                <td className="px-2 py-2">
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Активен
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <ShieldOff className="w-3 h-3" /> Деактивирован
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  <Button
                    size="sm"
                    variant={u.isActive ? "outline" : "default"}
                    disabled={toggleActive.isPending}
                    onClick={() => toggleActive.mutate({ id: u.id, active: !u.isActive })}
                    className={u.isActive ? "" : "bg-blue-600 hover:bg-blue-700"}
                  >
                    {u.isActive ? "Деактивировать" : "Активировать"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Карточка редактирования годовой EBITDA для расчёта KPI-2. */
function EbitdaSettingsCard() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { data: current } = useEbitda(year);
  const mutation = useSetEbitda();
  const [draft, setDraft] = useState<string>("");
  const [touched, setTouched] = useState(false);

  // Синхронизация input ↔ серверного значения при смене года.
  useEffect(() => {
    if (!touched) setDraft(current?.ebitda != null ? String(current.ebitda) : "");
  }, [current?.ebitda, touched]);

  const handleSave = async () => {
    const n = Number(String(draft).replace(/\s/g, "").replace(",", "."));
    if (!isFinite(n) || n <= 0) {
      toast({ variant: "destructive", title: "Введите положительное число" });
      return;
    }
    try {
      await mutation.mutateAsync({ year, ebitda: n });
      setTouched(false);
      toast({ title: "EBITDA сохранена", description: `На ${year} год: ${formatAmountShort(n)}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="space-y-4 rounded-xl border border-blue-100 bg-white p-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-blue-100 text-blue-700">
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-blue-900">Годовая EBITDA</h3>
          <p className="text-xs text-blue-500 mt-0.5">
            Используется для расчёта KPI-2 (% от EBITDA по проигранным как ответчик).
            Цифру предоставляет бухгалтерия в начале года.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
        <div>
          <Label className="text-xs text-blue-600">Год</Label>
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setTouched(false); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-blue-600">EBITDA (₸)</Label>
          <Input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
            placeholder="например: 100 000 000 000"
            className="mt-1"
          />
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending} className="h-10">
          {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          Сохранить
        </Button>
      </div>

      {current?.ebitda != null && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          Текущее значение на {year}: <span className="font-semibold text-blue-900">{formatAmountShort(current.ebitda)}</span>
        </p>
      )}
      {current?.ebitda == null && (
        <p className="text-xs text-amber-700 border-t pt-3">
          ⚠ На {year} год EBITDA не задана — KPI-2 на дашборде показывает «—».
        </p>
      )}
    </div>
  );
}

const SettingsPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = canManageUsers(user);
  // Финансовые показатели может править только director/chief_lawyer
  const canEditEbitda = user.role === "director" || user.role === "chief_lawyer";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-blue-900">Настройки</h2>
        <p className="text-sm text-blue-500">Профиль текущего пользователя и (для администратора) управление учётными записями.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Пользователи</TabsTrigger>}
          {canEditEbitda && <TabsTrigger value="finance">Финансовые показатели</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ChangePasswordCard />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UsersAdminCard />
          </TabsContent>
        )}
        {canEditEbitda && (
          <TabsContent value="finance" className="mt-4">
            <EbitdaSettingsCard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
