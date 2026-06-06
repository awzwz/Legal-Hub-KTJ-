import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const rows = [
  ["45%", "Результат", "процент побед для компании с поправкой на количество завершённых дел"],
  ["20%", "Объём", "количество дел за выбранный период; используется мягкая шкала, чтобы один большой портфель не ломал рейтинг"],
  ["15%", "Сумма", "общая сумма исков; также используется мягкая шкала"],
  ["10%", "Риск", "доля дел высокого риска"],
  ["10%", "Сроки", "средняя длительность решённых дел минус штраф за просрочки"],
];

export default function LawyerRatingHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
          <Info className="h-3.5 w-3.5" />
          Как считается
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] text-sm">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-blue-900">Рейтинг юристов</h4>
            <p className="mt-1 text-xs text-slate-600">
              Итоговый балл считается по шкале 0-100. Рейтинг показывает не только процент побед,
              но и сложность портфеля, объём работы и дисциплину по срокам.
            </p>
          </div>
          <div className="space-y-2">
            {rows.map(([weight, label, text]) => (
              <div key={label} className="grid grid-cols-[44px_86px_1fr] gap-2 text-xs">
                <span className="font-semibold tabular-nums text-blue-700">{weight}</span>
                <span className="font-medium text-slate-900">{label}</span>
                <span className="text-slate-600">{text}</span>
              </div>
            ))}
          </div>
          <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
            Победа: для истца — удовлетворение или медиативное соглашение; для ответчика — отказ
            в иске. Проигрыш определяется обратным образом. Дела третьих лиц не входят в X и балл.
          </p>
          <p className="rounded-md bg-blue-50 p-2 text-xs text-blue-800">
            % побед = выиграно / (выиграно + проиграно). Для результата применяется поправка
            на малую выборку: одна победа не даёт автоматического первого места.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
