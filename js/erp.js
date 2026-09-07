/**
 * ===================================================================
 * ERP MANAGER - HỆ THỐNG QUẢN TRỊ TOÀN DIỆN NHÓM DINH DƯỠNG (NDD)
 * ===================================================================
 * Quản lý 360° cho Chủ Nhóm Dinh Dưỡng:
 * 1. Quản lý Hội viên & Thẻ Gói Dinh Dưỡng (10/30/90 ngày)
 * 2. Điểm danh 1-Touch / QR Code hàng ngày & Cảnh báo hội viên vắng mặt
 * 3. Nhật ký Chỉ số Thể trạng (InBody) & Biểu đồ tiến trình
 * 4. Quản lý Kho & Vật tư nhóm (Thực phẩm bổ sung, ly lắc, trà...)
 * 5. Sổ Quỹ Thu - Chi thực tế (P&L Ledger & Cashflow)
 * 6. Báo cáo Executive Dashboard & Phân quyền Đồng vận hành
 */

const ERPManager = {
  STORAGE_KEYS: {
    MEMBERS: "nutriclub_erp_members",
    ATTENDANCE: "nutriclub_erp_attendance",
    INVENTORY: "nutriclub_erp_inventory",
    TRANSACTIONS: "nutriclub_erp_transactions",
    PACKAGES: "nutriclub_erp_packages",
    INBODY: "nutriclub_erp_inbody",
    ROLE: "nutriclub_erp_role",
    SETTINGS: "nutriclub_erp_settings"
  },

  // Mẫu Gói Dinh Dưỡng Mặc Định
  DEFAULT_PACKAGES: [
    { id: "pkg_10d", name: "Gói 10 Ngày Trải Nghiệm", days: 10, visits: 10, price: 500000, desc: "Trà thảo mộc + Aloe + Shake dinh dưỡng (10 ngày)" },
    { id: "pkg_30d_std", name: "Gói 30 Ngày Cơ Bản", days: 30, visits: 30, price: 1450000, desc: "Bữa ăn dinh dưỡng chuẩn 30 ngày tại nhóm" },
    { id: "pkg_30d_adv", name: "Gói 30 Ngày Nâng Cao (Tăng Cơ/Giảm Mỡ)", days: 30, visits: 30, price: 2800000, desc: "Trà + Aloe + F1 + Đạm PPP + Khung tập vận động" },
    { id: "pkg_vip", name: "Gói VIP Thể Thao / Platinum", days: 90, visits: 90, price: 7500000, desc: "Gói dinh dưỡng vận động nâng cao 90 ngày cá nhân hóa" }
  ],

  // 1. KHỞI TẠO HỆ THỐNG ERP
  init() {
    this.initDefaultData();
    this.initCloudSync();
  },

  initDefaultData() {
    // Khởi tạo danh sách gói mặc định nếu chưa có
    if (!localStorage.getItem(this.STORAGE_KEYS.PACKAGES)) {
      localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(this.DEFAULT_PACKAGES));
    }

    // Dữ liệu mẫu ban đầu để Chủ nhóm trải nghiệm ERP ngay lập tức
    if (!localStorage.getItem(this.STORAGE_KEYS.MEMBERS)) {
      const demoMembers = [
        {
          id: "mem_01",
          clubId: "club_demo",
          name: "Nguyễn Thiện Nhân",
          phone: "0908123456",
          gender: "Nam",
          joinDate: "2026-08-01",
          packageId: "pkg_30d_adv",
          packageName: "Gói 30 Ngày Nâng Cao",
          totalVisits: 30,
          usedVisits: 18,
          remainingVisits: 12,
          startDate: "2026-08-10",
          endDate: "2026-09-10",
          status: "active",
          notes: "Mục tiêu giảm 4kg mỡ bụng, tăng 2kg cơ"
        },
        {
          id: "mem_02",
          clubId: "club_demo",
          name: "Trần Thị Mai",
          phone: "0912987654",
          gender: "Nữ",
          joinDate: "2026-08-15",
          packageId: "pkg_10d",
          packageName: "Gói 10 Ngày Trải Nghiệm",
          totalVisits: 10,
          usedVisits: 9,
          remainingVisits: 1, // Sắp hết hạn
          startDate: "2026-08-25",
          endDate: "2026-09-05",
          status: "active",
          notes: "Đang trải nghiệm vị dâu, tiêu hóa tốt"
        },
        {
          id: "mem_03",
          clubId: "club_demo",
          name: "Phạm Quốc Bảo",
          phone: "0934567890",
          gender: "Nam",
          joinDate: "2026-07-20",
          packageId: "pkg_30d_std",
          packageName: "Gói 30 Ngày Cơ Bản",
          totalVisits: 30,
          usedVisits: 30,
          remainingVisits: 0,
          startDate: "2026-07-20",
          endDate: "2026-08-20",
          status: "expired",
          notes: "Đã hoàn thành xuất sắc 1 liệu trình"
        }
      ];
      localStorage.setItem(this.STORAGE_KEYS.MEMBERS, JSON.stringify(demoMembers));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.INVENTORY)) {
      const demoInventory = [
        { id: "inv_01", code: "F1-CHO", name: "Hỗn Hợp Dinh Dưỡng F1 (Vị Socola)", category: "Thực phẩm bổ sung", unit: "Hộp", stock: 12, minStock: 5, unitPrice: 750000 },
        { id: "inv_02", code: "F1-VAN", name: "Hỗn Hợp Dinh Dưỡng F1 (Vị Vani)", category: "Thực phẩm bổ sung", unit: "Hộp", stock: 3, minStock: 5, unitPrice: 750000 }, // Sắp hết
        { id: "inv_03", code: "TEA-100", name: "Trà Thảo Mộc Cô Đặc 100g", category: "Trà & Thảo dược", unit: "Hộp", stock: 8, minStock: 4, unitPrice: 520000 },
        { id: "inv_04", code: "ALO-CON", name: "Lô Hội Thảo Mộc Cô Đặc (Aloe)", category: "Thức uống thảo mộc", unit: "Chai", stock: 15, minStock: 5, unitPrice: 680000 },
        { id: "inv_05", code: "PPP-240", name: "Bột Protein PPP 240g", category: "Bổ sung Đạm", unit: "Hộp", stock: 2, minStock: 4, unitPrice: 480000 }, // Cảnh báo đỏ
        { id: "inv_06", code: "SHK-CUP", name: "Ly Lắc NDD Logo Cao Cấp 500ml", category: "Dụng cụ nhóm", unit: "Cái", stock: 25, minStock: 10, unitPrice: 45000 }
      ];
      localStorage.setItem(this.STORAGE_KEYS.INVENTORY, JSON.stringify(demoInventory));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)) {
      const demoTransactions = [
        { id: "tx_01", type: "income", category: "Bán Thẻ Gói NDD", amount: 2800000, description: "Hội viên Nguyễn Thiện Nhân đăng ký Gói 30 ngày nâng cao", date: "2026-08-10", memberName: "Nguyễn Thiện Nhân" },
        { id: "tx_02", type: "income", category: "Bán Thẻ Gói NDD", amount: 500000, description: "Hội viên Trần Thị Mai mua Gói 10 ngày trải nghiệm", date: "2026-08-25", memberName: "Trần Thị Mai" },
        { id: "tx_03", type: "income", category: "Bán Lẻ Sản Phẩm", amount: 1270000, description: "Bán lẻ 1 F1 Socola + 1 Trà thảo mộc 100g", date: "2026-09-01", memberName: "Khách lẻ" },
        { id: "tx_04", type: "expense", category: "Thuê Mặt Bằng", amount: 4500000, description: "Tiền thuê mặt bằng Nhóm Dinh Dưỡng tháng 9", date: "2026-09-01", memberName: "" },
        { id: "tx_05", type: "expense", category: "Điện - Nước - Wifi", amount: 850000, description: "Tiền điện nước máy lạnh pha chế tháng 8", date: "2026-09-02", memberName: "" },
        { id: "tx_06", type: "expense", category: "Nguyên Liệu Đá & Ly", amount: 350000, description: "Mua đá sạch & ly nhựa sinh học phục vụ trà", date: "2026-09-03", memberName: "" }
      ];
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(demoTransactions));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE)) {
      const todayStr = new Date().toISOString().split("T")[0];
      const demoAttendance = [
        { id: "att_01", memberId: "mem_01", memberName: "Nguyễn Thiện Nhân", date: todayStr, time: "07:15", drink: "Trà thảo mộc + Shake Socola Đạm", checkedBy: "Chủ nhóm" },
        { id: "att_02", memberId: "mem_02", memberName: "Trần Thị Mai", date: todayStr, time: "07:45", drink: "Trà Aloe + Shake Vani", checkedBy: "Chủ nhóm" }
      ];
      localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(demoAttendance));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.INBODY)) {
      const demoInBody = [
        { id: "inb_01", memberId: "mem_01", date: "2026-08-10", weight: 78.5, fatPercent: 24.5, muscleMass: 32.0, visceralFat: 9, notes: "Khám thể trạng ban đầu khi nhập gói" },
        { id: "inb_02", memberId: "mem_01", date: "2026-08-25", weight: 76.2, fatPercent: 22.8, muscleMass: 32.8, visceralFat: 8, notes: "Giảm 2.3kg cân nặng, giảm 1.7% mỡ, tăng 0.8kg cơ" },
        { id: "inb_03", memberId: "mem_01", date: "2026-09-05", weight: 75.0, fatPercent: 21.4, muscleMass: 33.2, visceralFat: 7, notes: "Tiến trình cực kỳ tốt, vòng bụng thon gọn hẳn" },
        { id: "inb_04", memberId: "mem_02", date: "2026-08-25", weight: 58.0, fatPercent: 28.0, muscleMass: 21.0, visceralFat: 5, notes: "Khảo sát đầu vào gói 10 ngày" },
        { id: "inb_05", memberId: "mem_02", date: "2026-09-03", weight: 56.8, fatPercent: 26.5, muscleMass: 21.4, visceralFat: 4, notes: "Cơ thể nhẹ nhàng, da sáng, giảm 1.5% mỡ" }
      ];
      localStorage.setItem(this.STORAGE_KEYS.INBODY, JSON.stringify(demoInBody));
    }
  },

  // 2. GETTERS & SETTERS DỮ LIỆU
  getRole() {
    return localStorage.getItem(this.STORAGE_KEYS.ROLE) || "owner";
  },
  setRole(role) {
    const validRole = role === "assistant" ? "assistant" : "owner";
    localStorage.setItem(this.STORAGE_KEYS.ROLE, validRole);
    this.broadcastLocalSync();
    return validRole;
  },

  getMembers() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.MEMBERS)) || [];
    } catch (e) {
      return [];
    }
  },
  saveMembers(members) {
    localStorage.setItem(this.STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this.syncCollectionToCloud(this.STORAGE_KEYS.MEMBERS, members);
    this.broadcastLocalSync();
  },

  getInventory() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.INVENTORY)) || [];
    } catch (e) {
      return [];
    }
  },
  saveInventory(inventory) {
    localStorage.setItem(this.STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    this.syncCollectionToCloud(this.STORAGE_KEYS.INVENTORY, inventory);
    this.broadcastLocalSync();
  },

  getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)) || [];
    } catch (e) {
      return [];
    }
  },
  saveTransactions(txs) {
    localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    this.syncCollectionToCloud(this.STORAGE_KEYS.TRANSACTIONS, txs);
    this.broadcastLocalSync();
  },

  getAttendance() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE)) || [];
    } catch (e) {
      return [];
    }
  },
  saveAttendance(list) {
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
    this.syncCollectionToCloud(this.STORAGE_KEYS.ATTENDANCE, list);
    this.broadcastLocalSync();
  },

  getPackages() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PACKAGES)) || this.DEFAULT_PACKAGES;
    } catch (e) {
      return this.DEFAULT_PACKAGES;
    }
  },
  savePackages(packages) {
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
    this.syncCollectionToCloud(this.STORAGE_KEYS.PACKAGES, packages);
    this.broadcastLocalSync();
  },

  getInBodyLogs(memberId = null) {
    try {
      const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.INBODY)) || [];
      if (memberId) {
        return logs.filter(l => l.memberId === memberId).sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      return logs;
    } catch (e) {
      return [];
    }
  },
  saveInBodyLogs(logs) {
    localStorage.setItem(this.STORAGE_KEYS.INBODY, JSON.stringify(logs));
    this.syncCollectionToCloud(this.STORAGE_KEYS.INBODY, logs);
    this.broadcastLocalSync();
  },

  addInBodyLog(logData) {
    const logs = this.getInBodyLogs();
    const newLog = {
      id: "inb_" + Date.now(),
      memberId: logData.memberId,
      date: logData.date || new Date().toISOString().split("T")[0],
      weight: Number(logData.weight) || 0,
      fatPercent: Number(logData.fatPercent) || 0,
      muscleMass: Number(logData.muscleMass) || 0,
      visceralFat: Number(logData.visceralFat) || 0,
      notes: (logData.notes || "").trim()
    };
    logs.push(newLog);
    this.saveInBodyLogs(logs);
    return newLog;
  },

  deleteInBodyLog(logId) {
    let logs = this.getInBodyLogs();
    logs = logs.filter(l => l.id !== logId);
    this.saveInBodyLogs(logs);
    return true;
  },

  addPackage(pkgData) {
    const packages = this.getPackages();
    const newPkg = {
      id: "pkg_" + Date.now(),
      name: pkgData.name.trim(),
      days: Number(pkgData.days) || 30,
      visits: Number(pkgData.visits) || 30,
      price: Number(pkgData.price) || 0,
      desc: (pkgData.desc || "").trim()
    };
    packages.push(newPkg);
    this.savePackages(packages);
    return newPkg;
  },

  updatePackage(pkgId, pkgData) {
    const packages = this.getPackages();
    const target = packages.find(p => p.id === pkgId);
    if (!target) return { success: false, message: "Không tìm thấy gói dinh dưỡng!" };

    target.name = pkgData.name.trim();
    target.days = Number(pkgData.days) || 30;
    target.visits = Number(pkgData.visits) || 30;
    target.price = Number(pkgData.price) || 0;
    target.desc = (pkgData.desc || "").trim();

    this.savePackages(packages);
    return { success: true, package: target };
  },

  deletePackage(pkgId) {
    let packages = this.getPackages();
    packages = packages.filter(p => p.id !== pkgId);
    this.savePackages(packages);
    return true;
  },

  // 3. QUẢN LÝ ĐIỂM DẠNH 1-TOUCH HÀNG NGÀY
  checkInMember(memberId, drinkNote = "") {
    const members = this.getMembers();
    const member = members.find(m => m.id === memberId);
    if (!member) return { success: false, message: "Không tìm thấy hội viên!" };

    if (member.remainingVisits <= 0) {
      return { success: false, message: `Hội viên ${member.name} đã dùng hết số buổi trong gói! Vui lòng cho hội viên gia hạn gói mới.` };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const attendance = this.getAttendance();

    // Kiểm tra xem hôm nay đã điểm danh chưa
    const alreadyChecked = attendance.find(a => a.memberId === memberId && a.date === todayStr);
    if (alreadyChecked) {
      return { success: false, message: `Hội viên ${member.name} đã được điểm danh dùng bữa hôm nay lúc ${alreadyChecked.time || ""}!` };
    }

    // Trừ 1 lượt dùng
    member.usedVisits += 1;
    member.remainingVisits -= 1;
    if (member.remainingVisits === 0) {
      member.status = "expired";
    }
    this.saveMembers(members);

    // Ghi nhận lịch sử điểm danh
    const newRecord = {
      id: "att_" + Date.now(),
      memberId: member.id,
      memberName: member.name,
      phone: member.phone,
      date: todayStr,
      time: nowTimeStr,
      drink: drinkNote || "Trà + Aloe + Shake Dinh Dưỡng",
      checkedBy: "Chủ nhóm NDD"
    };
    attendance.unshift(newRecord);
    this.saveAttendance(attendance);

    return {
      success: true,
      message: `✅ Đã điểm danh hội viên ${member.name}! Còn lại ${member.remainingVisits} buổi.`,
      remainingVisits: member.remainingVisits
    };
  },

  // 4. QUẢN LÝ HỘI VIÊN MỚI & THẺ GÓI
  addMember(memberData) {
    const members = this.getMembers();
    const packages = this.getPackages();
    const selectedPkg = packages.find(p => p.id === memberData.packageId) || packages[0];

    const todayStr = new Date().toISOString().split("T")[0];
    const newMember = {
      id: "mem_" + Date.now(),
      clubId: memberData.clubId || "club_current",
      name: memberData.name.trim(),
      phone: memberData.phone.trim(),
      gender: memberData.gender || "Nữ",
      joinDate: todayStr,
      packageId: selectedPkg.id,
      packageName: selectedPkg.name,
      totalVisits: Number(selectedPkg.visits),
      usedVisits: 0,
      remainingVisits: Number(selectedPkg.visits),
      startDate: memberData.startDate || todayStr,
      endDate: memberData.endDate || todayStr,
      status: "active",
      notes: memberData.notes || ""
    };

    members.unshift(newMember);
    this.saveMembers(members);

    // Tự động tạo giao dịch Thu trong Sổ quỹ P&L
    this.addTransaction({
      type: "income",
      category: "Bán Thẻ Gói NDD",
      amount: Number(selectedPkg.price),
      description: `Đăng ký ${selectedPkg.name} cho hội viên ${newMember.name}`,
      date: todayStr,
      memberName: newMember.name
    });

    return { success: true, member: newMember };
  },

  deleteMember(memberId) {
    let members = this.getMembers();
    members = members.filter(m => m.id !== memberId);
    this.saveMembers(members);
  },

  // 5. QUẢN LÝ SỔ QUỸ THU - CHI (P&L LEDGER)
  addTransaction(txData) {
    const txs = this.getTransactions();
    const newTx = {
      id: "tx_" + Date.now(),
      type: txData.type || "income", // "income" hoặc "expense"
      category: txData.category || "Khác",
      amount: Number(txData.amount) || 0,
      description: txData.description || "",
      date: txData.date || new Date().toISOString().split("T")[0],
      memberName: txData.memberName || ""
    };
    txs.unshift(newTx);
    this.saveTransactions(txs);
    return newTx;
  },

  deleteTransaction(txId) {
    let txs = this.getTransactions();
    txs = txs.filter(t => t.id !== txId);
    this.saveTransactions(txs);
  },

  // 6. QUẢN LÝ KHO HÀNG & NHẬP / XUẤT KHO
  addInventoryItem(itemData) {
    const inventory = this.getInventory();
    const newItem = {
      id: "inv_" + Date.now(),
      code: (itemData.code || "").trim().toUpperCase() || "SP-" + Math.floor(100 + Math.random() * 900),
      name: itemData.name.trim(),
      category: itemData.category || "Thực phẩm bổ sung",
      unit: itemData.unit || "Hộp",
      stock: Number(itemData.stock) || 0,
      minStock: Number(itemData.minStock) || 5,
      unitPrice: Number(itemData.unitPrice) || 0
    };
    inventory.unshift(newItem);
    this.saveInventory(inventory);
    this.checkAndNotifyLowStock(newItem);
    return newItem;
  },

  deleteInventoryItem(itemId) {
    let inventory = this.getInventory();
    inventory = inventory.filter(i => i.id !== itemId);
    this.saveInventory(inventory);
  },

  updateStock(itemId, deltaQty) {
    const inventory = this.getInventory();
    const item = inventory.find(i => i.id === itemId);
    if (!item) return { success: false, message: "Không tìm thấy sản phẩm!" };

    item.stock = Math.max(0, item.stock + Number(deltaQty));
    this.saveInventory(inventory);
    this.checkAndNotifyLowStock(item);
    return { success: true, newStock: item.stock };
  },

  // 7. TÍNH TOÁN BÁO CÁO EXECUTIVE DASHBOARD KPI
  getExecutiveKPIs() {
    const members = this.getMembers();
    const attendance = this.getAttendance();
    const inventory = this.getInventory();
    const txs = this.getTransactions();
    const role = this.getRole();
    const isAssistant = role === "assistant";

    const todayStr = new Date().toISOString().split("T")[0];

    // Số lượt hội viên có mặt hôm nay
    const todayAttendanceCount = attendance.filter(a => a.date === todayStr).length;

    // Tổng số hội viên đang hoạt động
    const activeMembersCount = members.filter(m => m.status === "active").length;

    // Số hội viên sắp hết hạn gói (còn <= 2 buổi)
    const expiringMembersCount = members.filter(m => m.status === "active" && m.remainingVisits <= 2).length;

    // Tổng thu, Tổng chi & Lợi nhuận ròng
    let totalIncome = 0;
    let totalExpense = 0;
    txs.forEach(t => {
      if (t.type === "income") totalIncome += Number(t.amount || 0);
      else if (t.type === "expense") totalExpense += Number(t.amount || 0);
    });
    const netProfit = totalIncome - totalExpense;

    // Sản phẩm kho cảnh báo tồn tối thiểu
    const lowStockItems = inventory.filter(i => i.stock <= i.minStock);

    return {
      role,
      isAssistant,
      todayAttendanceCount,
      activeMembersCount,
      expiringMembersCount,
      totalIncome: isAssistant ? "🔒 Ẩn với Trợ lý" : totalIncome,
      totalExpense: isAssistant ? "🔒 Ẩn với Trợ lý" : totalExpense,
      netProfit: isAssistant ? "🔒 Ẩn với Trợ lý" : netProfit,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  },

  // Format tiền tệ Việt Nam
  formatVND(amount) {
    if (typeof amount === "string" && amount.includes("Ẩn")) return amount;
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  },

  // 8. ĐỒNG BỘ REALTIME ĐA THIẾT BỊ (FIREBASE FIRESTORE & CROSS-TAB BROADCASTCHANNEL)
  _syncChannel: null,

  initCloudSync() {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this._syncChannel = new BroadcastChannel("nutriclub_erp_sync");
        this._syncChannel.onmessage = () => {
          if (typeof App !== "undefined" && App.renderErpSection) {
            App.renderErpSection();
          }
        };
      }
      window.addEventListener("storage", (e) => {
        if (e.key && e.key.startsWith("nutriclub_erp_")) {
          if (typeof App !== "undefined" && App.renderErpSection) {
            App.renderErpSection();
          }
        }
      });
    } catch (err) {
      console.warn("Local sync channel warning:", err);
    }

    this.initFirestoreSync();
  },

  broadcastLocalSync() {
    try {
      if (this._syncChannel) this._syncChannel.postMessage({ timestamp: Date.now() });
    } catch (e) {}
  },

  async initFirestoreSync() {
    if (typeof window === "undefined" || !window.firebaseDb || !window.firestoreHelpers) return;
    const db = window.firebaseDb;
    const { collection, onSnapshot } = window.firestoreHelpers;

    const collectionsToSync = ["members", "attendance", "inventory", "transactions", "packages", "inbody"];

    collectionsToSync.forEach(colName => {
      try {
        const storageKey = this.STORAGE_KEYS[colName.toUpperCase()];
        if (!storageKey) return;

        onSnapshot(collection(db, `erp_${colName}`), (snapshot) => {
          if (snapshot.empty) return;
          const remoteData = [];
          snapshot.forEach(docSnap => {
            remoteData.push(docSnap.data());
          });
          if (remoteData.length > 0) {
            const localStr = localStorage.getItem(storageKey);
            const remoteStr = JSON.stringify(remoteData);
            if (localStr !== remoteStr) {
              localStorage.setItem(storageKey, remoteStr);
              if (typeof App !== "undefined" && App.renderErpSection) {
                App.renderErpSection();
              }
            }
          }
        }, (err) => {
          console.warn(`Firestore listener warning for erp_${colName}:`, err);
        });
      } catch (err) {
        console.warn("Firestore sync setup error:", err);
      }
    });
  },

  async syncCollectionToCloud(storageKey, data) {
    if (typeof window === "undefined" || !window.firebaseDb || !window.firestoreHelpers) return;
    const db = window.firebaseDb;
    const { doc, setDoc } = window.firestoreHelpers;

    let colName = "";
    Object.keys(this.STORAGE_KEYS).forEach(k => {
      if (this.STORAGE_KEYS[k] === storageKey) colName = k.toLowerCase();
    });
    if (!colName || colName === "role") return;

    try {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.id) {
            await setDoc(doc(db, `erp_${colName}`, item.id), item, { merge: true });
          }
        }
      }
    } catch (err) {
      console.warn(`Error syncing erp_${colName} to cloud:`, err);
    }
  },

  // 8. XUẤT BÁO CÁO EXCEL/CSV (UTF-8 BOM hỗ trợ mở bằng Microsoft Excel Tiếng Việt)
  exportMembersCSV() {
    const members = this.getMembers();
    if (members.length === 0) return false;

    let csvContent = "\uFEFFMã Hội Viên,Họ và Tên,Số Điện Thoại,Giới Tính,Gói Dinh Dưỡng,Tổng Buổi,Đã Dùng,Còn Lại,Trạng Thái,Ghi Chú\n";
    members.forEach(m => {
      csvContent += `"${m.id}","${m.name}","${m.phone}","${m.gender}","${m.packageName}",${m.totalVisits},${m.usedVisits},${m.remainingVisits},"${m.status}","${(m.notes || '').replace(/"/g, '""')}"\n`;
    });

    this._downloadCSV(csvContent, `ERP_BaoCaoHoiVien_${new Date().toISOString().split("T")[0]}.csv`);
    return true;
  },

  exportTransactionsCSV() {
    const txs = this.getTransactions();
    if (txs.length === 0) return false;

    let csvContent = "\uFEFFMã Giao Dịch,Loại,Danh Mục,Số Tiền,Nội Dung,Ngày,Hội Viên / Khách\n";
    txs.forEach(t => {
      const typeStr = t.type === "income" ? "THU" : "CHI";
      csvContent += `"${t.id}","${typeStr}","${t.category}",${t.amount},"${(t.description || '').replace(/"/g, '""')}","${t.date}","${t.memberName || ''}"\n`;
    });

    this._downloadCSV(csvContent, `ERP_SoQuyThuChi_${new Date().toISOString().split("T")[0]}.csv`);
    return true;
  },

  exportInventoryCSV() {
    const inv = this.getInventory();
    if (inv.length === 0) return false;

    let csvContent = "\uFEFFMã SKU,Tên Sản Phẩm / Vật Tư,Danh Mục,Đơn Vị,Tồn Kho,Tồn Tối Thiểu,Cảnh Báo Tồn,Đơn Giá\n";
    inv.forEach(i => {
      const isLow = i.stock <= i.minStock ? "CẢNH BÁO TỒN THẤP" : "Bình thường";
      csvContent += `"${i.code}","${i.name}","${i.category}","${i.unit}",${i.stock},${i.minStock},"${isLow}",${i.unitPrice}\n`;
    });

    this._downloadCSV(csvContent, `ERP_BaoCaoKiemKeKho_${new Date().toISOString().split("T")[0]}.csv`);
    return true;
  },

  _downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // 11. CẤU HÌNH THÔNG BÁO ZALO & TELEGRAM BOT WEBHOOK
  getNotificationSettings() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return {
        telegramToken: "",
        telegramChatId: "",
        zaloWebhook: "",
        autoNotifyLowStock: true
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { telegramToken: "", telegramChatId: "", zaloWebhook: "", autoNotifyLowStock: true };
    }
  },

  saveNotificationSettings(settings) {
    localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  generateZaloInBodyMessage(member, latestLog, firstLog) {
    if (!member || !latestLog) return "";
    let msg = `📊 BÁO CÁO CHỈ SỐ INBODY & SỨC KHỎE - ${member.name.toUpperCase()}\n`;
    msg += `📅 Ngày đo: ${latestLog.date}\n`;
    msg += `-----------------------------\n`;
    msg += `⚖️ Cân nặng: ${latestLog.weight} kg`;
    if (firstLog && firstLog.id !== latestLog.id) {
      const diffW = (latestLog.weight - firstLog.weight).toFixed(1);
      msg += ` (${diffW > 0 ? '+' : ''}${diffW} kg)`;
    }
    msg += `\n🔴 Tỷ lệ mỡ: ${latestLog.fatPercent}%`;
    if (firstLog && firstLog.id !== latestLog.id) {
      const diffF = (latestLog.fatPercent - firstLog.fatPercent).toFixed(1);
      msg += ` (${diffF > 0 ? '+' : ''}${diffF}%)`;
    }
    if (latestLog.muscleMass) msg += `\n🔵 Khối lượng cơ: ${latestLog.muscleMass} kg`;
    if (latestLog.visceralFat) msg += `\n⚠️ Mỡ nội tạng: Level ${latestLog.visceralFat}`;
    if (latestLog.notes) msg += `\n💡 Nhận xét HLV: ${latestLog.notes}`;
    msg += `\n-----------------------------\n`;
    msg += `🌱 Chúc ${member.name} duy trì kỷ luật dinh dưỡng và đạt mục tiêu vóc dáng! 💚`;
    return msg;
  },

  async sendTelegramAlert(textMessage) {
    const settings = this.getNotificationSettings();
    if (!settings.telegramToken || !settings.telegramChatId) {
      return { success: false, message: "Chưa cấu hình Telegram Bot Token hoặc Chat ID!" };
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: textMessage,
          parse_mode: "HTML"
        })
      });
      const data = await res.json();
      if (data.ok) {
        return { success: true, message: "Đã gửi thông báo qua Telegram Bot thành công!" };
      } else {
        return { success: false, message: data.description || "Gửi Telegram thất bại." };
      }
    } catch (err) {
      return { success: false, message: "Lỗi kết nối mạng: " + err.message };
    }
  },

  checkAndNotifyLowStock(item) {
    if (!item) return;
    const settings = this.getNotificationSettings();
    if (!settings.autoNotifyLowStock) return;

    if (item.stock <= item.minStock) {
      const alertMsg = `🚨 <b>CẢNH BÁO TỒN KHO THẤP - ERP NHÓM DINH DƯỠNG</b>\n` +
        `📦 Sản phẩm: <b>[${item.code}] ${item.name}</b>\n` +
        `⚠️ Số lượng tồn hiện tại: <b>${item.stock} ${item.unit}</b> (Mức tối thiểu: ${item.minStock})\n` +
        `💡 <i>Vui lòng lên kế hoạch nhập hàng bổ sung ngay!</i>`;
      this.sendTelegramAlert(alertMsg);
    }
  }
};

// Tự động khởi tạo ERP khi load script
if (typeof window !== "undefined") {
  window.ERPManager = ERPManager;
  ERPManager.init();
}
