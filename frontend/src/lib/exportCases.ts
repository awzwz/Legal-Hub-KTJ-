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

const columns: Array<{ header: string; key: string; width: number; getValue: (c: LegalCase) => unknown }> = [
  { header: "№ дела", key: "caseNumber", width: 18, getValue: (c) => c.caseNumber },
  { header: "Контрагент", key: "counterparty", width: 32, getValue: getCounterparty },
  { header: "БИН/ИИН", key: "companyBIN", width: 14, getValue: (c) => c.companyBIN },
  { header: "Тип", key: "caseType", width: 22, getValue: (c) => caseTypeLabels[c.caseType] ?? c.caseType },
  { header: "Роль КТЖ", key: "partyRole", width: 14, getValue: (c) => partyRoleLabels[c.partyRole] ?? c.partyRole },
  { header: "Статус", key: "status", width: 22, getValue: (c) => caseStatusLabels[c.status] ?? c.status },
  {
    header: "Инстанция",
    key: "courtInstance",
    width: 22,
    getValue: (c) => courtInstanceLabels[c.courtInstance] ?? c.courtInstance,
  },
  { header: "Наименование суда", key: "court", width: 28, getValue: (c) => c.court },
  { header: "Судья", key: "judge", width: 22, getValue: (c) => c.judge },
  { header: "Сумма иска (₸)", key: "claimAmount", width: 16, getValue: (c) => c.claimAmount },
  { header: "Взыскано (₸)", key: "paidAmount", width: 16, getValue: (c) => c.paidAmount },
  { header: "Юрист", key: "assignedLawyer", width: 22, getValue: (c) => c.assignedLawyer },
  { header: "Филиал", key: "branch", width: 24, getValue: (c) => c.branch },
  { header: "Город", key: "city", width: 14, getValue: (c) => c.city },
  { header: "Риск", key: "riskLevel", width: 18, getValue: (c) => riskLabels[c.riskLevel] ?? c.riskLevel },
  { header: "Дата подачи", key: "filingDate", width: 12, getValue: (c) => c.filingDate },
  {
    header: "Ближайшее заседание",
    key: "nextHearing",
    width: 18,
    getValue: (c) => c.nextHearing === "not_set" || !c.nextHearing ? "Не назначено" : c.nextHearing,
  },
  { header: "Срок оплаты", key: "paymentDeadline", width: 12, getValue: (c) => c.paymentDeadline ?? "" },
  { header: "Просрочено (дней)", key: "daysOverdue", width: 12, getValue: (c) => c.daysOverdue },
];

export const toSpreadsheetCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  // Keep imported text inert when the workbook is opened in spreadsheet applications.
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

export async function buildCasesWorkbook(cases: LegalCase[]) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Реестр судебных дел");
  worksheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };
  for (const legalCase of cases) {
    worksheet.addRow(
      Object.fromEntries(columns.map(({ key, getValue }) => [key, toSpreadsheetCell(getValue(legalCase))])),
    );
  }
  return workbook.xlsx.writeBuffer();
}

export async function exportCasesToExcel(cases: LegalCase[], fileName?: string) {
  const buffer = await buildCasesWorkbook(cases);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const today = new Date().toISOString().slice(0, 10);
  const name = fileName ?? `Реестр_судебных_дел_${today}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
