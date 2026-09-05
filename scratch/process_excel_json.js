const fs = require('fs');

let fileContent = fs.readFileSync('d:\\Claude\\ndd\\scratch\\excel_data_utf8.json', 'utf8');
fileContent = fileContent.replace(/^\uFEFF/, '');
const rawData = JSON.parse(fileContent);

console.log("Total records loaded from Excel JSON:", rawData.length);

const provincesMap = new Map();

rawData.forEach(item => {
  const provNameFull = item.tenTinhTP;
  const provCode = item.maTinhBNV || item.maTinhTMS;
  const wardName = item.tenPhuongXaMoi;

  if (!provincesMap.has(provNameFull)) {
    provincesMap.set(provNameFull, {
      code: provCode,
      nameWithPrefix: provNameFull,
      provinceClean: provNameFull.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim(),
      type: provNameFull.startsWith("Thành phố") ? "thanh-pho" : "tinh",
      wardsSet: new Set()
    });
  }

  const pObj = provincesMap.get(provNameFull);
  if (wardName) {
    pObj.wardsSet.add(wardName);
  }
});

console.log("Unique Provinces Found:", provincesMap.size);

const provincesList = Array.from(provincesMap.values()).map(p => ({
  code: p.code,
  province: p.provinceClean,
  type: p.type,
  nameWithType: p.nameWithPrefix,
  oldNames: p.type === "thanh-pho" ? [p.provinceClean] : [],
  wardsCount: p.wardsSet.size,
  wards: Array.from(p.wardsSet)
}));

console.log(JSON.stringify(provincesList.map(p => ({
  code: p.code,
  province: p.province,
  nameWithType: p.nameWithType,
  type: p.type,
  wardsCount: p.wardsCount
})), null, 2));
