import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useCreateClaim, useUpdateClaim } from "@/hooks/useClaims";
import { useCases } from "@/hooks/useCases";
import { claimStatusLabels, type Claim, type ClaimStatus, type ClaimCreatePayload } from "@/lib/claims";
import { validateBinFormat } from "@/lib/binValidation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim | null;
}

const STATUSES: ClaimStatus[] = ["collected", "not_collected", "offset", "recalculation"];

const AddClaimDialog = ({ open, onOpenChange, claim }: AddClaimDialogProps) => {
  const isEdit = !!claim;
  const create = useCreateClaim();
  const update = useUpdateClaim();
  const allCases = useCases();

  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyBIN, setCounterpartyBIN] = useState("");
  const [binError, setBinError] = useState<string | null>(null);
  const [outgoingNumber, setOutgoingNumber] = useState("");
  const [claimDate, setClaimDate] = useState<Date | undefined>(undefined);
  const [subject, setSubject] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("not_collected");
  const [statusDetail, setStatusDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [caseId, setCaseId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setCounterpartyName(claim?.counterpartyName || "");
      setCounterpartyBIN(claim?.counterpartyBIN || "");
      setBinError(null);
      setOutgoingNumber(claim?.outgoingNumber || "");
      setClaimDate(claim?.claimDate ? new Date(claim.claimDate) : new Date());
      setSubject(claim?.subject || "");
      setAmount(claim ? String(claim.amount) : "");
      setStatus(claim?.status || "not_collected");
      setStatusDetail(claim?.statusDetail || "");
      setNotes(claim?.notes || "");
      setCaseId(claim?.caseId || "");
    }
  }, [open, claim]);

  const handleBinBlur = () => {
    if (!counterpartyBIN.trim()) { setBinError(null); return; }
    const r = validateBinFormat(counterpartyBIN.trim());
    setBinError(r.ok ? null : r.error);
  };

  const handleSubmit = async () => {
    if (!counterpartyName.trim()) {
      toast({ variant: "destructive", title: "Укажите контрагента" });
      return;
    }
    if (!outgoingNumber.trim()) {
      toast({ variant: "destructive", title: "Укажите ИСХ.№" });
      return;
    }
    if (!claimDate) {
      toast({ variant: "destructive", title: "Укажите дату претензии" });
      return;
    }
    if (!subject.trim()) {
      toast({ variant: "destructive", title: "Укажите сущность претензии" });
      return;
    }
    const amountNum = Number(String(amount).replace(/\s/g, "").replace(",", "."));
    if (!isFinite(amountNum) || amountNum < 0) {
      toast({ variant: "destructive", title: "Некорректная сумма" });
      return;
    }
    if (counterpartyBIN.trim()) {
      const r = validateBinFormat(counterpartyBIN.trim());
      if (!r.ok) {
        toast({ variant: "destructive", title: "БИН некорректен", description: r.error || "" });
        return;
      }
    }

    const payload: ClaimCreatePayload = {
      counterpartyName: counterpartyName.trim(),
      counterpartyBIN: counterpartyBIN.trim() || null,
      outgoingNumber: outgoingNumber.trim(),
      claimDate: format(claimDate, "yyyy-MM-dd"),
      subject: subject.trim(),
      amount: amountNum,
      status,
      statusDetail: statusDetail.trim() || null,
      notes: notes.trim() || null,
      caseId: caseId || null,
    };

    try {
      if (isEdit && claim) {
        await update.mutateAsync({ id: claim.id, payload });
        toast({ title: "Претензия обновлена" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Претензия создана" });
      }
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: String((e as Error).message) });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать претензию" : "Новая претензия"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Контрагент *</Label>
            <Input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} placeholder="ТОО «Пример»" />
          </div>

          <div>
            <Label>БИН контрагента</Label>
            <Input
              value={counterpartyBIN}
              onChange={(e) => setCounterpartyBIN(e.target.value)}
              onBlur={handleBinBlur}
              maxLength={12}
              placeholder="070340014200"
            />
            {binError && <p className="text-xs text-red-600 mt-1">{binError}</p>}
          </div>

          <div>
            <Label>ИСХ.№ *</Label>
            <Input value={outgoingNumber} onChange={(e) => setOutgoingNumber(e.target.value)} placeholder="ЦЛЮ-14-17/165-И" />
          </div>

          <div>
            <Label>Дата претензии *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !claimDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {claimDate ? format(claimDate, "PPP", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={claimDate} onSelect={setClaimDate} locale={ru} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Сумма (₸) *</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
          </div>

          <div className="sm:col-span-2">
            <Label>Сущность претензии *</Label>
            <Textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={2} placeholder="простой вагона / нарушение сроков поставки / ..." />
          </div>

          <div>
            <Label>Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ClaimStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{claimStatusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Связанное дело (если есть)</Label>
            <Select value={caseId || "__none__"} onValueChange={(v) => setCaseId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Не привязано" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— не привязано —</SelectItem>
                {allCases.slice(0, 200).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.caseNumber} · {c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>Детализация статуса</Label>
            <Textarea value={statusDetail} onChange={(e) => setStatusDetail(e.target.value)} rows={2} placeholder="пл.поручение №2461 от 25.07.2025г. / частичные суммы..." />
          </div>

          <div className="sm:col-span-2">
            <Label>Примечание</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddClaimDialog;
