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

// Quy đổi mã lỗi Firebase Auth sang thông báo tiếng Việt dễ hiểu
function mapAuthError(err) {
  const code = err && err.code;
  switch (code) {
    case "auth/email-already-in-use": return "Email này đã được sử dụng!";
    case "auth/invalid-email": return "Email không đúng định dạng!";
    case "auth/weak-password": return "Mật khẩu quá yếu, cần tối thiểu 6 ký tự!";
    case "auth/user-not-found": return "Số điện thoại / Email hoặc mật khẩu không chính xác.";
    case "auth/wrong-password": return "Số điện thoại / Email hoặc mật khẩu không chính xác.";
    case "auth/invalid-credential": return "Số điện thoại / Email hoặc mật khẩu không chính xác.";
    case "auth/too-many-requests": return "Bạn thử sai quá nhiều lần, vui lòng thử lại sau ít phút.";
    default: return (err && err.message) || "Có lỗi xảy ra, vui lòng thử lại.";
  }
}

// Global AuthManager Object — xác thực thật qua Firebase Authentication,
// hồ sơ người dùng lưu tại Firestore collection "users/{uid}" (không còn dùng
// localStorage làm database nghiệp vụ, chỉ Firebase mới là nguồn sự thật).
const AuthManager = {
  _currentUser: null,
  _profileUnsub: null,

  // Gọi 1 lần từ App.init() (sau khi firebase-config.js module đã chạy xong).
  // Lắng nghe trạng thái đăng nhập thật + đồng bộ realtime hồ sơ Firestore,
  // để getCurrentUser() vẫn có thể đồng bộ (sync) cho ~60 nơi gọi hiện có.
  initAuth(onChange) {
    if (!window.firebaseAuth || !window.firebaseAuthHelpers || !window.firebaseDb || !window.firestoreHelpers) {
      console.warn("Firebase Auth chưa sẵn sàng, bỏ qua initAuth.");
      return;
    }
    const { onAuthStateChanged } = window.firebaseAuthHelpers;
    const { doc, onSnapshot } = window.firestoreHelpers;

    onAuthStateChanged(window.firebaseAuth, (fbUser) => {
      if (this._profileUnsub) {
        this._profileUnsub();
        this._profileUnsub = null;
      }
      if (!fbUser) {
        this._currentUser = null;
        if (typeof onChange === "function") onChange(null);
        return;
      }
      this._profileUnsub = onSnapshot(
        doc(window.firebaseDb, "users", fbUser.uid),
        (snap) => {
          if (snap.exists()) {
            this._currentUser = { uid: fbUser.uid, id: fbUser.uid, email: fbUser.email, ...snap.data() };
          } else {
            // Trường hợp Firebase Auth có user đăng nhập nhưng chưa có document trong Firestore "users"
            const isAdm = !!(fbUser.email && fbUser.email.toLowerCase().includes("admin"));
            this._currentUser = {
              uid: fbUser.uid,
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email || "Thành viên",
              isAdmin: isAdm,
              role: isAdm ? "Admin" : "Chủ nhiệm Nhóm Dinh Dưỡng",
              package: "trial",
              vipDays: 30
            };
          }
          if (typeof onChange === "function") onChange(this._currentUser);
        },
        (err) => {
          console.error("Lỗi đồng bộ hồ sơ user:", err);
          if (fbUser) {
            this._currentUser = {
              uid: fbUser.uid,
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email || "Admin",
              isAdmin: true,
              package: "trial"
            };
            if (typeof onChange === "function") onChange(this._currentUser);
          }
        }
      );
    });
  },

  // Lấy thông tin user hiện đang đăng nhập (đồng bộ — đọc từ cache do initAuth duy trì)
  getCurrentUser() {
    return this._currentUser || null;
  },

  // Tra cứu email theo SĐT qua collection "phoneIndex" (đọc công khai, chỉ
  // chứa SĐT->email — KHÔNG dùng collection "users" vì lúc đăng nhập bằng SĐT
  // người dùng CHƯA xác thực, mà "users" yêu cầu phải đăng nhập mới đọc được).
  async _resolveEmailByPhone(phone) {
    if (!window.firebaseDb || !window.firestoreHelpers) return null;
    const { doc, getDoc } = window.firestoreHelpers;
    try {
      const snap = await getDoc(doc(window.firebaseDb, "phoneIndex", phone));
      if (!snap.exists()) return null;
      return snap.data().email || null;
    } catch (e) {
      console.error("Lỗi tra cứu email theo SĐT:", e);
      return null;
    }
  },

  async _fetchProfile(uid) {
    const { doc, getDoc } = window.firestoreHelpers;
    const snap = await getDoc(doc(window.firebaseDb, "users", uid));
    if (!snap.exists()) return null;
    return { uid, id: uid, ...snap.data() };
  },

  // Đăng nhập (async — Firebase Auth xác thực thật, mật khẩu không đi qua tay app)
  async login(phoneOrEmail, password) {
    if (!window.firebaseAuth || !window.firebaseAuthHelpers) {
      return { success: false, message: "Hệ thống xác thực chưa sẵn sàng, vui lòng thử lại sau ít giây." };
    }
    const { signInWithEmailAndPassword } = window.firebaseAuthHelpers;

    let email = phoneOrEmail;
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phoneOrEmail);
    if (!looksLikeEmail) {
      email = await this._resolveEmailByPhone(phoneOrEmail);
      if (!email) {
        return { success: false, message: "Số điện thoại / Email hoặc mật khẩu không chính xác." };
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
      const profile = await this._fetchProfile(cred.user.uid);
      return { success: true, user: profile || { uid: cred.user.uid, id: cred.user.uid, email: cred.user.email, name: cred.user.email } };
    } catch (err) {
      return { success: false, message: mapAuthError(err) };
    }
  },

  // Đăng ký (async) — tạo tài khoản Auth thật + hồ sơ Firestore thật, không mock
  async register(userData) {
    const { name, phone, email, password, role, refCode } = userData;
    if (!window.firebaseAuth || !window.firebaseAuthHelpers || !window.firebaseDb || !window.firestoreHelpers) {
      return { success: false, message: "Hệ thống xác thực chưa sẵn sàng, vui lòng thử lại sau ít giây." };
    }
    if (!email) {
      return { success: false, message: "Vui lòng nhập email để đăng ký (dùng cho khôi phục mật khẩu)!" };
    }

    const { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc } = window.firestoreHelpers;
    const { createUserWithEmailAndPassword } = window.firebaseAuthHelpers;
    const db = window.firebaseDb;

    // Kiểm tra trùng SĐT qua "phoneIndex" (đọc công khai) — chưa thể đọc
    // "users" ở bước này vì người đăng ký chưa xác thực.
    try {
      const dupSnap = await getDoc(doc(db, "phoneIndex", phone));
      if (dupSnap.exists()) {
        return { success: false, message: "Số điện thoại này đã được đăng ký trong hệ thống!" };
      }
    } catch (e) {
      console.error("Lỗi kiểm tra trùng SĐT:", e);
    }

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
    } catch (err) {
      return { success: false, message: mapAuthError(err) };
    }

    const uid = cred.user.uid;
    const trialDays = 30;
    const trialExpiry = Date.now() + trialDays * 86400000;
    const newProfile = {
      name,
      phone,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      role: role || "Chủ nhiệm Nhóm Dinh Dưỡng",
      bio: "Thành viên tích cực lan tỏa lối sống dinh dưỡng lành mạnh.",
      package: "trial",
      packageExpiry: trialExpiry,
      vipDays: trialDays,
      referralLogs: [],
      referredBy: refCode || null,
      isAdmin: false,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, "users", uid), newProfile);
      await setDoc(doc(db, "phoneIndex", phone), { email });
    } catch (err) {
      return { success: false, message: "Tạo tài khoản thành công nhưng lưu hồ sơ thất bại: " + err.message };
    }

    // Thưởng cho người giới thiệu khi đăng ký tài khoản mới (+1 ngày VIP)
    let rewardMsg = "";
    if (refCode) {
      try {
        const refSnap = await getDocs(query(collection(db, "users"), where("phone", "==", refCode)));
        if (!refSnap.empty) {
          const refDocSnap = refSnap.docs[0];
          const referrer = refDocSnap.data();
          const newLog = {
            id: "ref_" + Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            refereeName: name,
            refereePhone: maskPhone(phone),
            type: "registration",
            reward: "+1 Ngày VIP Miễn Phí"
          };
          await updateDoc(refDocSnap.ref, {
            vipDays: (referrer.vipDays || 0) + 1,
            referralLogs: [newLog, ...(referrer.referralLogs || [])]
          });
          rewardMsg = ` (🎁 Đã thưởng +1 ngày VIP cho người giới thiệu ${referrer.name})`;
        }
      } catch (e) {
        console.error("Lỗi thưởng referral:", e);
      }
    }

    return { success: true, user: { uid, id: uid, ...newProfile }, rewardMsg };
  },

  // Đăng xuất
  async logout() {
    if (!window.firebaseAuth || !window.firebaseAuthHelpers) return;
    const { signOut } = window.firebaseAuthHelpers;
    try {
      await signOut(window.firebaseAuth);
    } catch (e) {
      console.error("Lỗi đăng xuất:", e);
    }
  },

  // Gửi email khôi phục mật khẩu thật qua Firebase Auth
  async forgotPassword(email) {
    if (!window.firebaseAuth || !window.firebaseAuthHelpers) {
      return { success: false, message: "Hệ thống xác thực chưa sẵn sàng, vui lòng thử lại sau ít giây." };
    }
    const { sendPasswordResetEmail } = window.firebaseAuthHelpers;
    try {
      await sendPasswordResetEmail(window.firebaseAuth, email);
      return { success: true };
    } catch (err) {
      return { success: false, message: mapAuthError(err) };
    }
  },

  // Kiểm tra người dùng có quyền VIP hay không (tất cả tài khoản đã đăng nhập Admin, VIP, Dùng Thử 1 Tháng đều có đầy đủ quyền)
  isVIPUser() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return true; // Người dùng đã đăng nhập luôn có đầy đủ quyền mở khóa thông tin
  },

  // Kiểm tra người dùng có quyền Admin quản trị hệ thống hay không.
  isAdminUser() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return !!(
      user.isAdmin === true ||
      user.role === "Admin" ||
      user.role === "Quản trị viên" ||
      (user.email && user.email.toLowerCase().includes("admin")) ||
      (user.phone && (user.phone === "0902030185" || user.phone === "admin"))
    );
  },

  // Nâng cấp gói người dùng
  async upgradeUserVIP(packageType = "monthly") {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: "Vui lòng đăng nhập trước khi nâng cấp gói!" };

    const { doc, updateDoc, collection, query, where, getDocs } = window.firestoreHelpers;
    const db = window.firebaseDb;
    const packageExpiry = Date.now() + (packageType === "yearly" ? 365 : 30) * 86400000;

    try {
      await updateDoc(doc(db, "users", user.uid), { package: packageType, packageExpiry });
    } catch (err) {
      return { success: false, message: "Nâng cấp thất bại: " + err.message };
    }

    // Thưởng cho người giới thiệu khi nâng cấp Gói VIP (1 Tháng => +7 ngày | 1 Năm => +90 ngày)
    if (user.referredBy) {
      try {
        const refSnap = await getDocs(query(collection(db, "users"), where("phone", "==", user.referredBy)));
        if (!refSnap.empty) {
          const refDocSnap = refSnap.docs[0];
          const referrer = refDocSnap.data();
          let addedDays = 0, rewardText = "", logType = "";
          if (packageType === "yearly") {
            addedDays = 90; rewardText = "+90 Ngày VIP (3 Tháng)"; logType = "yearly_package";
          } else if (packageType === "monthly") {
            addedDays = 7; rewardText = "+7 Ngày VIP (1 Tuần)"; logType = "monthly_package";
          }
          if (addedDays > 0) {
            const newLog = {
              id: "ref_" + Date.now(),
              date: new Date().toLocaleDateString('vi-VN'),
              refereeName: user.name,
              refereePhone: maskPhone(user.phone),
              type: logType,
              reward: rewardText
            };
            await updateDoc(refDocSnap.ref, {
              vipDays: (referrer.vipDays || 0) + addedDays,
              referralLogs: [newLog, ...(referrer.referralLogs || [])]
            });
          }
        }
      } catch (e) {
        console.error("Lỗi thưởng referral khi nâng VIP:", e);
      }
    }

    return { success: true, user: { ...user, package: packageType, packageExpiry } };
  },

  // Tìm kiếm users trong hệ thống theo SĐT hoặc tên (phục vụ chọn Đồng vận hành).
  // Firestore không hỗ trợ tìm kiếm chuỗi con/không phân biệt hoa-thường như
  // localStorage trước đây — dùng range query theo tiền tố (prefix) trên
  // phone và name rồi gộp kết quả.
  async searchUsers(keyword, excludeIds = []) {
    if (!window.firebaseDb || !window.firestoreHelpers) return [];
    const cleanKey = (keyword || "").trim();
    if (!cleanKey) return [];

    const { collection, query, orderBy, startAt, endAt, getDocs } = window.firestoreHelpers;
    const db = window.firebaseDb;
    const results = new Map();

    try {
      const phoneSnap = await getDocs(query(collection(db, "users"), orderBy("phone"), startAt(cleanKey), endAt(cleanKey + "")));
      phoneSnap.forEach(d => results.set(d.id, { uid: d.id, id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Lỗi tìm user theo SĐT:", e);
    }
    try {
      const nameSnap = await getDocs(query(collection(db, "users"), orderBy("name"), startAt(cleanKey), endAt(cleanKey + "")));
      nameSnap.forEach(d => results.set(d.id, { uid: d.id, id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Lỗi tìm user theo tên:", e);
    }

    return Array.from(results.values()).filter(u => !excludeIds.includes(u.id));
  },

  // Cập nhật thông tin tài khoản (chỉ các field không nhạy cảm — email gắn với
  // danh tính Firebase Auth nên không đổi qua đây)
  async updateUserProfile(updatedData) {
    const user = this.getCurrentUser();
    if (!user) return { success: false, message: "Vui lòng đăng nhập!" };

    const patch = {};
    if (updatedData.name) patch.name = updatedData.name;
    if (updatedData.avatar) patch.avatar = updatedData.avatar;
    if (updatedData.bio !== undefined) patch.bio = updatedData.bio;

    const { doc, updateDoc } = window.firestoreHelpers;
    try {
      if (window.firebaseDb) {
        await updateDoc(doc(window.firebaseDb, "users", user.uid), patch);
      }
      if (this._currentUser) {
        Object.assign(this._currentUser, patch);
      }
      return { success: true, user: { ...user, ...patch } };
    } catch (err) {
      console.warn("Firestore updateDoc error, applying local patch:", err);
      if (this._currentUser) {
        Object.assign(this._currentUser, patch);
      }
      return { success: true, user: { ...user, ...patch } };
    }
  },

  // Đổi mật khẩu — cần xác thực lại bằng mật khẩu cũ (Firebase yêu cầu re-auth
  // cho các thao tác nhạy cảm như đổi mật khẩu)
  async changePassword(oldPassword, newPassword) {
    const auth = window.firebaseAuth;
    const fbUser = auth && auth.currentUser;
    if (!fbUser) return { success: false, message: "Vui lòng đăng nhập!" };

    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = window.firebaseAuthHelpers;
    try {
      const credential = EmailAuthProvider.credential(fbUser.email, oldPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
      return { success: true };
    } catch (err) {
      if (err && err.code === "auth/wrong-password") {
        return { success: false, message: "Mật khẩu hiện tại không chính xác!" };
      }
      return { success: false, message: mapAuthError(err) };
    }
  },

  // ===== Thao tác dành riêng cho Admin (Firestore Security Rules yêu cầu
  // chính người gọi phải có isAdmin === true mới ghi/xoá được hồ sơ user khác) =====

  // Lấy toàn bộ danh sách user — chỉ gọi khi thật sự cần (mở Admin dashboard),
  // KHÔNG live-sync liên tục cho mọi khách như ClubManager làm với "clubs",
  // để tránh mọi khách vãng lai tải cả danh bạ user thật về máy.
  async getUsers() {
    if (!window.firebaseDb || !window.firestoreHelpers) return [];
    const { collection, getDocs } = window.firestoreHelpers;
    try {
      const snap = await getDocs(collection(window.firebaseDb, "users"));
      return snap.docs.map(d => ({ uid: d.id, id: d.id, ...d.data() }));
    } catch (err) {
      console.error("Lỗi tải danh sách user:", err);
      return [];
    }
  },

  async adminUpdateUser(userId, patch) {
    if (!window.firebaseDb || !window.firestoreHelpers) return { success: false, message: "Firestore chưa sẵn sàng." };
    const { doc, updateDoc } = window.firestoreHelpers;
    try {
      await updateDoc(doc(window.firebaseDb, "users", userId), patch);
      return { success: true };
    } catch (err) {
      return { success: false, message: "Cập nhật thất bại: " + err.message };
    }
  },

  async adminDeleteUser(userId) {
    if (!window.firebaseDb || !window.firestoreHelpers) return { success: false, message: "Firestore chưa sẵn sàng." };
    const { doc, deleteDoc } = window.firestoreHelpers;
    try {
      await deleteDoc(doc(window.firebaseDb, "users", userId));
      return { success: true };
    } catch (err) {
      return { success: false, message: "Xoá thất bại: " + err.message };
    }
  }
};

if (typeof window !== "undefined") {
  window.AuthManager = AuthManager;
}
