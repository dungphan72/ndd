// Hàm che số điện thoại bằng dấu *: chỉ hiển thị 4 số đầu, che toàn bộ các số phía sau
function maskPhone(phone) {
  if (!phone) return "0902******";
  const clean = phone.toString().trim();
  if (clean.length <= 4) return clean + "******";
  const prefix = clean.substring(0, 4);
  const stars = "*".repeat(Math.max(6, clean.length - 4));
  return prefix + stars;
}

// Chống XSS: escape ký tự đặc biệt HTML trước khi chèn dữ liệu (do người dùng nhập) vào innerHTML
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Chống XSS: escape an toàn để nhúng chuỗi vào tham số của inline onclick="fn('...')"
// (phải escape ký tự JS string TRƯỚC, rồi mới escape ký tự thuộc tính HTML,
// vì trình duyệt giải mã HTML entity của thuộc tính trước khi JS engine đọc chuỗi)
function escapeJsAttr(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Chống chèn link độc hại (javascript:, vbscript:, data:...) vào thuộc tính href/src:
// chỉ chấp nhận URL http/https hợp lệ, ngược lại trả về giá trị mặc định an toàn
function sanitizeUrl(url, fallback = "") {
  if (!url) return fallback;
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return fallback;
}

// Global AuthManager Object
const AuthManager = {
  // Lấy danh sách users từ LocalStorage
  getUsers() {
    try {
      const users = localStorage.getItem("nutriclub_users");
      if (users) {
        const parsed = JSON.parse(users);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error parsing users from localStorage:", e);
    }
    return typeof SEED_USERS !== "undefined" ? SEED_USERS : [];
  },

  // Lưu danh sách users
  saveUsers(users) {
    localStorage.setItem("nutriclub_users", JSON.stringify(users));
  },

  // Lấy thông tin user hiện đang đăng nhập
  getCurrentUser() {
    try {
      const userJson = localStorage.getItem("nutriclub_current_user");
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      console.error("Error parsing current user:", e);
      return null;
    }
  },

  // Đăng nhập
  login(phoneOrEmail, password) {
    const users = this.getUsers();
    const user = users.find(u => (u.phone === phoneOrEmail || u.email === phoneOrEmail) && u.password === password);
    if (user) {
      localStorage.setItem("nutriclub_current_user", JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: "Số điện thoại / Email hoặc mật khẩu không chính xác." };
  },

  // Đăng ký
  register(userData) {
    const users = this.getUsers();
    // Kiểm tra trùng SĐT hoặc Email
    if (users.some(u => u.phone === userData.phone)) {
      return { success: false, message: "Số điện thoại này đã được đăng ký trong hệ thống!" };
    }
    if (userData.email && users.some(u => u.email === userData.email)) {
      return { success: false, message: "Email này đã được sử dụng!" };
    }

    const newUser = {
      id: "usr_" + Date.now(),
      name: userData.name,
      phone: userData.phone,
      email: userData.email || `${userData.phone}@nhomdinhduong.vn`,
      password: userData.password,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`,
      role: userData.role || "Chủ nhiệm Nhóm Dinh Dưỡng",
      bio: userData.bio || "Thành viên tích cực lan tỏa lối sống dinh dưỡng lành mạnh.",
      vipDays: 0,
      referralLogs: []
    };

    // Thưởng cho người giới thiệu khi đăng ký tài khoản mới (+1 ngày VIP)
    let rewardMsg = "";
    if (userData.refCode) {
      newUser.referredBy = userData.refCode;
      const referrer = users.find(u => u.phone === userData.refCode || u.id === userData.refCode);
      if (referrer) {
        referrer.vipDays = (referrer.vipDays || 0) + 1;
        if (!referrer.referralLogs) referrer.referralLogs = [];
        referrer.referralLogs.unshift({
          id: "ref_" + Date.now(),
          date: new Date().toLocaleDateString('vi-VN'),
          refereeName: userData.name,
          refereePhone: maskPhone(userData.phone),
          type: "registration",
          reward: "+1 Ngày VIP Miễn Phí"
        });
        rewardMsg = ` (🎁 Đã thưởng +1 ngày VIP cho người giới thiệu ${referrer.name})`;
      }
    }

    users.push(newUser);
    this.saveUsers(users);
    // Tự động đăng nhập
    localStorage.setItem("nutriclub_current_user", JSON.stringify(newUser));
    return { success: true, user: newUser, rewardMsg };
  },

  // Đăng xuất
  logout() {
    localStorage.removeItem("nutriclub_current_user");
  },

  // Kiểm tra người dùng có quyền VIP hay không (đã nâng cấp gói)
  isVIPUser() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.isAdmin === true || user.package === "monthly" || user.package === "yearly" || user.package === "vip";
  },

  // Ép đăng nhập quyền Admin Quản Trị Viên 0902030185
  forceLoginAdmin() {
    let users = this.getUsers();
    let adminUser = users.find(u => u.phone === "0902030185");
    if (!adminUser) {
      adminUser = {
        id: "usr_000",
        name: "Phan Tiến Dũng",
        phone: "0902030185",
        email: "admin@nhomdinhduong.vn",
        password: "123",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        role: "Quản trị viên Hệ thống (Admin)",
        bio: "Quản trị viên hệ thống Nhomdinhduong.vn toàn quốc.",
        package: "yearly",
        isAdmin: true
      };
      users.unshift(adminUser);
      this.saveUsers(users);
    } else {
      adminUser.isAdmin = true;
      adminUser.package = "yearly";
      adminUser.role = "Quản trị viên Hệ thống (Admin)";
      const idx = users.findIndex(u => u.id === adminUser.id);
      if (idx !== -1) users[idx] = adminUser;
      this.saveUsers(users);
    }
    localStorage.setItem("nutriclub_current_user", JSON.stringify(adminUser));
    return adminUser;
  },

  // Kiểm tra người dùng có quyền Admin quản trị hệ thống hay không
  isAdminUser() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.isAdmin === true || user.phone === "0902030185" || user.phone === "0988888888" || (user.role && user.role.includes("Admin"));
  },

  // Nâng cấp gói người dùng
  upgradeUserVIP(packageType = "monthly") {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: "Vui lòng đăng nhập trước khi nâng cấp gói!" };
    
    user.package = packageType;
    user.packageExpiry = Date.now() + (packageType === "yearly" ? 365 : 30) * 86400000;

    const users = this.getUsers();

    // Thưởng cho người giới thiệu khi nâng cấp Gói VIP (1 Tháng => +7 ngày | 1 Năm => +90 ngày)
    if (user.referredBy) {
      const referrer = users.find(u => u.phone === user.referredBy || u.id === user.referredBy);
      if (referrer) {
        let addedDays = 0;
        let rewardText = "";
        let logType = "";

        if (packageType === "yearly") {
          addedDays = 90;
          rewardText = "+90 Ngày VIP (3 Tháng)";
          logType = "yearly_package";
        } else if (packageType === "monthly") {
          addedDays = 7;
          rewardText = "+7 Ngày VIP (1 Tuần)";
          logType = "monthly_package";
        }

        if (addedDays > 0) {
          referrer.vipDays = (referrer.vipDays || 0) + addedDays;
          if (!referrer.referralLogs) referrer.referralLogs = [];
          referrer.referralLogs.unshift({
            id: "ref_" + Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            refereeName: user.name,
            refereePhone: maskPhone(user.phone),
            type: logType,
            reward: rewardText
          });
        }
      }
    }

    localStorage.setItem("nutriclub_current_user", JSON.stringify(user));

    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      this.saveUsers(users);
    }
    return { success: true, user };
  },

  // Tìm kiếm users trong hệ thống (phục vụ chức năng chọn Đồng vận hành)
  searchUsers(keyword, excludeIds = []) {
    const users = this.getUsers();
    const cleanKey = keyword.toLowerCase().trim();
    if (!cleanKey) return [];
    
    return users.filter(u => {
      if (excludeIds.includes(u.id)) return false;
      return (
        u.name.toLowerCase().includes(cleanKey) ||
        u.phone.includes(cleanKey) ||
        (u.email && u.email.toLowerCase().includes(cleanKey))
      );
    });
  },

  // Cập nhật thông tin tài khoản
  updateUserProfile(updatedData) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: "Vui lòng đăng nhập!" };

    if (updatedData.name) user.name = updatedData.name;
    if (updatedData.avatar) user.avatar = updatedData.avatar;
    if (updatedData.bio !== undefined) user.bio = updatedData.bio;
    if (updatedData.email) user.email = updatedData.email;

    localStorage.setItem("nutriclub_current_user", JSON.stringify(user));

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      this.saveUsers(users);
    }
    return { success: true, user };
  },

  // Đổi mật khẩu
  changePassword(oldPassword, newPassword) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: "Vui lòng đăng nhập!" };
    if (user.password !== oldPassword) {
      return { success: false, message: "Mật khẩu hiện tại không chính xác!" };
    }

    user.password = newPassword;
    localStorage.setItem("nutriclub_current_user", JSON.stringify(user));

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      this.saveUsers(users);
    }
    return { success: true };
  }
};

if (typeof window !== "undefined") {
  window.AuthManager = AuthManager;
}

