import { useState } from "react";
import { FileSpreadsheet, FileText, Download, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ru } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const reports = [
  { id: "1", name: "Уголовные", description: "Реестр уголовных дел с детализацией" },
  { id: "2", name: "Административные", description: "Реестр административных дел с детализацией" },
  { id: "3", name: "Гражданские", description: "Реестр гражданских дел с детализацией" },
  { id: "4", name: "Исполнительные производства", description: "Дела на стадии исполнительного производства" },
  { id: "5", name: "Претензионно-исковая работа", description: "Претензии, иски, суммы требований и оплат" },
];

const ReportsPage = () => {
  const [date, setDate] = useState<DateRange | undefined>();

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

  const handleDownload = (name: string) => {
    if (!date?.from) return;
    const fromStr = format(date.from, "dd.MM.yyyy", { locale: ru });
    const toStr = date.to ? format(date.to, "dd.MM.yyyy", { locale: ru }) : fromStr;
    
    toast({
      title: "Формирование отчета",
      description: `Формируется отчет "${name}" за период с ${fromStr} по ${toStr}. Загрузка начнется автоматически.`,
    });
  };

  const isDateSelected = Boolean(date?.from);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(215,35%,15%)]">Отчёты</h2>
          <span className="text-sm text-muted-foreground">Выгрузка в формате Excel</span>
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

            <div className="flex gap-2">
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
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => (
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
              <p className="text-xs text-blue-600 mt-2 line-clamp-2">{r.description}</p>
            </div>
            
            <div className="mt-5">
              <button 
                disabled={!isDateSelected}
                onClick={() => handleDownload(r.name)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isDateSelected 
                    ? "bg-[hsl(215,80%,40%)] text-white hover:bg-[hsl(215,80%,30%)] shadow-sm" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Скачать отчет в Excel
                <Download className="w-4 h-4 ml-1" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
