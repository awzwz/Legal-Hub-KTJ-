export type CaseStatus = "active" | "mediation" | "suspended" | "execution" | "closed";
export type CaseOutcome = "fully_satisfied" | "partially_satisfied" | "denied" | "settled" | "dismissed" | "pending" | "returned";
export type CourtInstance = "first" | "appeal" | "cassation" | "supreme";
export type CaseType = "civil" | "administrative" | "criminal" | "executive" | "labor" | "tax" | "corporate" | "other";
export type PartyRole = "plaintiff" | "defendant" | "third_party";

/**
 * Категория иска.
 * - procurement     — Иски, связанные с нарушением законодательства о закупках и вытекающие из договоров
 * - transportation  — Иски, вытекающие из перевозочного процесса
 * - government      — Иски, вытекающие из споров с госорганами
 * - labor           — Трудовые споры
 * - other           — Иные
 * - mediation       — Медиативные соглашения (внутреннее, не показывается в фильтре)
 */
export type DisputeCategory = "procurement" | "transportation" | "government" | "labor" | "other" | "mediation";

export interface Payment {
  id: string;
  documentNumber: string;
  payer: string;
  payee: string;
  date: string;
  amount: number;
  description: string;
}


export interface CaseDocument {
  id: string;
  title: string;
  uploadDate: string;
  author: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  downloadUrl?: string | null;
}

export interface CaseComment {
  id: string;
  author: string;
  role: string;
  text: string;
  type: "question" | "clarify" | "problem" | "info";
  date: string;
  likes: number;
}

export interface CaseEvent {
  id: string;
  date: string;
  action: string;
  user: string;
  detail?: string;
}

/** PIR / case extensions (from API; optional in offline mocks). */
export interface CaseLitigationBlock {
  claimSummary: string;
  judgmentFirst: string;
  judgmentAppeal: string;
  judgmentCassation: string;
  damageRecoveryNote: string;
  /** ПИР «истец» кол. 16 */
  writRequestNote?: string;
  /** ПИР «истец» кол. 17 */
  writDispatchNote?: string;
  /** ПИР «истец» кол. 18 */
  executionProofNote?: string;
  /** ПИР «ответчик» кол. 18 — информация об исполнении (№, дата документа). */
  defendantExecutionNote?: string;
  /** ПИР «3-лицо» / «в качестве 3 лица» кол. 19 — примечание. */
  thirdPartyNote?: string;
  updatedAt?: string | null;
}

export interface EnforcementProceedingRow {
  id: string;
  debtorName: string;
  debtorBin?: string | null;
  courtActSummary: string;
  amountTotal: number;
  amountMain: number;
  amountFines: number;
  amountFees: number;
  progressNotes: string;
  collectedAmount: number;
  collectionDocRef: string;
  balanceRemaining: number;
  statusLabel: string;
  recordedAt: string;
}

export interface DebtRecoveryEntryRow {
  id: string;
  caseId?: string | null;
  counterpartyBin?: string | null;
  debtorName: string;
  debtorStatus: string;
  debtAmount: number;
  paidAmount: number;
  writtenOffAmount: number;
  workSummary: string;
  recordedAt: string;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  court: string;
  courtInstance: CourtInstance;
  caseType: CaseType;
  status: CaseStatus;
  outcome: CaseOutcome;
  partyRole: PartyRole;
  opponentType: "juridical" | "physical";
  plaintiff: string;
  defendant: string;
  company: string;
  companyBIN: string;
  claimAmount: number;
  mainDebt: number;
  stateFee: number;
  fines: number;
  repExpenses: number;
  otherCosts: number;
  paidAmount: number;
  /** ПИР лист «истец»: взысканная сумма (кол. 13–15) */
  recoveredMain?: number;
  recoveredFines?: number;
  recoveredStateFee?: number;
  /** ПИР листы «ответчик» (кол. 16) и «3-лицо» (кол. 17): взысканные представительские расходы. */
  recoveredRepExpenses?: number;
  /** Раздел в шаблоне ПИР, в который дело попадёт при экспорте. По умолчанию — закупки. */
  disputeCategory?: DisputeCategory;
  assignedLawyer: string;
  assignedLawyerIsActive?: boolean;
  /** UUID филиала (из API) */
  branchId?: string;
  /** UUID назначенного юриста (из API) */
  assignedLawyerId?: string | null;
  branch: string;
  city: string;
  judge: string;
  filingDate: string;
  nextHearing: string | null | "not_set";
  paymentDeadline: string | null;
  daysOverdue: number;
  lastUpdated: string;
  riskLevel: "low" | "medium" | "high";
  payments: Payment[];
  documents: CaseDocument[];
  comments: CaseComment[];
  events: CaseEvent[];
  /** Судебные материалы для выгрузки ПИР */
  litigation?: CaseLitigationBlock;
  enforcementProceedings?: EnforcementProceedingRow[];
  debtRecoveryEntries?: DebtRecoveryEntryRow[];
}

export interface Notification {
  id: string;
  type: "payment" | "deadline" | "status" | "overdue" | "hearing";
  title: string;
  description: string;
  date: string;
  read: boolean;
  caseId: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: "view" | "edit" | "create" | "comment" | "payment" | "export";
  entityType: "case" | "payment" | "comment" | "report";
  entityId: string;
  details: string;
  caseNumber?: string;
}


export const courtInstanceLabels: Record<CourtInstance, string> = {
  first: "Первая инстанция",
  appeal: "Апелляционная инстанция",
  cassation: "Кассационная инстанция",
  supreme: "Верховный суд",
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  active: "В работе",
  mediation: "В работе",
  suspended: "В работе",
  execution: "Исполнено",
  closed: "Исполнено",
};

/** Видимые значения статуса дела в фильтре/форме (два укрупнённых статуса). */
export const visibleCaseStatuses: { key: CaseStatus; label: string }[] = [
  { key: "active", label: "В работе" },
  { key: "execution", label: "Исполнено" },
];

/** Группа статусов в БД, которая соответствует укрупнённому видимому статусу. */
export const caseStatusGroup: Record<CaseStatus, "active" | "execution"> = {
  active: "active",
  mediation: "active",
  suspended: "active",
  execution: "execution",
  closed: "execution",
};

export const caseOutcomeLabels: Record<CaseOutcome, string> = {
  fully_satisfied: "Иск удовлетворен",
  partially_satisfied: "Частично удовлетворен",
  denied: "В иске отказано",
  settled: "Заключено медиативное/мировое соглашение",
  dismissed: "Оставлено без рассмотрения",
  pending: "Решение не вынесено",
  returned: "Иск возвращён",
};

export const caseTypeLabels: Record<CaseType, string> = {
  civil: "Гражданское",
  administrative: "Административное",
  criminal: "Уголовное",
  executive: "Исполнительное производство",
  labor: "Трудовое",
  tax: "Налоговое",
  corporate: "Корпоративное",
  other: "Иное",
};

export const partyRoleLabels: Record<PartyRole, string> = {
  plaintiff: "Истец",
  defendant: "Ответчик",
  third_party: "Третье лицо",
};

/** Подписи категорий иска для UI (Select/фильтры). */
export const disputeCategoryLabels: Record<DisputeCategory, string> = {
  procurement: "Иски, связанные с нарушением законодательства о закупках и вытекающие из договоров",
  transportation: "Иски, вытекающие из перевозочного процесса",
  government: "Иски, вытекающие из споров с госорганами",
  labor: "Трудовые споры",
  other: "Иные",
  mediation: "Медиативные соглашения",
};

/** Полные подписи — для отображения в карточке дела или подсказке. */
export const disputeCategoryFullLabels: Record<DisputeCategory, string> = {
  procurement: "Иски, связанные с нарушением законодательства о закупках и вытекающие из договоров",
  transportation: "Иски, вытекающие из перевозочного процесса",
  government: "Иски, вытекающие из споров с госорганами",
  labor: "Трудовые споры",
  other: "Иные",
  mediation: "Медиативные соглашения",
};

/**
 * Какие категории доступны для конкретной роли в шаблоне ПИР:
 * на «истец» нет «перевозочные» — такие дела сваливаются в «Иные споры».
 */
export const allowedDisputeCategoriesForRole: Record<PartyRole, DisputeCategory[]> = {
  plaintiff: ["procurement", "transportation", "government", "labor", "other", "mediation"],
  defendant: ["procurement", "transportation", "government", "labor", "other", "mediation"],
  third_party: ["procurement", "transportation", "government", "labor", "other", "mediation"],
};

export const commentTypeLabels: Record<string, string> = {
  question: "Вопрос",
  clarify: "Уточнить",
  problem: "Проблема",
  info: "Информация",
};

export const branches = [
  "ЦА - Центральный аппарат",
  "АО «Вагонсервис»",
  'РФ «Северный»',
  'РФ «Западный»',
  'РФ «Южный»',
  'Филиал «Экспресс»',
  'Филиал «Пригородные перевозки»',
  'Филиал «Сұңқар»',
];

/** Нормализует название филиала из БД к каноническому виду. */
export function normalizeBranchName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/[«»"']/g, "").replace(/\s+/g, " ");
  if (/^(цлю|цюс|цлвсю|цюс\/цлю|центральный аппарат|центральный|ца|цлю|цлвсю)/.test(s)) return "ЦА - Центральный аппарат";
  if (/вагонсервис/.test(s)) return "АО «Вагонсервис»";
  if (/северн/.test(s)) return 'РФ «Северный»';
  if (/западн/.test(s)) return 'РФ «Западный»';
  if (/южн/.test(s)) return 'РФ «Южный»';
  if (/экспресс/.test(s)) return 'Филиал «Экспресс»';
  if (/пригородн/.test(s)) return 'Филиал «Пригородные перевозки»';
  if (/с[уұ]н[кқ]ар/.test(s)) return 'Филиал «Сұңқар»';
  return raw.trim();
}

/**
 * Не названия структурных подразделений (часто ошибочные строки из ПИР в колонке «филиал»).
 * Такие значения не участвуют в аналитике по филиалам.
 */
export function isRealBranchNameForStats(name: string | null | undefined): boolean {
  if (name == null) return false;
  const raw = name.trim().normalize("NFKC").replace(/\s+/g, " ");
  if (!raw) return false;
  const s = raw.toLowerCase();
  const exact = new Set([
    "предъявлено",
    "удовлетворено",
    "отказано",
    "заключено медиативное соглашение",
    "частично удовлетворено",
    "полностью удовлетворено",
    "иск удовлетворен",
    "в иске отказано",
    "мировое соглашение",
    "оставлено без рассмотрения",
    "нет решения",
  ]);
  if (exact.has(s)) return false;
  if (s === "нет" || s === "не указано" || s === "нет филиала") return false;
  // только пробелы и знаки «тире» (Pd) — не филиал, даже если символ не совпал с литералом «—»
  if (/^[\p{Pd}\p{Zs}]+$/u.test(raw)) return false;
  if (s.includes("медиатив")) return false;
  if (s.startsWith("удовлетворен") || s.startsWith("частично удовлетворен")) return false;
  if (s.startsWith("предъявлен")) return false;
  if (/^отказан/.test(s)) return false;
  return true;
}

/** Уникальные названия филиалов из поля `branch` в делах (как приходит с API). */
export const getBranchNamesFromCases = (cases: LegalCase[]): string[] => {
  const set = new Set<string>();
  for (const c of cases) {
    const b = c.branch?.trim();
    if (b && isRealBranchNameForStats(b)) set.add(b);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
};

/** Справочник филиалов для аналитики: активные подразделения из БД + любые названия из дел (импорт ПИР и т.д.). */
export const mergeBranchDirectory = (apiBranchNames: string[], cases: LegalCase[]): string[] => {
  const set = new Set<string>();
  for (const n of apiBranchNames) {
    const t = n?.trim();
    if (t && isRealBranchNameForStats(t)) set.add(t);
  }
  for (const c of cases) {
    const b = c.branch?.trim();
    if (b && isRealBranchNameForStats(b)) set.add(b);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
};

/** Уникальные ФИО из поля «Ответственный» по загруженным делам (сортировка ru). */
export const getLawyerNamesFromCases = (cases: LegalCase[]): string[] => {
  const set = new Set<string>();
  for (const c of cases) {
    const n = c.assignedLawyer?.trim();
    if (n) set.add(n);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
};
export interface Counterparty {
  id: string;
  bin: string;
  name: string;
  totalCases: number;
  activeCases: number;
  totalDebt: number;
  totalPaid: number;
  lastCaseDate: string;
}

export const getCounterparties = (cases: LegalCase[]): Counterparty[] => {
  const map = new Map<string, Counterparty>();
  cases.forEach(c => {
    // У КТЖ-стороны компания/БИН в поле company/companyBIN — это и есть контрагент.
    // БИН чаще всего пустой (импорт ПИР не содержит его для большинства дел),
    // поэтому ключ группировки — нормализованное имя; БИН только переносим в карточку,
    // если он есть. Это даёт 187 уникальных контрагентов вместо 3.
    const rawName = (c.company || "").trim();
    if (!rawName) return;
    const key = rawName.toLowerCase().replace(/\s+/g, " ");
    const existing = map.get(key);
    if (existing) {
      existing.totalCases++;
      existing.activeCases += ["active", "mediation", "suspended", "execution"].includes(c.status) ? 1 : 0;
      existing.totalDebt += c.mainDebt;
      existing.totalPaid += c.paidAmount;
      if (c.filingDate > existing.lastCaseDate) existing.lastCaseDate = c.filingDate;
      // если у нас ещё не было БИН — подхватываем первый встретившийся
      if (!existing.bin && c.companyBIN) existing.bin = c.companyBIN;
    } else {
      map.set(key, {
        id: key,
        bin: c.companyBIN || "",
        name: rawName,
        totalCases: 1,
        activeCases: ["active", "mediation", "suspended", "execution"].includes(c.status) ? 1 : 0,
        totalDebt: c.mainDebt,
        totalPaid: c.paidAmount,
        lastCaseDate: c.filingDate,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
};

export const formatAmount = (amount: number): string => {
  const n = Math.round(Number(amount));
  return new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(n) + " ₸";
};

/** Краткий вид суммы (млн / тыс.). Учитывает отрицательные значения — иначе попадали в «хвост» toString() с float-шумом. */
export const formatAmountShort = (amount: number): string => {
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(Number(amount));
  const trimDec = (s: string) => s.replace(/\.0$/, "");
  if (abs >= 1_000_000_000) return `${sign}${trimDec((abs / 1_000_000_000).toFixed(1))} млрд ₸`;
  if (abs >= 1_000_000) return `${sign}${trimDec((abs / 1_000_000).toFixed(1))} млн ₸`;
  if (abs >= 1_000) return `${sign}${trimDec((abs / 1_000).toFixed(0))} тыс ₸`;
  return `${sign}${Math.round(abs)} ₸`;
};

/**
 * Статистика по юристам. Без `lawyerNames` — только те, кто встречается в `cases` (удобно для графиков с периодом).
 * С `lawyerNames` — полный справочник (например, активные юристы из БД + любые ФИО из дел).
 */
const isActiveNow = (c: LegalCase): boolean => {
  if (c.status === "active" || c.status === "mediation" || c.status === "suspended") return true;
  if (c.status === "execution") {
    const note = (c.litigation?.damageRecoveryNote || "").trim().toLowerCase();
    return note !== "исполнено" && note !== "прекращено";
  }
  return false;
};

const workloadLevelFor = (n: number): "free" | "normal" | "busy" | "overloaded" => {
  if (n === 0) return "free";
  if (n <= 3) return "normal";
  if (n <= 5) return "busy";
  return "overloaded";
};

const hiddenLawyerStatsNames = new Set(["Орак С.Б."]);

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const outcomeWeight = (outcome: CaseOutcome): number | null => {
  if (outcome === "fully_satisfied") return 100;
  if (outcome === "partially_satisfied") return 80;
  if (outcome === "settled") return 70;
  if (outcome === "denied" || outcome === "dismissed" || outcome === "returned") return 0;
  return null;
};

export const getLawyerStats = (cases: LegalCase[], lawyerNames?: string[]) => {
  const names =
    lawyerNames && lawyerNames.length > 0
      ? [...new Set(lawyerNames.map((n) => n.trim()).filter(Boolean))]
      : getLawyerNamesFromCases(cases);
  const visibleNames = names
    .filter((name) => !hiddenLawyerStatsNames.has(name))
    .sort((a, b) => a.localeCompare(b, "ru"));
  const rows = visibleNames.map((lawyer) => {
    const lawyerCases = cases.filter((c) => c.assignedLawyer === lawyer);
    const isLawyerActive =
      lawyerCases.length === 0 ? true : lawyerCases.some((c) => c.assignedLawyerIsActive !== false);
    const won = lawyerCases.filter(
      (c) => c.outcome === "fully_satisfied" || c.outcome === "partially_satisfied" || c.outcome === "settled",
    ).length;
    const lost = lawyerCases.filter((c) => c.outcome === "denied" || c.outcome === "dismissed" || c.outcome === "returned").length;
    const active = lawyerCases.filter((c) => ["active", "mediation", "suspended", "execution"].includes(c.status)).length;
    const activeNow = lawyerCases.filter(isActiveNow).length;
    const totalAmount = lawyerCases.reduce((s, c) => s + c.claimAmount, 0);
    const highRiskCases = lawyerCases.filter((c) => c.riskLevel === "high").length;
    const overdueCases = lawyerCases.filter((c) => (c.daysOverdue ?? 0) > 0).length;
    const overdueDays = lawyerCases.reduce((s, c) => s + Math.max(0, c.daysOverdue ?? 0), 0);
    const decidedWeights = lawyerCases
      .map((c) => outcomeWeight(c.outcome))
      .filter((v): v is number => v !== null);
    const avgDays =
      decidedWeights.length > 0
        ? Math.round(
            lawyerCases.filter((c) => outcomeWeight(c.outcome) !== null).reduce((s, c) => {
              const start = new Date(c.filingDate);
              const end = new Date(c.lastUpdated);
              return s + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / decidedWeights.length,
          )
        : 0;
    const winRate = lawyerCases.length > 0 ? Math.round((won / Math.max(won + lost, 1)) * 100) : 0;
    const resolvedQuality = decidedWeights.length > 0
      ? decidedWeights.reduce((s, v) => s + v, 0) / decidedWeights.length
      : 50;
    const confidence = decidedWeights.length / (decidedWeights.length + 3);
    const resultScore = clampScore(50 + (resolvedQuality - 50) * confidence);
    return {
      name: lawyer,
      isActive: isLawyerActive,
      totalCases: lawyerCases.length,
      won,
      lost,
      active,
      activeNow,
      decidedCases: decidedWeights.length,
      highRiskCases,
      overdueCases,
      overdueDays,
      totalAmount,
      avgDays,
      winRate,
      resultScore: Math.round(resultScore),
      volumeScore: 0,
      amountScore: 0,
      riskScore: 0,
      timelinessScore: 0,
      ratingScore: 0,
      workloadLevel: workloadLevelFor(activeNow),
      workloadPercent: 0,
      compositeScore: 0,
    };
  });

  const maxActive = Math.max(1, ...rows.map((r) => r.activeNow));
  const maxTotal = Math.max(1, ...rows.map((r) => r.totalCases));
  const maxAmountLog = Math.max(1, ...rows.map((r) => Math.log1p(r.totalAmount)));
  const maxRisk = Math.max(1, ...rows.map((r) => r.highRiskCases));
  const minAvgDays = Math.min(...rows.filter((r) => r.avgDays > 0).map((r) => r.avgDays), Infinity);
  const maxAvgDays = Math.max(1, ...rows.map((r) => r.avgDays));

  for (const r of rows) {
    r.workloadPercent = Math.round((r.activeNow / maxActive) * 100);
    r.volumeScore = Math.round((Math.log1p(r.totalCases) / Math.log1p(maxTotal)) * 100);
    r.amountScore = Math.round((Math.log1p(r.totalAmount) / maxAmountLog) * 100);
    r.riskScore = Math.round((Math.log1p(r.highRiskCases) / Math.log1p(maxRisk)) * 100);

    const durationScore =
      r.avgDays > 0 && Number.isFinite(minAvgDays) && maxAvgDays > minAvgDays
        ? clampScore(100 - ((r.avgDays - minAvgDays) / (maxAvgDays - minAvgDays)) * 60)
        : r.avgDays > 0
          ? 85
          : 60;
    const overduePenalty = Math.min(55, r.overdueCases * 12 + Math.min(25, r.overdueDays / 3));
    r.timelinessScore = Math.round(clampScore(durationScore - overduePenalty));
    r.ratingScore = Math.round(
      r.resultScore * 0.45 +
      r.volumeScore * 0.2 +
      r.amountScore * 0.15 +
      r.riskScore * 0.1 +
      r.timelinessScore * 0.1,
    );
    r.compositeScore = r.ratingScore;
  }

  return rows.sort((a, b) => b.ratingScore - a.ratingScore || b.totalCases - a.totalCases);
};

// Role system
export type UserRole = "director" | "chief_lawyer" | "branch_lawyer" | "accountant";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  branch: string | null; // null for director (all branches)
  email: string;
  avatar?: string;
}

export const roleLabels: Record<string, string> = {
  director: "Директор",
  chief_lawyer: "Главный юрист",
  branch_lawyer: "Юрист филиала",
  accountant: "Бухгалтер",
  system: "Система",
};

// Current user storage key (used by useCurrentUser + apiAuthHeaders)
export const USER_STORAGE_KEY = "court_flow_current_user";

// Permissions helper
export const canViewAllCases = (user: User): boolean =>
  user.role === "director" || user.role === "chief_lawyer" || user.role === "accountant" || (user.branch || "").includes("Центральный аппарат");
export const canViewAllBranches = (user: User): boolean =>
  user.role === "director" || user.role === "chief_lawyer" || (user.branch || "").includes("Центральный аппарат");
export const canViewAllAnalytics = (user: User): boolean => user.role === "director" || user.role === "chief_lawyer";
export const canViewAuditLog = (user: User): boolean => user.role === "director" || user.role === "chief_lawyer";
export const canEditCase = (user: User, caseData: LegalCase): boolean => {
  if (user.role === "director" || user.role === "chief_lawyer") return true;
  if ((user.branch || "").includes("Центральный аппарат")) return true;
  if (user.role === "branch_lawyer") return caseData.branch === user.branch;
  return false;
};
export const canAddPayment = (user: User): boolean => user.role === "director" || user.role === "accountant";
export const canViewLawyerStats = (user: User): boolean => user.role === "director" || user.role === "chief_lawyer";
export const canAddCase = (user: User): boolean => user.role === "branch_lawyer";
export const canManageUsers = (user: User): boolean => user.role === "director" || user.role === "chief_lawyer";

export const CASES_CHANGE_EVENT = "casechange";

export const notifyCasesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CASES_CHANGE_EVENT));
  }
};

/** @deprecated Cases are created via API; kept for compatibility with legacy callers. */
export const addCase = (_c: LegalCase) => {
  notifyCasesChanged();
};

// Filter cases based on user role (`cases` must come from API / useCases — no implicit mock fallback).
export const getFilteredCasesForUser = (user: User, cases: LegalCase[]): LegalCase[] => {
  if (canViewAllCases(user)) return cases;
  if (user.role === "branch_lawyer" && user.branch) {
    return cases.filter(c => c.branch === user.branch);
  }
  return [];
};
