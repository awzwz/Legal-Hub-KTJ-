const fs = require('fs');

let content = fs.readFileSync('mockData.ts', 'utf-8');

// 1. Replace types
content = content.replace(
  /export type CaseStatus = "active" \| "won" \| "lost" \| "appeal" \| "cassation" \| "execution" \| "closed";/,
  `export type CaseStatus = "active" | "mediation" | "suspended" | "execution" | "closed";\nexport type CaseOutcome = "fully_satisfied" | "partially_satisfied" | "denied" | "settled" | "dismissed" | "pending";`
);

// 2. Add outcome to LegalCase
content = content.replace(
  /status: CaseStatus;\n  partyRole: PartyRole;/,
  `status: CaseStatus;\n  outcome: CaseOutcome;\n  partyRole: PartyRole;`
);

// 3. Replace labels
content = content.replace(
  /export const caseStatusLabels: Record<CaseStatus, string> = {[\s\S]*?};\n/,
  `export const caseStatusLabels: Record<CaseStatus, string> = {
  active: "В работе",
  mediation: "Медиация",
  suspended: "Приостановлено",
  execution: "Исполнение",
  closed: "Закрыто",
};

export const caseOutcomeLabels: Record<CaseOutcome, string> = {
  fully_satisfied: "Иск удовлетворен",
  partially_satisfied: "Частично удовлетворен",
  denied: "В иске отказано",
  settled: "Мировое соглашение",
  dismissed: "Оставлено без рассмотрения",
  pending: "Нет решения",
};
`
);

// 4. Update mockCases
content = content.replace(/status: "active",/g, 'status: "active", outcome: "pending",');
content = content.replace(/status: "won",/g, 'status: "closed", outcome: "fully_satisfied",');
content = content.replace(/status: "lost",/g, 'status: "closed", outcome: "denied",');
content = content.replace(/status: "appeal",/g, 'status: "active", outcome: "pending",');
content = content.replace(/status: "cassation",/g, 'status: "active", outcome: "pending",');
content = content.replace(/status: "execution",/g, 'status: "execution", outcome: "pending",');
content = content.replace(/status: "closed",/g, 'status: "closed", outcome: "settled",');

// 5. Update getCounterparties
content = content.replace(
  /\["active", "appeal", "cassation", "execution"\]\.includes\(c\.status\)/g,
  `["active", "mediation", "suspended", "execution"].includes(c.status)`
);

// 6. Update getLawyerStats
content = content.replace(
  /const won = cases\.filter\(c => c\.status === "won"\)\.length;/,
  `const won = cases.filter(c => c.outcome === "fully_satisfied" || c.outcome === "partially_satisfied" || c.outcome === "settled").length;`
);
content = content.replace(
  /const lost = cases\.filter\(c => c\.status === "lost"\)\.length;/,
  `const lost = cases.filter(c => c.outcome === "denied" || c.outcome === "dismissed").length;`
);

fs.writeFileSync('mockData.ts', content, 'utf-8');
console.log('Migration complete');
