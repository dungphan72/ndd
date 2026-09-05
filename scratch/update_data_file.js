const fs = require('fs');

const dataFilePath = 'd:\\Claude\\ndd\\js\\data.js';
let dataJsContent = fs.readFileSync(dataFilePath, 'utf8');

const locationsJsCode = fs.readFileSync('d:\\Claude\\ndd\\scratch\\vietnam_locations_code.js', 'utf8');

// Find start of VIETNAM_LOCATIONS and start of SEED_ADMINISTRATIVE_MAPPINGS
const locStartIndex = dataJsContent.indexOf('/// Danh mục Địa Phương 2 Cấp');
if (locStartIndex === -1) {
  console.error("Could not find start marker for VIETNAM_LOCATIONS");
  process.exit(1);
}

const mapStartIndex = dataJsContent.indexOf('// Bảng Ánh Xạ Địa Giới Lịch Sử');
if (mapStartIndex === -1) {
  console.error("Could not find start marker for SEED_ADMINISTRATIVE_MAPPINGS");
  process.exit(1);
}

const beforeLoc = dataJsContent.substring(0, locStartIndex);
const afterLoc = dataJsContent.substring(mapStartIndex);

const updatedContent = beforeLoc + locationsJsCode + "\n" + afterLoc;

fs.writeFileSync(dataFilePath, updatedContent, 'utf8');
console.log("Successfully updated js/data.js with new VIETNAM_LOCATIONS from Excel file!");
