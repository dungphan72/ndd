const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const dataJs = fs.readFileSync("js/data.js", "utf8");
const locationJs = fs.readFileSync("js/location.js", "utf8");
const authJs = fs.readFileSync("js/auth.js", "utf8");
const clubsJs = fs.readFileSync("js/clubs.js", "utf8");
const appJs = fs.readFileSync("js/app.js", "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:8000/" });
const window = dom.window;

window.eval(dataJs);
window.eval(locationJs);
window.eval(authJs);
window.eval(clubsJs);
window.eval(appJs);

const App = window.App;

console.log("=== TEST CLICKING 'Tôi Đã Chuyển Khoản -> Sang Bước 3' ===");

App.setVIPStep(3);

const botBox = window.document.getElementById("zaloBotNotificationBox");
console.log("Zalo Bot Notification Box display style:", botBox ? botBox.style.display : "null");
console.log("Zalo Bot Notification text content:", botBox ? botBox.textContent.trim().replace(/\s+/g, ' ') : "");

if (botBox && botBox.style.display === "block" && botBox.textContent.includes("bạn có giao dịch mới trên bot zalo")) {
  console.log("  [PASS] Zalo Bot transaction notification successfully displayed on Step 3!");
} else {
  throw new Error("Failed to display Zalo Bot notification on Step 3!");
}
