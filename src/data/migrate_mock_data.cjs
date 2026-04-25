const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, 'mockData.ts');
let content = fs.readFileSync(mockDataPath, 'utf8');

// 1. Interfaces
// CaseDocument
const caseDocInterface = `
export interface CaseDocument {
  id: string;
  title: string;
  uploadDate: string;
  author: string;
}
`;

content = content.replace(/export interface CaseComment/, `${caseDocInterface}\nexport interface CaseComment`);

// LegalCase
content = content.replace(/penalty: number;/, 'fines: number;');
content = content.replace(/lawyerFee: number;/, 'repExpenses: number;');
content = content.replace(/executionFee: number;/, 'otherCosts: number;');
content = content.replace(/nextHearing: string \| null;/, 'nextHearing: string | null | "not_set";');
content = content.replace(/comments: CaseComment\[\];/, 'documents: CaseDocument[];\n  comments: CaseComment[];');

// 2. Branches
content = content.replace(
  /export const branches = \["Северный", "Южный", "Западный", "Экспресс", "Центральный"\];/,
  `export const branches = ["Центральный аппарат", "Северный", "Южный", "Западный", "Экспресс", "Центральный"];`
);

// 3. canViewAllCases logic
content = content.replace(
  /export const canViewAllCases = \(user: User\): boolean => user\.role === "director" \|\| user\.role === "accountant";/,
  `export const canViewAllCases = (user: User): boolean => user.role === "director" || user.role === "accountant" || user.branch === "Центральный аппарат";`
);

// 4. Update mockCases data
// Add documents: []
content = content.replace(/payments: \[\],/g, 'documents: [],\n    payments: [],');
content = content.replace(/payments: \[([\s\S]*?)\](,?)/g, (match, p1, p2) => {
  return `documents: [],\n    payments: [${p1}]${p2}`;
});
// Note: sometimes it's formatted inline, sometimes multi-line. Let's do a more robust regex for documents.
// If documents doesn't exist, insert it before payments.
content = content.replace(/(\s*)(payments:\s*\[)/g, '$1documents: [],$1$2');

// Rename penalty -> fines, lawyerFee -> repExpenses, executionFee -> otherCosts
content = content.replace(/penalty:/g, 'fines:');
content = content.replace(/lawyerFee:/g, 'repExpenses:');
content = content.replace(/executionFee:/g, 'otherCosts:');

// 5. notifyCasesChanged - make sure it's exported
if (!content.includes('export const notifyCasesChanged')) {
  content = content.replace(
    /export const addCase = /,
    `export const notifyCasesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CASES_CHANGE_EVENT));
  }
};

export const addCase = `
  );
}

// Ensure addCase uses notifyCasesChanged
content = content.replace(
  /if \(typeof window !== "undefined"\) {\s*window\.dispatchEvent\(new CustomEvent\(CASES_CHANGE_EVENT\)\);\s*}/,
  `notifyCasesChanged();`
);

fs.writeFileSync(mockDataPath, content, 'utf8');
console.log('mockData migrated');
