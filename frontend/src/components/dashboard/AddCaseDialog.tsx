import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyAmountInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  caseStatusLabels,
  caseTypeLabels,
  courtInstanceLabels,
  partyRoleLabels,
  branches,
  canViewAllCases,
  disputeCategoryLabels,
  allowedDisputeCategoriesForRole,
  type CaseStatus,
  type CaseType,
  type CourtInstance,
  type DisputeCategory,
  type LegalCase,
  type PartyRole,
  type User,
} from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { apiJsonHeaders } from "@/lib/api";

const riskLabels = { low: "Низкий", medium: "Средний", high: "Высокий" } as const;

const formSchema = z.object({
  caseNumber: z.string().min(1, "Введите номер дела"),
  court: z.string().min(1, "Введите наименование суда"),
  judge: z.string().min(1, "Введите ФИО судьи"),
  caseType: z.string().min(1, "Выберите тип дела"),
  otherCaseType: z.string().optional(),
  courtInstance: z.enum(["first", "appeal", "cassation", "supreme"]),
  partyRole: z.enum(["plaintiff", "defendant", "third_party"]),
  disputeCategory: z.enum(["procurement", "transportation", "labor", "other", "mediation"]),
  opponentType: z.enum(["juridical", "physical"]),
  companyName: z.string().optional(),
  bin: z.string().optional(),
  fullName: z.string().optional(),
  iin: z.string().optional(),
  claimAmount: z.number().min(0, "Не может быть меньше 0"),
  paidAmount: z.number().min(0, "Не может быть меньше 0"),
  mainDebt: z.number().min(0, "Не может быть меньше 0"),
  stateFee: z.number().min(0, "Не может быть меньше 0"),
  fines: z.number().min(0, "Не может быть меньше 0"),
  repExpenses: z.number().min(0, "Не может быть меньше 0"),
  otherCosts: z.number().min(0, "Не может быть меньше 0"),
  status: z.enum(["active", "mediation", "suspended", "execution", "closed"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  hearingNotSet: z.boolean().default(false),
  nextHearingDate: z.date().optional(),
  hearingTime: z.string().optional(),
  filingDate: z.date({ required_error: "Укажите дату подачи иска" }),
  branch: z.string().min(1, "Выберите филиал"),
}).superRefine((data, ctx) => {
  if (data.caseType === "other" && !data.otherCaseType?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherCaseType"], message: "Укажите тип дела" });
  }
  if (data.opponentType === "juridical") {
    if (!data.companyName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "Обязательное поле" });
    }
    if (!data.bin || !/^\d{12}$/.test(data.bin)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bin"], message: "Ровно 12 цифр" });
    }
  } else {
    if (!data.fullName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fullName"], message: "Обязательное поле" });
    }
    if (!data.iin || !/^\d{12}$/.test(data.iin)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["iin"], message: "Ровно 12 цифр" });
    }
  }
});

type CaseFormValues = z.infer<typeof formSchema>;

const AddCaseDialog = ({ user }: { user: User }) => {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createCaseMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/v1/cases", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { message?: string }).message || `Ошибка ${res.status}`);
      }
      return body as LegalCase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      toast({ title: "Дело добавлено", description: "Запись сохранена в базе данных." });
      setOpen(false);
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Не удалось создать дело", description: e.message });
    },
  });
  const canSelectBranch = canViewAllCases(user);

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caseNumber: "",
      court: "",
      judge: "",
      caseType: "civil",
      otherCaseType: "",
      courtInstance: "first",
      partyRole: "plaintiff",
      disputeCategory: "procurement",
      opponentType: "juridical",
      companyName: "",
      bin: "",
      fullName: "",
      iin: "",
      claimAmount: 0,
      paidAmount: 0,
      mainDebt: 0,
      stateFee: 0,
      fines: 0,
      repExpenses: 0,
      otherCosts: 0,
      status: "active",
      riskLevel: "low",
      hearingNotSet: false,
      hearingTime: "",
      filingDate: new Date(),
      branch: user.branch || "Центральный аппарат",
    },
  });

  const caseType = form.watch("caseType");
  const opponentType = form.watch("opponentType");
  const hearingNotSet = form.watch("hearingNotSet");
  const partyRole = form.watch("partyRole");
  const disputeCategory = form.watch("disputeCategory");

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Если выбрана роль, в которой текущая категория ПИР недоступна (например,
  // «истец» + «перевозочные»), сбрасываем на «Иные споры», чтобы экспорт не
  // нарушил структуру шаблона.
  useEffect(() => {
    const allowed = allowedDisputeCategoriesForRole[partyRole];
    if (!allowed.includes(disputeCategory)) {
      form.setValue("disputeCategory", "other");
    }
  }, [partyRole, disputeCategory, form]);

  useEffect(() => {
    if (open) {
      form.setValue("filingDate", new Date());
    }
  }, [open, form]);

  const onSubmit = (data: CaseFormValues) => {
    const filingStr = format(data.filingDate, "yyyy-MM-dd");

    let nextHearing: string | null | "not_set" = null;
    if (data.hearingNotSet) {
      nextHearing = "not_set";
    } else if (data.nextHearingDate) {
      const dateStr = format(data.nextHearingDate, "yyyy-MM-dd");
      nextHearing = data.hearingTime ? `${dateStr} ${data.hearingTime}` : dateStr;
    }

    const company = data.opponentType === "juridical" ? data.companyName! : data.fullName!;
    const bin = data.opponentType === "juridical" ? data.bin! : data.iin!;

    const isPlaintiff = data.partyRole === "plaintiff";

    const caseTypeResolved = data.caseType === "other" && data.otherCaseType?.trim() ? "other" : data.caseType;

    const payload: Record<string, unknown> = {
      caseNumber: data.caseNumber,
      court: data.court,
      courtInstance: data.courtInstance,
      caseType: caseTypeResolved,
      status: data.status,
      outcome: "pending",
      partyRole: data.partyRole,
      disputeCategory: data.disputeCategory,
      opponentType: data.opponentType,
      plaintiff: isPlaintiff ? "АО «НК «КТЖ»" : company,
      defendant: isPlaintiff ? company : "АО «НК «КТЖ»",
      company,
      companyBIN: bin,
      claimAmount: data.claimAmount,
      mainDebt: data.mainDebt,
      stateFee: data.stateFee,
      fines: data.fines,
      repExpenses: data.repExpenses,
      otherCosts: data.otherCosts,
      paidAmount: data.paidAmount,
      branch: data.branch,
      city: "—",
      judge: data.judge,
      filingDate: filingStr,
      nextHearing,
      paymentDeadline: null,
      daysOverdue: 0,
      lastUpdated: filingStr,
      riskLevel: data.riskLevel,
    };

    createCaseMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)]">
          <Plus className="w-4 h-4" />
          Добавить дело
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl text-[hsl(215,35%,15%)]">Новое судебное дело</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Блок 1: Основные реквизиты */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[hsl(215,35%,45%)]">1. Основные реквизиты</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="caseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер дела</FormLabel>
                    <FormControl><Input placeholder="Например: 2-1234/2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="court" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Наименование суда</FormLabel>
                    <FormControl><Input placeholder="СМЭС г. Астана" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="judge" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ФИО Судьи</FormLabel>
                    <FormControl><Input placeholder="Иванов И.И." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="caseType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип дела</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(caseTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {caseType === "other" && (
                  <FormField control={form.control} name="otherCaseType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Иной тип дела</FormLabel>
                      <FormControl><Input placeholder="Впишите тип" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="courtInstance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Инстанция</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(courtInstanceLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="branch" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Филиал</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canSelectBranch}>
                      <FormControl>
                        <SelectTrigger className={cn(!canSelectBranch && "bg-[hsl(220,14%,96%)] text-muted-foreground opacity-100")}>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="filingDate" render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-3">
                    <FormLabel>Дата подачи иска в суд</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full max-w-[280px] justify-start text-left font-normal border-blue-200",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {field.value ? format(field.value, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ru} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground pt-1">
                      В выгрузку ПИР попадают дела с этой датой в выбранном на странице «Отчёты» периоде.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <Separator className="bg-[hsl(215,35%,90%)]" />

            {/* Блок 2: Стороны конфликта */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[hsl(215,35%,45%)]">2. Стороны конфликта</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="partyRole" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Роль КТЖ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(partyRoleLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="disputeCategory" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Раздел в отчёте ПИР</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Выберите раздел" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {allowedDisputeCategoriesForRole[partyRole].map((k) => (
                          <SelectItem key={k} value={k}>{disputeCategoryLabels[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="opponentType" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Тип оппонента</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="juridical" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Юр. лицо</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="physical" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Физ. лицо</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {opponentType === "juridical" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[hsl(220,14%,98%)] p-4 rounded-lg border border-[hsl(215,35%,90%)]">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Наименование компании</FormLabel>
                      <FormControl><Input placeholder="ТОО «Пример»" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>БИН (12 цифр)</FormLabel>
                      <FormControl><Input placeholder="123456789012" maxLength={12} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[hsl(220,14%,98%)] p-4 rounded-lg border border-[hsl(215,35%,90%)]">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ФИО оппонента</FormLabel>
                      <FormControl><Input placeholder="Иванов И.И." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="iin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ИИН (12 цифр)</FormLabel>
                      <FormControl><Input placeholder="123456789012" maxLength={12} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </div>

            <Separator className="bg-[hsl(215,35%,90%)]" />

            {/* Блок 3: Финансовый блок */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[hsl(215,35%,45%)]">3. Финансовый блок</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="claimAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма иска (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="paidAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Оплачено (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mainDebt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Основной долг (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stateFee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Госпошлина (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fines" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Штрафные санкции (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="repExpenses" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Представительские расходы (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="otherCosts" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Прочие издержки (₸)</FormLabel>
                    <FormControl>
                      <MoneyAmountInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <Separator className="bg-[hsl(215,35%,90%)]" />

            {/* Блок 4: Сроки и контроль */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[hsl(215,35%,45%)]">4. Сроки и контроль</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(caseStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="riskLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Уровень риска</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value === "high" && "text-red-700 bg-red-50 border-red-200",
                          field.value === "medium" && "text-orange-700 bg-orange-50 border-orange-200",
                          field.value === "low" && "text-green-700 bg-green-50 border-green-200"
                        )}>
                          <SelectValue placeholder="Выберите" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(riskLabels) as Array<keyof typeof riskLabels>).map((k) => (
                          <SelectItem key={k} value={k}>{riskLabels[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex flex-col gap-4">
                  <FormField control={form.control} name="nextHearingDate" render={({ field }) => (
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel className="mb-1">Дата заседания</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={hearingNotSet}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground", hearingNotSet && "opacity-50")}
                            >
                              {field.value && !hearingNotSet ? format(field.value, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ru}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="hearingNotSet" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("nextHearingDate", undefined);
                            form.setValue("hearingTime", "");
                          }
                        }} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-[11px] text-muted-foreground font-normal cursor-pointer">
                          Дата не назначена / Неизвестна
                        </FormLabel>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="hearingTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время заседания</FormLabel>
                    <FormControl><Input type="time" disabled={hearingNotSet} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(215,35%,90%)]">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={createCaseMutation.isPending} className="bg-[hsl(192,72%,47%)] hover:bg-[hsl(192,72%,42%)]">
                {createCaseMutation.isPending ? "Сохранение…" : "Сохранить дело"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCaseDialog;
