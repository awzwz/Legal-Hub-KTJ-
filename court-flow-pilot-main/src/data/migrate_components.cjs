const fs = require('fs');
const glob = require('glob'); // wait, node might not have glob without npm install. I will use a simple recursive directory read.
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(getFiles(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = getFiles(path.join(__dirname, '../components'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Replace won/lost colors logic
  if (content.includes('status === "won"')) {
    content = content.replace(/status === "won"/g, 'outcome === "fully_satisfied"');
    changed = true;
  }
  if (content.includes('status === "lost"')) {
    content = content.replace(/status === "lost"/g, 'outcome === "denied"');
    changed = true;
  }
  // execution and others if needed
  
  // DashboardCharts specific
  if (content.includes('["active", "appeal", "cassation", "execution"].includes')) {
    content = content.replace(/\["active", "appeal", "cassation", "execution"\].includes\(c.status\)/g, '["active", "mediation", "suspended", "execution"].includes(c.status)');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
  }
}
console.log('Component migration complete');
