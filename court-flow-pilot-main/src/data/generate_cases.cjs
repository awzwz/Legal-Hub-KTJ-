const fs = require('fs');

const branches = ["Центральный аппарат", "Северный", "Южный", "Западный", "Экспресс"];
const riskLevels = ["low", "medium", "high"];
const statuses = ["active", "mediation", "suspended", "execution", "closed"];
const outcomes = ["fully_satisfied", "partially_satisfied", "denied", "settled", "dismissed", "pending"];
const caseTypes = ["civil", "administrative", "criminal", "executive", "labor", "tax", "corporate", "other"];
const instances = ["first", "appeal", "cassation", "supreme"];
const roles = ["plaintiff", "defendant", "third_party"];

const physicalNames = ["Иванов И.И.", "Омаров С.С.", "Алиев А.А.", "Петров П.П.", "Сыздыков Б.М."];
const juridicalNames = ["ТОО «АльфаПром»", "АО «Самрук»", "КГД МФ РК", "ТОО «ТрансЛогистик»", "ТОО «СтройСервис»", "ТОО «ТемирЖол»"];

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomAmount = (min, max) => Math.floor(Math.random() * ((max - min)/1000)) * 1000 + min;
const randomBIN = () => Math.floor(Math.random() * 900000000000 + 100000000000).toString();

const cases = [];

for (let i = 1; i <= 20; i++) {
  const isHQ = i <= 3;
  const isOverdue = i >= 17;
  const opponentType = Math.random() > 0.3 ? "juridical" : "physical";
  
  const company = opponentType === "juridical" ? random(juridicalNames) : random(physicalNames);
  const companyBIN = randomBIN();

  let claimAmount = isHQ ? randomAmount(5000000000, 20000000000) : randomAmount(50000, 500000000);
  const mainDebt = Math.floor(claimAmount * 0.8);
  const fines = Math.floor(claimAmount * 0.1);
  const stateFee = Math.floor(claimAmount * 0.03);
  const repExpenses = Math.floor(claimAmount * 0.05);
  const otherCosts = Math.floor(claimAmount * 0.02);
  
  const status = isOverdue ? "execution" : random(statuses);
  const outcome = status === "closed" ? random(["fully_satisfied", "partially_satisfied", "denied", "settled", "dismissed"]) : "pending";
  
  const paidAmount = outcome === "fully_satisfied" || outcome === "settled" ? claimAmount : (status === "execution" ? Math.floor(claimAmount * 0.2) : 0);
  
  const daysOverdue = isOverdue ? random([45, 90, 120, 150]) : 0;
  const paymentDeadline = isOverdue ? "2025-11-01" : (status === "execution" ? "2026-08-01" : null);
  
  const nextHearing = status === "closed" ? null : (Math.random() > 0.5 ? "not_set" : "2026-06-15 10:00");
  const partyRole = random(roles);
  
  cases.push({
    id: i.toString(),
    caseNumber: "2-" + (1000 + i) + "/2026",
    court: isHQ ? "СМЭС г. Астана" : "Областной суд",
    courtInstance: random(instances),
    caseType: isHQ ? "corporate" : random(caseTypes),
    status: status,
    outcome: outcome,
    partyRole: partyRole,
    opponentType: opponentType,
    plaintiff: partyRole === "plaintiff" ? "АО «НК «КТЖ»" : company,
    defendant: partyRole === "defendant" ? "АО «НК «КТЖ»" : company,
    company: company,
    companyBIN: companyBIN,
    claimAmount: claimAmount,
    mainDebt: mainDebt,
    stateFee: stateFee,
    fines: fines,
    repExpenses: repExpenses,
    otherCosts: otherCosts,
    paidAmount: paidAmount,
    assignedLawyer: "Иванов А.А.",
    branch: isHQ ? "Центральный аппарат" : random(branches.slice(1)),
    city: isHQ ? "Астана" : "Алматы",
    judge: "Сыздыков Р.К.",
    filingDate: "2026-01-10",
    nextHearing: nextHearing,
    paymentDeadline: paymentDeadline,
    daysOverdue: daysOverdue,
    lastUpdated: "2026-04-20",
    riskLevel: isHQ ? "high" : random(riskLevels),
    documents: [
      {
        id: "d" + i + "-1",
        title: "Исковое заявление",
        uploadDate: "2026-01-10",
        author: "Иванов А.А."
      }
    ],
    payments: paidAmount > 0 ? [
      {
        id: "p" + i + "-1",
        documentNumber: "ПП-" + i + "11",
        payer: partyRole === "plaintiff" ? company : "АО «НК «КТЖ»",
        payee: partyRole === "plaintiff" ? "АО «НК «КТЖ»" : company,
        date: "2026-03-15",
        amount: paidAmount,
        description: "Оплата по делу"
      }
    ] : [],
    comments: [
      {
        id: "c" + i + "-1",
        author: "Юрист",
        role: "branch_lawyer",
        text: isOverdue ? "Срочно нужно взыскать долг, сроки горят!" : "Рабочий процесс идет.",
        type: isOverdue ? "problem" : "info",
        date: "2026-04-18",
        likes: 1
      }
    ],
    events: [
      {
        id: "e" + i + "-1",
        date: "2026-01-10",
        action: "Регистрация иска",
        user: "Система"
      }
    ]
  });
}

const code = "export const mockCases: LegalCase[] = " + JSON.stringify(cases, null, 2) + ";";

fs.writeFileSync('cases_output.ts', code, 'utf-8');
console.log("Done");
