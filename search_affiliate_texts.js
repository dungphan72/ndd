const fs = require('fs');

const files = ['index.html', 'js/data.js', 'js/auth.js', 'js/clubs.js', 'js/events.js', 'js/shop.js', 'js/bmi.js', 'js/courses.js', 'js/metrics.js', 'js/app.js'];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('ngày vip') || line.toLowerCase().includes('tháng vip') || line.toLowerCase().includes('tuần vip') || line.toLowerCase().includes('referral') || line.toLowerCase().includes('ref_code') || line.toLowerCase().includes('affiliate')) {
            console.log(`${file}:${idx+1}: ${line.trim()}`);
        }
    });
});
