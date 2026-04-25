const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, 'mockData.ts');
let content = fs.readFileSync(mockDataPath, 'utf8');

// Remove duplicate outcome
content = content.replace(/outcome: "settled", outcome: "(.*?)",/g, 'outcome: "$1",');
content = content.replace(/outcome: "settled", outcome: "denied",/g, 'outcome: "denied",'); // in case it missed

// Remove duplicate documents
// Keep only one "documents: []," per object
// The easiest way is to match all `documents: [],\s*documents: [],` and collapse them.
while (content.includes('documents: [],\n    documents: [],')) {
  content = content.replace(/documents: \[\],\n    documents: \[\],/g, 'documents: [],');
}
while (content.includes('documents: [],\n      documents: [],')) {
  content = content.replace(/documents: \[\],\n      documents: \[\],/g, 'documents: [],');
}

fs.writeFileSync(mockDataPath, content, 'utf8');
console.log('Fixed duplicates');
