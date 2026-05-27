import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Download, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ru } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const reports = [
  {
    id: "1",
    name: "Отчёт по уголовным делам",
    description:
      "Сводный реестр уголовных дел в разрезе процессуального статуса организации, стадии расследования и итогов рассмотрения за отчётный период.",
  },
  {
    id: "2",
    name: "Отчёт по делам об административных правонарушениях",
    description:
      "Реестр административных производств с указанием уполномоченного органа, предмета правонарушения, применённого взыскания и статуса исполнения.",
  },
] as const;

function initialYearRange(): DateRange {
  const now = new Date();
  return { from: startOfYear(now), to: endOfYear(now) };
}

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>(initialYearRange);
  const reportRequestMutation = useMutation({
    mutationFn: async (vars: { reportType: string; dateFrom: string; dateTo: string; label: string }) => {
      const res = await fetch("/api/v1/reports/requests", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          reportType: vars.reportType,
          dateFrom: vars.dateFrom,
          dateTo: vars.dateTo,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message || `Ошибка ${res.status}`);
      return body as { id: string; status: string };
    },
    onMutate: () => {
      toast({
        title: "Отправляем заявку…",
        description: "Пожалуйста, подождите — это займёт несколько секунд.",
      });
    },
    onSuccess: (data, vars) => {
      toast({
        title: "Заявка принята",
        description: `Отчёт «${vars.label}» зарегистрирован (id: ${data.id}). Файл будет доступен позже.`,
      });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Ошибка заявки", description: e.message });
    },
  });

  const pirDownloadMutation = useMutation({
    mutationFn: async (vars: { dateFrom: string; dateTo: string }) => {
      const qs = new URLSearchParams({ dateFrom: vars.dateFrom, dateTo: vars.dateTo });
      const ac = new AbortController();
      const t = window.setTimeout(() => ac.abort(), 4 * 60 * 1000);
      try {
        const res = await fetch(`/api/v1/reports/pir.xlsx?${qs.toString()}`, {
          method: "GET",
          headers: apiAuthHeaders(),
          signal: ac.signal,
        });
        const buf = new Uint8Array(await res.arrayBuffer());
        if (!res.ok) {
          const text = new TextDecoder().decode(buf.slice(0, 4000));
          throw new Error(text || `Ошибка ${res.status}`);
        }
        if (buf.length === 0) {
          throw new Error("Пустой ответ сервера при выгрузке ПИР.");
        }
        // Явные ошибки API (JSON) или HTML прокси — не сохраняем как xlsx.
        const probe = new TextDecoder().decode(buf.slice(0, Math.min(16, buf.length))).trimStart();
        if (probe.startsWith("{") || probe.startsWith("[")) {
          let msg = new TextDecoder().decode(buf.slice(0, 8000));
          try {
            const j = JSON.parse(msg) as { message?: string; detail?: unknown };
            const d = j.detail;
            const detailStr =
              typeof d === "string" ? d : d !== undefined ? JSON.stringify(d) : "";
            msg = j.message || detailStr || msg;
          } catch {
            /* оставляем сырое тело */
          }
          throw new Error(msg.slice(0, 600));
        }
        if (probe.startsWith("<")) {
          throw new Error(
            "Сервер вернул HTML вместо Excel (часто таймаут прокси или 502). Обновите страницу и повторите.",
          );
        }
        return new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } finally {
        window.clearTimeout(t);
      }
    },
    onMutate: () => {
      toast({
        title: "Готовим файл ПИР…",
        description: "Скачивание начнётся автоматически. Для большого шаблона это может занять 10–40 секунд.",
      });
    },
    onSuccess: (blob, vars) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fmtRu = (s: string) => s.split("-").reverse().join(".");
      a.download = `Отчёт ПИР ${fmtRu(vars.dateFrom)} — ${fmtRu(vars.dateTo)}.xlsx`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Файл ПИР скачан",
        description:
          "На основных листах — дела с датой подачи в выбранном периоде (по вашему доступу к филиалам). Листы исполнительного производства и дебиторки дополнительно фильтруются тем же периодом по своим датам.",
      });
    },
    onError: (e: Error) => {
      const msg =
        e.name === "AbortError"
          ? "Превышено время ожидания (4 мин). Попробуйте сузить период или повторите позже."
          : e.message;
      toast({ variant: "destructive", title: "Ошибка выгрузки ПИР", description: msg });
    },
  });

  const setPreset = (preset: "month" | "quarter" | "year") => {
    const now = new Date();
    switch (preset) {
      case "month":
        setDate({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "quarter":
        setDate({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case "year":
        setDate({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  };

  /** Установить период по конкретному кварталу текущего года (q ∈ {1,2,3,4}). */
  const setQuarter = (q: 1 | 2 | 3 | 4) => {
    const y = new Date().getFullYear();
    const startMonth = (q - 1) * 3; // 0,3,6,9
    const from = new Date(y, startMonth, 1);
    const to = new Date(y, startMonth + 3, 0); // последний день квартала
    setDate({ from, to });
  };

  const handleDownload = (name: string, reportId: string) => {
    if (!date?.from) return;
    const dateFrom = format(date.from, "yyyy-MM-dd");
    const dateTo = format(date.to ?? date.from, "yyyy-MM-dd");
    reportRequestMutation.mutate({ reportType: `r${reportId}`, dateFrom, dateTo, label: name });
  };

  const handleDownloadPir = () => {
    if (!date?.from) return;
    const dateFrom = format(date.from, "yyyy-MM-dd");
    const dateTo = format(date.to ?? date.from, "yyyy-MM-dd");
    pirDownloadMutation.mutate({ dateFrom, dateTo });
  };

  const isDateSelected = Boolean(date?.from);
  const pirPending = pirDownloadMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(215,35%,15%)]">Отчёты</h2>
          <span className="text-sm text-muted-foreground">Мгновенная выгрузка Excel.</span>
        </div>

        {/* Date Selection Control */}
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">Обязательный выбор периода</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-[260px] justify-start text-left font-normal border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-400",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd MMM yyyy", { locale: ru })} -{" "}
                        {format(date.to, "dd MMM yyyy", { locale: ru })}
                      </>
                    ) : (
                      format(date.from, "dd MMM yyyy", { locale: ru })
                    )
                  ) : (
                    <span>Выберите период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>

            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100 transition-colors py-1.5 px-3 bg-blue-50 text-blue-700 border border-blue-200"
                onClick={() => setPreset("month")}
              >
                Текущий месяц
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100 transition-colors py-1.5 px-3 bg-blue-50 text-blue-700 border border-blue-200"
                onClick={() => setPreset("quarter")}
              >
                Текущий квартал
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100 transition-colors py-1.5 px-3 bg-blue-50 text-blue-700 border border-blue-200"
                onClick={() => setPreset("year")}
              >
                С начала года
              </Badge>
            </div>
          </div>

          {/* Конкретные кварталы текущего года */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Кварталы {new Date().getFullYear()}:</span>
            {([1, 2, 3, 4] as const).map((q) => (
              <Badge
                key={q}
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100 transition-colors py-1.5 px-3 bg-white text-blue-700 border border-blue-200"
                onClick={() => setQuarter(q)}
              >
                {q} квартал
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow ring-1 ring-blue-100"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileSpreadsheet className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="text-sm font-bold text-blue-900">Отчёт по претензионно-исковой работе</h3>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Сводный реестр судебных дел за отчётный период по утверждённой форме АО «Пассажирские перевозки»:
              позиции истца, ответчика и третьего лица в разрезе категорий споров, с автоматическим расчётом
              удовлетворённых, отклонённых и медиативно урегулированных требований.
            </p>
          </div>
          <div className="mt-5">
            <button
              type="button"
              disabled={!isDateSelected || pirPending || reportRequestMutation.isPending}
              aria-busy={pirPending || reportRequestMutation.isPending}
              onClick={handleDownloadPir}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[42px]",
                isDateSelected
                  ? pirPending || reportRequestMutation.isPending
                    ? "bg-[hsl(215,80%,28%)] text-white cursor-wait shadow-sm"
                    : "bg-[hsl(215,80%,32%)] text-white hover:bg-[hsl(215,80%,26%)] shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200",
              )}
            >
              {pirPending ? (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                  <span>Формируем файл…</span>
                </>
              ) : reportRequestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                  <span>Подождите…</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Скачать ПИР (Excel)</span>
                  <Download className="w-4 h-4 ml-1 shrink-0" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Временно скрыты: уголовные дела и адм. правонарушения (id 1, 2). Вернуть — уберите .filter */}
        {reports.filter((r) => r.id !== "1" && r.id !== "2").map((r, i) => {
          const thisRequestPending =
            reportRequestMutation.isPending &&
            reportRequestMutation.variables?.reportType === `r${r.id}`;
          const btnBusy = thisRequestPending;
          const otherRequestRunning = reportRequestMutation.isPending && !thisRequestPending;
          const pirRunningElsewhere = pirPending;

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-blue-900">{r.name}</h3>
                </div>
                <p className="text-xs text-blue-600 mt-2 line-clamp-3">{r.description}</p>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  disabled={!isDateSelected || btnBusy || otherRequestRunning || pirRunningElsewhere}
                  aria-busy={btnBusy}
                  onClick={() => handleDownload(r.name, r.id)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[42px]",
                    isDateSelected
                      ? btnBusy
                        ? "bg-[hsl(215,75%,34%)] text-white cursor-wait shadow-sm"
                        : "bg-[hsl(215,80%,40%)] text-white hover:bg-[hsl(215,80%,30%)] shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200",
                  )}
                >
                  {thisRequestPending ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                      <span>Отправка…</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>Оформить заявку на отчёт</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
