import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Check, Trash2, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useProceduralDeadlines, useCreateDeadline, useUpdateDeadline, useDeleteDeadline } from "@/hooks/useProceduralDeadlines";
import { PROCEDURAL_KINDS, proceduralKindLabels, type ProceduralKind } from "@/lib/proceduralKinds";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  caseId: string;
}

const ProceduralDeadlinesBlock = ({ caseId }: Props) => {
  const { data: deadlines = [] } = useProceduralDeadlines({ caseId });
  const create = useCreateDeadline(caseId);
  const update = useUpdateDeadline();
  const del = useDeleteDeadline();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ProceduralKind>("response");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");

  const handleAdd = async () => {
    if (!dueDate) {
      toast({ variant: "destructive", title: "Укажите срок" });
      return;
    }
    try {
      await create.mutateAsync({
        kind,
        dueDate: format(dueDate, "yyyy-MM-dd"),
        notes: notes.trim() || null,
      });
      toast({ title: "Дедлайн добавлен" });
      setOpen(false);
      setKind("response");
      setDueDate(new Date());
      setNotes("");
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await update.mutateAsync({
        id,
        payload: { completedAt: completed ? new Date().toISOString() : null },
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить дедлайн?")) return;
    try {
      await del.mutateAsync(id);
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-blue-100 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Процедурные дедлайны ({deadlines.length})
        </h4>
        <Button size="sm" onClick={() => setOpen(true)} className="h-7 gap-1">
          <Plus className="w-3.5 h-3.5" /> Добавить
        </Button>
      </div>

      {deadlines.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Нет процедурных дедлайнов. Добавьте отзыв, апелляцию или другое действие со сроком.
        </p>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => {
            const isDone = !!d.completedAt;
            const dueDateObj = parseISO(d.dueDate);
            return (
              <div
                key={d.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md border",
                  isDone ? "bg-green-50/40 border-green-200" :
                  d.isOverdue ? "bg-red-50/40 border-red-200" : "bg-amber-50/40 border-amber-200"
                )}
              >
                <button
                  onClick={() => handleToggleComplete(d.id, !isDone)}
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5",
                    isDone ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-blue-400"
                  )}
                  title={isDone ? "Отметить невыполненным" : "Отметить выполненным"}
                >
                  {isDone && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>
                      {proceduralKindLabels[d.kind]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      до {format(dueDateObj, "d MMMM yyyy", { locale: ru })}
                    </span>
                    {!isDone && d.isOverdue && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Просрочено
                      </span>
                    )}
                    {!isDone && !d.isOverdue && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> В работе
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                        Выполнено
                      </span>
                    )}
                  </div>
                  {d.notes && (
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{d.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1 rounded text-red-600 hover:bg-red-100"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый дедлайн</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Тип действия</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ProceduralKind)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCEDURAL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{proceduralKindLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Срок (до какой даты)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start mt-1", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ru} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Примечание (опционально)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="например: до судебного заседания 15.05.2026" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={handleAdd} disabled={create.isPending}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProceduralDeadlinesBlock;
