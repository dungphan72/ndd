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
  _initialized: false,

  isInitialized() {
    return this._initialized;
  },

  // Gọi 1 lần từ App.init() (sau khi firebase-config.js module đã chạy xong).
  // Lắng nghe trạng thái đăng nhập thật + đồng bộ realtime hồ sơ Firestore,
  // để getCurrentUser() vẫn có thể đồng bộ (sync) cho ~60 nơi gọi hiện có.
  initAuth(onChange) {
    if (!window.firebaseAuth || !window.firebaseAuthHelpers || !window.firebaseDb || !window.firestoreHelpers) {
      console.warn("Firebase Auth chưa sẵn sàng, bỏ qua initAuth.");
      this._initialized = true;
      if (typeof onChange === "function") onChange(null);
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
        this._initialized = true;
        if (typeof onChange === "function") onChange(null);
        return;
      }
      this._profileUnsub = onSnapshot(
        doc(window.firebaseDb, "users", fbUser.uid),
        (snap) => {
          if (snap.exists()) {
            this._currentUser = { uid: fbUser.uid, id: fbUser.uid, email: fbUser.email, ...snap.data() };
            this._getUserReferralCode(this._currentUser);
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
            this._getUserReferralCode(this._currentUser);
          }
          this._initialized = true;
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
          } else {
            this._currentUser = null;
          }
          this._initialized = true;
          if (typeof onChange === "function") onChange(this._currentUser);
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

  // Lấy hoặc tạo Mã Giới Thiệu cá nhân 6 số bảo mật (format: 000001 -> 999999)
  _getUserReferralCode(user) {
    if (!user) return "000001";
    if (user.referralCode && String(user.referralCode).length === 6) {
      return String(user.referralCode);
    }

    // Tạo mã ngẫu nhiên 6 số duy nhất từ UID / Email / SĐT
    const seed = String(user.uid || user.id || user.email || user.phone || Math.random());
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const codeNum = (Math.abs(hash) % 900000) + 100000;
    const generatedCode = String(codeNum).padStart(6, '0');

    user.referralCode = generatedCode;

    // Tự động lưu referralCode vào Firestore cho các user đã có
    if (user.uid && window.firebaseDb && window.firestoreHelpers) {
      try {
        const { doc, updateDoc } = window.firestoreHelpers;
        updateDoc(doc(window.firebaseDb, "users", user.uid), { referralCode: generatedCode }).catch(() => {});
      } catch (e) {}
    }

    return generatedCode;
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

    // Kiểm tra trùng SĐT qua "phoneIndex" (đọc công khai)
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
    const referralCode = this._getUserReferralCode({ uid, phone, email, name });

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
      referralCode,
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

    // Thưởng cho người giới thiệu (User A) khi đăng ký tài khoản mới (+1 ngày VIP)
    let rewardMsg = "";
    if (refCode) {
      await this._processReferralReward(newProfile, "registration");
      rewardMsg = ` (🎁 Đã thưởng +1 ngày VIP cho người giới thiệu)`;
    }

    return { success: true, user: { uid, id: uid, ...newProfile }, rewardMsg };
  },

  // Helper xử lý thưởng Affiliate cho người giới thiệu (User A) khi User B đăng ký hoặc nâng VIP
  async _processReferralReward(refereeUser, packageType) {
    if (!refereeUser || !refereeUser.referredBy) return;
    const refCode = String(refereeUser.referredBy).trim();
    if (!refCode) return;

    if (!window.firebaseDb || !window.firestoreHelpers) return;
    const { doc, getDoc, updateDoc, collection, query, where, getDocs } = window.firestoreHelpers;
    const db = window.firebaseDb;

    try {
      let refDocSnap = null;
      let referrerData = null;

      // 1. Ưu tiên tìm theo referralCode (mã 6 số ngẫu nhiên)
      const refCodeSnap = await getDocs(query(collection(db, "users"), where("referralCode", "==", refCode)));
      if (!refCodeSnap.empty) {
        refDocSnap = refCodeSnap.docs[0];
        referrerData = refDocSnap.data();
      } else {
        // Tìm theo SĐT (dành cho mã giới thiệu cũ)
        const cleanPhone = refCode.replace(/^(?:\+84|84)/, "0");
        const phoneSnap = await getDocs(query(collection(db, "users"), where("phone", "==", cleanPhone)));
        if (!phoneSnap.empty) {
          refDocSnap = phoneSnap.docs[0];
          referrerData = refDocSnap.data();
        } else {
          // Tìm theo Email
          const emailSnap = await getDocs(query(collection(db, "users"), where("email", "==", refCode.toLowerCase())));
          if (!emailSnap.empty) {
            refDocSnap = emailSnap.docs[0];
            referrerData = emailSnap.data();
          } else if (refCode.length >= 15) {
            // Tìm theo UID
            const directSnap = await getDoc(doc(db, "users", refCode));
            if (directSnap.exists()) {
              refDocSnap = directSnap;
              referrerData = directSnap.data();
            }
          }
        }
      }

      if (!refDocSnap || !referrerData) {
        console.warn("Không tìm thấy người giới thiệu cho mã:", refCode);
        return;
      }

      if (referrerData.phone === refereeUser.phone || referrerData.uid === refereeUser.uid) {
        return;
      }

      // 2. Mức thưởng:
      // - Đăng ký: +1 Ngày VIP Miễn Phí
      // - Gói VIP 1 Tháng: +7 Ngày VIP (1 Tuần)
      // - Gói VIP 1 Năm: +90 Ngày VIP (3 Tháng)
      let addedDays = 0;
      let rewardText = "";
      let logType = packageType;

      if (packageType === "registration") {
        addedDays = 1;
        rewardText = "+1 Ngày VIP Miễn Phí";
      } else if (packageType === "monthly") {
        addedDays = 7;
        rewardText = "+7 Ngày VIP (1 Tuần)";
      } else if (packageType === "yearly") {
        addedDays = 90;
        rewardText = "+90 Ngày VIP (3 Tháng)";
      }

      if (addedDays <= 0) return;

      const logs = referrerData.referralLogs || [];
      const refereePhoneMasked = maskPhone(refereeUser.phone || "");

      const alreadyRewarded = logs.some(l => 
        l.type === logType && 
        (l.refereePhone === refereePhoneMasked || (l.refereeName && l.refereeName === refereeUser.name))
      );

      if (alreadyRewarded) {
        console.log(`Đã thưởng mốc ${logType} trước đó cho ${referrerData.name}`);
        return;
      }

      const newLog = {
        id: "ref_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        date: new Date().toLocaleDateString('vi-VN'),
        refereeName: refereeUser.name || "Thành viên mới",
        refereePhone: refereePhoneMasked,
        type: logType,
        reward: rewardText
      };

      const currentExpiry = referrerData.packageExpiry && referrerData.packageExpiry > Date.now() 
        ? referrerData.packageExpiry 
        : Date.now();
      const newExpiry = currentExpiry + (addedDays * 86400000);

      await updateDoc(refDocSnap.ref, {
        vipDays: (referrerData.vipDays || 0) + addedDays,
        packageExpiry: newExpiry,
        package: (referrerData.package === "yearly" || referrerData.package === "monthly") ? referrerData.package : "trial",
        referralLogs: [newLog, ...logs]
      });

      console.log(`🎁 Đã thưởng thành công ${addedDays} ngày VIP cho người giới thiệu ${referrerData.name}!`);
    } catch (err) {
      console.error("Lỗi thưởng referral:", err);
    }
  },

  // Đồng bộ kiểm tra và bù thưởng bổ sung cho các lượt giới thiệu chưa nhận
  async syncMissedReferrals(currentUser) {
    if (!currentUser) return;
    if (!window.firebaseDb || !window.firestoreHelpers) return;
    const { collection, query, where, getDocs, doc, updateDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;

    try {
      const userRefCode = this._getUserReferralCode(currentUser);
      const userPhone = (currentUser.phone || "").trim();
      const userEmail = (currentUser.email || "").toLowerCase().trim();
      const userId = currentUser.uid || currentUser.id;

      let refereeDocs = [];

      // 1. Tìm theo referralCode (mã 6 số)
      if (userRefCode) {
        const qRefCode = await getDocs(query(collection(db, "users"), where("referredBy", "==", userRefCode)));
        qRefCode.forEach(d => refereeDocs.push({ uid: d.id, id: d.id, ...d.data() }));
      }

      // 2. Tìm theo SĐT (mã cũ)
      if (userPhone) {
        const qPhone = await getDocs(query(collection(db, "users"), where("referredBy", "==", userPhone)));
        qPhone.forEach(d => {
          if (!refereeDocs.some(x => x.uid === d.id)) refereeDocs.push({ uid: d.id, id: d.id, ...d.data() });
        });
      }

      // 3. Tìm theo Email
      if (userEmail) {
        const qEmail = await getDocs(query(collection(db, "users"), where("referredBy", "==", userEmail)));
        qEmail.forEach(d => {
          if (!refereeDocs.some(x => x.uid === d.id)) refereeDocs.push({ uid: d.id, id: d.id, ...d.data() });
        });
      }

      if (refereeDocs.length === 0) return;

      let logs = [...(currentUser.referralLogs || [])];
      let addedDaysTotal = 0;
      let hasChanges = false;

      for (const referee of refereeDocs) {
        const refereePhoneMasked = maskPhone(referee.phone || "");

        // 1. Kiểm tra mốc đăng ký mới (+1 ngày)
        const hasRegLog = logs.some(l => l.type === "registration" && (l.refereePhone === refereePhoneMasked || l.refereeName === referee.name));
        if (!hasRegLog) {
          logs.unshift({
            id: "ref_reg_" + referee.uid,
            date: new Date(referee.createdAt || Date.now()).toLocaleDateString('vi-VN'),
            refereeName: referee.name || "Thành viên mới",
            refereePhone: refereePhoneMasked,
            type: "registration",
            reward: "+1 Ngày VIP Miễn Phí"
          });
          addedDaysTotal += 1;
          hasChanges = true;
        }

        // 2. Kiểm tra mốc nâng VIP 1 Tháng (+7 ngày)
        if (referee.package === "monthly") {
          const hasMonthlyLog = logs.some(l => l.type === "monthly_package" && (l.refereePhone === refereePhoneMasked || l.refereeName === referee.name));
          if (!hasMonthlyLog) {
            logs.unshift({
              id: "ref_m_" + referee.uid,
              date: new Date().toLocaleDateString('vi-VN'),
              refereeName: referee.name || "Thành viên mới",
              refereePhone: refereePhoneMasked,
              type: "monthly_package",
              reward: "+7 Ngày VIP (1 Tuần)"
            });
            addedDaysTotal += 7;
            hasChanges = true;
          }
        }

        // 3. Kiểm tra mốc nâng VIP 1 Năm (+90 ngày)
        if (referee.package === "yearly") {
          const hasYearlyLog = logs.some(l => l.type === "yearly_package" && (l.refereePhone === refereePhoneMasked || l.refereeName === referee.name));
          if (!hasYearlyLog) {
            logs.unshift({
              id: "ref_y_" + referee.uid,
              date: new Date().toLocaleDateString('vi-VN'),
              refereeName: referee.name || "Thành viên mới",
              refereePhone: refereePhoneMasked,
              type: "yearly_package",
              reward: "+90 Ngày VIP (3 Tháng)"
            });
            addedDaysTotal += 90;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        const currentExpiry = currentUser.packageExpiry && currentUser.packageExpiry > Date.now() 
          ? currentUser.packageExpiry 
          : Date.now();
        const newExpiry = currentExpiry + (addedDaysTotal * 86400000);

        await updateDoc(doc(db, "users", userId), {
          vipDays: (currentUser.vipDays || 0) + addedDaysTotal,
          packageExpiry: newExpiry,
          referralLogs: logs
        });
        console.log(`🎉 Đã đồng bộ bổ sung ${addedDaysTotal} ngày VIP cho ${currentUser.name}!`);
      }
    } catch (e) {
      console.error("Lỗi đồng bộ thưởng referral chưa nhận:", e);
    }
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

    const { doc, updateDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;
    const packageExpiry = Date.now() + (packageType === "yearly" ? 365 : 30) * 86400000;

    try {
      await updateDoc(doc(db, "users", user.uid), { package: packageType, packageExpiry });
    } catch (err) {
      return { success: false, message: "Nâng cấp thất bại: " + err.message };
    }

    // Thưởng cho người giới thiệu (User A) khi nâng cấp Gói VIP (1 Tháng => +7 ngày | 1 Năm => +90 ngày)
    if (user.referredBy) {
      await this._processReferralReward(user, packageType);
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
    const { doc, updateDoc, getDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;
    try {
      await updateDoc(doc(db, "users", userId), patch);

      // Nếu Admin nâng/duyệt gói VIP (monthly hoặc yearly), tự động thưởng cho người giới thiệu
      if (patch && (patch.package === "monthly" || patch.package === "yearly")) {
        try {
          const userSnap = await getDoc(doc(db, "users", userId));
          if (userSnap.exists()) {
            const userB = { uid: userId, id: userId, ...userSnap.data() };
            if (userB.referredBy) {
              await this._processReferralReward(userB, patch.package);
            }
          }
        } catch (e) {
          console.error("Lỗi thưởng referral khi admin duyệt VIP:", e);
        }
      }

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
