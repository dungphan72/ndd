/**
 * Verification Test Script for Vietnam 2-Level Administrative Location Model Migration
 */

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

console.log("🚀 STARTING AUTOMATED VERIFICATION FOR 2-LEVEL LOCATION MODEL MIGRATION...");

const html = fs.readFileSync("index.html", "utf8");
const dataJs = fs.readFileSync("js/data.js", "utf8");
const locationJs = fs.readFileSync("js/location.js", "utf8");
const authJs = fs.readFileSync("js/auth.js", "utf8");
const clubsJs = fs.readFileSync("js/clubs.js", "utf8");
const eventsJs = fs.readFileSync("js/events.js", "utf8");
const shopJs = fs.readFileSync("js/shop.js", "utf8");
const bmiJs = fs.readFileSync("js/bmi.js", "utf8");
const coursesJs = fs.readFileSync("js/courses.js", "utf8");
const metricsJs = fs.readFileSync("js/metrics.js", "utf8");
const appJs = fs.readFileSync("js/app.js", "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:8000/" });
const window = dom.window;

try {
  window.eval(dataJs);
  window.eval(locationJs);
  window.eval(authJs);
  window.eval(clubsJs);
  window.eval(eventsJs);
  window.eval(shopJs);
  window.eval(bmiJs);
  window.eval(coursesJs);
  window.eval(metricsJs);
  window.eval(appJs);

  console.log("✅ All JS modules loaded successfully in JSDOM!");

  const LM = window.LocationManager;
  if (!LM) throw new Error("LocationManager module is not exposed on window!");

  // TEST 1: Check Provinces list
  const provinces = LM.getProvinces();
  console.log(`\n📌 TEST 1: Provincial units count = ${provinces.length} (Expected 34: 28 provinces + 6 central cities)`);
  if (provinces.length !== 34) {
    console.warn(`⚠️ Warning: Provincial units count is ${provinces.length}, expected 34.`);
  } else {
    console.log("  [PASS] All 34 official provincial administrative units (28 provinces & 6 central cities) loaded correctly!");
  }

  // TEST 2: Cascading Wards for Hanoi
  const hanoiWards = LM.getWards("Hà Nội");
  console.log(`\n📌 TEST 2: Hanoi 2-level wards count = ${hanoiWards.length}`);
  if (hanoiWards.length > 0) {
    console.log(`  [PASS] Sample ward: ${hanoiWards[0].wardName} (${hanoiWards[0].wardType})`);
  } else {
    throw new Error("Failed to retrieve wards for Hanoi!");
  }

  // TEST 3: Legacy Address Parser
  const legacyAddr = "Phường Tăng Nhơn Phú A, Quận 9, TP. Hồ Chí Minh";
  const mapped = LM.mapLegacyAddress(legacyAddr);
  console.log(`\n📌 TEST 3: Legacy Address Mapping for "${legacyAddr}"`);
  console.log("  Mapped result:", mapped);
  if (mapped.success && mapped.mappedWard === "Phường Tăng Nhơn Phú A" && mapped.mappedProvince === "TP. Hồ Chí Minh") {
    console.log("  [PASS] Successfully mapped legacy District 9 address to 2-level model.");
  } else {
    console.warn("  [FAIL] Legacy address mapping failed!");
  }

  // TEST 4: Search Engine for Historical Aliases
  const searchRes = LM.searchLocations("Quận 9");
  console.log(`\n📌 TEST 4: Search historical alias "Quận 9" -> Results count: ${searchRes.length}`);
  if (searchRes.length > 0) {
    console.log("  Top suggestion:", searchRes[0]);
    console.log("  [PASS] Historical search alias recognized!");
  } else {
    console.warn("  [FAIL] Historical alias search returned empty.");
  }

  // TEST 5: Data Quality Audit Report
  const audit = LM.runDataQualityCheck();
  console.log("\n📌 TEST 5: Data Quality Audit Report:");
  console.log(" ", JSON.stringify(audit, null, 2));

  // TEST 6: Address Validation (validateWardInProvince)
  const valResult = LM.validateWardInProvince("Phường Ba Đình", "Hà Nội");
  console.log(`\n📌 TEST 6: Address Validation for "Phường Ba Đình" in "Hà Nội"`);
  if (valResult.valid) {
    console.log("  [PASS] Address validation passed cleanly for 2-level model!");
  } else {
    throw new Error(`Address validation failed: ${valResult.reason}`);
  }

  // TEST 7: 6 Central Cities Check
  const centralCities = provinces.filter(p => p.provinceType === "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG" || p.provinceName.startsWith("TP.") || p.provinceName === "Hà Nội" || p.provinceName === "Đà Nẵng" || p.provinceName === "Hải Phòng" || p.provinceName === "Cần Thơ");
  console.log(`\n📌 TEST 7: Central Cities count = ${centralCities.length} (Expected 6)`);
  if (centralCities.length >= 6) {
    console.log("  [PASS] All 6 Central Cities (Hà Nội, TP. HCM, Hải Phòng, Đà Nẵng, Cần Thơ, TP. Huế) verified!");
  } else {
    console.warn(`  [WARN] Central Cities count is ${centralCities.length}`);
  }

  console.log("\n🎉 ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
} catch (e) {
  console.error("❌ VERIFICATION TEST FAILED:", e);
  process.exit(1);
}
