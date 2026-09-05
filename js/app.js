var SEED_CMS_CONFIG = window.SEED_CMS_CONFIG || {
  menu: [
    { id: "clubsTab", tab: "Trang Chủ", label: "Trang Chủ", enabled: true },
    { id: "eventsTab", tab: "Sự Kiện", label: "Sự Kiện", enabled: true },
    { id: "shopTab", tab: "Shop", label: "Shop Công Cụ", enabled: true },
    { id: "coursesTab", tab: "Khóa Học", label: "Khóa Học E-Learning", enabled: true },
    { id: "bmiTab", tab: "Tính BMI", label: "Công Cụ BMI", enabled: true }
  ],
  footer: {
    brandName: "Nhomdinhduong.vn",
    hotline: "0902.030.185",
    hotlineTitle: "Hotline Hỗ Trợ 24/7",
    tagline: "Nền Tảng Kết Nối Nhóm Dinh Dưỡng & Sức Khỏe Cộng Đồng Toàn Quốc",
    copyright: "© 2026 Nhomdinhduong.vn - All Rights Reserved.",
    subText: "Hệ thống hỗ trợ hội viên tìm kiếm Nhóm Dinh Dưỡng gần nhất, theo dõi chỉ số thể trạng InBody và học tập kiến thức dinh dưỡng chuẩn hóa."
  }
};


const App = {
  activeTab: 'clubsTab',
  selectedType: 'all',
  selectedProvince: 'all',
  selectedDistrict: 'all',
  selectedWard: 'all',
  selectedFeatures: [],
  selectedOpeningTime: 'all',
  selectedSortBy: 'rating',
  searchKeyword: '',
  selectedShopCategory: 'all',
  shopSearchKeyword: '',
  shopPriceSort: 'default',
  userCoord: null,
  leafletMap: null,
  markersLayer: null,
  selectedCoOperators: [], // Danh sách đồng vận hành được chọn khi tạo nhóm
  selectedEditCoOperators: [], // Danh sách đồng vận hành được chọn khi Admin sửa nhóm
  selectedCourseCategory: 'all',

  tabSlugMap: {
    'clubsTab': '',
    'eventsTab': 'events',
    'shopTab': 'shop',
    'coursesTab': 'courses',
    'bmiTab': 'bmi',
    'profileTab': 'profile',
    'trackerTab': 'tracker',
    'adminTab': 'admin'
  },

  slugToTabMap: {
    '': 'clubsTab',
    'home': 'clubsTab',
    'clubs': 'clubsTab',
    'clubstab': 'clubsTab',
    'events': 'eventsTab',
    'eventstab': 'eventsTab',
    'shop': 'shopTab',
    'shoptab': 'shopTab',
    'courses': 'coursesTab',
    'coursestab': 'coursesTab',
    'bmi': 'bmiTab',
    'bmitab': 'bmiTab',
    'profile': 'profileTab',
    'profiletab': 'profileTab',
    'tracker': 'trackerTab',
    'trackertab': 'trackerTab',
    'admin': 'adminTab',
    'admintab': 'adminTab'
  },

  getTabFromURL() {
    // 1. Kiểm tra Path (ví dụ: /courses hoặc /events)
    let path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase().trim();
    if (path && this.slugToTabMap[path]) {
      return this.slugToTabMap[path];
    }

    // 2. Kiểm tra Query Param (?page=courses hoặc ?tab=courses)
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = (urlParams.get("page") || urlParams.get("tab") || "").toLowerCase().trim();
    if (pageParam && this.slugToTabMap[pageParam]) {
      return this.slugToTabMap[pageParam];
    }

    // 3. Kiểm tra Hash (#courses hoặc #coursesTab)
    let hash = (window.location.hash || '').replace('#', '').toLowerCase().trim();
    if (hash && this.slugToTabMap[hash]) {
      return this.slugToTabMap[hash];
    }

    return 'clubsTab';
  },

  init() {
    // Khởi tạo các sự kiện giao diện
    this.setupAuthUI();
    this.setupLocationDropdowns();
    this.setupCoOpSearch();
    this.setupEditCoOpSearch();
    this.setupSearchSuggestionDismissal();

    // Kiểm tra URL ban đầu và chuyển về tab tương ứng (sạch dấu # và chữ Tab)
    const initialTab = this.getTabFromURL();
    this.switchTab(initialTab, false);

    // Đăng ký lắng nghe sự kiện Back/Forward của trình duyệt
    window.addEventListener("popstate", () => {
      const currentTab = this.getTabFromURL();
      this.switchTab(currentTab, false);
    });

    this.renderEvents();
    this.renderProducts();
    this.renderCourses();
    this.setupEventListeners();
    this.initTheme();
    this.renderDynamicCMS();

    // Khởi tạo Lắng nghe Firestore Realtime Database
    if (typeof ClubManager !== "undefined" && typeof ClubManager.initFirestoreSync === "function") {
      ClubManager.initFirestoreSync(() => {
        if (this.activeTab === 'clubsTab') {
          this.renderClubs();
        }
      });
    }

    // Khởi tạo tính toán BMI ban đầu
    this.calculateBMI();

    // Kiểm tra link giới thiệu Affiliate ?ref=...
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get("ref");
    if (refParam) {
      sessionStorage.setItem("nutriclub_ref_code", refParam);
      const refInput = document.getElementById("regRefCodeInput");
      if (refInput) refInput.value = refParam;
    }
  },

  // Chuyển đổi giữa các Trang / Tab (Nhóm Dinh Dưỡng | Sự Kiện | Shop Công Cụ | Khóa Học | Tính BMI | Quản Trị Admin)
  switchTab(tabId, updateUrl = true) {
    if (!tabId) return;
    this.activeTab = tabId;

    // Cập nhật URL sạch trên thanh địa chỉ của trình duyệt (Không còn dấu # và chữ Tab)
    if (updateUrl) {
      const slug = this.tabSlugMap[tabId] || '';
      
      let pathSegments = window.location.pathname.split('/').filter(Boolean);
      let basePath = '/';
      if (pathSegments.length > 0 && pathSegments[0].toLowerCase() === 'ndd') {
        basePath = '/ndd/';
      }

      let targetUrl = basePath;
      if (slug) {
        targetUrl = basePath + (basePath.endsWith('/') ? '' : '/') + slug;
      }

      try {
        history.pushState({ tabId }, '', targetUrl);
      } catch (e) {
        try {
          history.pushState({ tabId }, '', basePath + (slug ? '?page=' + slug : ''));
        } catch (err) {}
      }
    }

    // 1. Cập nhật trạng thái Active cho các nút Menu Desktop & Mobile Dock
    document.querySelectorAll(".nav-link-btn, .mobile-dock-item").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // 2. Ẩn tất cả các panel tab và chỉ hiện tab được chọn
    document.querySelectorAll(".tab-content-panel").forEach(panel => {
      if (panel.id === tabId) {
        panel.style.display = "block";
        panel.classList.add("tab-fade-in");
      } else {
        panel.style.display = "none";
        panel.classList.remove("tab-fade-in");
      }
    });

    // 2b. Chỉ hiển thị Hero Section tại Trang Chủ (clubsTab)
    const heroSec = document.getElementById("heroSection") || document.querySelector(".hero-section");
    if (heroSec) {
      heroSec.style.display = tabId === "clubsTab" ? "block" : "none";
    }

    // 3. Xử lý tải dữ liệu theo từng tab
    if (tabId === "clubsTab") {
      this.renderClubs();
      this.renderEvents();
      this.renderProducts();
      this.renderCourses();
    } else if (tabId === "eventsTab") {
      this.renderEvents();
    } else if (tabId === "shopTab") {
      this.renderProducts();
    } else if (tabId === "coursesTab") {
      this.renderCourses();
    } else if (tabId === "bmiTab") {
      this.calculateBMI();
    } else if (tabId === "profileTab") {
      this.openUserProfilePage(false);
    } else if (tabId === "trackerTab") {
      this.renderTrackerDashboard();
    } else if (tabId === "adminTab") {
      this.openAdminDashboardModal(false);
    } else if (tabId === "mapTab") {
      setTimeout(() => this.initLeafletMap(), 100);
    }

    // Cuộn lên đầu trang nhẹ nhàng
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
  },

  // Thiết lập trạng thái Auth trên Navbar
  setupAuthUI() {
    let currentUser = AuthManager.getCurrentUser();

    // Tự động sử dụng tài khoản dùng thử mặc định nếu chưa đăng nhập
    // NHƯNG KHÔNG tự động đăng nhập lại nếu người dùng vừa chủ động đăng xuất
    if (!currentUser && !this._loggedOut) {
      const users = AuthManager.getUsers();
      currentUser = (users && users.length > 0) ? users[0] : (typeof SEED_USERS !== 'undefined' ? SEED_USERS[0] : null);
      if (currentUser) {
        try { localStorage.setItem("nutriclub_current_user", JSON.stringify(currentUser)); } catch(e) {}
      }
    }

    const guestNav = document.getElementById("guestNavActions");
    const userNav = document.getElementById("userNavActions");
    const userNameLabel = document.getElementById("userNameLabel");
    const userAvatarImg = document.getElementById("userAvatarImg");
    const navAdminBtn = document.getElementById("navAdminBtn");
    const adminDropdownItem = document.getElementById("adminDropdownItem");
    const navCreateClubBtn = document.getElementById("navCreateClubBtn");

    const isVIP = AuthManager.isVIPUser();
    const isAdmin = AuthManager.isAdminUser();

    if (currentUser) {
      if (guestNav) guestNav.style.display = "none";
      if (userNav) userNav.style.display = "flex";
      if (userNameLabel) {
        userNameLabel.innerHTML = `${escapeHtml(currentUser.name)} ${isVIP ? '<span class="user-vip-badge">⭐ VIP</span>' : '<span class="user-trial-badge">Dùng thử</span>'}`;
      }
      if (userAvatarImg) userAvatarImg.src = sanitizeUrl(currentUser.avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=User');

      // Nút Đăng Nhóm hiển thị khi ĐÃ ĐĂNG NHẬP
      if (navCreateClubBtn) navCreateClubBtn.style.display = "inline-flex";

      // Nút Admin chỉ hiển thị khi ĐÃ ĐĂNG NHẬP VÀ LÀ TÀI KHOẢN ADMIN
      if (navAdminBtn) navAdminBtn.style.display = isAdmin ? "inline-flex" : "none";
      if (adminDropdownItem) adminDropdownItem.style.display = isAdmin ? "flex" : "none";
    } else {
      if (guestNav) guestNav.style.display = "flex";
      if (userNav) userNav.style.display = "none";

      // Khi đăng xuất => Ẩn hoàn toàn nút Đăng Nhóm và các nút Admin
      if (navCreateClubBtn) navCreateClubBtn.style.display = "none";
      if (navAdminBtn) navAdminBtn.style.display = "none";
      if (adminDropdownItem) adminDropdownItem.style.display = "none";
    }

    this.updateFooterAffiliateLink();
  },

  updateFooterAffiliateLink() {
    const input = document.getElementById("footerAffiliateLinkInput");
    if (!input) return;
    const currentUser = AuthManager.getCurrentUser();
    const baseUrl = window.location.origin + window.location.pathname;
    if (currentUser && currentUser.phone) {
      input.value = `${baseUrl}?ref=${currentUser.phone}`;
    } else {
      input.value = `${baseUrl}?ref=0902030185`;
    }
  },

  copyFooterAffiliateLink() {
    const input = document.getElementById("footerAffiliateLinkInput");
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);
    try {
      navigator.clipboard.writeText(input.value);
    } catch (e) {
      document.execCommand("copy");
    }

    this.showToast("🎉 Đã sao chép link affiliate thành công! Hãy gửi cho bạn bè để được sử dụng MIỄN PHÍ.");
  },

  renderDynamicCMS() {
    this.updateFooterAffiliateLink();
  },

  currentVIPStep: 1,
  selectedVIPPlan: 'monthly',
  selectedVIPPrice: 99000,

  openVIPUpgradeModal() {
    this.setVIPStep(1);
    this.openModal("vipUpgradeModal");
  },

  setVIPStep(stepNum) {
    this.currentVIPStep = stepNum;

    // Cập nhật trạng thái các nút tiến trình Step 1 -> 2 -> 3
    document.querySelectorAll(".vip-step-pill").forEach(pill => {
      const s = parseInt(pill.dataset.step);
      if (s === stepNum) {
        pill.classList.add("active");
        pill.classList.remove("completed");
      } else if (s < stepNum) {
        pill.classList.remove("active");
        pill.classList.add("completed");
      } else {
        pill.classList.remove("active");
        pill.classList.remove("completed");
      }
    });

    // Chuyển đổi hiển thị các panel Step
    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById(`vipStep${i}Panel`);
      if (panel) {
        panel.style.display = (i === stepNum) ? "block" : "none";
      }
    }

    // Khi chuyển sang Bước 3: Gửi tin nhắn Zalo Bot thông báo giao dịch mới
    if (stepNum === 3) {
      this.sendZaloTransactionNotification();
    }
  },

  sendZaloTransactionNotification() {
    const currentUser = (typeof AuthManager !== "undefined" && AuthManager.getCurrentUser()) || {};
    const userPhone = currentUser.phone || "0902030185";
    const userName = currentUser.name || "Khách hàng";
    const planName = this.selectedVIPPlan === 'yearly' ? 'Gói 1 Năm (899.000đ)' : 'Gói 1 Tháng (99.000đ)';
    const amountVal = this.selectedVIPPrice || 99000;
    const amountStr = amountVal.toLocaleString("vi-VN") + "đ";
    const transferCode = `${userPhone} - VIP Nhomdinhduong.vn`;
    const zaloMsgText = "bạn có giao dịch mới trên bot zalo";

    // 1. Hiển thị khung thông báo Zalo Bot trong Step 3 Panel
    const botBox = document.getElementById("zaloBotNotificationBox");
    if (botBox) {
      botBox.style.display = "block";
      botBox.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #0284c7; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-robot" style="font-size: 1.25rem; color: #0068ff;"></i> Zalo Bot Notification API
          </span>
          <span style="font-size: 0.75rem; color: #0284c7; background: #bae6fd; padding: 2px 8px; border-radius: 10px; font-weight: 700;">Vừa kết nối</span>
        </div>
        <div style="color: #0c4a6e; font-size: 1.05rem; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <i class="fa-solid fa-bell" style="color: #0068ff;"></i> ${zaloMsgText}
        </div>
        <div style="font-size: 0.88rem; color: #0369a1; background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px dashed #7dd3fc; line-height: 1.5;">
          <div>📱 <strong>Tài khoản:</strong> ${userName} (${userPhone})</div>
          <div>💎 <strong>Gói đăng ký:</strong> ${planName}</div>
          <div>💰 <strong>Số tiền:</strong> ${amountStr}</div>
          <div>📝 <strong>Nội dung:</strong> ${transferCode}</div>
        </div>
      `;
    }

    // 2. Cập nhật Deep Link Zalo Bot để mở Zalo có sẵn tin nhắn chuẩn bị gửi
    const zaloPhone = (window.SEED_CMS_CONFIG && window.SEED_CMS_CONFIG.zaloBotPhone) || "0902030185";
    const fullMessage = `${zaloMsgText}\n- SĐT: ${userPhone}\n- Gói: ${planName}\n- Số tiền: ${amountStr}\n- Nội dung: ${transferCode}`;
    const deepLinkUrl = `https://zalo.me/${zaloPhone}?text=${encodeURIComponent(fullMessage)}`;

    const deepLinkBtn = document.getElementById("zaloBotDeepLinkBtn");
    if (deepLinkBtn) {
      deepLinkBtn.href = deepLinkUrl;
    }

    // 3. Gửi qua relay server-side (Zalo Bot API không hỗ trợ CORS nên
    // trình duyệt không thể gọi thẳng — xem cloudflare-worker/README.md)
    this.sendZaloBotNotification(fullMessage);

    // 4. Hiển thị Toast Popup thông báo giao dịch mới
    this.showToastNotification(`📲 Zalo Bot: ${zaloMsgText}`, "info");
  },

  showToastNotification(message, type = "info") {
    if (typeof document === "undefined") return;

    let toastContainer = document.getElementById("globalToastContainer");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "globalToastContainer";
      toastContainer.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `toast-popup toast-${type}`;
    toast.style.cssText = "pointer-events: auto; background: #0f172a; color: #ffffff; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 12px; border-left: 4px solid #0068ff; animation: slideInRight 0.3s ease;";

    toast.innerHTML = `
      <i class="fa-solid fa-comment-dots" style="color: #0068ff; font-size: 1.25rem;"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => {
        if (toast && typeof toast.remove === "function") {
          toast.remove();
        } else if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4500);
  },

  selectVIPPlan(planType, price) {
    this.selectedVIPPlan = planType;
    this.selectedVIPPrice = price;

    const currentUser = AuthManager.getCurrentUser();
    const phone = currentUser ? currentUser.phone : "09xxxxxx";

    // Ảnh QR tương ứng cho từng gói
    const qrImageEl = document.getElementById("vipQRImage");
    if (qrImageEl) {
      qrImageEl.src = planType === 'yearly' ? 'images/qr_999k.jpg' : 'images/qr_99k.jpg';
    }

    // Tên gói & Giá
    const planTitleEl = document.getElementById("vipSelectedPlanTitle");
    if (planTitleEl) {
      planTitleEl.innerText = planType === 'yearly' ? 'Gói VIP Năm (999.000đ)' : 'Gói Tháng VIP (99.000đ)';
    }

    const priceEl = document.getElementById("vipSelectedPriceText");
    if (priceEl) {
      priceEl.innerText = planType === 'yearly' ? '999.000đ' : '99.000đ';
    }

    const contentEl = document.getElementById("vipTransferContent");
    if (contentEl) {
      contentEl.innerText = `${phone} - VIP Nhomdinhduong.vn`;
    }

    // Chuyển sang Bước 2 ngay khi chọn gói
    this.setVIPStep(2);
  },

  toggleVIPPayMethod(method) {
    const qrBox = document.getElementById("vipPayMethodQR");
    const manualBox = document.getElementById("vipPayMethodManual");
    const btnQR = document.getElementById("btnPayMethodQR");
    const btnManual = document.getElementById("btnPayMethodManual");

    if (method === 'qr') {
      if (qrBox) qrBox.style.display = "block";
      if (manualBox) manualBox.style.display = "none";
      if (btnQR) btnQR.classList.add("active");
      if (btnManual) btnManual.classList.remove("active");
    } else {
      if (qrBox) qrBox.style.display = "none";
      if (manualBox) manualBox.style.display = "block";
      if (btnQR) btnQR.classList.remove("active");
      if (btnManual) btnManual.classList.add("active");
    }
  },

  // Gửi thông báo đến Zalo qua relay server-side (Cloudflare Worker).
  // Zalo Bot API không trả CORS header nên trình duyệt không thể gọi thẳng;
  // relay giữ bot token thật và forward tin nhắn hộ. Xem cloudflare-worker/README.md.
  async sendZaloBotNotification(messageText) {
    const relayUrl = window.SEED_CMS_CONFIG && window.SEED_CMS_CONFIG.zaloRelayUrl;
    const relaySecret = window.SEED_CMS_CONFIG && window.SEED_CMS_CONFIG.zaloRelaySecret;

    if (!relayUrl || relayUrl.indexOf("<subdomain>") !== -1) {
      console.warn("🤖 Zalo relay chưa được cấu hình (zaloRelayUrl trong js/data.js). Xem cloudflare-worker/README.md.");
      return false;
    }

    try {
      const res = await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Relay-Secret": relaySecret || ""
        },
        body: JSON.stringify({ text: messageText })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        console.warn("🤖 Zalo relay báo lỗi:", data);
        return false;
      }
      console.log("🤖 Zalo Bot notification sent via relay");
      return true;
    } catch (error) {
      console.warn("🤖 Zalo relay fetch error:", error.message);
      return false;
    }
  },

  confirmVIPPaymentSent() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("Vui lòng đăng nhập tài khoản trước khi kích hoạt gói VIP!", "error");
      this.openModal("loginModal");
      return;
    }
    
    AuthManager.upgradeUserVIP(this.selectedVIPPlan || "monthly");

    // Gửi thông báo ngầm về Zalo Bot HTTP API
    const msg = `🔔 [GIAO DỊCH MỚI] Thành viên ${currentUser.name} (${currentUser.phone}) vừa xác nhận chuyển khoản gói VIP (${this.selectedVIPPlan || 'monthly'}) trên bot zalo!`;
    this.sendZaloBotNotification(msg);

    this.setupAuthUI();
    this.renderClubs();
    this.closeAllModals();
    this.showToast("🎉 Kích hoạt gói VIP thành công! Đang mở Zalo để gửi bill xác nhận...");

    // Tự động mở Zalo với tin nhắn mẫu sẵn sàng gửi bill
    const zaloText = encodeURIComponent(`Xin chào Admin! Tôi là ${currentUser.name} (${currentUser.phone}), tôi vừa thực hiện chuyển khoản kích hoạt gói VIP (${this.selectedVIPPlan || 'monthly'}). Tôi gửi kèm ảnh bill chuyển khoản để xác nhận!`);
    setTimeout(() => {
      window.open(`https://zalo.me/0902030185?text=${zaloText}`, '_blank');
    }, 600);
  },

  copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.showToast(`📋 Đã copy: ${text}`);
    } else {
      this.showToast(`Số TK Vietcombank: ${text}`);
    }
  },

  // Khởi tạo danh mục Tỉnh / TP & Xã / Phường / Đặc khu (Mô hình 2 Cấp)
  setupLocationDropdowns() {
    const provinces = typeof LocationManager !== "undefined" ? LocationManager.getProvinces() : (typeof VIETNAM_LOCATIONS !== "undefined" ? VIETNAM_LOCATIONS.map(l => ({ provinceName: l.province })) : []);
    
    // 1. Dropdown Tỉnh trong thanh tìm kiếm
    const searchProvince = document.getElementById("searchProvince");
    if (searchProvince) {
      searchProvince.innerHTML = `<option value="all">Tất cả Tỉnh / TP (34 Đơn vị)</option>` +
        provinces.map(p => `<option value="${p.provinceName}">${p.provinceName}</option>`).join('');
    }

    // 2. Dropdown Tỉnh trong Form Đăng Nhóm
    const clubProvince = document.getElementById("clubProvince");
    if (clubProvince) {
      clubProvince.innerHTML = `<option value="">-- Chọn Tỉnh / Thành phố --</option>` +
        provinces.map(p => `<option value="${p.provinceName}">${p.provinceName}</option>`).join('');
    }

    // 3. Dropdown Tỉnh trong Form Admin Sửa Nhóm
    const editClubProvince = document.getElementById("editClubProvince");
    if (editClubProvince) {
      editClubProvince.innerHTML = `<option value="">-- Chọn Tỉnh / Thành phố --</option>` +
        provinces.map(p => `<option value="${p.provinceName}">${p.provinceName}</option>`).join('');
    }
  },

  onSearchProvinceChange() {
    const provinceVal = document.getElementById("searchProvince").value;
    const searchWard = document.getElementById("searchDistrict") || document.getElementById("searchWard");
    this.selectedProvince = provinceVal;
    this.selectedDistrict = 'all';
    this.selectedWard = 'all';

    if (!searchWard) return;

    if (provinceVal === 'all') {
      searchWard.innerHTML = `<option value="all">Tất cả Xã / Phường / Đặc khu</option>`;
    } else {
      const wards = typeof LocationManager !== "undefined" ? LocationManager.getWards(provinceVal) : [];
      if (wards.length > 0) {
        searchWard.innerHTML = `<option value="all">Tất cả Xã / Phường / Đặc khu (${provinceVal})</option>` +
          wards.map(w => `<option value="${w.wardName}">${w.wardName}</option>`).join('');
      } else {
        searchWard.innerHTML = `<option value="all">Tất cả Xã / Phường / Đặc khu</option>`;
      }
    }
    this.updateFilterSummary();
    this.renderClubs();
    this.syncMapWithFilters();
  },

  onSearchDistrictChange() {
    const selectEl = document.getElementById("searchDistrict") || document.getElementById("searchWard");
    const wardVal = selectEl ? selectEl.value : "all";
    this.selectedDistrict = wardVal;
    this.selectedWard = wardVal;
    this.updateFilterSummary();
    this.renderClubs();
    this.syncMapWithFilters();
  },

  onClubProvinceChange() {
    const provinceVal = document.getElementById("clubProvince") ? document.getElementById("clubProvince").value : "";
    const clubDistrict = document.getElementById("clubDistrict");
    if (!clubDistrict) return;

    if (!provinceVal) {
      clubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;
      return;
    }

    const wards = typeof LocationManager !== "undefined" ? LocationManager.getWards(provinceVal) : [];
    if (wards.length > 0) {
      clubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường (${wards.length}) --</option>` +
        wards.map(w => `<option value="${w.wardName}">${w.wardName}</option>`).join('');
    } else {
      clubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;
    }
  },

  onEditClubProvinceChange() {
    const provinceVal = document.getElementById("editClubProvince") ? document.getElementById("editClubProvince").value : "";
    const editClubDistrict = document.getElementById("editClubDistrict") || document.getElementById("editClubWard");
    if (!editClubDistrict) return;

    if (!provinceVal) {
      editClubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;
      return;
    }

    const wards = typeof LocationManager !== "undefined" ? LocationManager.getWards(provinceVal) : [];
    if (wards.length > 0) {
      editClubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường (${wards.length}) --</option>` +
        wards.map(w => `<option value="${w.wardName}">${w.wardName}</option>`).join('');
    } else {
      editClubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;
    }
  },

  onSearchSortChange(val) {
    this.selectedSortBy = val;
    this.renderClubs();
  },

  onOpeningTimeChange(val) {
    this.selectedOpeningTime = val;
    this.updateFilterSummary();
    this.renderClubs();
    this.syncMapWithFilters();
  },

  toggleFeatureFilter(featureName, el) {
    if (this.selectedFeatures.includes(featureName)) {
      this.selectedFeatures = this.selectedFeatures.filter(f => f !== featureName);
      el.classList.remove("active");
    } else {
      this.selectedFeatures.push(featureName);
      el.classList.add("active");
    }
    this.updateFilterSummary();
    this.renderClubs();
    this.syncMapWithFilters();
  },

  // Toggle bảng bộ lọc nâng cao
  toggleAdvancedFilters() {
    const panel = document.getElementById("advancedFiltersPanel");
    const btn = document.getElementById("toggleAdvancedBtn");
    if (panel) {
      const isHidden = window.getComputedStyle(panel).display === "none";
      panel.style.display = isHidden ? "flex" : "none";
      if (btn) btn.classList.toggle("active", isHidden);
    }
  },

  // Xử lý ô tìm kiếm thông minh & Gợi ý tức thì
  onSmartSearchInput(val) {
    this.searchKeyword = val;
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) clearBtn.style.display = val.trim().length > 0 ? "block" : "none";

    const popup = document.getElementById("smartSuggestionsPopup");
    if (!popup) return;

    if (!val || val.trim().length === 0) {
      popup.classList.remove("show");
      this.renderClubs();
      this.syncMapWithFilters();
      this.updateFilterSummary();
      return;
    }

    const suggestions = ClubManager.getSuggestions(val);
    const hasAny = suggestions.clubs.length > 0 || suggestions.coaches.length > 0 || suggestions.locations.length > 0;

    if (!hasAny) {
      popup.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">Không tìm thấy gợi ý phù hợp cho "<strong>${escapeHtml(val)}</strong>"</div>`;
    } else {
      let html = '';

      // Nhóm câu lạc bộ gợi ý
      if (suggestions.clubs.length > 0) {
        html += `<div class="suggestion-group-title"><i class="fa-solid fa-leaf" style="color: var(--primary);"></i> Nhóm Dinh Dưỡng</div>`;
        html += suggestions.clubs.slice(0, 4).map(c => `
          <div class="suggestion-item" onclick="ClubManager.showClubDetailModal('${escapeJsAttr(c.id)}')">
            <img src="${sanitizeUrl(c.image, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80')}" class="suggestion-thumb" alt="${escapeHtml(c.title)}" onerror="this.src='https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'">
            <div class="suggestion-info">
              <div class="suggestion-title">${escapeHtml(c.title)}</div>
              <div class="suggestion-sub"><i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${escapeHtml(c.sub)}</div>
            </div>
            <span class="suggestion-tag ${c.type.includes('chuyên sâu') ? 'badge-deep' : 'badge-sport'}">${c.type.includes('chuyên sâu') ? 'Chuyên sâu' : 'Vận động'}</span>
          </div>
        `).join('');
      }

      // Huấn luyện viên gợi ý
      if (suggestions.coaches.length > 0) {
        html += `<div class="suggestion-group-title"><i class="fa-solid fa-user-doctor" style="color: var(--primary);"></i> Huấn Luyện Viên / Chủ Nhóm</div>`;
        html += suggestions.coaches.slice(0, 3).map(coach => `
          <div class="suggestion-item" onclick="App.applyQuickSearch('${escapeJsAttr(coach.title)}')">
            <img src="${sanitizeUrl(coach.image, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Host')}" class="suggestion-thumb" style="border-radius: 50%;" alt="${escapeHtml(coach.title)}">
            <div class="suggestion-info">
              <div class="suggestion-title">${escapeHtml(coach.title)}</div>
              <div class="suggestion-sub">${escapeHtml(coach.sub)}</div>
            </div>
          </div>
        `).join('');
      }

      // Khu vực gợi ý
      if (suggestions.locations.length > 0) {
        html += `<div class="suggestion-group-title">📍 Khu Vực / Địa Điểm</div>`;
        html += suggestions.locations.slice(0, 3).map(loc => `
          <div class="suggestion-item" onclick="App.selectLocationSuggestion('${escapeJsAttr(loc.province)}', '${escapeJsAttr(loc.ward || loc.district || '')}')">
            <div style="font-size: 1.2rem;">📍</div>
            <div class="suggestion-info">
              <div class="suggestion-title">${escapeHtml(loc.title)}</div>
              <div class="suggestion-sub">${escapeHtml(loc.type)}</div>
            </div>
          </div>
        `).join('');
      }

      popup.innerHTML = html;
    }

    popup.classList.add("show");
    this.renderClubs();
    this.syncMapWithFilters();
    this.updateFilterSummary();
  },

  onSmartSearchFocus() {
    const val = this.searchKeyword;
    if (val && val.trim().length > 0) {
      const popup = document.getElementById("smartSuggestionsPopup");
      if (popup) popup.classList.add("show");
    }
  },

  setupSearchSuggestionDismissal() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-input-box") && !e.target.closest("#smartSuggestionsPopup")) {
        const popup = document.getElementById("smartSuggestionsPopup");
        if (popup) popup.classList.remove("show");
      }
    });
  },

  clearSearchInput() {
    const input = document.getElementById("smartSearchInput");
    if (input) input.value = '';
    this.onSmartSearchInput('');
  },

  selectLocationSuggestion(province, ward) {
    const popup = document.getElementById("smartSuggestionsPopup");
    if (popup) popup.classList.remove("show");

    const provSelect = document.getElementById("searchProvince");
    if (provSelect) {
      provSelect.value = province;
      this.onSearchProvinceChange();
      if (ward) {
        setTimeout(() => {
          const wardSelect = document.getElementById("searchDistrict") || document.getElementById("searchWard");
          if (wardSelect) {
            wardSelect.value = ward;
            this.onSearchDistrictChange();
          }
        }, 50);
      }
    }
  },

  // Lọc nhanh theo Thành Phố Lớn
  filterByProvince(provinceName) {
    const provSelect = document.getElementById("searchProvince");
    if (provSelect) {
      provSelect.value = provinceName;
      this.onSearchProvinceChange();
      this.showToast(`📍 Đang hiển thị các nhóm dinh dưỡng tại ${provinceName}`);
    }
  },

  // Tìm vị trí gần tôi bằng Geolocation API
  findNearMe() {
    if (navigator.geolocation) {
      this.showToast("🔍 Đang xác định vị trí của bạn...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userCoord = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.selectedSortBy = "distance";
          const sortSelect = document.getElementById("searchSortBy");
          if (sortSelect) sortSelect.value = "distance";

          this.showToast(`📍 Đã định vị thành công! Đang sắp xếp nhóm gần bạn nhất.`);
          this.renderClubs();
          this.syncMapWithFilters();
        },
        (error) => {
          // Mock location nếu không cấp quyền (Hà Nội Cầu Giấy)
          this.userCoord = { lat: 21.0313, lng: 105.7892 };
          this.selectedSortBy = "distance";
          const sortSelect = document.getElementById("searchSortBy");
          if (sortSelect) sortSelect.value = "distance";

          this.showToast(`📍 Sử dụng định vị mô phỏng khu vực trung tâm để gợi ý nhóm gần bạn!`);
          this.renderClubs();
          this.syncMapWithFilters();
        }
      );
    } else {
      this.showToast("Trình duyệt không hỗ trợ Geolocation.", "warning");
    }
  },

  triggerSearch() {
    const popup = document.getElementById("smartSuggestionsPopup");
    if (popup) popup.classList.remove("show");
    this.renderClubs();
    this.syncMapWithFilters();
    this.showToast(`🔍 Đã cập nhật kết quả tìm kiếm!`);
  },

  applyQuickSearch(keyword) {
    const input = document.getElementById("smartSearchInput");
    if (input) {
      input.value = keyword;
      this.onSmartSearchInput(keyword);
    }
  },

  resetAllFilters() {
    this.selectedType = 'all';
    this.selectedProvince = 'all';
    this.selectedDistrict = 'all';
    this.selectedWard = 'all';
    this.selectedFeatures = [];
    this.selectedOpeningTime = 'all';
    this.selectedSortBy = 'rating';
    this.searchKeyword = '';
    this.userCoord = null;

    // Reset Form Elements
    const input = document.getElementById("smartSearchInput");
    if (input) input.value = '';
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) clearBtn.style.display = 'none';

    if (document.getElementById("searchProvince")) document.getElementById("searchProvince").value = 'all';
    if (document.getElementById("searchDistrict")) document.getElementById("searchDistrict").innerHTML = `<option value="all">📍 Tất cả Xã / Phường</option>`;
    if (document.getElementById("searchWard")) document.getElementById("searchWard").innerHTML = `<option value="all">🏘️ Tất cả Xã / Phường</option>`;
    if (document.getElementById("searchSortBy")) document.getElementById("searchSortBy").value = 'rating';
    if (document.getElementById("searchOpeningTime")) document.getElementById("searchOpeningTime").value = 'all';

    document.querySelectorAll(".type-pill-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === 'all');
    });

    document.querySelectorAll(".feature-check-chip").forEach(chip => {
      chip.classList.remove("active");
    });

    const popup = document.getElementById("smartSuggestionsPopup");
    if (popup) popup.classList.remove("show");

    this.updateFilterSummary();
    this.renderClubs();
    this.syncMapWithFilters();
    this.showToast("✨ Đã đặt lại tất cả bộ lọc về mặc định.");
  },

  updateFilterSummary() {
    const summaryEl = document.getElementById("filterSummaryText");
    if (!summaryEl) return;

    let parts = [];
    if (this.selectedType !== 'all') parts.push(this.selectedType);
    if (this.selectedProvince !== 'all') parts.push(this.selectedProvince);
    if (this.selectedDistrict !== 'all') parts.push(this.selectedDistrict);
    if (this.selectedWard !== 'all') parts.push(this.selectedWard);
    if (this.searchKeyword) parts.push(`"${this.searchKeyword}"`);
    if (this.selectedFeatures.length > 0) parts.push(`Tiện ích: ${this.selectedFeatures.join(', ')}`);

    summaryEl.innerText = parts.length > 0 ? parts.join(' • ') : 'Tất cả các nhóm toàn quốc';
  },

  onClubProvinceChange() {
    const provVal = document.getElementById("clubProvince").value;
    const clubDistrict = document.getElementById("clubDistrict");

    if (!clubDistrict) return;
    clubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;

    if (provVal) {
      const provData = VIETNAM_LOCATIONS.find(p => p.province === provVal);
      const wardList = provData ? (provData.wards || provData.districts || []) : [];
      if (wardList.length > 0) {
        clubDistrict.innerHTML += wardList.map(w => {
          const name = typeof w === 'string' ? w : (w.name || w);
          return `<option value="${name}">${name}</option>`;
        }).join('');
      }
    }
  },

  // Tương tự onClubProvinceChange nhưng dùng cho Form Admin Sửa Nhóm
  onEditClubProvinceChange(selectedWard = "") {
    const provVal = document.getElementById("editClubProvince").value;
    const editClubWard = document.getElementById("editClubWard");

    if (!editClubWard) return;
    editClubWard.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;

    if (provVal) {
      const provData = VIETNAM_LOCATIONS.find(p => p.province === provVal);
      const wardList = provData ? (provData.wards || provData.districts || []) : [];
      if (wardList.length > 0) {
        editClubWard.innerHTML += wardList.map(w => {
          const name = typeof w === 'string' ? w : (w.name || w);
          return `<option value="${name}">${name}</option>`;
        }).join('');
      }
    }

    if (selectedWard) editClubWard.value = selectedWard;
  },

  // Setup tìm kiếm và chọn Đồng vận hành (Co-operators)
  setupCoOpSearch() {
    const input = document.getElementById("coOpSearchInput");
    const list = document.getElementById("coOpAutocompleteList");

    if (!input || !list) return;

    input.addEventListener("input", (e) => {
      const q = e.target.value;
      if (!q || q.trim().length < 1) {
        list.classList.remove("show");
        return;
      }

      const excludeIds = this.selectedCoOperators.map(c => c.id);
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser) excludeIds.push(currentUser.id);

      const matches = AuthManager.searchUsers(q, excludeIds);
      if (matches.length === 0) {
        list.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.88rem; text-align: center;">Không tìm thấy thành viên phù hợp</div>`;
      } else {
        // Chỉ nhúng id (do hệ thống sinh ra, an toàn) vào onclick — tra cứu tên/SĐT bên trong hàm
        // thay vì nhúng thẳng dữ liệu người dùng nhập vào attribute để tránh XSS phá khung onclick
        list.innerHTML = matches.map(u => `
          <div class="co-op-item" onclick="App.addCoOperator('${escapeJsAttr(u.id)}')">
            <img src="${sanitizeUrl(u.avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=User')}" class="co-op-item-avatar" alt="${escapeHtml(u.name)}">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(u.name)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(u.phone)} • ${escapeHtml(u.role)}</div>
            </div>
          </div>
        `).join('');
      }
      list.classList.add("show");
    });

    // Ẩn dropdown khi click ra ngoài
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".co-op-selector-wrap")) {
        list.classList.remove("show");
      }
    });
  },

  addCoOperator(id) {
    if (this.selectedCoOperators.some(c => c.id === id)) return;
    const user = AuthManager.getUsers().find(u => u.id === id);
    if (!user) return;
    this.selectedCoOperators.push({ id: user.id, name: user.name, phone: user.phone });

    // Clear input & dropdown
    const input = document.getElementById("coOpSearchInput");
    const list = document.getElementById("coOpAutocompleteList");
    if (input) input.value = '';
    if (list) list.classList.remove("show");

    this.renderCoOpChips();
  },

  removeCoOperator(id) {
    this.selectedCoOperators = this.selectedCoOperators.filter(c => c.id !== id);
    this.renderCoOpChips();
  },

  renderCoOpChips() {
    const chipsWrapper = document.getElementById("coOpChipsList");
    if (!chipsWrapper) return;

    chipsWrapper.innerHTML = this.selectedCoOperators.map(co => `
      <span class="co-op-chip">
        <span>${escapeHtml(co.name)}</span>
        <span class="co-op-chip-remove" onclick="App.removeCoOperator('${escapeJsAttr(co.id)}')">&times;</span>
      </span>
    `).join('');
  },

  // Setup tìm kiếm và chọn Đồng vận hành (Co-operators) cho Form Admin Sửa Nhóm
  setupEditCoOpSearch() {
    const input = document.getElementById("editCoOpSearchInput");
    const list = document.getElementById("editCoOpAutocompleteList");

    if (!input || !list) return;

    input.addEventListener("input", (e) => {
      const q = e.target.value;
      if (!q || q.trim().length < 1) {
        list.classList.remove("show");
        return;
      }

      const excludeIds = this.selectedEditCoOperators.map(c => c.id);
      const matches = AuthManager.searchUsers(q, excludeIds);
      if (matches.length === 0) {
        list.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 0.88rem; text-align: center;">Không tìm thấy thành viên phù hợp</div>`;
      } else {
        // Chỉ nhúng id (do hệ thống sinh ra, an toàn) vào onclick — tra cứu tên/SĐT bên trong hàm
        // thay vì nhúng thẳng dữ liệu người dùng nhập vào attribute để tránh XSS phá khung onclick
        list.innerHTML = matches.map(u => `
          <div class="co-op-item" onclick="App.addEditCoOperator('${escapeJsAttr(u.id)}')">
            <img src="${sanitizeUrl(u.avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=User')}" class="co-op-item-avatar" alt="${escapeHtml(u.name)}">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">${escapeHtml(u.name)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(u.phone)} • ${escapeHtml(u.role)}</div>
            </div>
          </div>
        `).join('');
      }
      list.classList.add("show");
    });

    // Ẩn dropdown khi click ra ngoài
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#editCoOpSelectorWrap")) {
        list.classList.remove("show");
      }
    });
  },

  addEditCoOperator(id) {
    if (this.selectedEditCoOperators.some(c => c.id === id)) return;
    const user = AuthManager.getUsers().find(u => u.id === id);
    if (!user) return;
    this.selectedEditCoOperators.push({ id: user.id, name: user.name, phone: user.phone });

    const input = document.getElementById("editCoOpSearchInput");
    const list = document.getElementById("editCoOpAutocompleteList");
    if (input) input.value = '';
    if (list) list.classList.remove("show");

    this.renderEditCoOpChips();
  },

  removeEditCoOperator(id) {
    this.selectedEditCoOperators = this.selectedEditCoOperators.filter(c => c.id !== id);
    this.renderEditCoOpChips();
  },

  renderEditCoOpChips() {
    const chipsWrapper = document.getElementById("editCoOpChipsList");
    if (!chipsWrapper) return;

    chipsWrapper.innerHTML = this.selectedEditCoOperators.map(co => `
      <span class="co-op-chip">
        <span>${escapeHtml(co.name)}</span>
        <span class="co-op-chip-remove" onclick="App.removeEditCoOperator('${escapeJsAttr(co.id)}')">&times;</span>
      </span>
    `).join('');
  },



  // Chọn loại hình nhóm
  setTypeFilter(type) {
    this.selectedType = type;
    document.querySelectorAll(".type-pill-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
    this.renderClubs();
    this.syncMapWithFilters();
  },

  onSearchKeywordChange(val) {
    this.searchKeyword = val;
    this.renderClubs();
    this.syncMapWithFilters();
  },

  // Render danh sách nhóm
  renderClubs() {
    const clubsContainer = document.getElementById("clubsGridContainer");
    const countBadge = document.getElementById("totalClubsCount");
    
    let filteredClubs = ClubManager.filterClubs({
      type: this.selectedType,
      province: this.selectedProvince,
      district: this.selectedDistrict,
      ward: this.selectedWard,
      features: this.selectedFeatures,
      openingTime: this.selectedOpeningTime,
      sortBy: this.selectedSortBy,
      userCoord: this.userCoord,
      keyword: this.searchKeyword
    });

    if ((!filteredClubs || filteredClubs.length === 0) && (this.selectedType === 'all' && this.selectedProvince === 'all' && (!this.searchKeyword || !this.searchKeyword.trim()))) {
      filteredClubs = ClubManager.getClubs();
    }

    if (countBadge) countBadge.innerText = `(${filteredClubs.length} Nhóm Dinh Dưỡng)`;
    if (clubsContainer) {
      clubsContainer.innerHTML = ClubManager.renderClubCards(filteredClubs);
    }
  },

  currentEventCategory: "all",

  filterEventsCategory(cat, btn) {
    this.currentEventCategory = cat;
    if (btn) {
      document.querySelectorAll("[data-event-cat]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
    this.renderEvents();
  },

  // Render danh sách sự kiện
  renderEvents() {
    const eventsContainer = document.getElementById("eventsGridContainer");
    const homeEventsContainer = document.getElementById("eventsHomeGridContainer");
    let events = EventManager.getEvents();

    if (this.currentEventCategory && this.currentEventCategory !== "all") {
      const cat = this.currentEventCategory.toLowerCase();
      events = events.filter(e => {
        const text = (e.title + " " + (e.description || "")).toLowerCase();
        if (cat === "inbody") return text.includes("inbody") || text.includes("đo") || text.includes("quét") || text.includes("chỉ số");
        if (cat === "workout") return text.includes("chạy") || text.includes("cardio") || text.includes("hiit") || text.includes("vận động") || text.includes("tập");
        if (cat === "workshop") return text.includes("workshop") || text.includes("trà") || text.includes("chế biến") || text.includes("dinh dưỡng");
        if (cat === "challenge") return text.includes("thử thách") || text.includes("21 ngày") || text.includes("vóc dáng") || text.includes("thách");
        return true;
      });
    }

    const html = EventManager.renderEventCards(events);
    if (eventsContainer) eventsContainer.innerHTML = html;
    if (homeEventsContainer) homeEventsContainer.innerHTML = html;
  },

  // Render danh sách sản phẩm Shop Công Cụ
  renderProducts() {
    const container = document.getElementById("productsGridContainer");
    const homeContainer = document.getElementById("productsHomeGridContainer");

    const filteredProducts = ShopManager.filterProducts({
      category: this.selectedShopCategory,
      keyword: this.shopSearchKeyword,
      sort: this.shopPriceSort
    });

    const html = ShopManager.renderProductCards(filteredProducts);
    if (container) container.innerHTML = html;
    if (homeContainer) homeContainer.innerHTML = html;
  },

  setShopCategory(cat) {
    this.selectedShopCategory = cat;
    document.querySelectorAll(".shop-cat-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.cat === cat);
    });
    this.renderProducts();
  },

  onShopSearchInput(val) {
    this.shopSearchKeyword = val;
    this.renderProducts();
  },

  onShopSortChange(val) {
    this.shopPriceSort = val;
    this.renderProducts();
  },

  openCreateProductModal() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để đăng bán công cụ!", "warning");
      this.openModal("loginModal");
      return;
    }
    this.openModal("createProductModal");
  },

  // Gợi ý tên sản phẩm từ slug link Shopee (chỉ điền khi ô Tên đang trống, người dùng vẫn sửa được tự do)
  onShopeeLinkInput(url) {
    const form = document.querySelector("#createProductModal form");
    if (!form) return;
    const titleInput = form.prodTitle;
    if (!titleInput || titleInput.value.trim()) return;

    const match = (url || "").match(/\/([a-z0-9-]+)-i\.\d+\.\d+/i);
    if (!match) return;

    const suggested = match[1]
      .split("-")
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (suggested) titleInput.value = suggested;
  },

  submitCreateProduct(e) {
    e.preventDefault();
    const form = e.target;
    const title = form.prodTitle.value.trim();
    const category = form.prodCategory.value;
    const price = form.prodPrice.value;
    const condition = form.prodCondition.value;
    const province = form.prodProvince.value;
    const image = form.prodImage.value.trim();
    const description = form.prodDescription.value.trim();
    const shopeeLink = form.prodShopeeLink.value.trim();

    if (!title || !price || !description) {
      this.showToast("Vui lòng điền đầy đủ thông tin sản phẩm!", "error");
      return;
    }

    const res = ShopManager.createProduct({
      title,
      category,
      price,
      condition,
      province,
      image,
      description,
      shopeeLink
    });

    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.renderProducts();
      this.showToast(`🎉 Công cụ "${res.product.title}" đã được đăng bán thành công!`);
    } else {
      this.showToast(res.message, "error");
    }
  },

  // ===================================================================
  // E-LEARNING COURSES & VIDEO PLAYER METHODS
  // ===================================================================
  renderCourseCategoriesBar() {
    const bar = document.querySelector("#coursesTab .course-category-bar");
    if (!bar) return;

    const categories = CourseManager.getCategories();
    let html = `
      <button type="button" class="course-cat-pill ${this.selectedCourseCategory === 'all' ? 'active' : ''}" data-course-cat="all" onclick="App.filterCourses('all', this)">
        <span class="cat-icon-box"><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i></span>
        <span>Tất Cả Chủ Đề</span>
      </button>
    `;

    categories.forEach(c => {
      html += `
        <button type="button" class="course-cat-pill ${this.selectedCourseCategory === c.id ? 'active' : ''}" data-course-cat="${c.id}" onclick="App.filterCourses('${c.id}', this)">
          <span class="cat-icon-box" style="font-size: 1.1rem;">${c.icon || '📚'}</span>
          <span>${c.name}</span>
        </button>
      `;
    });

    bar.innerHTML = html;
  },

  populateCourseCategoryOptions() {
    const categories = CourseManager.getCategories();
    const optionsHtml = categories.map(c => `<option value="${c.id}">${c.icon || '📚'} ${c.name}</option>`).join('');

    const selectIds = ['createCourseCategorySelect', 'editCourseCategory'];
    selectIds.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.innerHTML = optionsHtml;
    });
  },

  renderCourses() {
    this.renderCourseCategoriesBar();
    this.populateCourseCategoryOptions();
    const grid = document.getElementById("coursesGrid");
    const homeGrid = document.getElementById("coursesHomeGrid");
    if (!grid && !homeGrid) return;

    let courses = CourseManager.getCourses();
    if (this.selectedCourseCategory !== "all") {
      courses = courses.filter(c => c.category === this.selectedCourseCategory);
    }

    let html = "";
    if (courses.length === 0) {
      html = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <i class="fa-solid fa-graduation-cap" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 12px;"></i>
          <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 6px;">Chưa có khóa học nào thuộc chủ đề này</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted);">Hãy là người đầu tiên đăng video bài giảng bổ ích cho cộng đồng!</p>
          <button type="button" class="btn btn-primary" onclick="App.openCreateCourseModal()" style="margin-top: 12px;">
            <i class="fa-solid fa-plus"></i> Đăng Bài Giảng Đầu Tiên
          </button>
        </div>
      `;
    } else {
      html = courses.map(c => {
        const safeTitle = escapeHtml(c.title || '');
        const safeDescription = escapeHtml(c.description || '');
        const safeInstructor = escapeHtml(c.instructor || '');
        const safeDuration = escapeHtml(c.duration || '');
        const safeCategoryLabel = escapeHtml(c.categoryLabel || '');
        const safeThumbnail = sanitizeUrl(c.thumbnail, 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80');
        const safeId = escapeJsAttr(c.id);
        return `
        <div class="course-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: var(--shadow-sm);">
          <div style="position: relative; cursor: pointer;" onclick="App.openCourseVideoModal('${safeId}')">
            <img src="${safeThumbnail}" alt="${safeTitle}" style="width: 100%; height: 180px; object-fit: cover;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0.9; transition: opacity 0.2s;">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
                <i class="fa-solid fa-play" style="margin-left: 3px;"></i>
              </div>
            </div>
            <span style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.75); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
              <i class="fa-solid fa-clock" style="margin-right: 3px;"></i> ${safeDuration}
            </span>
            <span style="position: absolute; top: 10px; left: 10px; background: var(--primary); color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700;">
              ${safeCategoryLabel}
            </span>
          </div>

          <div style="padding: 16px; flex-grow: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main); line-height: 1.4; margin-bottom: 8px; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" onclick="App.openCourseVideoModal('${safeId}')">
              ${safeTitle}
            </h3>

            <p style="font-size: 0.83rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${safeDescription}
            </p>

            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-user-tie" style="color: var(--primary);"></i>
                <span style="font-weight: 700; color: var(--text-main);">${safeInstructor}</span>
              </div>
              <div>
                <i class="fa-solid fa-eye" style="color: #64748b; margin-right: 2px;"></i> ${escapeHtml(c.views)}
              </div>
            </div>

            <button type="button" class="btn btn-outline" onclick="App.openCourseVideoModal('${safeId}')" style="width: 100%; margin-top: 12px; font-weight: 700; font-size: 0.85rem; border-color: var(--primary); color: var(--primary);">
              <i class="fa-solid fa-circle-play" style="color: #ef4444;"></i> Xem Video Ngay
            </button>
          </div>
        </div>
      `;
      }).join('');
    }

    if (grid) grid.innerHTML = html;
    if (homeGrid) homeGrid.innerHTML = html;
  },

  filterCourses(cat, btn) {
    this.selectedCourseCategory = cat;
    const parent = btn.parentElement;
    if (parent) {
      parent.querySelectorAll(".course-cat-pill, .category-chip").forEach(b => b.classList.remove("active"));
    }
    btn.classList.add("active");
    this.renderCourses();
  },

  openCourseVideoModal(courseId) {
    const courses = CourseManager.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const modalTitle = document.getElementById("courseVideoModalTitle");
    const iframe = document.getElementById("courseYoutubeIframe");
    const details = document.getElementById("courseVideoModalDetails");

    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fa-solid fa-circle-play" style="color: #ef4444;"></i> <span>${escapeHtml(course.title)}</span>`;
    }

    if (iframe) {
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(course.youtubeId || '')}?autoplay=1`;
    }

    if (details) {
      details.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
          <span style="background: var(--primary-light); color: var(--primary); font-weight: 800; font-size: 0.8rem; padding: 4px 12px; border-radius: 20px;">
            <i class="fa-solid fa-bookmark"></i> ${escapeHtml(course.categoryLabel)}
          </span>
          <div style="display: flex; gap: 14px; font-size: 0.85rem; color: var(--text-muted);">
            <span><i class="fa-solid fa-clock" style="color: var(--primary);"></i> ${escapeHtml(course.duration)}</span>
            <span><i class="fa-solid fa-signal" style="color: var(--primary);"></i> ${escapeHtml(course.level)}</span>
            <span><i class="fa-solid fa-eye" style="color: #64748b;"></i> ${escapeHtml(course.views)} Lượt xem</span>
          </div>
        </div>

        <div style="background: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 14px; display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            <i class="fa-solid fa-user-graduate"></i>
          </div>
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(course.instructor)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(course.instructorRole)}</div>
          </div>
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 6px;">Nội Dung Bài Giảng:</h4>
        <p style="font-size: 0.88rem; color: var(--text-main); line-height: 1.6; margin: 0;">${escapeHtml(course.description)}</p>
      `;
    }

    this.openModal("courseVideoModal");
  },

  closeCourseVideoModal() {
    const iframe = document.getElementById("courseYoutubeIframe");
    if (iframe) iframe.src = "";
    this.closeAllModals();
  },

  openCreateCourseModal() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để đăng bài giảng khóa học!", "warning");
      this.openModal("loginModal");
      return;
    }
    this.populateCourseCategoryOptions();
    this.openModal("createCourseModal");
  },

  submitCreateCourse(event) {
    event.preventDefault();
    const form = event.target;
    const title = form.courseTitle.value.trim();
    const category = form.courseCategory.value;
    const level = form.courseLevel.value;
    const youtubeUrl = form.courseYoutubeUrl.value.trim();
    const instructor = form.courseInstructor.value.trim() || AuthManager.getCurrentUser().name;
    const duration = form.courseDuration.value.trim() || "30 phút";
    const thumbnail = form.courseThumbnail.value.trim();
    const description = form.courseDescription.value.trim();

    if (!title || !youtubeUrl || !description) {
      this.showToast("Vui lòng nhập đầy đủ tiêu đề, link video YouTube và mô tả!", "error");
      return;
    }

    const res = CourseManager.addCourse({ title, category, level, youtubeUrl, instructor, duration, thumbnail, description });
    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.renderCourses();
      this.showToast(`🎉 Khóa học "${res.course.title}" đã được đăng tải thành công!`);
    } else {
      this.showToast("Không thể đăng khóa học, vui lòng thử lại!", "error");
    }
  },

  // ===================================================================
  // DAILY HEALTH & INBODY METRICS TRACKER METHODS (9 CHỈ SỐ INBODY)
  // ===================================================================
  renderTrackerDashboard() {
    const container = document.getElementById("trackerDashboardContent");
    if (!container) return;

    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <i class="fa-solid fa-notes-medical" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 16px;"></i>
          <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">Theo Dõi Chỉ Số Sức Khỏe InBody Hàng Ngày</h2>
          <p style="font-size: 0.92rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 20px; line-height: 1.6;">
            Vui lòng đăng nhập để lưu nhật ký theo dõi 9 chỉ số cơ thể: Cân nặng, Mỡ cơ thể, Lượng nước, Khối lượng cơ, BMI, Tuổi sinh học, Mỡ nội tạng & Vóc dáng.
          </p>
          <button type="button" class="btn btn-primary" onclick="App.openModal('loginModal')" style="font-weight: 700;">
            <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Để Sử Dụng
          </button>
        </div>
      `;
      return;
    }

    const logs = MetricsManager.getUserLogs(currentUser.phone);
    const latest = logs[0] || {};
    const oldest = logs[logs.length - 1] || {};

    const weightDiff = (latest.weight - oldest.weight).toFixed(1);
    const fatDiff = (latest.bodyFat - oldest.bodyFat).toFixed(1);
    const muscleDiff = (latest.muscle - oldest.muscle).toFixed(1);

    const bmiRating = MetricsManager.getBMIRating(latest.bmi || 22);
    const visceralRating = MetricsManager.getVisceralFatRating(latest.visceralFat || 4);
    const physiqueText = MetricsManager.getPhysiqueLabel(latest.physiqueRating || 5);

    container.innerHTML = `
      <!-- Header Bar -->
      <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-chart-line" style="color: #10b981;"></i> Bảng Theo Dõi 9 Chỉ Số Sức Khỏe InBody
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">
            Thành viên: <strong>${escapeHtml(currentUser.name)}</strong> (${escapeHtml(currentUser.phone)}) • Cập nhật gần nhất: <strong>${escapeHtml(latest.date || 'Hôm nay')}</strong>
          </p>
        </div>
        <button type="button" class="btn btn-primary" onclick="App.openAddMetricsModal()" style="font-weight: 700; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none;">
          <i class="fa-solid fa-notes-medical"></i> Nhập Chỉ Số InBody Hôm Nay
        </button>
      </div>

      <!-- 9 KEY METRICS KPI CARDS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        
        <!-- 1. Cân Nặng -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-weight-scale" style="color: var(--primary); margin-right: 4px;"></i> Cân Nặng (Weight)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: ${weightDiff <= 0 ? 'rgba(5,150,105,0.15)' : 'rgba(225,29,72,0.15)'}; color: ${weightDiff <= 0 ? 'var(--primary)' : '#e11d48'};">
              ${weightDiff <= 0 ? weightDiff + ' kg' : '+' + weightDiff + ' kg'}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.weight || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">kg</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Ban đầu: ${oldest.weight || '--'} kg</div>
        </div>

        <!-- 2. Tỷ Lệ Mỡ Cơ Thể -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-percent" style="color: var(--secondary); margin-right: 4px;"></i> Tỷ Lệ Mỡ (% Body Fat)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: ${fatDiff <= 0 ? 'rgba(5,150,105,0.15)' : 'rgba(225,29,72,0.15)'}; color: ${fatDiff <= 0 ? 'var(--primary)' : '#e11d48'};">
              ${fatDiff <= 0 ? fatDiff + '%' : '+' + fatDiff + '%'}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.bodyFat || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">%</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Ban đầu: ${oldest.bodyFat || '--'}%</div>
        </div>

        <!-- 3. Khối Lượng Cơ -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-dumbbell" style="color: var(--primary); margin-right: 4px;"></i> Khối Lượng Cơ (Muscle)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: ${muscleDiff >= 0 ? 'rgba(5,150,105,0.15)' : 'rgba(225,29,72,0.15)'}; color: ${muscleDiff >= 0 ? 'var(--primary)' : '#e11d48'};">
              ${muscleDiff >= 0 ? '+' + muscleDiff + ' kg' : muscleDiff + ' kg'}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.muscle || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">kg</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Ban đầu: ${oldest.muscle || '--'} kg</div>
        </div>

        <!-- 4. Lượng Nước Trong Cơ Thể -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-sport); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-droplet" style="color: var(--accent-sport); margin-right: 4px;"></i> Lượng Nước (% Water)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(13,148,136,0.15); color: var(--accent-sport);">
              Tối Ưu
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.water || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">%</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Tiêu chuẩn: > 55%</div>
        </div>

        <!-- 5. Chỉ Số BMI -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-calculator" style="color: var(--secondary); margin-right: 4px;"></i> Chỉ Số BMI</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(217,119,6,0.15); color: var(--secondary);">
              ${bmiRating.status}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.bmi || '--'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Chuẩn Châu Á: 18.5 - 22.9</div>
        </div>

        <!-- 6. Mỡ Nội Tạng -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-deep); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-heart-circle-check" style="color: var(--accent-deep); margin-right: 4px;"></i> Mỡ Nội Tạng (Visceral)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(180,83,9,0.15); color: var(--accent-deep);">
              ${visceralRating.status}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">Cấp ${latest.visceralFat || '--'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Ban đầu: Cấp ${oldest.visceralFat || '--'}</div>
        </div>

        <!-- 7. Tỷ Lệ Trao Đổi Chất BMR -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-bolt" style="color: var(--secondary); margin-right: 4px;"></i> Trao Đổi Chất (BMR)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(217,119,6,0.15); color: var(--secondary);">
              Năng lượng nền
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.bmr || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">kcal</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Lượng calo đốt tối thiểu/ngày</div>
        </div>

        <!-- 8. Tuổi Sinh Học -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-sport); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-dna" style="color: var(--accent-sport); margin-right: 4px;"></i> Tuổi Sinh Học</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(13,148,136,0.15); color: var(--accent-sport);">
              ${oldest.metabolicAge ? (oldest.metabolicAge - latest.metabolicAge > 0 ? 'Trẻ hơn ' + (oldest.metabolicAge - latest.metabolicAge) + ' tuổi' : 'Đang trẻ hóa') : 'Trẻ hóa'}
            </span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main);">${latest.metabolicAge || '--'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">tuổi</span></div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Ban đầu: ${oldest.metabolicAge || '--'} tuổi</div>
        </div>

        <!-- 9. Đánh Giá Vóc Dáng -->
        <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); box-shadow: var(--shadow-sm); grid-column: span 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.83rem; font-weight: 700; color: var(--text-muted);"><i class="fa-solid fa-person-rays" style="color: var(--primary); margin-right: 4px;"></i> Đánh Giá Vóc Dáng (Physique Rating 1-9)</span>
            <span style="font-size: 0.75rem; font-weight: 800; padding: 2px 10px; border-radius: 12px; background: rgba(5,150,105,0.15); color: var(--primary);">
              Mức ${latest.physiqueRating || 5}/9
            </span>
          </div>
          <div style="font-size: 1.2rem; font-weight: 800; color: var(--primary);">${physiqueText}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Phân tích tỷ lệ cơ bắp & mỡ thừa trên toàn bộ cơ thể</div>
        </div>

      </div>

      <!-- VISUAL PROGRESS TREND CHART SECTION -->
      <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <h4 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-chart-line" style="color: var(--primary);"></i> Biểu Đồ Tiến Trình Giảm Mỡ & Tăng Cơ (Các Lần Đo Gần Nhất)
        </h4>

        <!-- SVG Line Chart Visualizer -->
        <div style="width: 100%; overflow-x: auto;">
          ${this.generateMetricsSVGChart(logs)}
        </div>
      </div>

      <!-- HISTORY LOG TABLE SECTION -->
      <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-clock-rotate-left" style="color: var(--primary);"></i> Lịch Sử Nhật Ký Đo Chỉ Số InBody
          </h4>
          <button type="button" class="btn btn-outline" onclick="App.openAddMetricsModal()" style="font-weight: 700; font-size: 0.85rem;">
            <i class="fa-solid fa-plus"></i> Thêm Bản Ghi Mới
          </button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ngày Đo</th>
                <th>Cân Nặng</th>
                <th>% Mỡ</th>
                <th>Cơ (kg)</th>
                <th>Nước (%)</th>
                <th>BMI</th>
                <th>Mỡ N.Tạng</th>
                <th>BMR / Tuổi SH</th>
                <th>Vóc Dáng</th>
                <th>Ghi Chú</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="font-weight: 800; color: var(--primary);">${l.date}</td>
                  <td><strong>${l.weight}</strong> kg</td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${l.bodyFat}%</span></td>
                  <td><span style="color: #10b981; font-weight: 700;">${l.muscle} kg</span></td>
                  <td>${l.water}%</td>
                  <td>${l.bmi}</td>
                  <td>Cấp ${l.visceralFat}</td>
                  <td>${l.bmr} kcal / ${l.metabolicAge}t</td>
                  <td style="font-size: 0.82rem; font-weight: 700;">${MetricsManager.getPhysiqueLabel(l.physiqueRating)}</td>
                  <td style="font-size: 0.82rem; color: var(--text-muted); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(l.notes || '')}">${escapeHtml(l.notes || '-')}</td>
                  <td>
                    <button type="button" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 4px 8px; font-size: 0.78rem;" onclick="App.deleteMetricLog('${escapeJsAttr(l.id)}')">
                      <i class="fa-solid fa-trash-can"></i> Xóa
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  generateMetricsSVGChart(logs) {
    if (!logs || logs.length === 0) return `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có đủ dữ liệu để vẽ biểu đồ.</p>`;

    const chartLogs = [...logs].reverse().slice(-10);
    const width = 800;
    const height = 220;
    const padding = 40;

    const weights = chartLogs.map(l => l.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;

    const getX = (index) => padding + (index * (width - 2 * padding) / Math.max(1, chartLogs.length - 1));
    const getY = (val) => height - padding - ((val - minW) / Math.max(1, maxW - minW)) * (height - 2 * padding);

    const points = chartLogs.map((l, i) => `${getX(i)},${getY(l.weight)}`).join(" ");

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <!-- Horizontal Gridlines -->
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--border-color)" stroke-dasharray="4 4" />
        <line x1="${padding}" y1="${height/2}" x2="${width - padding}" y2="${height/2}" stroke="var(--border-color)" stroke-dasharray="4 4" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-color)" stroke-dasharray="4 4" />

        <!-- Line Chart Trend -->
        <polyline fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />

        <!-- Data Points & Labels -->
        ${chartLogs.map((l, i) => `
          <circle cx="${getX(i)}" cy="${getY(l.weight)}" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" />
          <text x="${getX(i)}" y="${getY(l.weight) - 10}" font-size="11" font-weight="bold" fill="var(--text-main)" text-anchor="middle">${l.weight}kg</text>
          <text x="${getX(i)}" y="${height - 12}" font-size="10" fill="var(--text-muted)" text-anchor="middle">${l.date.split('-').slice(1).join('/')}</text>
        `).join('')}
      </svg>
    `;
  },

  openAddMetricsModal() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để ghi nhận chỉ số sức khỏe!", "warning");
      this.openModal("loginModal");
      return;
    }
    const dateInput = document.getElementById("metricDateInput");
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    this.openModal("addMetricsModal");
  },

  submitAddMetrics(event) {
    event.preventDefault();
    const form = event.target;
    const date = form.metricDate.value;
    const weight = form.metricWeight.value;
    const bodyFat = form.metricBodyFat.value;
    const muscle = form.metricMuscle.value;
    const water = form.metricWater.value;
    const visceralFat = form.metricVisceralFat.value;
    const bmr = form.metricBmr.value;
    const metabolicAge = form.metricMetabolicAge.value;
    const physiqueRating = form.metricPhysiqueRating.value;
    const notes = form.metricNotes.value.trim();

    const res = MetricsManager.addLog({ date, weight, bodyFat, muscle, water, visceralFat, bmr, metabolicAge, physiqueRating, notes });
    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.openUserProfilePage(true);
      const metricsBtn = document.querySelector("button[onclick*='myMetricsSec']");
      if (metricsBtn) this.switchProfileTab(metricsBtn, 'myMetricsSec');
      this.showToast(`🎉 Đã lưu bản ghi chỉ số ngày ${res.log.date} thành công!`);
    } else {
      this.showToast(res.message, "error");
    }
  },

  deleteMetricLog(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi chỉ số này?")) {
      MetricsManager.deleteLog(id);
      this.openUserProfilePage(false);
      const metricsBtn = document.querySelector("button[onclick*='myMetricsSec']");
      if (metricsBtn) this.switchProfileTab(metricsBtn, 'myMetricsSec');
      this.showToast("Đã xóa bản ghi chỉ số.");
    }
  },

  // Chuyển đổi chế độ xem: Thẻ Nhóm (Grid) / Bản Đồ (Map)
  setClubsViewMode(mode) {
    const gridContainer = document.getElementById("clubsGridContainer");
    const mapContainer = document.getElementById("clubsMapViewContainer");
    const gridBtn = document.getElementById("viewGridBtn");
    const mapBtn = document.getElementById("viewMapBtn");

    if (mode === "map") {
      if (gridContainer) gridContainer.style.display = "none";
      if (mapContainer) mapContainer.style.display = "flex";
      if (gridBtn) gridBtn.classList.remove("active");
      if (mapBtn) mapBtn.classList.add("active");
      setTimeout(() => this.initLeafletMap(), 100);
    } else {
      if (gridContainer) gridContainer.style.display = "grid";
      if (mapContainer) mapContainer.style.display = "none";
      if (gridBtn) gridBtn.classList.add("active");
      if (mapBtn) mapBtn.classList.remove("active");
    }
  },

  // Khởi tạo bản đồ Leaflet Map
  initLeafletMap() {
    const mapElement = document.getElementById("leafletMap");
    if (!mapElement) return;

    if (!this.leafletMap) {
      // Tọa độ trung tâm Việt Nam
      this.leafletMap = L.map('leafletMap').setView([16.0544, 108.2022], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.leafletMap);

      this.markersLayer = L.layerGroup().addTo(this.leafletMap);
    }

    setTimeout(() => {
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
      }
    }, 200);

    this.syncMapWithFilters();
  },

  syncMapWithFilters() {
    if (!this.leafletMap || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    const filteredClubs = ClubManager.filterClubs({
      type: this.selectedType,
      province: this.selectedProvince,
      district: this.selectedDistrict,
      ward: this.selectedWard,
      features: this.selectedFeatures,
      openingTime: this.selectedOpeningTime,
      sortBy: this.selectedSortBy,
      userCoord: this.userCoord,
      keyword: this.searchKeyword
    });

    const isVIP = AuthManager.isVIPUser();

    const sidebarList = document.getElementById("mapSidebarList");
    if (sidebarList) {
      sidebarList.innerHTML = filteredClubs.length === 0
        ? `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Không có nhóm nào trong khu vực này</div>`
        : filteredClubs.map(c => {
          const sidebarAddr = isVIP ? `${escapeHtml(c.addressDetail || '')}, ${escapeHtml(c.province)}` : `${escapeHtml(c.ward || '')}, ${escapeHtml(c.province)} (🔒 Ẩn số nhà)`;
          return `
            <div class="map-mini-card" onclick="App.focusMapMarker(${Number(c.lat) || 0}, ${Number(c.lng) || 0}, '${escapeJsAttr(c.id)}')">
              <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">${escapeHtml(c.name)}</div>
              <div style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${escapeHtml(c.type)}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">📍 ${sidebarAddr}</div>
            </div>
          `;
        }).join('');
    }

    const bounds = [];
    filteredClubs.forEach(c => {
      if (c.lat && c.lng) {
        bounds.push([c.lat, c.lng]);

        const isDeep = c.type.includes("chuyên sâu");
        const markerColor = isDeep ? "#d97706" : "#059669";

        // Custom Icon SVG Marker
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="background-color: ${markerColor}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <span style="transform: rotate(45deg); color: #fff; font-size: 14px; font-weight: bold;">🌱</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34]
        });

        const marker = L.marker([c.lat, c.lng], { icon: customIcon });
        
        const popupPhone = escapeHtml(isVIP ? (c.ownerPhone || 'Hotline') : maskPhone(c.ownerPhone || '0902030185'));
        const popupAddr = isVIP ? `${escapeHtml(c.addressDetail || '')}, ${escapeHtml(c.ward || '')}, ${escapeHtml(c.province || '')}` : `${escapeHtml(c.ward || '')}, ${escapeHtml(c.province || '')} (🔒 Ẩn số nhà)`;

        const popupContent = `
          <div style="min-width: 220px; font-family: inherit;">
            <img src="${sanitizeUrl(c.image, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80')}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 4px; color: #0f172a;">${escapeHtml(c.name)}</h4>
            <div style="font-size: 0.78rem; color: ${markerColor}; font-weight: 700; margin-bottom: 4px;">${escapeHtml(c.type)}</div>
            <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 8px;">📍 ${popupAddr}</div>
            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 10px;">Chủ nhóm: ${escapeHtml(c.ownerName)} (${popupPhone})</div>
            <button onclick="ClubManager.showClubDetailModal('${escapeJsAttr(c.id)}')" style="width: 100%; padding: 6px; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.82rem;">Xem Chi Tiết</button>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.markersLayer.addLayer(marker);
      }
    });

    if (bounds.length > 0) {
      this.leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  },

  focusMapMarker(lat, lng, clubId) {
    if (this.leafletMap) {
      this.leafletMap.setView([lat, lng], 15);
      // Mở popup tương ứng
      this.markersLayer.eachLayer(layer => {
        const layerLatLng = layer.getLatLng();
        if (Math.abs(layerLatLng.lat - lat) < 0.0001 && Math.abs(layerLatLng.lng - lng) < 0.0001) {
          layer.openPopup();
        }
      });
    }
  },

  showOnMap(lat, lng, name) {
    this.closeAllModals();
    this.switchTab('mapTab');
    setTimeout(() => {
      this.focusMapMarker(lat, lng);
    }, 300);
  },

  // Modal Control
  openModal(modalId) {
    this.closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("show");
  },

  closeAllModals() {
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) dropdown.classList.remove("show");
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("show"));
  },

  // Mở Form Đăng Nhóm Dinh Dưỡng
  openCreateClubModal() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để đăng nhóm dinh dưỡng!", "warning");
      this.openModal("loginModal");
      return;
    }

    // Tự động gán mặc định tên user và SĐT đăng ký
    const ownerNameInput = document.getElementById("clubOwnerName");
    const ownerPhoneInput = document.getElementById("clubOwnerPhone");
    if (ownerNameInput) ownerNameInput.value = currentUser.name;
    if (ownerPhoneInput) ownerPhoneInput.value = currentUser.phone;

    // Cập nhật lại dropdown Tỉnh / TP & Xã / Phường
    this.setupLocationDropdowns();
    const clubDistrict = document.getElementById("clubDistrict");
    if (clubDistrict) clubDistrict.innerHTML = `<option value="">-- Chọn Xã / Phường --</option>`;

    // Reset danh sách đồng vận hành đã chọn
    this.selectedCoOperators = [];
    this.renderCoOpChips();

    this.openModal("createClubModal");
  },

  // Xử lý nộp Form Đăng Nhóm Dinh Dưỡng Mới
  submitCreateClub(e) {
    if (e) e.preventDefault();

    let currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      const users = AuthManager.getUsers();
      currentUser = (users && users.length > 0) ? users[0] : { id: "user_default", name: "Nguyễn Văn Hùng", phone: "0902030185" };
      try { localStorage.setItem("nutriclub_current_user", JSON.stringify(currentUser)); } catch(err) {}
    }

    const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : document.querySelector('#createClubModal form');
    const getVal = (field) => {
      if (!form) return "";
      const el = form.querySelector(`[name="${field}"]`) || form.elements[field] || document.getElementById(field);
      return el ? el.value.trim() : "";
    };

    const name = getVal("clubName");
    const type = getVal("clubType") || "Nhóm dinh dưỡng chuyên sâu";
    const image = getVal("clubImage") || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80";
    const province = getVal("clubProvince");
    const district = getVal("clubDistrict");
    const addressDetail = getVal("clubAddressDetail");
    const openingHours = getVal("clubOpeningHours");
    const story = getVal("clubStory");

    if (!name) {
      this.showToast("⚠️ Vui lòng nhập Tên nhóm dinh dưỡng!", "warning");
      return;
    }
    if (!province || !district || !addressDetail) {
      this.showToast("⚠️ Vui lòng điền đầy đủ Tỉnh/TP, Xã/Phường và Địa chỉ chi tiết!", "warning");
      return;
    }

    const newClubData = {
      name,
      type,
      image,
      province,
      district,
      ward: district,
      addressDetail,
      openingHours,
      story,
      ownerId: currentUser.id,
      ownerName: currentUser.name || "Chủ nhóm",
      ownerPhone: currentUser.phone || "0902030185",
      coOperators: this.selectedCoOperators || []
    };

    const result = ClubManager.createClub(newClubData);
    if (result && result.success) {
      // Reset bộ lọc về tất cả để hiển thị nhóm mới vừa tạo ngay lập tức
      this.selectedType = 'all';
      this.selectedProvince = 'all';
      this.selectedDistrict = 'all';
      this.selectedWard = 'all';
      this.searchKeyword = '';

      const searchProvEl = document.getElementById("searchProvince");
      if (searchProvEl) searchProvEl.value = 'all';
      const searchDistEl = document.getElementById("searchDistrict") || document.getElementById("searchWard");
      if (searchDistEl) searchDistEl.value = 'all';

      // Đồng bộ trực tiếp lên Firebase Firestore
      ClubManager.syncSingleClubToFirestore(result.club);

      // Gửi thông báo tự động về Zalo Bot
      const zaloMsg = `🏠 [NHÓM MỚI DỰ ÁN] ${currentUser.name} (${currentUser.phone}) vừa đăng Nhóm Dinh Dưỡng mới: "${name}" tại ${district}, ${province}!`;
      this.sendZaloBotNotification(zaloMsg);

      this.closeAllModals();
      this.renderClubs();
      this.syncMapWithFilters();
      this.showToast("🎉 Đăng Nhóm Dinh Dưỡng thành công! Dữ liệu đã được đồng bộ lên Firebase.");
    } else {
      this.showToast(result ? result.message : "Có lỗi xảy ra khi đăng nhóm!", "error");
    }
  },

  // Mở Form Đăng Sự Kiện
  openCreateEventModal() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để đăng sự kiện!", "warning");
      this.openModal("loginModal");
      return;
    }

    // Load danh sách nhóm của user vào select
    const clubs = ClubManager.getClubs().filter(c => c.ownerId === currentUser.id || (c.coOperators && c.coOperators.some(co => co.id === currentUser.id)));
    const allClubs = ClubManager.getClubs();
    const eventClubSelect = document.getElementById("eventClubSelect");

    const clubsToShow = clubs.length > 0 ? clubs : allClubs;

    if (eventClubSelect) {
      eventClubSelect.innerHTML = clubsToShow.map(c => `
        <option value="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}" data-address="${escapeHtml((c.addressDetail || '') + ', ' + (c.ward || '') + ', ' + (c.province || ''))}">
          ${escapeHtml(c.name)} (${escapeHtml(c.type)})
        </option>
      `).join('');
    }

    this.openModal("createEventModal");
  },

  // Submit Tạo Nhóm Mới
  submitCreateClub(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.clubName.value.trim();
    const type = form.clubType.value;
    const province = form.clubProvince.value;
    const district = form.clubDistrict.value;
    const ward = form.clubWard ? form.clubWard.value : district;
    const addressDetail = form.clubAddressDetail.value.trim();
    const openingHours = form.clubOpeningHours.value.trim();
    const story = form.clubStory.value.trim();
    const image = form.clubImage.value.trim();

    if (!name || !province || !district || !addressDetail) {
      App.showToast("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
      return;
    }

    const res = ClubManager.createClub({
      name,
      type,
      province,
      district,
      ward,
      addressDetail,
      openingHours,
      story,
      image,
      coOperators: this.selectedCoOperators
    });

    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.selectedCoOperators = [];
      this.renderCoOpChips();
      this.renderClubs();
      this.showToast(`🎉 Nhóm dinh dưỡng "${res.club.name}" đã được đăng thành công!`);
      this.switchTab('clubsTab');
    } else {
      this.showToast(res.message, "error");
    }
  },

  // Submit Tạo Sự Kiện Mới
  submitCreateEvent(e) {
    e.preventDefault();
    const form = e.target;
    const select = form.eventClubSelect;
    const clubId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    const clubName = selectedOption.dataset.name;
    const title = form.eventTitle.value.trim();
    const date = form.eventDate.value;
    const time = form.eventTime.value.trim();
    const locationType = form.eventLocationType.value;
    const address = form.eventAddress.value.trim() || selectedOption.dataset.address;
    const description = form.eventDescription.value.trim();
    const image = form.eventImage.value.trim();
    const maxParticipants = form.eventMaxParticipants.value;

    if (!title || !date || !time || !description) {
      App.showToast("Vui lòng điền đầy đủ thông tin sự kiện!", "error");
      return;
    }

    const res = EventManager.createEvent({
      clubId,
      clubName,
      title,
      date,
      time,
      locationType,
      address,
      description,
      image,
      maxParticipants
    });

    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.renderEvents();
      this.showToast(`🎉 Sự kiện "${res.event.title}" đã được đăng thành công!`);
      this.switchTab('eventsTab');
    } else {
      this.showToast(res.message, "error");
    }
  },

  // Đăng nhập nhanh tài khoản Admin (1-Click Login)
  fillAdminAccount(phone, pass) {
    const accInput = document.getElementById("loginAccountInput");
    const passInput = document.getElementById("loginPasswordInput");
    if (accInput) accInput.value = phone;
    if (passInput) passInput.value = pass;

    const res = AuthManager.login(phone, pass);
    if (res.success) {
      this._loggedOut = false;
      this.setupAuthUI();
      this.closeAllModals();
      this.showToast(`👑 Đã đăng nhập thành công Quản trị viên ${res.user.name}!`);
      setTimeout(() => this.openAdminDashboardModal(), 200);
    } else {
      const adminUser = AuthManager.forceLoginAdmin();
      this.setupAuthUI();
      this.closeAllModals();
      this.showToast(`👑 Kích hoạt phiên Quản trị viên ${adminUser.name}!`);
      setTimeout(() => this.openAdminDashboardModal(), 200);
    }
  },

  // Submit Đăng nhập
  submitLogin(e) {
    e.preventDefault();
    const phoneOrEmail = e.target.loginAccount.value.trim();
    const password = e.target.loginPassword.value.trim();

    const res = AuthManager.login(phoneOrEmail, password);
    if (res.success) {
      this._loggedOut = false;
      this.setupAuthUI();
      this.closeAllModals();
      this.showToast(`👋 Chào mừng ${res.user.name} đã đăng nhập!`);
    } else {
      this.showToast(res.message, "error");
    }
  },

  // Submit Đăng ký
  submitRegister(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.regName.value.trim();
    const phone = form.regPhone.value.trim();
    const email = form.regEmail.value.trim();
    const password = form.regPassword.value.trim();
    const role = form.regRole ? form.regRole.value : "Thành viên Nhomdinhduong.vn";
    const refCode = (form.regRefCode ? form.regRefCode.value.trim() : "") || sessionStorage.getItem("nutriclub_ref_code") || "";

    if (!name || !phone || !password) {
      this.showToast("Vui lòng điền họ tên, số điện thoại và mật khẩu!", "error");
      return;
    }

    const res = AuthManager.register({ name, phone, email, password, role, refCode });
    if (res.success) {
      this._loggedOut = false;
      this.setupAuthUI();
      this.closeAllModals();
      form.reset();
      this.showToast(`🎉 Chúc mừng ${res.user.name} đã đăng ký tài khoản thành công!${res.rewardMsg || ''}`);
    } else {
      this.showToast(res.message, "error");
    }
  },

  copyReferralLink() {
    const input = document.getElementById("myReferralLinkInput");
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value);
      this.showToast("📋 Đã sao chép link giới thiệu Affiliate của bạn!");
    }
  },

  // Đăng xuất
  logout() {
    this._loggedOut = true; // Đánh dấu đã chủ động đăng xuất để setupAuthUI không tự đăng nhập lại
    AuthManager.logout();
    this.closeAllModals();
    this.setupAuthUI();
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) dropdown.classList.remove("show");
    this.switchTab('clubsTab');
    this.showToast("👋 Bạn đã đăng xuất tài khoản thành công!");
  },

  // Toggle dropdown menu profile
  toggleUserDropdown() {
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) dropdown.classList.toggle("show");
  },

  selectBMIGender(gender) {
    const radio = document.querySelector(`input[name="bmiGender"][value="${gender}"]`);
    if (radio) {
      radio.checked = true;
    }
    document.querySelectorAll('.radio-pill').forEach(pill => {
      const r = pill.querySelector('input[name="bmiGender"]');
      if (r && r.checked) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    this.calculateBMI();
  },

  // Tính BMI & Hiển thị kết quả
  calculateBMI() {
    // Đồng bộ class active cho nút chọn Nam / Nữ
    document.querySelectorAll('input[name="bmiGender"]').forEach(radio => {
      const pill = radio.closest('.radio-pill');
      if (pill) {
        if (radio.checked) {
          pill.classList.add("active");
        } else {
          pill.classList.remove("active");
        }
      }
    });

    const heightCm = parseFloat(document.getElementById("bmiHeight").value) || 165;
    const weightKg = parseFloat(document.getElementById("bmiWeight").value) || 60;
    const age = parseInt(document.getElementById("bmiAge").value) || 28;
    const gender = document.querySelector('input[name="bmiGender"]:checked') ? document.querySelector('input[name="bmiGender"]:checked').value : 'male';

    const result = BMICalculator.calculate({ heightCm, weightKg, gender, age });

    // Cập nhật UI
    const numberEl = document.getElementById("bmiResultNumber");
    const statusEl = document.getElementById("bmiResultStatus");
    const markerEl = document.getElementById("bmiResultMarker");
    const idealWeightEl = document.getElementById("bmiResultIdealWeight");
    const waterEl = document.getElementById("bmiResultWater");
    const bmrEl = document.getElementById("bmiResultBMR");
    const adviceEl = document.getElementById("bmiResultAdvice");
    const recTypeEl = document.getElementById("bmiRecClubType");

    if (numberEl) {
      numberEl.innerText = result.bmi;
      numberEl.style.color = result.color;
    }
    if (statusEl) {
      statusEl.innerText = result.status;
      statusEl.style.color = result.color;
      statusEl.style.backgroundColor = result.badgeBg;
    }
    if (markerEl) {
      markerEl.style.left = `${result.markerPercent}%`;
      markerEl.style.borderColor = result.color;
    }
    if (idealWeightEl) idealWeightEl.innerText = `${result.minIdealWeight} - ${result.maxIdealWeight} kg`;
    if (waterEl) waterEl.innerText = `${result.minWater} lít / ngày`;
    if (bmrEl) bmrEl.innerText = `${result.bmr} kcal`;
    if (adviceEl) adviceEl.innerText = result.advice;
    if (recTypeEl) {
      recTypeEl.innerText = result.recommendedClubType;
      recTypeEl.onclick = () => {
        this.switchTab('clubsTab');
        this.setTypeFilter(result.recommendedClubType);
      };
    }

    // Dynamic Active Highlight for BMI scale cards
    document.querySelectorAll('.bmi-scale-card').forEach(card => card.classList.remove('active-cat'));
    let activeCardId = 'bmiCatNormal';
    if (result.bmi < 18.5) {
      activeCardId = 'bmiCatUnderweight';
    } else if (result.bmi >= 18.5 && result.bmi <= 22.9) {
      activeCardId = 'bmiCatNormal';
    } else if (result.bmi >= 23.0 && result.bmi <= 24.9) {
      activeCardId = 'bmiCatOverweight';
    } else {
      activeCardId = 'bmiCatObese';
    }
    const activeCard = document.getElementById(activeCardId);
    if (activeCard) activeCard.classList.add('active-cat');

    this._lastBMIResult = result;
    this.renderInBodyEstimateSection(result);
  },

  renderInBodyEstimateSection(result) {
    const grid = document.getElementById("inbodyEstimateGrid");
    if (!grid) return;

    const items = [
      { icon: "fa-percent", color: "#f59e0b", label: "Tỷ Lệ Mỡ Cơ Thể", value: `${result.bodyFatPercent}%`, badge: result.bodyFatRating.status, badgeColor: result.bodyFatRating.color },
      { icon: "fa-dumbbell", color: "#10b981", label: "Khối Lượng Cơ", value: `${result.muscleMass} kg`, badge: "Ước tính", badgeColor: "#10b981" },
      { icon: "fa-droplet", color: "#06b6d4", label: "Tỷ Lệ Nước Cơ Thể", value: `${result.waterPercent}%`, badge: "Chuẩn > 55%", badgeColor: "#06b6d4" },
      { icon: "fa-heart-circle-check", color: "#ec4899", label: "Mỡ Nội Tạng", value: `Cấp ${result.visceralFat}`, badge: result.visceralRating.status, badgeColor: result.visceralRating.color },
      { icon: "fa-dna", color: "#6366f1", label: "Tuổi Sinh Học", value: `${result.metabolicAge} tuổi`, badge: result.metabolicAge <= result.age ? "Trẻ hơn tuổi thật" : "Cần cải thiện", badgeColor: result.metabolicAge <= result.age ? "#10b981" : "#f59e0b" },
      { icon: "fa-person-rays", color: "#14b8a6", label: "Đánh Giá Vóc Dáng", value: `Mức ${result.physiqueRating}/9`, badge: result.physiqueLabel, badgeColor: "#14b8a6" }
    ];

    grid.innerHTML = items.map(it => `
      <div style="background: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid ${it.color};">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid ${it.icon}" style="color: ${it.color}; margin-right: 4px;"></i> ${it.label}</div>
        <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${it.value}</div>
        <div style="font-size: 0.75rem; font-weight: 700; color: ${it.badgeColor}; margin-top: 4px;">${it.badge}</div>
      </div>
    `).join('');
  },

  saveBMIResultToTracker() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để lưu chỉ số vào nhật ký!", "warning");
      this.openModal('loginModal');
      return;
    }
    const r = this._lastBMIResult;
    if (!r) return;

    this.openAddMetricsModal();
    const form = document.querySelector("#addMetricsModal form");
    if (!form) return;
    const weightInput = document.getElementById("bmiWeight");
    form.metricWeight.value = weightInput ? weightInput.value : "";
    form.metricBodyFat.value = r.bodyFatPercent;
    form.metricMuscle.value = r.muscleMass;
    form.metricWater.value = r.waterPercent;
    form.metricVisceralFat.value = r.visceralFat;
    form.metricBmr.value = r.bmr;
    form.metricMetabolicAge.value = r.metabolicAge;
    form.metricPhysiqueRating.value = r.physiqueRating;
    form.metricNotes.value = "Ước tính từ Công Cụ Tính Chỉ Số BMI";
  },

  // Open & Render User Profile Page & Modal Dashboard
  openUserProfilePage(doSwitchTab = true) {
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) dropdown.classList.remove("show");

    let currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      const users = AuthManager.getUsers();
      currentUser = (users && users.length > 0) ? users[0] : (typeof SEED_USERS !== 'undefined' ? SEED_USERS[0] : null);
      if (currentUser) {
        localStorage.setItem("nutriclub_current_user", JSON.stringify(currentUser));
        this.setupAuthUI();
      }
    }

    if (!currentUser) {
      this.showToast("⚠️ Vui lòng đăng nhập để xem hồ sơ cá nhân!", "warning");
      this.openModal("loginModal");
      return;
    }

    const allClubs = ClubManager.getClubs();
    const myClubs = allClubs.filter(c => 
      c.ownerPhone === currentUser.phone || 
      c.ownerName === currentUser.name ||
      (c.coOperators && c.coOperators.some(co => co.id === currentUser.id || co.phone === currentUser.phone))
    );

    const allEvents = EventManager.getEvents();
    const myEvents = allEvents.filter(e => e.hostName === currentUser.name || (e.clubName && e.clubName.includes(currentUser.name)));

    const allProducts = ShopManager.getProducts();
    const myProducts = allProducts.filter(p => p.sellerPhone === currentUser.phone || p.sellerName === currentUser.name);

    const isVIP = AuthManager.isVIPUser();
    const pkgName = currentUser.package === "yearly" ? "Gói VIP Năm (999k)" : (currentUser.package === "monthly" ? "Gói VIP Tháng (99k)" : "Tài Khoản Dùng Thử (Miễn phí)");
    const pkgBadgeClass = isVIP ? "user-vip-badge" : "vip-lock-badge";
    const metricsHTML = this.getMetricsSecHTML(currentUser.phone);
    const contentHTML = `
      <div class="dashboard-grid-container">
        <!-- SIDEBAR THÔNG TIN & MENU BÊN TRÁI -->
        <div class="dashboard-sidebar-card">
          <div class="dash-user-mini">
            <div class="dash-user-avatar-wrapper" onclick="App.openChangeAvatarModal()" title="Bấm để thay đổi ảnh đại diện">
              <img src="${sanitizeUrl(currentUser.avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=User')}" alt="${escapeHtml(currentUser.name)}">
              <div class="dash-avatar-badge" title="Đổi ảnh đại diện"><i class="fa-solid fa-camera"></i></div>
            </div>
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-main); line-height: 1.2;">${escapeHtml(currentUser.name)}</div>
              <div style="font-size: 0.78rem; color: var(--primary); font-weight: 700; margin-top: 3px;">${escapeHtml(currentUser.role || 'HLV Dinh Dưỡng')}</div>
              <button type="button" onclick="App.openChangeAvatarModal()" style="border: none; background: transparent; padding: 0; color: var(--primary); font-size: 0.75rem; font-weight: 700; cursor: pointer; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-camera"></i> Đổi ảnh đại diện
              </button>
            </div>
          </div>

          <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 10px;">DANH MỤC QUẢN LÝ</div>

          <!-- Vertical Nav Menu Sidebar -->
          <ul class="dash-nav-list">
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn active" onclick="App.switchProfileTab(this, 'myClubsSec')">
                <span><i class="fa-solid fa-leaf" style="color: var(--primary); width: 22px;"></i> Nhóm Của Tôi</span>
                <span class="badge-pill">${myClubs.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'myMetricsSec')">
                <span><i class="fa-solid fa-notes-medical" style="color: var(--primary); width: 22px;"></i> Chỉ Số InBody</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'myEventsSec')">
                <span><i class="fa-solid fa-calendar-star" style="color: var(--secondary); width: 22px;"></i> Sự Kiện Của Tôi</span>
                <span class="badge-pill">${myEvents.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'myProductsSec')">
                <span><i class="fa-solid fa-store" style="color: var(--accent-sport); width: 22px;"></i> Shop Công Cụ</span>
                <span class="badge-pill">${myProducts.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'myAffiliateSec')">
                <span><i class="fa-solid fa-gift" style="color: var(--secondary); width: 22px;"></i> Affiliates & Thưởng</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'myVIPSec')">
                <span><i class="fa-solid fa-crown" style="color: var(--secondary); width: 22px;"></i> Gói VIP & Quyền Lợi</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'editProfileSec')">
                <span><i class="fa-solid fa-gear" style="color: var(--text-muted); width: 22px;"></i> Cài Đặt Hồ Sơ</span>
              </button>
            </li>
          </ul>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
            ${!isVIP ? `
              <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openVIPUpgradeModal();" style="width: 100%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; font-weight: 700; font-size: 0.88rem;">
                <i class="fa-solid fa-crown"></i> 🚀 Nâng Cấp VIP (99k)
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline" onclick="App.logout()" style="width: 100%; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); font-weight: 700; font-size: 0.85rem;">
              <i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất
            </button>
          </div>
        </div>

        <!-- KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH BÊN PHẢI -->
        <div class="dashboard-main-content">
          <!-- BẢNG THỐNG KÊ NHANH (KPI STATS) -->
          <div class="profile-stats-grid">
            <div class="profile-stat-card" style="border-left: 4px solid var(--primary);">
              <div class="stat-num" style="color: var(--primary);">${myClubs.length}</div>
              <div class="stat-label"><i class="fa-solid fa-leaf" style="color: var(--primary); margin-right: 4px;"></i> Nhóm Quản Lý</div>
            </div>
            <div class="profile-stat-card" style="border-left: 4px solid var(--secondary);">
              <div class="stat-num" style="color: var(--secondary);">${myEvents.length}</div>
              <div class="stat-label"><i class="fa-solid fa-calendar-star" style="color: var(--secondary); margin-right: 4px;"></i> Sự Kiện Đã Đăng</div>
            </div>
            <div class="profile-stat-card" style="border-left: 4px solid var(--accent-sport);">
              <div class="stat-num" style="color: var(--accent-sport);">${myProducts.length}</div>
              <div class="stat-label"><i class="fa-solid fa-store" style="color: var(--accent-sport); margin-right: 4px;"></i> Thiết Bị Đăng Bán</div>
            </div>
            <div class="profile-stat-card" style="border-left: 4px solid var(--secondary);">
              <div class="stat-num" style="color: var(--secondary);">${currentUser.vipDays || 0} Ngày</div>
              <div class="stat-label"><i class="fa-solid fa-gift" style="color: var(--secondary); margin-right: 4px;"></i> VIP Thưởng</div>
            </div>
          </div>

      <!-- TAB 1: NHÓM DINH DƯỠNG CỦA TÔI -->
      <div id="myClubsSec" class="profile-tab-sec" style="display: block;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0;"><i class="fa-solid fa-leaf" style="color: var(--primary); margin-right: 6px;"></i> Danh Sách Nhóm Dinh Dưỡng Bạn Đang Quản Lý</h4>
          <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateClubModal();" style="padding: 6px 14px; font-size: 0.88rem; font-weight: 700;">
            <i class="fa-solid fa-plus"></i> Đăng Nhóm Mới
          </button>
        </div>

        ${myClubs.length === 0 ? `
          <div style="text-align: center; padding: 30px; background: var(--bg-main); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
            <i class="fa-solid fa-house-medical" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 10px;"></i>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 14px;">Bạn chưa tạo hoặc đồng vận hành nhóm dinh dưỡng nào.</p>
            <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateClubModal();">
              <i class="fa-solid fa-plus" style="margin-right: 4px;"></i> Tạo Nhóm Dinh Dưỡng Đầu Tiên
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${myClubs.map(c => `
              <div class="profile-item-row" style="display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <img src="${sanitizeUrl(c.image, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80')}" class="profile-item-thumb" alt="${escapeHtml(c.name)}" style="width: 56px; height: 56px; border-radius: 8px; object-fit: cover;">
                <div style="flex-grow: 1;">
                  <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">${escapeHtml(c.name)}</div>
                  <div style="font-size: 0.83rem; color: var(--text-muted); margin-top: 2px;">
                    <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${escapeHtml(c.addressDetail || '')}, ${escapeHtml(c.ward || '')}, ${escapeHtml(c.province || '')} • <i class="fa-solid fa-phone" style="color: var(--primary);"></i> ${escapeHtml(c.ownerPhone)}
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 700;" onclick="App.closeAllModals(); ClubManager.showClubDetailModal('${escapeJsAttr(c.id)}');">
                    <i class="fa-solid fa-eye"></i> Xem
                  </button>
                  <button type="button" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 6px 12px; font-size: 0.82rem; font-weight: 700;" onclick="App.deleteMyClub('${escapeJsAttr(c.id)}')">
                    <i class="fa-solid fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- TAB 2: SỰ KIỆN CỘNG ĐỒNG CỦA TÔI -->
      <div id="myEventsSec" class="profile-tab-sec" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0;"><i class="fa-solid fa-calendar-star" style="color: #f59e0b; margin-right: 6px;"></i> Các Sự Kiện Sức Khỏe Bạn Đã Tổ Chức</h4>
          <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateEventModal();" style="padding: 6px 14px; font-size: 0.88rem; font-weight: 700; background: #f59e0b; border-color: #f59e0b;">
            <i class="fa-solid fa-plus"></i> Đăng Sự Kiện Mới
          </button>
        </div>

        ${myEvents.length === 0 ? `
          <div style="text-align: center; padding: 30px; background: var(--bg-main); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 10px;"></i>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 14px;">Bạn chưa tạo sự kiện vận động / workshop dinh dưỡng nào.</p>
            <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateEventModal();">
              <i class="fa-solid fa-plus" style="margin-right: 4px;"></i> Đăng Sự Kiện Ngay
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${myEvents.map(e => `
              <div class="profile-item-row" style="display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <img src="${sanitizeUrl(e.image, 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80')}" class="profile-item-thumb" alt="${escapeHtml(e.title)}" style="width: 56px; height: 56px; border-radius: 8px; object-fit: cover;">
                <div style="flex-grow: 1;">
                  <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">${escapeHtml(e.title)}</div>
                  <div style="font-size: 0.83rem; color: var(--text-muted); margin-top: 2px;">
                    <i class="fa-solid fa-calendar-day" style="color: #f59e0b;"></i> ${escapeHtml(e.date)} (${escapeHtml(e.time)}) • <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${escapeHtml(e.address || '')}
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 6px 12px; font-size: 0.82rem; font-weight: 700;" onclick="App.deleteMyEvent('${escapeJsAttr(e.id)}')">
                    <i class="fa-solid fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- TAB 3: SẢN PHẨM SHOP CỦA TÔI -->
      <div id="myProductsSec" class="profile-tab-sec" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h4 style="font-size: 1.05rem; font-weight: 800; margin: 0;"><i class="fa-solid fa-store" style="color: var(--accent-sport); margin-right: 6px;"></i> Công Cụ & Thiết Bị Bạn Đang Đăng Bán</h4>
          <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateProductModal();" style="padding: 6px 14px; font-size: 0.88rem; font-weight: 700;">
            <i class="fa-solid fa-plus"></i> Đăng Bán Công Cụ
          </button>
        </div>

        ${myProducts.length === 0 ? `
          <div style="text-align: center; padding: 30px; background: var(--bg-main); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
            <i class="fa-solid fa-store-slash" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 10px;"></i>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 14px;">Bạn chưa đăng bán máy quét InBody hay thiết bị mở nhóm nào.</p>
            <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openCreateProductModal();">
              <i class="fa-solid fa-plus" style="margin-right: 4px;"></i> Đăng Bán Công Cụ Mới
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${myProducts.map(p => `
              <div class="profile-item-row" style="display: flex; align-items: center; gap: 14px; background: var(--bg-main); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <img src="${sanitizeUrl(p.image, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80')}" class="profile-item-thumb" alt="${escapeHtml(p.title)}" style="width: 56px; height: 56px; border-radius: 8px; object-fit: cover;">
                <div style="flex-grow: 1;">
                  <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">${escapeHtml(p.title)}</div>
                  <div style="font-size: 0.85rem; color: var(--primary); font-weight: 800; margin-top: 2px;">
                    ${ShopManager.formatCurrency(p.price)} • Tình trạng: ${escapeHtml(p.condition)}
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 6px 12px; font-size: 0.82rem; font-weight: 700;" onclick="App.deleteMyProduct('${escapeJsAttr(p.id)}')">
                    <i class="fa-solid fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- TAB 4: CHƯƠNG TRÌNH AFFILIATES -->
      <div id="myAffiliateSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; font-weight: 800; color: #d97706; margin-bottom: 8px;">
            <i class="fa-solid fa-gift" style="color: #ec4899; margin-right: 6px;"></i> Chương Trình Chia Sẻ Link Giới Thiệu Nhận VIP Miễn Phí
          </h4>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.7;">
            • Chia sẻ link cá nhân để mời bạn bè đăng ký ➡️ <strong>Bạn bè đăng ký Thưởng ngay +1 Ngày VIP Miễn Phí</strong>.<br>
            • Khi người được giới thiệu nâng cấp Gói VIP 1 Tháng ➡️ <strong>Thưởng ngay +1 Tuần VIP (7 Ngày VIP)</strong>.<br>
            • Khi người được giới thiệu nâng cấp Gói VIP 1 Năm ➡️ <strong>Thưởng ngay +3 Tháng VIP (90 Ngày VIP)</strong>.
          </p>

          <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <input type="text" id="myReferralLinkInput" class="form-control" value="${window.location.origin}/?ref=${currentUser.phone}" readonly style="font-weight: 700; color: var(--primary); flex-grow: 1;">
            <button type="button" class="btn btn-primary" onclick="App.copyReferralLink()" style="white-space: nowrap; font-weight: 700;">
              <i class="fa-solid fa-copy"></i> Sao Chép Link Giới Thiệu
            </button>
          </div>

          <div class="profile-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
            <div class="profile-stat-card" style="border-left: 3px solid #10b981; background: var(--bg-card); padding: 12px;">
              <div class="stat-num" style="color: #10b981; font-weight: 800; font-size: 1.3rem;">${(currentUser.referralLogs || []).length}</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);"><i class="fa-solid fa-users" style="color: #10b981; margin-right: 4px;"></i> Đã Giới Thiệu</div>
            </div>
            <div class="profile-stat-card" style="border-left: 3px solid #f59e0b; background: var(--bg-card); padding: 12px;">
              <div class="stat-num" style="color: #f59e0b; font-weight: 800; font-size: 1.3rem;">${currentUser.vipDays || 0}</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);"><i class="fa-solid fa-gift" style="color: #f59e0b; margin-right: 4px;"></i> Tổng Ngày VIP Thưởng</div>
            </div>
            <div class="profile-stat-card" style="border-left: 3px solid #8b5cf6; background: var(--bg-card); padding: 12px;">
              <div class="stat-num" style="color: #8b5cf6; font-weight: 800; font-size: 1.3rem;">${(currentUser.referralLogs || []).filter(l => l.type === 'monthly_package' || l.type === 'yearly_package').length}</div>
              <div class="stat-label" style="font-size: 0.82rem; color: var(--text-muted);"><i class="fa-solid fa-crown" style="color: #8b5cf6; margin-right: 4px;"></i> Nâng Cấp VIP</div>
            </div>
          </div>

          <h5 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 12px;"><i class="fa-solid fa-list-check" style="color: var(--primary); margin-right: 6px;"></i> Lịch Sử Nhận Thưởng:</h5>
          ${(!currentUser.referralLogs || currentUser.referralLogs.length === 0) ? `
            <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 16px;">Bạn chưa có lượt giới thiệu nào. Hãy copy link trên và chia sẻ cho đồng nghiệp nhé!</p>
          ` : `
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Ngày Nhận</th>
                    <th>Thành Viên Đăng Ký</th>
                    <th>SĐT Che</th>
                    <th>Phần Thưởng</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentUser.referralLogs.map(l => `
                    <tr>
                      <td>${escapeHtml(l.date)}</td>
                      <td style="font-weight: 700;">${escapeHtml(l.refereeName)}</td>
                      <td>${escapeHtml(l.refereePhone)}</td>
                      <td><span class="user-vip-badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid #f59e0b;">${escapeHtml(l.reward)}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- TAB 5: QUẢN LÝ GÓI VIP -->
      <div id="myVIPSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; font-weight: 800; color: #b45309; margin-bottom: 12px;">
            <i class="fa-solid fa-shield-halved" style="color: #f59e0b; margin-right: 6px;"></i> Thông Tin Gói VIP & Quyền Lợi Tài Khoản
          </h4>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 0.83rem; color: var(--text-muted);">Trạng thái gói:</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: ${isVIP ? '#10b981' : '#f59e0b'}; margin-top: 4px;">
                ${isVIP ? '<i class="fa-solid fa-star" style="color: #f59e0b;"></i> Đã Kích Hoạt VIP' : '<i class="fa-solid fa-lock" style="color: #f59e0b;"></i> Dùng Thử Miễn Phí'}
              </div>
            </div>
            <div style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 0.83rem; color: var(--text-muted);">Tên gói hiện tại:</div>
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary); margin-top: 4px;">
                ${pkgName}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h5 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 10px;"><i class="fa-solid fa-wand-magic-sparkles" style="color: #f59e0b; margin-right: 6px;"></i> Quyền Lợi Đã Mở Khóa:</h5>
            <ul style="list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; font-size: 0.9rem;">
              <li><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Xem Số điện thoại đầy đủ tất cả Chủ nhóm</li>
              <li><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Xem Số nhà & Tên đường chi tiết</li>
              <li><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Bản đồ Leaflet vị trí & chỉ đường</li>
              <li><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Đăng bài viết Sự kiện sức khỏe không giới hạn</li>
            </ul>
          </div>

          ${!isVIP ? `
            <button type="button" class="btn btn-primary" onclick="App.closeAllModals(); App.openVIPUpgradeModal();" style="width: 100%; padding: 12px; font-size: 1rem; font-weight: 800; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none;">
              <i class="fa-solid fa-rocket" style="margin-right: 6px;"></i> Nâng Cấp VIP Ngay Chỉ 99.000đ / Tháng
            </button>
          ` : `
            <button type="button" class="btn btn-outline" onclick="App.closeAllModals(); App.openVIPUpgradeModal();" style="width: 100%; padding: 12px; font-size: 0.95rem; font-weight: 700;">
              <i class="fa-solid fa-arrows-rotate" style="margin-right: 6px;"></i> Gia Hạn Hoặc Đổi Gói VIP Khác
            </button>
          `}
        </div>
      </div>

      <!-- TAB 6: CÀI ĐẶT HỒ SƠ & MẬT KHẨU -->
      <div id="editProfileSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-main); padding: 22px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 20px;">
          <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 18px; color: var(--primary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-user-gear" style="color: var(--primary);"></i> Cập Nhật Thông Tin Cá Nhân
          </h4>
          <form onsubmit="App.submitUpdateProfile(event)">
            <div class="form-group-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 14px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-user" style="color: var(--primary); margin-right: 4px;"></i> Họ và tên *</label>
                <input type="text" name="updName" class="form-control" value="${escapeHtml(currentUser.name)}" required>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-phone" style="color: var(--primary); margin-right: 4px;"></i> Số điện thoại (Tài khoản cố định)</label>
                <input type="text" class="form-control" value="${escapeHtml(currentUser.phone)}" disabled readonly style="background: var(--bg-card); opacity: 0.8;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-envelope" style="color: var(--secondary); margin-right: 4px;"></i> Email liên hệ</label>
              <input type="email" name="updEmail" class="form-control" value="${escapeHtml(currentUser.email || '')}" placeholder="Nhập email của bạn">
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-image" style="color: var(--accent-sport); margin-right: 4px;"></i> Ảnh Đại Diện (Avatar)</label>
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                <img id="editProfileAvatarThumb" src="${sanitizeUrl(currentUser.avatar, '')}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); box-shadow: 0 3px 10px rgba(5, 150, 105, 0.2);">
                <div style="flex-grow: 1;">
                  <input type="url" name="updAvatar" id="updAvatarInput" class="form-control" value="${escapeHtml(currentUser.avatar || '')}" placeholder="https://example.com/avatar.jpg" oninput="document.getElementById('editProfileAvatarThumb').src=this.value">
                  <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn btn-sm btn-outline" onclick="App.openChangeAvatarModal()" style="font-weight: 700; font-size: 0.78rem;">
                      <i class="fa-solid fa-camera" style="color: var(--primary);"></i> Tải Ảnh Mới Hoặc Chọn Mẫu...
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-comment-dots" style="color: var(--secondary); margin-right: 4px;"></i> Giới thiệu bản thân / Nhóm dinh dưỡng</label>
              <textarea name="updBio" class="form-control" rows="3" placeholder="Chia sẻ câu chuyện và kinh nghiệm vận hành nhóm dinh dưỡng của bạn...">${escapeHtml(currentUser.bio || '')}</textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="font-weight: 800; padding: 10px 20px;">
              <i class="fa-solid fa-floppy-disk" style="margin-right: 6px;"></i> Lưu Thay Đổi Hồ Sơ
            </button>
          </form>
        </div>

        <!-- ĐỔI MẬT KHẨU -->
        <div style="background: var(--bg-main); padding: 22px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 18px; color: var(--secondary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-lock" style="color: var(--secondary);"></i> Đổi Mật Khẩu Đăng Nhập
          </h4>
          <form onsubmit="App.submitChangePassword(event)">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-key" style="color: var(--secondary); margin-right: 4px;"></i> Mật khẩu hiện tại *</label>
              <input type="password" name="oldPassword" class="form-control" placeholder="Nhập mật khẩu cũ" required>
            </div>
            <div class="form-group-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 18px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-shield-halved" style="color: var(--primary); margin-right: 4px;"></i> Mật khẩu mới *</label>
                <input type="password" name="newPassword" class="form-control" placeholder="Nhập mật khẩu mới" required>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;"><i class="fa-solid fa-check-double" style="color: var(--primary); margin-right: 4px;"></i> Xác nhận mật khẩu mới *</label>
                <input type="password" name="confirmPassword" class="form-control" placeholder="Nhập lại mật khẩu mới" required>
              </div>
            </div>

            <button type="submit" class="btn btn-outline" style="border-color: var(--secondary); color: var(--secondary); font-weight: 800; padding: 10px 20px;">
              <i class="fa-solid fa-key" style="margin-right: 6px;"></i> Cập Nhật Mật Khẩu
            </button>
          </form>
        </div>
      </div>

      <!-- TAB: THEO DÕI CHỈ SỐ INBODY HÀNG NGÀY -->
      <div id="myMetricsSec" class="profile-tab-sec" style="display: none;">
        ${metricsHTML}
      </div>

        </div><!-- End dashboard-main-content -->
      </div><!-- End dashboard-grid-container -->
    `;

    // Render vào Tab panel trên trang
    const pageContentEl = document.getElementById("userProfilePageContent");
    if (pageContentEl) pageContentEl.innerHTML = contentHTML;

    // Render vào Modal làm fallback
    const modalBodyEl = document.getElementById("userProfileModalBody");
    if (modalBodyEl) modalBodyEl.innerHTML = contentHTML;

    this.closeAllModals();

    if (doSwitchTab) {
      this.switchTab("profileTab");
    }
  },

  openUserProfileModal() {
    this.openUserProfilePage(true);
  },

  switchProfileTab(btn, secId) {
    const parent = btn.closest('.dashboard-grid-container') || btn.closest('.modal-body') || btn.closest('#adminTabContentContainer') || btn.closest('.tab-content-panel') || btn.closest('.modal-container') || document;
    
    const tabsContainer = btn.closest(".dash-nav-list") || btn.parentElement;
    if (tabsContainer) {
      tabsContainer.querySelectorAll(".dash-nav-btn, .profile-tab-btn").forEach(b => b.classList.remove("active"));
    }
    btn.classList.add("active");

    const sections = parent.querySelectorAll(".profile-tab-sec");
    if (sections.length > 0) {
      sections.forEach(s => {
        s.style.display = s.id === secId ? "block" : "none";
      });
    } else {
      const target = document.getElementById(secId);
      if (target) target.style.display = "block";
    }
  },

  getMetricsSecHTML(phone) {
    const logs = MetricsManager.getUserLogs(phone);
    const latest = logs[0] || {};
    const oldest = logs[logs.length - 1] || {};

    const weightDiff = (latest.weight - oldest.weight).toFixed(1);
    const fatDiff = (latest.bodyFat - oldest.bodyFat).toFixed(1);
    const muscleDiff = (latest.muscle - oldest.muscle).toFixed(1);

    const bmiRating = MetricsManager.getBMIRating(latest.bmi || 22);
    const visceralRating = MetricsManager.getVisceralFatRating(latest.visceralFat || 4);
    const physiqueText = MetricsManager.getPhysiqueLabel(latest.physiqueRating || 5);
    const chartHTML = this.generateMetricsSVGChart(logs);

    return `
      <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-chart-line" style="color: #10b981;"></i> Theo Dõi 9 Chỉ Số Sức Khỏe InBody Hàng Ngày
            </h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">Lịch sử đo và phân tích tiến trình giảm mỡ, tăng cơ & độ trẻ hóa cơ thể</p>
          </div>
          <button type="button" class="btn btn-primary" onclick="App.openAddMetricsModal()" style="font-weight: 700; font-size: 0.88rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none;">
            <i class="fa-solid fa-notes-medical"></i> Nhập Chỉ Số Hôm Nay
          </button>
        </div>

        <!-- 9 KEY METRICS KPI CARDS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
              <span><i class="fa-solid fa-weight-scale" style="color: var(--primary);"></i> Cân Nặng</span>
              <span style="color: ${weightDiff <= 0 ? 'var(--primary)' : '#e11d48'};">${weightDiff <= 0 ? weightDiff + ' kg' : '+' + weightDiff + ' kg'}</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.weight || '--'} kg</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
              <span><i class="fa-solid fa-percent" style="color: var(--secondary);"></i> % Mỡ Cơ Thể</span>
              <span style="color: ${fatDiff <= 0 ? 'var(--primary)' : '#e11d48'};">${fatDiff <= 0 ? fatDiff + '%' : '+' + fatDiff + '%'}</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.bodyFat || '--'}%</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
              <span><i class="fa-solid fa-dumbbell" style="color: var(--primary);"></i> Khối Lượng Cơ</span>
              <span style="color: ${muscleDiff >= 0 ? 'var(--primary)' : '#e11d48'};">${muscleDiff >= 0 ? '+' + muscleDiff + ' kg' : muscleDiff + ' kg'}</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.muscle || '--'} kg</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-sport);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-droplet" style="color: var(--accent-sport);"></i> Lượng Nước</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.water || '--'}%</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-calculator" style="color: var(--secondary);"></i> Chỉ Số BMI</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--secondary);">${latest.bmi || '--'} (${bmiRating.status})</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-deep);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-heart-circle-check" style="color: var(--accent-deep);"></i> Mỡ Nội Tạng</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--accent-deep);">Cấp ${latest.visceralFat || '--'} (${visceralRating.status})</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--secondary);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-bolt" style="color: var(--secondary);"></i> BMR Trao Đổi Chất</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.bmr || '--'} kcal</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--accent-sport);">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-dna" style="color: var(--accent-sport);"></i> Tuổi Sinh Học</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">${latest.metabolicAge || '--'} tuổi</div>
          </div>

          <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); grid-column: span 1 / -1;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;"><i class="fa-solid fa-person-rays" style="color: var(--primary);"></i> Đánh Giá Vóc Dáng (Physique Rating)</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">Mức ${latest.physiqueRating || 5}/9: ${physiqueText}</div>
          </div>
        </div>

        <!-- SVG Line Chart Visualizer -->
        <div style="margin-bottom: 20px;">
          <h5 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 10px;">📈 Biểu Đồ Cân Nặng Qua Các Lần Đo:</h5>
          ${chartHTML}
        </div>

        <!-- History Table -->
        <h5 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 10px;">📋 Lịch Sử Nhật Ký InBody:</h5>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ngày Đo</th>
                <th>Cân Nặng</th>
                <th>% Mỡ</th>
                <th>Cơ (kg)</th>
                <th>Nước (%)</th>
                <th>BMI</th>
                <th>Mỡ NT</th>
                <th>BMR/Tuổi</th>
                <th>Vóc Dáng</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="font-weight: 800; color: var(--primary);">${l.date}</td>
                  <td><strong>${l.weight}</strong> kg</td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${l.bodyFat}%</span></td>
                  <td><span style="color: #10b981; font-weight: 700;">${l.muscle} kg</span></td>
                  <td>${l.water}%</td>
                  <td>${l.bmi}</td>
                  <td>Cấp ${l.visceralFat}</td>
                  <td>${l.bmr}k / ${l.metabolicAge}t</td>
                  <td style="font-size: 0.78rem; font-weight: 700;">${MetricsManager.getPhysiqueLabel(l.physiqueRating)}</td>
                  <td>
                    <button type="button" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 2px 6px; font-size: 0.75rem;" onclick="App.deleteMetricLog('${escapeJsAttr(l.id)}')">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  deleteMyClub(clubId) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhóm dinh dưỡng này khỏi hệ thống?")) return;
    ClubManager.deleteClub(clubId);
    this.renderClubs();
    this.openUserProfilePage(false);
    this.showToast("🗑️ Đã xóa nhóm dinh dưỡng thành công!");
  },

  deleteMyEvent(eventId) {
    if (!confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) return;
    EventManager.deleteEvent(eventId);
    this.renderEvents();
    this.openUserProfilePage(false);
    this.showToast("🗑️ Đã xóa sự kiện thành công!");
  },

  deleteMyProduct(productId) {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi Shop?")) return;
    ShopManager.deleteProduct(productId);
    this.renderProducts();
    this.openUserProfilePage(false);
    this.showToast("🗑️ Đã xóa sản phẩm khỏi Shop thành công!");
  },

  openChangeAvatarModal() {
    const user = AuthManager.getCurrentUser();
    if (!user) {
      this.showToast("⚠️ Vui lòng đăng nhập để thay đổi ảnh đại diện!", "warning");
      this.openModal("loginModal");
      return;
    }
    const previewImg = document.getElementById("avatarPreviewImg");
    const inputUrl = document.getElementById("changeAvatarUrlInput");
    if (previewImg) previewImg.src = user.avatar;
    if (inputUrl) inputUrl.value = user.avatar;
    this.openModal("changeAvatarModal");
  },

  handleAvatarFileUpload(fileInput) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showToast("Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target.result;
      const previewImg = document.getElementById("avatarPreviewImg");
      const inputUrl = document.getElementById("changeAvatarUrlInput");
      if (previewImg) previewImg.src = base64Url;
      if (inputUrl) inputUrl.value = base64Url;
      this.showToast("📸 Đã tải ảnh lên! Nhấp 'Cập Nhật Ảnh Đại Diện' để lưu.");
    };
    reader.readAsDataURL(file);
  },

  selectPresetAvatar(url, element) {
    const previewImg = document.getElementById("avatarPreviewImg");
    const inputUrl = document.getElementById("changeAvatarUrlInput");
    if (previewImg) previewImg.src = url;
    if (inputUrl) inputUrl.value = url;

    document.querySelectorAll(".preset-avatar-item").forEach(item => item.classList.remove("active"));
    if (element) element.classList.add("active");
  },

  previewAvatarUrl(url) {
    if (!url) return;
    const previewImg = document.getElementById("avatarPreviewImg");
    if (previewImg) previewImg.src = url;
  },

  submitChangeAvatar(event) {
    event.preventDefault();
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const inputUrl = document.getElementById("changeAvatarUrlInput");
    const newAvatar = (inputUrl && inputUrl.value.trim()) ? inputUrl.value.trim() : user.avatar;

    const res = AuthManager.updateUserProfile({ avatar: newAvatar });
    if (res.success) {
      this.setupAuthUI();
      this.closeAllModals();
      this.openUserProfilePage(false);
      this.showToast("📷 Đã cập nhật ảnh đại diện thành công!");
    } else {
      this.showToast(res.message, "error");
    }
  },

  submitUpdateProfile(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.updName.value.trim();
    const email = form.updEmail.value.trim();
    const avatar = form.updAvatar.value.trim();
    const bio = form.updBio.value.trim();

    const res = AuthManager.updateUserProfile({ name, email, avatar, bio });
    if (res.success) {
      this.setupAuthUI();
      this.showToast("💾 Đã cập nhật hồ sơ cá nhân thành công!");
      this.openUserProfileModal();
    } else {
      this.showToast(res.message, "error");
    }
  },

  submitChangePassword(event) {
    event.preventDefault();
    const form = event.target;
    const oldPassword = form.oldPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      this.showToast("Mật khẩu mới và nhập lại mật khẩu không khớp!", "error");
      return;
    }

    const res = AuthManager.changePassword(oldPassword, newPassword);
    if (res.success) {
      form.reset();
      this.showToast("🔑 Đã đổi mật khẩu thành công!");
    } else {
      this.showToast(res.message, "error");
    }
  },



  // Open & Render Admin Dashboard Page Tab (no popup modal)
  openAdminDashboardModal(doSwitchTab = true) {
    let currentUser = AuthManager.getCurrentUser();
    if (!currentUser || !AuthManager.isAdminUser()) {
      currentUser = AuthManager.forceLoginAdmin();
      this.setupAuthUI();
      this.showToast("👑 Kích hoạt phiên làm việc Quản Trị Viên Admin (0902030185)!");
    }

    const tabContainer = document.getElementById("adminTabContentContainer");

    const users = AuthManager.getUsers();
    const clubs = ClubManager.getClubs();
    const events = EventManager.getEvents();
    const products = ShopManager.getProducts();
    const courses = CourseManager.getCourses();
    const categories = CourseManager.getCategories();
    const cmsConfig = this.getCMSConfig();

    const vipUsers = users.filter(u => u.package === "monthly" || u.package === "yearly" || u.package === "vip");
    const estimatedRev = vipUsers.reduce((sum, u) => sum + (u.package === "yearly" ? 999000 : 99000), 0);

    const adminHtml = `
      <div class="dashboard-grid-container">
        <!-- SIDEBAR BÊN TRÁI QUẢN TRỊ ADMIN -->
        <div class="dashboard-sidebar-card">
          <div class="dash-user-mini">
            <img src="${sanitizeUrl(currentUser.avatar, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}" alt="${escapeHtml(currentUser.name)}">
            <div>
              <div style="font-weight: 800; font-size: 0.98rem; color: var(--text-main); line-height: 1.2;">${escapeHtml(currentUser.name)}</div>
              <div style="font-size: 0.78rem; color: #d97706; font-weight: 700; margin-top: 2px;"><i class="fa-solid fa-shield-halved"></i> Quản Trị Viên</div>
              <span class="user-vip-badge" style="background: rgba(217, 119, 6, 0.15); color: #d97706; border: 1px solid #d97706; font-size: 0.7rem; padding: 2px 6px; display: inline-block; margin-top: 4px;">👑 Admin System</span>
            </div>
          </div>

          <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 8px;">QUẢN TRỊ HỆ THỐNG</div>

          <ul class="dash-nav-list">
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn active" onclick="App.switchProfileTab(this, 'adminUsersSec')">
                <span><i class="fa-solid fa-users" style="color: var(--primary); width: 22px;"></i> Thành Viên</span>
                <span class="badge-pill">${users.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminClubsSec')">
                <span><i class="fa-solid fa-leaf" style="color: var(--primary); width: 22px;"></i> Nhóm Dinh Dưỡng</span>
                <span class="badge-pill">${clubs.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminEventsSec')">
                <span><i class="fa-solid fa-calendar-star" style="color: var(--secondary); width: 22px;"></i> Sự Kiện</span>
                <span class="badge-pill">${events.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminProductsSec')">
                <span><i class="fa-solid fa-store" style="color: var(--accent-sport); width: 22px;"></i> Shop Công Cụ</span>
                <span class="badge-pill">${products.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminCoursesSec')">
                <span><i class="fa-solid fa-graduation-cap" style="color: #3b82f6; width: 22px;"></i> Khóa Học E-Learning</span>
                <span class="badge-pill">${courses.length}</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminLocationSec')">
                <span><i class="fa-solid fa-map-location-dot" style="color: #10b981; width: 22px;"></i> Quản Lý Địa Giới</span>
                <span class="badge-pill" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">63 Tỉnh/TP</span>
              </button>
            </li>
            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminMenuSec')">
                <span><i class="fa-solid fa-bars-staggered" style="color: var(--primary); width: 22px;"></i> Cấu Hình Menu</span>
              </button>
            </li>

            <li>
              <button type="button" class="dash-nav-btn profile-tab-btn" onclick="App.switchProfileTab(this, 'adminFooterSec')">
                <span><i class="fa-solid fa-shoe-prints" style="color: var(--text-muted); width: 22px;"></i> Cấu Hình Chân Trang</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH BÊN PHẢI -->
        <div class="dashboard-main-content">
          <!-- Admin KPI Summary Cards -->
          <div class="admin-kpi-grid">
            <div class="admin-kpi-card" style="border-left: 4px solid var(--primary);">
              <div class="kpi-title"><i class="fa-solid fa-users" style="color: var(--primary); margin-right: 4px;"></i> Tổng Thành Viên</div>
              <div class="kpi-num" style="color: var(--primary);">${users.length}</div>
              <div class="kpi-sub"><i class="fa-solid fa-star" style="color: var(--secondary); margin-right: 2px;"></i> ${vipUsers.length} Thành viên VIP</div>
            </div>
            <div class="admin-kpi-card" style="border-left: 4px solid var(--primary);">
              <div class="kpi-title"><i class="fa-solid fa-leaf" style="color: var(--primary); margin-right: 4px;"></i> Nhóm Dinh Dưỡng</div>
              <div class="kpi-num" style="color: var(--primary);">${clubs.length}</div>
              <div class="kpi-sub">Đang hoạt động toàn quốc</div>
            </div>
            <div class="admin-kpi-card" style="border-left: 4px solid var(--secondary);">
              <div class="kpi-title"><i class="fa-solid fa-calendar-star" style="color: var(--secondary); margin-right: 4px;"></i> Sự Kiện Cộng Đồng</div>
              <div class="kpi-num" style="color: var(--secondary);">${events.length}</div>
              <div class="kpi-sub">Workshop & Workout</div>
            </div>
            <div class="admin-kpi-card" style="border-left: 4px solid var(--accent-sport);">
              <div class="kpi-title"><i class="fa-solid fa-store" style="color: var(--accent-sport); margin-right: 4px;"></i> Công Cụ Trên Shop</div>
              <div class="kpi-num" style="color: var(--accent-sport);">${products.length}</div>
              <div class="kpi-sub">Cân InBody & Thiết bị</div>
            </div>
            <div class="admin-kpi-card" style="border-left: 4px solid #3b82f6;">
              <div class="kpi-title"><i class="fa-solid fa-graduation-cap" style="color: #3b82f6; margin-right: 4px;"></i> Bài Giảng Khóa Học</div>
              <div class="kpi-num" style="color: #3b82f6;">${courses.length}</div>
              <div class="kpi-sub">E-Learning & Video</div>
            </div>
            <div class="admin-kpi-card" style="border-left: 4px solid var(--secondary);">
              <div class="kpi-title"><i class="fa-solid fa-sack-dollar" style="color: var(--secondary); margin-right: 4px;"></i> Doanh Thu VIP (Ước Tính)</div>
              <div class="kpi-num" style="color: var(--secondary);">${ShopManager.formatCurrency(estimatedRev)}</div>
              <div class="kpi-sub">Tự động tính từ gói VIP</div>
            </div>
          </div>

      <!-- Admin Tab 1: Users Table -->
      <div id="adminUsersSec" class="profile-tab-sec" style="display: block;">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Thành Viên</th>
                <th>SĐT / Email</th>
                <th>Gói Hiện Tại</th>
                <th>Thao Tác Quản Trị</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const isVIPUser = u.package === "monthly" || u.package === "yearly" || u.package === "vip";
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${sanitizeUrl(u.avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=User')}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                        <div>
                          <div style="font-weight: 700;">${escapeHtml(u.name)}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(u.role || 'Thành viên')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 0.85rem; font-weight: 700;">${escapeHtml(u.phone)}</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(u.email)}</div>
                    </td>
                    <td>
                      <span class="${isVIPUser ? 'user-vip-badge' : 'vip-lock-badge'}">${isVIPUser ? '⭐ VIP ' + (u.package === 'yearly' ? '1 Năm' : '1 Tháng') : '🔒 Dùng Thử'}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem; background: #10b981; border: none;" onclick="App.adminApproveVIP('${escapeJsAttr(u.id)}', 'monthly')">⚡ VIP 1Th</button>
                        <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem; background: #f59e0b; border: none;" onclick="App.adminApproveVIP('${escapeJsAttr(u.id)}', 'yearly')">⚡ VIP 1Năm</button>
                        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #64748b; border-color: #cbd5e1;" onclick="App.adminRevokeVIP('${escapeJsAttr(u.id)}')">🔒 Hủy VIP</button>
                        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteUser('${escapeJsAttr(u.id)}')">❌ Xóa</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin Tab 2: Clubs Table -->
      <div id="adminClubsSec" class="profile-tab-sec" style="display: none;">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Tên Nhóm Dinh Dưỡng</th>
                <th>Loại Hình</th>
                <th>Tỉnh / Thành</th>
                <th>Chủ Nhóm</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${clubs.map(c => `
                <tr>
                  <td style="font-weight: 700;">${escapeHtml(c.name)}</td>
                  <td><span class="product-cat-badge" style="position: static; display: inline-block;">${escapeHtml(c.type)}</span></td>
                  <td>${escapeHtml(c.province)}</td>
                  <td>${escapeHtml(c.ownerName)} (${escapeHtml(c.ownerPhone)})</td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: var(--primary); border-color: var(--primary-light); background: var(--primary-light);" onclick="App.adminOpenEditClubModal('${escapeJsAttr(c.id)}')">✏️ Sửa</button>
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteClub('${escapeJsAttr(c.id)}')">❌ Xóa</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin Tab 3: Events Table -->
      <div id="adminEventsSec" class="profile-tab-sec" style="display: none;">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Tên Sự Kiện</th>
                <th>Thời Gian</th>
                <th>Địa Điểm</th>
                <th>Người Tổ Chức</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${events.map(e => `
                <tr>
                  <td style="font-weight: 700;">${escapeHtml(e.title)}</td>
                  <td>${escapeHtml(e.date)} (${escapeHtml(e.time)})</td>
                  <td>${escapeHtml(e.address)}</td>
                  <td>${escapeHtml(e.hostName)}</td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: var(--primary); border-color: var(--primary-light); background: var(--primary-light);" onclick="App.adminOpenEditEventModal('${escapeJsAttr(e.id)}')">✏️ Sửa</button>
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteEvent('${escapeJsAttr(e.id)}')">❌ Xóa</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin Tab 4: Products Table -->
      <div id="adminProductsSec" class="profile-tab-sec" style="display: none;">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Tên Công Cụ</th>
                <th>Danh Mục</th>
                <th>Giá Bán</th>
                <th>Người Đăng</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td style="font-weight: 700;">${escapeHtml(p.title)}</td>
                  <td>${escapeHtml(p.category)}</td>
                  <td style="color: var(--primary); font-weight: 800;">${ShopManager.formatCurrency(p.price)}</td>
                  <td>${escapeHtml(p.sellerName)} (${escapeHtml(p.sellerPhone)})</td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: var(--primary); border-color: var(--primary-light); background: var(--primary-light);" onclick="App.adminOpenEditProductModal('${escapeJsAttr(p.id)}')">✏️ Sửa</button>
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteProduct('${escapeJsAttr(p.id)}')">❌ Xóa</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin Tab 4b: Quản Lý Khóa Học & Chủ Đề E-Learning -->
      <div id="adminCoursesSec" class="profile-tab-sec" style="display: none;">
        <!-- KHU VỰC 1: QUẢN LÝ DANH MỤC CHỦ ĐỀ KHÓA HỌC -->
        <div style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">📂 Danh Mục Chủ Đề Khóa Học (${categories.length})</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Quản lý các chủ đề khóa học, sửa tên & icon biểu tượng, hoặc thêm chủ đề mới.</p>
            </div>
            <button class="btn btn-outline" style="font-size: 0.85rem; font-weight: 700; color: var(--primary); border-color: var(--primary);" onclick="App.adminOpenAddCourseCategoryModal()">
              <i class="fa-solid fa-folder-plus"></i> Thêm Chủ Đề Mới
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="background: var(--bg-main); text-align: left; border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 10px 14px;">Icon & Tên Chủ Đề</th>
                  <th style="padding: 10px 14px;">Mã Chủ Đề (ID)</th>
                  <th style="padding: 10px 14px;">Số Bài Giảng</th>
                  <th style="padding: 10px 14px; text-align: center;">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                ${categories.map(cat => {
                  const count = courses.filter(c => c.category === cat.id).length;
                  return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-main);">
                        <span style="font-size: 1.1rem; margin-right: 6px;">${escapeHtml(cat.icon || '📚')}</span> ${escapeHtml(cat.name)}
                      </td>
                      <td style="padding: 10px 14px; color: var(--text-muted);">
                        <code>${escapeHtml(cat.id)}</code>
                      </td>
                      <td style="padding: 10px 14px;">
                        <span class="badge-pill" style="background: rgba(5, 150, 105, 0.1); color: var(--primary); font-size: 0.78rem;">${count} Bài giảng</span>
                      </td>
                      <td style="padding: 10px 14px; text-align: center; white-space: nowrap;">
                        <button class="btn btn-outline" style="padding: 3px 8px; font-size: 0.78rem; margin-right: 4px;" onclick="App.adminOpenEditCourseCategoryModal('${escapeJsAttr(cat.id)}')">✏️ Sửa</button>
                        <button class="btn btn-outline" style="padding: 3px 8px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteCourseCategory('${escapeJsAttr(cat.id)}')">🗑️ Xóa</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- KHU VỰC 2: QUẢN LÝ DANH SÁCH BÀI GIẢNG KHÓA HỌC -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">🎓 Danh Sách Bài Giảng Khóa Học (${courses.length})</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Quản lý danh sách video khóa học E-Learning, chỉnh sửa thông tin bài giảng và thêm video mới.</p>
          </div>
          <button class="btn btn-primary" style="font-size: 0.88rem; font-weight: 700;" onclick="App.openCreateCourseModal()">
            <i class="fa-solid fa-plus"></i> Đăng Khóa Học Mới
          </button>
        </div>

        <div style="overflow-x: auto; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
            <thead>
              <tr style="background: var(--bg-main); text-align: left; border-bottom: 1px solid var(--border-color);">
                <th style="padding: 12px 16px;">Khóa Học & Video</th>
                <th style="padding: 12px 16px;">Chủ Đề</th>
                <th style="padding: 12px 16px;">Giảng Viên / HLV</th>
                <th style="padding: 12px 16px;">Thời Lượng</th>
                <th style="padding: 12px 16px; text-align: center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(c => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <img src="${sanitizeUrl(c.thumbnail, 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80')}" alt="${escapeHtml(c.title)}" style="width: 60px; height: 40px; border-radius: 6px; object-fit: cover;">
                      <div>
                        <div style="font-weight: 700; color: var(--text-main); line-height: 1.3;">${escapeHtml(c.title)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">YouTube ID: <code>${escapeHtml(c.youtubeId)}</code> | Cấp độ: <span class="badge-pill" style="font-size: 0.7rem; padding: 1px 6px;">${escapeHtml(c.level || 'Cơ Bản')}</span></div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 12px 16px;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); background: rgba(5, 150, 105, 0.1); padding: 3px 8px; border-radius: 10px;">${escapeHtml(c.categoryLabel)}</span>
                  </td>
                  <td style="padding: 12px 16px; font-weight: 600;">
                    ${escapeHtml(c.instructor)}
                  </td>
                  <td style="padding: 12px 16px; font-weight: 600;">
                    ${escapeHtml(c.duration)}
                  </td>
                  <td style="padding: 12px 16px; text-align: center; white-space: nowrap;">
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: var(--primary); border-color: var(--primary-light); background: var(--primary-light); margin-right: 4px;" onclick="App.adminEditCourse('${escapeJsAttr(c.id)}')" title="Sửa khóa học">✏️ Sửa</button>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; color: #ef4444; border-color: #fca5a5;" onclick="App.adminDeleteCourse('${escapeJsAttr(c.id)}')" title="Xóa khóa học">🗑️ Xóa</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin Tab 4c: Quản Lý Địa Giới Hành Chính 2 Cấp (Nghị quyết 202/2025/QH15) -->
      <div id="adminLocationSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> Hệ Thống Địa Giới Hành Chính Việt Nam 2 Cấp
                <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; background: rgba(16, 185, 129, 0.1); color: var(--primary); border-radius: 12px; border: 1px solid var(--primary-light);">Nghị quyết 202/2025/QH15</span>
              </h4>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Mô hình chính quyền địa phương 2 cấp (Tỉnh/Thành phố -> Xã/Phường/Đặc khu) & Tra cứu lịch sử 3 cấp cũ.</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline" style="font-size: 0.82rem; font-weight: 700; color: var(--primary); border-color: var(--primary);" onclick="App.adminRunLocationAudit()">
                <i class="fa-solid fa-shield-check"></i> Kiểm Tra Dữ Liệu
              </button>
              <button class="btn btn-outline" style="font-size: 0.82rem; font-weight: 700;" onclick="App.adminExportLocationData()">
                <i class="fa-solid fa-download"></i> Xuất CSV
              </button>
              <button class="btn btn-primary" style="font-size: 0.82rem; font-weight: 700;" onclick="App.adminImportLocationData()">
                <i class="fa-solid fa-upload"></i> Nhập CSV
              </button>
            </div>
          </div>

          <!-- Location Sub-Tabs Navigation -->
          <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px; overflow-x: auto;">
            <button class="btn btn-outline loc-sub-tab active" style="font-size: 0.82rem; padding: 6px 14px;" onclick="App.switchLocationSubTab(this, 'locProvTab')">🏢 Tỉnh / Thành (${(typeof LocationManager !== "undefined" ? LocationManager.getProvinces().length : 63)} Tỉnh/TP)</button>
            <button class="btn btn-outline loc-sub-tab" style="font-size: 0.82rem; padding: 6px 14px;" onclick="App.switchLocationSubTab(this, 'locWardTab')">🏘️ Danh Sách Xã/Phường/Đặc Khu</button>
            <button class="btn btn-outline loc-sub-tab" style="font-size: 0.82rem; padding: 6px 14px;" onclick="App.switchLocationSubTab(this, 'locMapTab')">🔄 Quy Đổi Lịch Sử (District Mapping)</button>
            <button class="btn btn-outline loc-sub-tab" style="font-size: 0.82rem; padding: 6px 14px;" onclick="App.switchLocationSubTab(this, 'locAuditTab')">📊 Kiểm Định Dữ Liệu</button>
          </div>

          <!-- Sub-Tab 1: Provinces List -->
          <div id="locProvTab" class="loc-tab-sec" style="display: block;">
            <div style="overflow-x: auto;">
              <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                <thead>
                  <tr style="background: var(--bg-main); text-align: left; border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 10px 14px;">Mã Tỉnh</th>
                    <th style="padding: 10px 14px;">Tỉnh / Thành Phố TW</th>
                    <th style="padding: 10px 14px;">Vùng Đô Thị</th>
                    <th style="padding: 10px 14px;">Số Đơn Vị Trực Thuộc</th>
                    <th style="padding: 10px 14px;">Mô Hình</th>
                  </tr>
                </thead>
                <tbody>
                  ${(typeof LocationManager !== "undefined" ? LocationManager.getProvinces() : []).map(p => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 10px 14px; color: var(--text-muted);"><code>${p.code}</code></td>
                      <td style="padding: 10px 14px; font-weight: 700; color: var(--text-main);">${p.name}</td>
                      <td style="padding: 10px 14px;"><span class="badge-pill" style="font-size: 0.75rem; background: var(--bg-main);">${p.region || 'TW'}</span></td>
                      <td style="padding: 10px 14px;"><strong style="color: var(--primary);">${(p.wards || []).length}</strong> Xã / Phường</td>
                      <td style="padding: 10px 14px;"><span style="font-size: 0.75rem; color: #10b981; font-weight: 700;">2 Cấp (TW -> Xã/Phường)</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sub-Tab 2: Wards Filter & List -->
          <div id="locWardTab" class="loc-tab-sec" style="display: none;">
            <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
              <label style="font-weight: 700; font-size: 0.88rem;">Lọc theo Tỉnh / Thành:</label>
              <select class="form-control" style="max-width: 280px;" onchange="App.filterAdminWardsTable(this.value)">
                <option value="">-- Tất cả 34 Tỉnh / Thành --</option>
                ${(typeof LocationManager !== "undefined" ? LocationManager.getProvinces() : []).map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
              </select>
            </div>
            <div style="overflow-x: auto;">
              <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;" id="adminWardsTable">
                <thead>
                  <tr style="background: var(--bg-main); text-align: left; border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 10px 14px;">Mã Đơn Vị</th>
                    <th style="padding: 10px 14px;">Tỉnh / Thành Phố</th>
                    <th style="padding: 10px 14px;">Tên Xã / Phường / Đặc Khu</th>
                    <th style="padding: 10px 14px;">Phân Loại</th>
                  </tr>
                </thead>
                <tbody id="adminWardsTableBody">
                  ${(typeof LocationManager !== "undefined" ? LocationManager.getProvinces().slice(0, 5) : []).flatMap(p => 
                    (p.wards || []).map(w => `
                      <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 8px 14px; color: var(--text-muted);"><code>${w.code || 'WARD'}</code></td>
                        <td style="padding: 8px 14px; font-weight: 600;">${p.name}</td>
                        <td style="padding: 8px 14px; font-weight: 700; color: var(--primary);">${w.name || w}</td>
                        <td style="padding: 8px 14px;"><span class="badge-pill" style="font-size: 0.72rem; padding: 2px 6px;">${w.type || ((w.name || w).startsWith('Đặc Khu') ? 'ĐẶC KHU' : ((w.name || w).startsWith('Xã') ? 'XÃ' : 'PHƯỜNG'))}</span></td>
                      </tr>
                    `)
                  ).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sub-Tab 3: Historical District Mapping -->
          <div id="locMapTab" class="loc-tab-sec" style="display: none;">
            <div style="overflow-x: auto;">
              <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="background: var(--bg-main); text-align: left; border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 10px 14px;">Đơn Vị Cũ (3 Cấp)</th>
                    <th style="padding: 10px 14px;">Đơn Vị Mới (2 Cấp Hiện Hành)</th>
                    <th style="padding: 10px 14px;">Loại Quy Đổi</th>
                    <th style="padding: 10px 14px;">Văn Bản Pháp Lý</th>
                    <th style="padding: 10px 14px;">Ghi Chú Chi Tiết</th>
                  </tr>
                </thead>
                <tbody>
                  ${(typeof LocationManager !== "undefined" ? LocationManager.getMappings() : []).map(m => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 10px 14px;">
                        <div style="font-weight: 700; color: #ef4444;">${m.oldWardName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${m.oldDistrictName}, ${m.oldProvinceName}</div>
                      </td>
                      <td style="padding: 10px 14px;">
                        <div style="font-weight: 700; color: var(--primary);">${m.newWardName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${m.newProvinceName}</div>
                      </td>
                      <td style="padding: 10px 14px;"><span class="badge-pill" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-size: 0.72rem;">${m.mappingType}</span></td>
                      <td style="padding: 10px 14px; font-size: 0.78rem;"><strong>${m.sourceDocument}</strong><br><span style="color: var(--text-muted);">Hiệu lực: ${m.effectiveDate}</span></td>
                      <td style="padding: 10px 14px; font-size: 0.78rem; color: var(--text-muted);">${m.note}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sub-Tab 4: Quality Audit Result & Tools -->
          <div id="locAuditTab" class="loc-tab-sec" style="display: none;">
            <div id="adminLocationAuditResultsBox" style="background: var(--bg-main); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <h5 style="font-size: 0.95rem; font-weight: 800; margin-bottom: 8px; color: var(--primary);">✅ Báo Cáo Kiểm Định Chất Lượng Dữ Liệu Hành Chính</h5>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Nhấn nút "Kiểm Tra Dữ Liệu" ở trên để chạy kiểm định toàn hệ thống 34 tỉnh, mã duy nhất, không trùng lặp và tương thích với toàn bộ Nhóm Dinh Dưỡng.</p>
            </div>
          </div>

        </div>
      </div>

      <!-- Admin Tab 5: Menu CMS Config -->
      <div id="adminMenuSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 10px;">⚙️ Quản Lý Nút Thanh Menu (Navbar Tabs)</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Tùy chỉnh nhãn hiển thị và bật/tắt các nút chuyển trang trên menu chính.</p>

          <form onsubmit="App.adminSubmitMenuConfig(event)">
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
              ${cmsConfig.menu.map(m => `
                <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <div style="font-weight: 700; width: 120px; font-size: 0.88rem; color: var(--primary);">📌 ${m.tab}</div>
                  <div style="flex: 1;">
                    <input type="text" name="menu_label_${m.id}" class="form-control" style="padding: 6px 12px;" value="${m.label}" placeholder="Tên hiển thị..." required>
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin: 0;">
                    <input type="checkbox" name="menu_enable_${m.id}" ${m.enabled ? 'checked' : ''}> Hiển thị
                  </label>
                </div>
              `).join('')}
            </div>
            <button type="submit" class="btn btn-primary">💾 Lưu Cấu Hình Menu</button>
          </form>
        </div>
      </div>

      <!-- Admin Tab 6: Footer CMS Config -->
      <div id="adminFooterSec" class="profile-tab-sec" style="display: none;">
        <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 10px;">👣 Quản Lý Nội Dung Chân Trang (Footer CMS)</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Chỉnh sửa thương hiệu, Hotline tư vấn, câu khẩu hiệu và thông tin bản quyền chân trang.</p>

          <form onsubmit="App.adminSubmitFooterConfig(event)">
            <div class="form-group">
              <label class="form-label">Tên Thương Hiệu Trang Web</label>
              <input type="text" name="footerBrandName" class="form-control" value="${cmsConfig.footer.brandName}" required>
            </div>
            <div class="form-row" style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Số Hotline Tư Vấn (24/7)</label>
                <input type="text" name="footerHotline" class="form-control" value="${cmsConfig.footer.hotline}" required>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Tiêu Đề Hotline Callout</label>
                <input type="text" name="footerHotlineTitle" class="form-control" value="${cmsConfig.footer.hotlineTitle}" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Câu Khẩu Hiệu (Tagline)</label>
              <input type="text" name="footerTagline" class="form-control" value="${cmsConfig.footer.tagline}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Dòng Chữ Bản Quyền (Copyright)</label>
              <input type="text" name="footerCopyright" class="form-control" value="${cmsConfig.footer.copyright}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Mô Tả Giới Thiệu Ngắn Ở Chân Trang</label>
              <textarea name="footerSubText" class="form-control" rows="2">${cmsConfig.footer.subText}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">💾 Lưu Cấu Hình Chân Trang</button>
          </form>
        </div>

        </div><!-- End dashboard-main-content -->
      </div><!-- End dashboard-grid-container -->
    `;

    if (tabContainer) {
      tabContainer.innerHTML = adminHtml;
    }

    this.closeAllModals();

    if (doSwitchTab) {
      this.switchTab("adminTab");
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Thao tác Admin Duyệt VIP
  adminApproveVIP(userId, packageType) {
    const users = AuthManager.getUsers();
    const u = users.find(x => x.id === userId);
    if (u) {
      u.package = packageType;
      AuthManager.saveUsers(users);
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.package = packageType;
        AuthManager.setCurrentUser(currentUser);
        this.setupAuthUI();
      }
      this.showToast(`🎉 Đã duyệt gói VIP ${packageType === 'yearly' ? '1 Năm' : '1 Tháng'} cho thành viên ${u.name}!`);
      this.openAdminDashboardModal();
    }
  },

  // Thao tác Admin Hạ Gói VIP về Dùng Thử
  adminRevokeVIP(userId) {
    const users = AuthManager.getUsers();
    const u = users.find(x => x.id === userId);
    if (u) {
      u.package = "trial";
      AuthManager.saveUsers(users);
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.package = "trial";
        AuthManager.setCurrentUser(currentUser);
        this.setupAuthUI();
      }
      this.showToast(`🔒 Đã chuyển gói thành viên ${u.name} về Dùng Thử.`, "info");
      this.openAdminDashboardModal();
    }
  },

  adminDeleteUser(userId) {
    const currentUser = AuthManager.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      this.showToast("⚠️ Bạn không thể xóa chính tài khoản Admin đang sử dụng!", "error");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi hệ thống?")) return;
    let users = AuthManager.getUsers();
    users = users.filter(u => u.id !== userId);
    AuthManager.saveUsers(users);
    this.showToast("Đã xóa thành viên thành công.");
    this.openAdminDashboardModal();
  },

  adminDeleteClub(clubId) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhóm dinh dưỡng này?")) return;
    ClubManager.deleteClub(clubId);
    this.renderClubs();
    this.showToast("Đã xóa nhóm dinh dưỡng.");
    this.openAdminDashboardModal();
  },

  // Dark / Light Mode Toggle
  initTheme() {
    const savedTheme = localStorage.getItem("nutriclub_theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    }
  },

  toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("nutriclub_theme", isDark ? "dark" : "light");
  },

  // Hiển thị Toast thông báo
  // Open & Submit Admin Edit User
  adminOpenEditUserModal(userId) {
    const users = AuthManager.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) return;
    document.getElementById("editUserId").value = u.id;
    document.getElementById("editUserName").value = u.name || '';
    document.getElementById("editUserPhone").value = u.phone || '';
    document.getElementById("editUserEmail").value = u.email || '';
    document.getElementById("editUserRole").value = u.role || '';
    document.getElementById("editUserPackage").value = u.package || 'trial';
    this.openModal("adminEditUserModal");
  },

  adminSubmitEditUser(e) {
    e.preventDefault();
    const userId = document.getElementById("editUserId").value;
    const users = AuthManager.getUsers();
    const u = users.find(x => x.id === userId);
    if (u) {
      u.name = document.getElementById("editUserName").value.trim();
      u.phone = document.getElementById("editUserPhone").value.trim();
      u.email = document.getElementById("editUserEmail").value.trim();
      u.role = document.getElementById("editUserRole").value.trim();
      u.package = document.getElementById("editUserPackage").value;
      AuthManager.saveUsers(users);
      const currentUser = AuthManager.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.name = u.name;
        currentUser.phone = u.phone;
        currentUser.email = u.email;
        currentUser.role = u.role;
        currentUser.package = u.package;
        AuthManager.setCurrentUser(currentUser);
        this.setupAuthUI();
      }
      this.closeAllModals();
      this.showToast(`💾 Đã cập nhật thành công thông tin thành viên ${u.name}!`);
      this.openAdminDashboardModal();
    }
  },

  // Open & Submit Admin Edit Club
  adminOpenEditClubModal(clubId) {
    const clubs = ClubManager.getClubs();
    const c = clubs.find(x => x.id === clubId);
    if (!c) return;
    document.getElementById("editClubId").value = c.id;
    document.getElementById("editClubName").value = c.name || '';
    document.getElementById("editClubType").value = c.type || 'Nhóm dinh dưỡng chuyên sâu';
    document.getElementById("editClubImage").value = c.image || '';
    document.getElementById("editClubProvince").value = c.province || '';
    this.onEditClubProvinceChange(c.ward || c.district || '');
    document.getElementById("editClubAddress").value = c.addressDetail || c.address || '';
    document.getElementById("editClubOwner").value = c.ownerName || '';
    document.getElementById("editClubOwnerPhone").value = c.ownerPhone || '';
    document.getElementById("editClubOpeningHours").value = c.openingHours || '';
    document.getElementById("editClubStory").value = c.story || '';

    // Nạp danh sách đồng vận hành hiện có của nhóm
    this.selectedEditCoOperators = c.coOperators && Array.isArray(c.coOperators) ? [...c.coOperators] : [];
    this.renderEditCoOpChips();

    this.openModal("adminEditClubModal");
  },

  adminSubmitEditClub(e) {
    e.preventDefault();
    const clubId = document.getElementById("editClubId").value;
    const clubs = ClubManager.getClubs();
    const c = clubs.find(x => x.id === clubId);
    if (c) {
      c.name = document.getElementById("editClubName").value.trim();
      c.type = document.getElementById("editClubType").value;
      c.image = document.getElementById("editClubImage").value.trim() || c.image;
      c.province = document.getElementById("editClubProvince").value.trim();
      const editWardEl = document.getElementById("editClubWard") || document.getElementById("editClubDistrict");
      const ward = editWardEl ? editWardEl.value.trim() : '';
      c.ward = ward;
      c.district = ward;
      c.addressDetail = document.getElementById("editClubAddress").value.trim();
      c.ownerName = document.getElementById("editClubOwner").value.trim();
      c.ownerPhone = document.getElementById("editClubOwnerPhone").value.trim();
      c.openingHours = document.getElementById("editClubOpeningHours").value.trim();
      c.story = document.getElementById("editClubStory").value.trim();
      c.coOperators = this.selectedEditCoOperators;

      // 1. Lưu LocalStorage & 2. Đồng bộ Firestore ngay lập tức
      ClubManager.saveClubs(clubs);
      ClubManager.syncSingleClubToFirestore(c);

      this.renderClubs();
      this.closeAllModals();
      this.showToast(`💾 Đã cập nhật thành công thông tin nhóm "${c.name}"!`);
      this.openAdminDashboardModal();
    }
  },

  // Open & Submit Admin Edit Event
  adminOpenEditEventModal(eventId) {
    const events = EventManager.getEvents();
    const ev = events.find(x => x.id === eventId);
    if (!ev) return;

    // Nạp danh sách nhóm dinh dưỡng vào dropdown chọn nhóm tổ chức
    const clubs = ClubManager.getClubs();
    const clubSelect = document.getElementById("editEventClubSelect");
    if (clubSelect) {
      clubSelect.innerHTML = clubs.map(c => `
        <option value="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}" data-address="${escapeHtml((c.addressDetail || '') + ', ' + (c.ward || '') + ', ' + (c.province || ''))}">
          ${escapeHtml(c.name)} (${escapeHtml(c.type)})
        </option>
      `).join('');
      clubSelect.value = ev.clubId || '';
    }

    document.getElementById("editEventId").value = ev.id;
    document.getElementById("editEventTitle").value = ev.title || '';
    document.getElementById("editEventDate").value = ev.date || '';
    document.getElementById("editEventTime").value = ev.time || '';
    document.getElementById("editEventLocationType").value = ev.locationType || 'Trực tiếp tại nhóm';
    document.getElementById("editEventMaxParticipants").value = ev.maxParticipants || 50;
    document.getElementById("editEventAddress").value = ev.address || '';
    document.getElementById("editEventDescription").value = ev.description || '';
    document.getElementById("editEventImage").value = ev.image || '';
    this.openModal("adminEditEventModal");
  },

  adminSubmitEditEvent(e) {
    e.preventDefault();
    const eventId = document.getElementById("editEventId").value;
    const events = EventManager.getEvents();
    const ev = events.find(x => x.id === eventId);
    if (ev) {
      const clubSelect = document.getElementById("editEventClubSelect");
      const selectedOption = clubSelect.options[clubSelect.selectedIndex];
      ev.clubId = clubSelect.value;
      ev.clubName = selectedOption ? selectedOption.dataset.name : ev.clubName;
      ev.title = document.getElementById("editEventTitle").value.trim();
      ev.date = document.getElementById("editEventDate").value;
      ev.time = document.getElementById("editEventTime").value.trim();
      ev.locationType = document.getElementById("editEventLocationType").value;
      ev.maxParticipants = parseInt(document.getElementById("editEventMaxParticipants").value) || 50;
      ev.address = document.getElementById("editEventAddress").value.trim();
      ev.description = document.getElementById("editEventDescription").value.trim();
      ev.image = document.getElementById("editEventImage").value.trim() || ev.image;
      EventManager.saveEvents(events);
      this.renderEvents();
      this.closeAllModals();
      this.showToast(`💾 Đã cập nhật sự kiện "${ev.title}"!`);
      this.openAdminDashboardModal();
    }
  },

  // Open & Submit Admin Edit Product
  adminOpenEditProductModal(productId) {
    const products = ShopManager.getProducts();
    const p = products.find(x => x.id === productId);
    if (!p) return;
    document.getElementById("editProductId").value = p.id;
    document.getElementById("editProductTitle").value = p.title || '';
    document.getElementById("editProductCategory").value = p.category || 'Cân & Máy Quét InBody';
    document.getElementById("editProductPrice").value = p.price || 0;
    document.getElementById("editProductCondition").value = p.condition || 'Mới 100%';
    document.getElementById("editProductProvince").value = p.province || 'Hà Nội';
    document.getElementById("editProductImage").value = p.image || '';
    document.getElementById("editProductShopeeLink").value = p.shopeeLink || '';
    document.getElementById("editProductDescription").value = p.description || '';
    this.openModal("adminEditProductModal");
  },

  adminSubmitEditProduct(e) {
    e.preventDefault();
    const productId = document.getElementById("editProductId").value;
    const products = ShopManager.getProducts();
    const p = products.find(x => x.id === productId);
    if (p) {
      p.title = document.getElementById("editProductTitle").value.trim();
      p.category = document.getElementById("editProductCategory").value;
      p.price = Number(document.getElementById("editProductPrice").value);
      p.condition = document.getElementById("editProductCondition").value;
      p.province = document.getElementById("editProductProvince").value;
      p.image = document.getElementById("editProductImage").value.trim() || p.image;
      p.shopeeLink = document.getElementById("editProductShopeeLink").value.trim();
      p.description = document.getElementById("editProductDescription").value.trim();
      ShopManager.saveProducts(products);
      this.renderProducts();
      this.closeAllModals();
      this.showToast(`💾 Đã cập nhật công cụ "${p.title}"!`);
      this.openAdminDashboardModal();
    }
  },

  // CMS Config Helper Methods
  getCMSConfig() {
    const raw = localStorage.getItem("nutriclub_cms_config");
    if (!raw) return SEED_CMS_CONFIG;
    try {
      return JSON.parse(raw);
    } catch(e) {
      return SEED_CMS_CONFIG;
    }
  },

  saveCMSConfig(cfg) {
    try {
      localStorage.setItem("nutriclub_cms_config", JSON.stringify(cfg));
    } catch(e) {
      console.error(e);
    }
    this.renderDynamicCMS();
  },
  getCMSConfig() {
    const raw = localStorage.getItem("nutriclub_cms_config");
    if (!raw) return SEED_CMS_CONFIG;
    try {
      return JSON.parse(raw);
    } catch(e) {
      return SEED_CMS_CONFIG;
    }
  },

  saveCMSConfig(cfg) {
    localStorage.setItem("nutriclub_cms_config", JSON.stringify(cfg));
    this.renderDynamicCMS();
  },

  renderDynamicCMS() {
    const cfg = this.getCMSConfig();
    
    // 1. Cập nhật Menu Navbar động
    if (cfg.menu) {
      cfg.menu.forEach(m => {
        const btn = document.querySelector(`.nav-link-btn[data-tab="${m.id || m.tab}"]`);
        if (btn) {
          const span = btn.querySelector("span");
          if (span) span.textContent = m.label;
          btn.style.display = m.enabled !== false ? "inline-flex" : "none";
        }
      });
    }

    // 2. Cập nhật Footer động
    if (cfg.footer) {
      const hotlineNums = document.querySelectorAll(".hotline-number, .floating-phone-text");
      hotlineNums.forEach(el => el.textContent = cfg.footer.hotline);
      
      const hotlineLinks = document.querySelectorAll("a[href^='tel:']");
      hotlineLinks.forEach(el => el.href = `tel:${cfg.footer.hotline}`);

      const hotlineLabels = document.querySelectorAll(".hotline-label");
      hotlineLabels.forEach(el => el.textContent = cfg.footer.hotlineTitle);
    }
  },

  adminSubmitMenuConfig(e) {
    e.preventDefault();
    const cfg = this.getCMSConfig();
    if (cfg.menu) {
      cfg.menu.forEach(m => {
        const labelInput = e.target[`menu_label_${m.id}`];
        const enableInput = e.target[`menu_enable_${m.id}`];
        if (labelInput) m.label = labelInput.value.trim();
        if (enableInput) m.enabled = enableInput.checked;
      });
    }
    this.saveCMSConfig(cfg);
    this.showToast("💾 Cập nhật cấu hình Menu thành công!");
    this.openAdminDashboardModal(false);
  },

  adminSubmitFooterConfig(e) {
    e.preventDefault();
    const cfg = this.getCMSConfig();
    if (!cfg.footer) cfg.footer = {};
    cfg.footer.brandName = e.target.footerBrandName.value.trim();
    cfg.footer.hotline = e.target.footerHotline.value.trim();
    cfg.footer.hotlineTitle = e.target.footerHotlineTitle.value.trim();
    cfg.footer.tagline = e.target.footerTagline.value.trim();
    cfg.footer.copyright = e.target.footerCopyright.value.trim();
    cfg.footer.subText = e.target.footerSubText.value.trim();
    this.saveCMSConfig(cfg);
    this.showToast("💾 Cập nhật cấu hình Chân Trang thành công!");
    this.openAdminDashboardModal(false);
  },

  // Admin Quản Lý Khóa Học E-Learning
  adminEditCourse(courseId) {
    this.populateCourseCategoryOptions();
    const courses = CourseManager.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById("editCourseId").value = course.id;
    document.getElementById("editCourseTitle").value = course.title;
    document.getElementById("editCourseCategory").value = course.category;
    document.getElementById("editCourseLevel").value = course.level || "Cơ Bản";
    document.getElementById("editCourseYoutubeUrl").value = course.youtubeId ? `https://www.youtube.com/watch?v=${course.youtubeId}` : "";
    document.getElementById("editCourseInstructor").value = course.instructor || "";
    document.getElementById("editCourseDuration").value = course.duration || "";
    document.getElementById("editCourseThumbnail").value = course.thumbnail || "";
    document.getElementById("editCourseDescription").value = course.description || "";

    this.openModal("adminEditCourseModal");
  },

  adminSubmitEditCourse(event) {
    event.preventDefault();
    const form = event.target;
    const courseId = form.editCourseId.value;
    const title = form.editCourseTitle.value.trim();
    const category = form.editCourseCategory.value;
    const level = form.editCourseLevel.value;
    const youtubeUrl = form.editCourseYoutubeUrl.value.trim();
    const instructor = form.editCourseInstructor.value.trim();
    const duration = form.editCourseDuration.value.trim();
    const thumbnail = form.editCourseThumbnail.value.trim();
    const description = form.editCourseDescription.value.trim();

    const res = CourseManager.updateCourse({
      id: courseId,
      title,
      category,
      level,
      youtubeUrl,
      instructor,
      duration,
      thumbnail,
      description
    });

    if (res.success) {
      this.closeAllModals();
      this.renderCourses();
      this.openAdminDashboardModal(false);
      this.showToast(`✅ Đã cập nhật thành công khóa học "${res.course.title}"!`);
    } else {
      this.showToast(res.message || "Không thể cập nhật khóa học!", "error");
    }
  },

  adminDeleteCourse(courseId) {
    const courses = CourseManager.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (confirm(`Bạn có chắc chắn muốn xóa bài giảng khóa học "${course.title}"?`)) {
      CourseManager.deleteCourse(courseId);
      this.renderCourses();
      this.openAdminDashboardModal(false);
      this.showToast(`🗑️ Đã xóa thành công bài giảng khóa học "${course.title}"!`);
    }
  },

  // Admin Quản Lý Chủ Đề Khóa Học
  adminOpenAddCourseCategoryModal() {
    this.openModal("adminAddCourseCategoryModal");
  },

  adminSubmitAddCourseCategory(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.categoryName.value.trim();
    const icon = form.categoryIcon.value.trim() || "📚";

    if (!name) {
      this.showToast("Vui lòng nhập tên chủ đề khóa học!", "error");
      return;
    }

    const res = CourseManager.addCategory(name, icon);
    if (res.success) {
      this.closeAllModals();
      form.reset();
      this.renderCourses();
      this.openAdminDashboardModal(false);
      this.showToast(`🎉 Đã thêm chủ đề "${res.category.name}" thành công!`);
    }
  },

  adminOpenEditCourseCategoryModal(catId) {
    const categories = CourseManager.getCategories();
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById("editCategoryId").value = cat.id;
    document.getElementById("editCategoryName").value = cat.name;
    document.getElementById("editCategoryIcon").value = cat.icon || "📚";

    this.openModal("adminEditCourseCategoryModal");
  },

  adminSubmitEditCourseCategory(event) {
    event.preventDefault();
    const form = event.target;
    const catId = form.editCategoryId.value;
    const name = form.editCategoryName.value.trim();
    const icon = form.editCategoryIcon.value.trim() || "📚";

    const res = CourseManager.updateCategory(catId, name, icon);
    if (res.success) {
      this.closeAllModals();
      this.renderCourses();
      this.openAdminDashboardModal(false);
      this.showToast(`✅ Đã cập nhật chủ đề "${res.category.name}" thành công!`);
    } else {
      this.showToast(res.message || "Không thể cập nhật chủ đề!", "error");
    }
  },

  adminDeleteCourseCategory(catId) {
    const categories = CourseManager.getCategories();
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const courses = CourseManager.getCourses();
    const coursesInCat = courses.filter(c => c.category === catId);

    if (coursesInCat.length > 0) {
      if (!confirm(`Chủ đề "${cat.name}" hiện đang có ${coursesInCat.length} khóa học sử dụng. Bạn có chắc chắn muốn xóa không?`)) {
        return;
      }
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề khóa học "${cat.name}"?`)) {
        return;
      }
    }

    CourseManager.deleteCategory(catId);
    this.renderCourses();
    this.openAdminDashboardModal(false);
    this.showToast(`🗑️ Đã xóa thành công chủ đề "${cat.name}"!`);
  },

  // -------------------------------------------------------------------
  // ADMIN 2-LEVEL LOCATION & HISTORICAL MAPPING MANAGEMENT
  // -------------------------------------------------------------------
  adminRunLocationAudit() {
    if (typeof LocationManager === "undefined") return;
    const audit = LocationManager.runDataQualityCheck();
    alert(`📊 KẾT QUẢ QUẢN TRỊ ĐỊA GIỚI HÀNH CHÍNH 2 CẤP (Nghị quyết 202/2025/QH15)
--------------------------------------------------
• Tổng số Tỉnh / Thành phố: ${audit.totalProvinces} đơn vị
• Tổng số Xã / Phường / Đặc khu: ${audit.totalWards} đơn vị (${audit.totalCommunes} Xã, ${audit.totalSpecialZones} Đặc khu)
• Tổng số Bản ghi Ánh xạ Lịch sử: ${audit.totalMappings} bản ghi
• Trùng lặp Mã đơn vị: ${audit.duplicateWardCodes.length} lỗi
• Đơn vị mồ côi (Orphan): ${audit.orphanWards.length} lỗi
• Bản ghi địa chỉ không khớp: ${audit.clubsInvalidLocation.length} lỗi

Trạng thái hệ thống: ${audit.status === 'EXCELLENT' ? '✅ HOÀN HẢO (100% Khớp dữ liệu chuẩn)' : '⚠️ CẦN RÀ SOÁT'}`);
  },

  adminExportLocationData() {
    if (typeof LocationManager === "undefined") return;
    const csv = LocationManager.exportLocationsCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Vietnam_2Level_Locations_${Date.now()}.csv`;
    link.click();
    this.showToast("📥 Đã xuất báo cáo CSV Địa giới hành chính 2 cấp thành công!");
  },

  adminImportLocationData() {
    const csvInput = prompt("Dán nội dung CSV địa giới hành chính (province_code,province_name,ward_code,ward_name,ward_type,status):");
    if (!csvInput || !csvInput.trim()) return;

    if (typeof LocationManager !== "undefined") {
      const res = LocationManager.importLocationsFromCSV(csvInput);
      if (res.success) {
        this.setupLocationDropdowns();
        this.showToast(`🎉 Đã nạp thành công ${res.importedCount} đơn vị hành chính 2 cấp! Total: ${res.totalCount}`);
      } else {
        this.showToast(`❌ Lỗi Import: ${res.error || (res.errors ? res.errors.join("; ") : "Không hợp lệ")}`, "error");
      }
    }
  },

  switchLocationSubTab(btn, subTabId) {
    const container = btn.closest('#adminLocationSec') || document;
    container.querySelectorAll('.loc-sub-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    container.querySelectorAll('.loc-tab-sec').forEach(s => s.style.display = 'none');
    const target = container.querySelector('#' + subTabId);
    if (target) target.style.display = 'block';
  },

  filterAdminWardsTable(provinceName) {
    const tbody = document.getElementById('adminWardsTableBody');
    if (!tbody || typeof LocationManager === 'undefined') return;
    let provinces = LocationManager.getProvinces();
    if (provinceName) {
      provinces = provinces.filter(p => p.name === provinceName);
    } else {
      provinces = provinces.slice(0, 5);
    }
    const html = provinces.flatMap(p => 
      (p.wards || []).map(w => `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 8px 14px; color: var(--text-muted);"><code>${w.code || 'WARD'}</code></td>
          <td style="padding: 8px 14px; font-weight: 600;">${p.name}</td>
          <td style="padding: 8px 14px; font-weight: 700; color: var(--primary);">${w.name || w}</td>
          <td style="padding: 8px 14px;"><span class="badge-pill" style="font-size: 0.72rem; padding: 2px 6px;">${w.type || ((w.name || w).startsWith('Đặc Khu') ? 'ĐẶC KHU' : ((w.name || w).startsWith('Xã') ? 'XÃ' : 'PHƯỜNG'))}</span></td>
        </tr>
      `)
    ).join('');
    tbody.innerHTML = html;
  },


  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : type === "warning" ? "toast-warning" : ""}`;
    toast.innerHTML = `
      <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Setup các listener chung (Sử dụng Event Delegation để hoạt động mượt mà trên 100% trình duyệt)
  setupEventListeners() {
    // 1. Delegated Click Listener cho toàn bộ ứng dụng
    document.addEventListener("click", (e) => {
      // a. Chuyển đổi Tab (Desktop Navbar & Mobile Dock)
      const tabBtn = e.target.closest("[data-tab]");
      if (tabBtn && tabBtn.dataset.tab) {
        this.switchTab(tabBtn.dataset.tab);
      }

      // b. Toggle User Dropdown Menu (Tự động đóng khi click ra ngoài)
      if (!e.target.closest(".user-menu-box") && !e.target.closest(".user-dropdown")) {
        const dropdown = document.getElementById("userDropdownMenu");
        if (dropdown) dropdown.classList.remove("show");
      }

      // c. Đóng Modal khi click ra ngoài backdrop
      if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
        this.closeAllModals();
      }

      // d. Nút đóng Modal (.modal-close-btn hoặc [data-dismiss='modal'])
      const closeBtn = e.target.closest(".modal-close-btn, .close-btn, [data-dismiss='modal']");
      if (closeBtn) {
        this.closeAllModals();
      }
    });

    // 2. Delegated Submit Listener cho Form Đăng Nhập & Đăng Ký
    document.addEventListener("submit", (e) => {
      const form = e.target;
      if (form.getAttribute("onsubmit")?.includes("submitLogin") || form.loginAccount) {
        e.preventDefault();
        this.submitLogin(e);
      } else if (form.getAttribute("onsubmit")?.includes("submitRegister") || form.regName) {
        e.preventDefault();
        this.submitRegister(e);
      }
    });
  }
};

if (typeof window !== "undefined") {
  window.App = App;
}

// Khởi chạy khi DOM load xong (Hỗ trợ cả trường hợp readyState đã interactive/complete)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  App.init();
}

