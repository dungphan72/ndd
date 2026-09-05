const fs = require('fs');
const path = require('path');

let fileContent = fs.readFileSync('d:\\Claude\\ndd\\scratch\\excel_data_utf8.json', 'utf8');
fileContent = fileContent.replace(/^\uFEFF/, '');
const rawData = JSON.parse(fileContent);

console.log("Processing", rawData.length, "rows from Excel...");

const provincesMap = new Map();

rawData.forEach(item => {
  let provNameFull = item.tenTinhTP ? item.tenTinhTP.trim() : "";
  let provCode = item.maTinhBNV || item.maTinhTMS;
  let wardName = item.tenPhuongXaMoi ? item.tenPhuongXaMoi.trim() : "";

  if (!provNameFull) return;

  // Clean province names
  let provinceClean = provNameFull.replace(/^(Thành phố|Tp|Tỉnh)\s+/i, '').trim();
  let type = "tinh";
  let nameWithType = provNameFull;
  let oldNames = [];

  if (/^(Thành phố|Tp)\s+/i.test(provNameFull) || ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế"].includes(provinceClean)) {
    type = "thanh-pho";
    if (provinceClean === "Hồ Chí Minh") {
      provinceClean = "TP. Hồ Chí Minh";
      nameWithType = "Thành phố Hồ Chí Minh";
      oldNames = ["Sài Gòn", "Gia Định"];
    } else if (provinceClean === "Huế") {
      provinceClean = "TP. Huế";
      nameWithType = "Thành phố Huế";
      oldNames = ["Thừa Thiên Huế"];
    } else {
      nameWithType = "Thành phố " + provinceClean;
    }
  } else {
    nameWithType = "Tỉnh " + provinceClean;
  }

  const key = provCode + "_" + provinceClean;

  if (!provincesMap.has(key)) {
    provincesMap.set(key, {
      code: provCode,
      province: provinceClean,
      type: type,
      nameWithType: nameWithType,
      oldNames: oldNames,
      wardsSet: new Set()
    });
  }

  const pObj = provincesMap.get(key);
  if (wardName) {
    pObj.wardsSet.add(wardName);
  }
});

const provincesList = Array.from(provincesMap.values()).map(p => ({
  code: p.code,
  province: p.province,
  type: p.type,
  nameWithType: p.nameWithType,
  oldNames: p.oldNames,
  wards: Array.from(p.wardsSet)
}));

console.log("Extracted", provincesList.length, "provinces/cities.");

// Build JS code string for ONLY VIETNAM_LOCATIONS
const jsLocationsCode = `/// Danh mục Địa Phương 2 Cấp Chính Thức theo File Excel "Danh-muc-Phuong-xa_moi_34-tinh-thanh-sau-sat-nhap.xlsx" (34 Đơn vị hành chính Tỉnh/TP: Mã 01 - 34)
const VIETNAM_LOCATIONS = ` + JSON.stringify(provincesList, null, 2) + `;\n`;

fs.writeFileSync('d:\\Claude\\ndd\\scratch\\vietnam_locations_code.js', jsLocationsCode, 'utf8');
console.log("Saved generated code to scratch/vietnam_locations_code.js");
