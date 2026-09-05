/**
 * Daily Body Metrics Tracker Manager for NutriClub Hub
 * Handles 9 key InBody / Tanita body composition indicators:
 * 1. Weight (kg)
 * 2. % Body Fat
 * 3. % Total Body Water
 * 4. Muscle Mass (kg)
 * 5. BMI (Body Mass Index)
 * 6. Physique Rating (Đánh giá vóc dáng 1-9)
 * 7. BMR (Basal Metabolic Rate - kcal)
 * 8. Metabolic Age (Tuổi sinh học)
 * 9. Visceral Fat (Mỡ nội tạng 1-59)
 */

const MetricsManager = {
  STORAGE_KEY: "nutriclub_user_metrics",

  // Sample default records if empty
  getDefaultLogs(phone) {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 3);
      dates.push(d.toISOString().split('T')[0]);
    }

    return [
      { id: "m_1", userPhone: phone, date: dates[0], weight: 68.5, bodyFat: 24.5, water: 54.2, muscle: 48.0, bmi: 24.2, physiqueRating: 5, bmr: 1540, metabolicAge: 32, visceralFat: 7, notes: "Khởi tạo lộ trình 30 ngày" },
      { id: "m_2", userPhone: phone, date: dates[1], weight: 67.8, bodyFat: 23.8, water: 54.8, muscle: 48.2, bmi: 23.9, physiqueRating: 5, bmr: 1535, metabolicAge: 31, visceralFat: 6, notes: "Uống đủ 2.5L nước/ngày" },
      { id: "m_3", userPhone: phone, date: dates[2], weight: 67.0, bodyFat: 23.0, water: 55.4, muscle: 48.5, bmi: 23.6, physiqueRating: 5, bmr: 1530, metabolicAge: 30, visceralFat: 6, notes: "Tập Tabata nhóm sáng" },
      { id: "m_4", userPhone: phone, date: dates[3], weight: 66.2, bodyFat: 22.2, water: 56.0, muscle: 48.8, bmi: 23.3, physiqueRating: 6, bmr: 1525, metabolicAge: 29, visceralFat: 5, notes: "Tăng cường 2 muỗng đạm F3" },
      { id: "m_5", userPhone: phone, date: dates[4], weight: 65.5, bodyFat: 21.5, water: 56.5, muscle: 49.0, bmi: 23.1, physiqueRating: 6, bmr: 1520, metabolicAge: 28, visceralFat: 5, notes: "Cảm thấy rất sung sức" },
      { id: "m_6", userPhone: phone, date: dates[5], weight: 65.0, bodyFat: 20.8, water: 57.0, muscle: 49.2, bmi: 22.9, physiqueRating: 6, bmr: 1515, metabolicAge: 27, visceralFat: 4, notes: "Đạt mục tiêu giảm 3.5kg!" },
      { id: "m_7", userPhone: phone, date: dates[6], weight: 64.5, bodyFat: 20.2, water: 57.5, muscle: 49.5, bmi: 22.7, physiqueRating: 7, bmr: 1510, metabolicAge: 26, visceralFat: 4, notes: "Vóc dáng thon gọn hơn" }
    ];
  },

  getAllLogs() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try { return JSON.parse(data); } catch(e) { return []; }
  },

  getUserLogs(phone) {
    if (!phone) return [];
    const logs = this.getAllLogs();
    const userLogs = logs.filter(l => l.userPhone === phone);
    if (userLogs.length === 0) {
      const defaults = this.getDefaultLogs(phone);
      const updated = [...logs, ...defaults];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      return defaults;
    }
    return userLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  addLog(logData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) return { success: false, message: "Vui lòng đăng nhập để lưu chỉ số!" };

    const logs = this.getAllLogs();
    
    // Auto calculate BMI if height provided or height exists
    const heightM = (logData.height || 168) / 100;
    const weight = parseFloat(logData.weight) || 60;
    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));

    // Auto calculate BMR estimation if needed
    const bmr = logData.bmr ? parseInt(logData.bmr) : Math.round(10 * weight + 6.25 * (logData.height || 168) - 5 * 30 + 5);

    const newLog = {
      id: "m_" + Date.now(),
      userPhone: currentUser.phone,
      date: logData.date || new Date().toISOString().split('T')[0],
      weight: weight,
      bodyFat: parseFloat(logData.bodyFat) || 20,
      water: parseFloat(logData.water) || 55,
      muscle: parseFloat(logData.muscle) || 45,
      bmi: bmi,
      physiqueRating: parseInt(logData.physiqueRating) || 5,
      bmr: bmr,
      metabolicAge: parseInt(logData.metabolicAge) || 28,
      visceralFat: parseInt(logData.visceralFat) || 5,
      notes: logData.notes || ""
    };

    // Replace if log for same date already exists
    const existingIndex = logs.findIndex(l => l.userPhone === currentUser.phone && l.date === newLog.date);
    if (existingIndex >= 0) {
      logs[existingIndex] = newLog;
    } else {
      logs.unshift(newLog);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    return { success: true, log: newLog };
  },

  deleteLog(logId) {
    let logs = this.getAllLogs();
    logs = logs.filter(l => l.id !== logId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    return { success: true };
  },

  // Ratings & Interpretations
  getBMIRating(bmi) {
    if (bmi < 18.5) return { status: "Thiếu cân", color: "#f59e0b" };
    if (bmi < 23) return { status: "Bình thường (Lý tưởng)", color: "#10b981" };
    if (bmi < 25) return { status: "Tiền béo phì", color: "#f59e0b" };
    return { status: "Béo phì", color: "#ef4444" };
  },

  getVisceralFatRating(fat) {
    if (fat <= 4) return { status: "Tốt (Lý tưởng)", color: "#10b981" };
    if (fat <= 9) return { status: "Bình thường", color: "#3b82f6" };
    if (fat <= 14) return { status: "Cao (Cảnh báo)", color: "#f59e0b" };
    return { status: "Rất cao (Nguy hiểm)", color: "#ef4444" };
  },

  getPhysiqueLabel(rating) {
    const labels = {
      1: "Béo Phì Ẩn (Thừa mỡ ít cơ)",
      2: "Thừa Mỡ Nặng",
      3: "Thừa Cân Nhẹ",
      4: "Thiếu Vận Động",
      5: "Cân Đối Chuẩn",
      6: "Vận Động Viên Khỏe",
      7: "Gầy Rắn Chắc",
      8: "Cơ Bắp Săn Chắc",
      9: "Vận Động Viên Chuyên Nghiệp"
    };
    return labels[rating] || "Cân Đối";
  }
};

if (typeof window !== "undefined") {
  window.MetricsManager = MetricsManager;
}

