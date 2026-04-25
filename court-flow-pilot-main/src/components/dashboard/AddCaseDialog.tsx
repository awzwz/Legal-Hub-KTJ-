import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  addCase,
  caseStatusLabels,
  caseTypeLabels,
  courtInstanceLabels,
  partyRoleLabels,
  mockCases,
  type CaseStatus,
  type CaseType,
  type CourtInstance,
  type LegalCase,
  type PartyRole,
  type User,
} from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

type FormState = {
  company: string;
  caseType: CaseType;
  partyRole: PartyRole;
  status: CaseStatus;
  courtInstance: CourtInstance;
  claimAmount: string;
  paidAmount: string;
  mainDebt: string;
  stateFee: string;
  penalty: string;
  lawyerFee: string;
  executionFee: string;
  riskLevel: "low" | "medium" | "high";
};

const initialForm: FormState = {
  company: "",
  caseType: "civil",
  partyRole: "plaintiff",
  status: "active",
  courtInstance: "first",
  claimAmount: "",
  paidAmount: "0",
  mainDebt: "",
  stateFee: "0",
  penalty: "0",
  lawyerFee: "0",
  executionFee: "0",
  riskLevel: "low",
};

const riskLabels = { low: "Низкий", medium: "Средний", high: "Высокий" } as const;

const AddCaseDialog = ({ user }: { user: User }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  if (user.role !== "branch_lawyer" || !user.branch) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.company.trim()) {
      toast({ title: "Укажите компанию", variant: "destructive" });
      return;
    }
    const claim = Number(form.claimAmount) || 0;
    const paid = Number(form.paidAmount) || 0;
    const mainDebt = form.mainDebt === "" ? claim : Number(form.mainDebt) || 0;
    const stateFee = Number(form.stateFee) || 0;
    const penalty = Number(form.penalty) || 0;
    const lawyerFee = Number(form.lawyerFee) || 0;
    const executionFee = Number(form.executionFee) || 0;
    if (claim <= 0) {
      toast({ title: "Укажите сумму иска", variant: "destructive" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextId = String(Math.max(0, ...mockCases.map((c) => Number(c.id) || 0)) + 1);
    const year = new Date().getFullYear();
    const caseNumber = `2-${Math.floor(1000 + Math.random() * 9000)}/${year}`;

    const newCase: LegalCase = {
      id: nextId,
      caseNumber,
      court: "—",
      courtInstance: form.courtInstance,
      caseType: form.caseType,
      status: form.status,
      partyRole: form.partyRole,
      plaintiff: form.partyRole === "plaintiff" ? "АО «НК «КТЖ»" : form.company,
      defendant: form.partyRole === "defendant" ? "АО «НК «КТЖ»" : form.company,
      company: form.company,
      companyBIN: "—",
      claimAmount: claim,
      mainDebt,
      stateFee,
      penalty,
      lawyerFee,
      executionFee,
      paidAmount: paid,
      assignedLawyer: user.name,
      branch: user.branch!,
      city: "",
      judge: "—",
      filingDate: today,
      nextHearing: null,
      paymentDeadline: null,
      daysOverdue: 0,
      lastUpdated: today,
      riskLevel: form.riskLevel,
      payments: [],
      comments: [],
      events: [
        { id: `e-${nextId}-1`, date: today, action: "Дело создано", user: user.name },
      ],
    };

    addCase(newCase);
    toast({ title: "Дело добавлено", description: `№ ${caseNumber}` });
    setForm(initialForm);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Добавить дело
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новое судебное дело</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Компания</Label>
            <Input
              placeholder="Название компании"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select value={form.caseType} onValueChange={(v) => update("caseType", v as CaseType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(caseTypeLabels) as CaseType[]).map((k) => (
                  <SelectItem key={k} value={k}>{caseTypeLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Роль</Label>
            <Select value={form.partyRole} onValueChange={(v) => update("partyRole", v as PartyRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(partyRoleLabels) as PartyRole[]).map((k) => (
                  <SelectItem key={k} value={k}>{partyRoleLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Статус</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as CaseStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(caseStatusLabels) as CaseStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{caseStatusLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Инстанция</Label>
            <Select value={form.courtInstance} onValueChange={(v) => update("courtInstance", v as CourtInstance)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(courtInstanceLabels) as CourtInstance[]).map((k) => (
                  <SelectItem key={k} value={k}>{courtInstanceLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Сумма иска (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.claimAmount}
              onChange={(e) => update("claimAmount", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Оплачено (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.paidAmount}
              onChange={(e) => update("paidAmount", e.target.value)}
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-semibold text-blue-900 mb-2">Финансовый блок</p>
          </div>

          <div className="space-y-1.5">
            <Label>Основной долг (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="по умолчанию = сумма иска"
              value={form.mainDebt}
              onChange={(e) => update("mainDebt", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Госпошлина (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.stateFee}
              onChange={(e) => update("stateFee", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Пеня (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.penalty}
              onChange={(e) => update("penalty", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Услуги адвоката (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.lawyerFee}
              onChange={(e) => update("lawyerFee", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Исполнительский сбор (₸)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.executionFee}
              onChange={(e) => update("executionFee", e.target.value)}
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-semibold text-blue-900 mb-2">Ответственные</p>
          </div>

          <div className="space-y-1.5">
            <Label>Юрист</Label>
            <Input value={user.name} disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Филиал</Label>
            <Input value={user.branch} disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Риск</Label>
            <Select value={form.riskLevel} onValueChange={(v) => update("riskLevel", v as FormState["riskLevel"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(riskLabels) as Array<keyof typeof riskLabels>).map((k) => (
                  <SelectItem key={k} value={k}>{riskLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleSubmit}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCaseDialog;
