const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const dataJs = fs.readFileSync("js/data.js", "utf8");
const locationJs = fs.readFileSync("js/location.js", "utf8");
const authJs = fs.readFileSync("js/auth.js", "utf8");
const clubsJs = fs.readFileSync("js/clubs.js", "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:8000/" });
const window = dom.window;

window.eval(dataJs);
window.eval(locationJs);
window.eval(authJs);
window.eval(clubsJs);

const CM = window.ClubManager;

console.log("=== TEST HAVERSINE DISTANCE & FUZZY SEARCH & 20KM RADIUS FILTER ===");

// User position: Hà Nội center (21.0285, 105.8542)
const userPos = { lat: 21.0285, lng: 105.8542 };

// Test 1: Haversine distance calculation between Hanoi (21.0285, 105.8542) and HCM (10.7769, 106.7009)
const distHanoiHCM = CM.calculateHaversineDistance(21.0285, 105.8542, 10.7769, 106.7009);
console.log(`Haversine Hanoi -> HCM: ${Math.round(distHanoiHCM)} km (Expected approx 1130-1160 km)`);

// Test 2: Fuzzy search for "green life" (accent-insensitive)
const fuzzyMatch1 = CM.fuzzySearchMatch("Nhóm Dinh Dưỡng Green Life - Cầu Giấy", "green life");
console.log("Fuzzy search 'green life' in 'Nhóm Dinh Dưỡng Green Life':", fuzzyMatch1);

// Test 3: Radius filter (20km) around Hanoi
const resultsRadius = CM.searchClubsWithinRadius({ keyword: "", maxRadiusKm: 20, userLocation: userPos });
console.log(`Clubs within 20km of Hanoi center (${userPos.lat}, ${userPos.lng}): ${resultsRadius.length} clubs found.`);
resultsRadius.forEach(c => {
  console.log(`  - ${c.name} (${c.province}) -> Khoảng cách: ${c.distanceKm} km`);
});

console.log("\n✅ HAVERSINE & FUZZY SEARCH TESTS COMPLETED!");
