const fs = require('fs');

const content = fs.readFileSync('d:\\Claude\\ndd\\scratch\\excel_data.csv', 'utf8');
const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

console.log("Total lines in CSV:", lines.length);
for (let i = 0; i < Math.min(10, lines.length); i++) {
  console.log(`Line ${i + 1}:`, lines[i]);
}
