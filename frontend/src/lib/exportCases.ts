import * as XLSX from "xlsx";
import {
  caseStatusLabels,
  caseTypeLabels,
  courtInstanceLabels,
  partyRoleLabels,
  type LegalCase,
} from "@/data/mockData";

const riskLabels: Record<LegalCase["riskLevel"], string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

const getCounterparty = (c: LegalCase) =>
  c.partyRole === "defendant" ? c.plaintiff : c.defendant;

export function exportCasesToExcel(cases: LegalCase[], fileName?: string) {
  const rows = cases.map((c) => ({
    "№ дела": c.caseNumber,
    "Контрагент": getCounterparty(c),
    "БИН/ИИН": c.companyBIN,
    "Тип": caseTypeLabels[c.caseType] ?? c.caseType,
    "Роль КТЖ": partyRoleLabels[c.partyRole] ?? c.partyRole,
    "Статус": caseStatusLabels[c.status] ?? c.status,
    "Инстанция": courtInstanceLabels[c.courtInstance] ?? c.courtInstance,
    "Наименование суда": c.court,
    "Судья": c.judge,
    "Сумма иска (₸)": c.claimAmount,
    "Взыскано (₸)": c.paidAmount,
    "Юрист": c.assignedLawyer,
    "Филиал": c.branch,
    "Город": c.city,
    "Уровень значимости": riskLabels[c.riskLevel] ?? c.riskLevel,
    "Дата подачи": c.filingDate,
    "Ближайшее заседание":
      c.nextHearing === "not_set" || !c.nextHearing ? "Не назначено" : c.nextHearing,
    "Срок оплаты": c.paymentDeadline ?? "",
    "Просрочено (дней)": c.daysOverdue,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 18 }, // № дела
    { wch: 32 }, // Контрагент
    { wch: 14 }, // БИН/ИИН
    { wch: 22 }, // Тип
    { wch: 14 }, // Роль
    { wch: 22 }, // Статус
    { wch: 22 }, // Инстанция
    { wch: 28 }, // Наименование суда
    { wch: 22 }, // Судья
    { wch: 16 }, // Сумма иска
    { wch: 16 }, // Взыскано
    { wch: 22 }, // Юрист
    { wch: 24 }, // Филиал
    { wch: 14 }, // Город
    { wch: 12 }, // Риск
    { wch: 12 }, // Дата подачи
    { wch: 18 }, // Ближайшее заседание
    { wch: 12 }, // Срок оплаты
    { wch: 12 }, // Просрочено
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Реестр судебных дел");

  const today = new Date().toISOString().slice(0, 10);
  const name = fileName ?? `Реестр_судебных_дел_${today}.xlsx`;
  XLSX.writeFile(wb, name);
}
