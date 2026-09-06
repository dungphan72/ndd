/**
 * Nutrition Clubs Management & Search Module
 */

const ClubManager = {
  // Lấy danh sách nhóm từ LocalStorage hoặc SEED_CLUBS
  getClubs() {
    try {
      const clubs = localStorage.getItem("nutriclub_clubs");
      if (clubs) {
        let parsed = JSON.parse(clubs);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter(c => c && typeof c === 'object' && c.id && c.name);
          if (parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading clubs from localStorage:", e);
    }
    if (typeof SEED_CLUBS !== "undefined" && Array.isArray(SEED_CLUBS)) {
      try { localStorage.setItem("nutriclub_clubs", JSON.stringify(SEED_CLUBS)); } catch(e) {}
      return SEED_CLUBS;
    }
    return [];
  },

  // Lưu danh sách nhóm vào LocalStorage & Đồng bộ lên Firebase Firestore
  saveClubs(clubs) {
    try {
      localStorage.setItem("nutriclub_clubs", JSON.stringify(clubs));
    } catch(e) {}

    // Async sync to Firebase Firestore if available
    this.syncAllToFirestore(clubs);
  },

  // Đồng bộ toàn bộ danh sách nhóm lên Firestore
  async syncAllToFirestore(clubs) {
    if (!window.firebaseDb || !window.firestoreHelpers) return;
    const { collection, doc, setDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;

    try {
      for (const club of clubs) {
        if (club && club.id) {
          const cleanClub = JSON.parse(JSON.stringify(club));
          const clubRef = doc(db, "clubs", String(club.id));
          await setDoc(clubRef, cleanClub, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Firestore syncAll warning:", err.message);
    }
  },

  // Đồng bộ 1 nhóm duy nhất lên Firestore
  async syncSingleClubToFirestore(club) {
    if (!window.firebaseDb || !window.firestoreHelpers || !club || !club.id) return;
    const { doc, setDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;
    try {
      // Loại bỏ các trường undefined để Firestore không từ chối ghi dữ liệu
      const cleanClub = JSON.parse(JSON.stringify(club));
      const clubRef = doc(db, "clubs", String(club.id));
      await setDoc(clubRef, cleanClub, { merge: true });
      console.log("🔥 Club successfully synced to Firestore Database:", club.name);
    } catch (err) {
      console.error("Firestore syncSingle error:", err);
    }
  },

  // Khởi tạo Lắng nghe Real-time Sync từ Firestore Database
  initFirestoreSync(onDataChange) {
    if (!window.firebaseDb || !window.firestoreHelpers) {
      console.log("Firestore unavailable, fallback to local storage mode");
      return;
    }
    const { collection, onSnapshot, doc, setDoc } = window.firestoreHelpers;
    const db = window.firebaseDb;
    const clubsRef = collection(db, "clubs");

    try {
      onSnapshot(clubsRef, (snapshot) => {
        if (snapshot.empty) {
          // Nếu Firestore chưa có dữ liệu, seed SEED_CLUBS lên Firestore
          const localClubs = this.getClubs();
          console.log("🔥 Firestore collection 'clubs' empty. Seeding initial clubs...");
          localClubs.forEach(club => {
            setDoc(doc(db, "clubs", String(club.id)), club, { merge: true });
          });
          return;
        }

        const firestoreClubs = [];
        snapshot.forEach(docSnap => {
          firestoreClubs.push(docSnap.data());
        });

        if (firestoreClubs.length > 0) {
          // Sắp xếp nhóm mới nhất lên đầu
          firestoreClubs.sort((a, b) => {
            const timeA = String(a.id || '').startsWith("club_") ? (parseInt(String(a.id).replace("club_", "")) || 0) : 0;
            const timeB = String(b.id || '').startsWith("club_") ? (parseInt(String(b.id).replace("club_", "")) || 0) : 0;
            return timeB - timeA;
          });

          console.log(`🔥 Received ${firestoreClubs.length} clubs from Firebase Firestore real-time sync`);
          localStorage.setItem("nutriclub_clubs", JSON.stringify(firestoreClubs));
          if (typeof onDataChange === "function") {
            onDataChange(firestoreClubs);
          }
        }
      }, (error) => {
        console.warn("Firestore snapshot listener notice:", error.message);
      });
    } catch (e) {
      console.error("Error setting up Firestore listener:", e);
    }
  },

  // Lấy chi tiết 1 nhóm theo ID
  getClubById(id) {
    const clubs = this.getClubs();
    return clubs.find(c => String(c.id) === String(id));
  },

  // Xóa nhóm dinh dưỡng (Cập nhật Local & Firebase Firestore)
  deleteClub(id) {
    const clubs = this.getClubs().filter(c => String(c.id) !== String(id));
    try {
      localStorage.setItem("nutriclub_clubs", JSON.stringify(clubs));
    } catch(e) {}

    if (window.firebaseDb && window.firestoreHelpers) {
      const { doc, deleteDoc } = window.firestoreHelpers;
      try {
        deleteDoc(doc(window.firebaseDb, "clubs", String(id)));
        console.log("🔥 Deleted club from Firestore:", id);
      } catch(err) {
        console.error("Error deleting from Firestore:", err);
      }
    }
  },

  // Loại bỏ dấu tiếng Việt để tìm kiếm gần đúng (Fuzzy Accent-Insensitive Matching)
  removeVietnameseAccents(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  },

  // Tính khoảng cách giữa 2 tọa độ bằng công thức Haversine (đơn vị: km)
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
    const R = 6371; // Bán kính Trái Đất theo km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Khoảng cách theo km
  },

  // So khớp gần đúng (Fuzzy Match: không phân biệt hoa thường, bỏ dấu, khớp từ phần)
  fuzzySearchMatch(text, keyword) {
    if (!keyword || !keyword.trim()) return true;
    const normText = this.removeVietnameseAccents(text);
    const normKey = this.removeVietnameseAccents(keyword);

    if (normText.includes(normKey)) return true;

    const tokens = normKey.split(/\s+/);
    return tokens.every(token => normText.includes(token));
  },

  // Tìm kiếm gần đúng & Lọc các Nhóm Dinh Dưỡng trong bán kính (mặc định 20km) từ vị trí người dùng
  searchClubsWithinRadius({ keyword = "", maxRadiusKm = 20, userLocation = null } = {}, callback = null) {
    const defaultLocation = { lat: 21.0285, lng: 105.8542 }; // Vị trí mặc định: Trung tâm Hà Nội

    const executeFilter = (coords) => {
      const clubs = this.getClubs();
      const results = [];

      clubs.forEach(club => {
        // 1. So khớp gần đúng tên nhóm & địa chỉ
        const isMatch = this.fuzzySearchMatch(club.name, keyword) ||
                        this.fuzzySearchMatch(club.addressDetail, keyword) ||
                        this.fuzzySearchMatch(club.ward, keyword) ||
                        this.fuzzySearchMatch(club.province, keyword) ||
                        this.fuzzySearchMatch(club.ownerName, keyword);

        if (!isMatch) return;

        // 2. Tính khoảng cách Haversine (km)
        const distanceKm = this.calculateHaversineDistance(coords.lat, coords.lng, club.lat, club.lng);

        // 3. Lọc các nhóm trong bán kính <= maxRadiusKm (mặc định 20km)
        if (distanceKm <= maxRadiusKm) {
          results.push({
            ...club,
            distanceKm: Math.round(distanceKm * 10) / 10 // Làm tròn 1 chữ số thập phân
          });
        }
      });

      // 4. Sắp xếp từ gần nhất đến xa nhất
      results.sort((a, b) => a.distanceKm - b.distanceKm);

      if (typeof callback === "function") {
        callback(results, coords);
      }
      return results;
    };

    // Nếu đã có vị trí người dùng chỉ định
    if (userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number") {
      return executeFilter(userLocation);
    }

    // Sử dụng Geolocation API của trình duyệt
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          executeFilter(userCoords);
        },
        (err) => {
          console.warn("Geolocation bị từ chối hoặc lỗi, dùng tọa độ mặc định:", err.message);
          executeFilter(defaultLocation);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      return executeFilter(defaultLocation);
    }
  },

  // Lọc danh sách nhóm theo Mô Hình 2 Cấp (Tỉnh/Thành -> Xã/Phường/Đặc khu) & Tương thích lịch sử
  filterClubs({ type = "all", province = "all", ward = "all", district = "all", keyword = "", features = [], openingTime = "all", sortBy = "rating", userCoord = null, radiusKm = null }) {
    let clubs = this.getClubs();

    // 1. Lọc theo loại hình
    if (type && type !== "all") {
      const targetType = type.toLowerCase().trim();
      clubs = clubs.filter(c => {
        const cType = (c.type || '').toLowerCase().trim();
        return cType.includes(targetType) || targetType.includes(cType);
      });
    }

    // 2. Lọc theo Tỉnh / Thành phố
    if (province && province !== "all") {
      const targetProv = province.toLowerCase().trim();
      clubs = clubs.filter(c => (c.province || '').toLowerCase().trim() === targetProv);
    }

    // 3. Lọc theo Xã / Phường / Đặc khu (Cấp 2 hiện hành)
    const targetWard = (ward && ward !== "all") ? ward : (district && district !== "all" ? district : "all");
    if (targetWard && targetWard !== "all") {
      const wTarget = targetWard.toLowerCase().trim();
      clubs = clubs.filter(c => {
        const cWard = (c.ward || '').toLowerCase().trim();
        const cHistDist = (c.historicalDistrict || c.district || '').toLowerCase().trim();
        return cWard.includes(wTarget) || wTarget.includes(cWard) || cHistDist.includes(wTarget) || wTarget.includes(cHistDist);
      });
    }

    // 4. Lọc theo tiện ích / dịch vụ (Features)
    if (features && features.length > 0) {
      clubs = clubs.filter(c => {
        if (!c.features || !Array.isArray(c.features)) return false;
        return features.every(reqFeat =>
          c.features.some(f => (f || '').toLowerCase().includes(reqFeat.toLowerCase()))
        );
      });
    }

    // 5. Lọc theo khung giờ hoạt động
    if (openingTime && openingTime !== "all") {
      if (openingTime === "morning") {
        clubs = clubs.filter(c => {
          const h = (c.openingHours || '').toLowerCase();
          return h.includes("05:") || h.includes("06:") || h.includes("07:") || h.includes("sáng");
        });
      } else if (openingTime === "evening") {
        clubs = clubs.filter(c => {
          const h = (c.openingHours || '').toLowerCase();
          return h.includes("16:") || h.includes("17:") || h.includes("18:") || h.includes("chiều");
        });
      }
    }

    // 6. Lọc theo từ khóa tìm kiếm gần đúng (Fuzzy Search)
    if (keyword && keyword.trim()) {
      clubs = clubs.filter(c =>
        this.fuzzySearchMatch(c.name, keyword) ||
        this.fuzzySearchMatch(c.addressDetail, keyword) ||
        this.fuzzySearchMatch(c.ownerName, keyword) ||
        this.fuzzySearchMatch(c.ward, keyword) ||
        this.fuzzySearchMatch(c.district, keyword) ||
        this.fuzzySearchMatch(c.province, keyword) ||
        this.fuzzySearchMatch(c.type, keyword)
      );
    }

    // 7. Gắn khoảng cách Haversine nếu có toạ độ người dùng
    if (userCoord && typeof userCoord.lat === "number" && typeof userCoord.lng === "number") {
      clubs.forEach(c => {
        c.distanceKm = Math.round(this.calculateHaversineDistance(userCoord.lat, userCoord.lng, c.lat, c.lng) * 10) / 10;
      });

      // Nếu chỉ định bán kính lọc
      if (radiusKm && radiusKm > 0) {
        clubs = clubs.filter(c => c.distanceKm <= radiusKm);
      }
    }

    // 8. Sắp xếp thông minh
    if (sortBy === "rating") {
      clubs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "members") {
      clubs.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    } else if (sortBy === "name") {
      clubs.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    } else if (sortBy === "distance" && userCoord) {
      clubs.sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
    }

    return clubs;
  },

  // Tạo danh sách gợi ý tìm kiếm tức thì (Live Auto-suggestions)
  getSuggestions(keyword) {
    const q = (keyword || '').toLowerCase().trim();
    if (!q) return { clubs: [], coaches: [], locations: [], features: [] };

    const clubs = this.getClubs();
    const suggestions = {
      clubs: [],
      coaches: [],
      locations: [],
      features: []
    };

    // 1. Nhóm Dinh Dưỡng khớp tên
    clubs.forEach(c => {
      if ((c.name || '').toLowerCase().includes(q)) {
        suggestions.clubs.push({
          id: c.id,
          title: c.name || 'Nhóm Dinh Dưỡng',
          sub: `${c.addressDetail || ''}, ${c.ward || ''}, ${c.province || ''}`,
          type: c.type || 'Nhóm dinh dưỡng',
          image: c.image || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
        });
      }
    });

    // 2. Khớp Chủ nhóm / Huấn luyện viên
    const seenCoaches = new Set();
    const isVIP = AuthManager.isVIPUser();

    clubs.forEach(c => {
      const owner = c.ownerName || '';
      if (owner && owner.toLowerCase().includes(q) && !seenCoaches.has(owner)) {
        seenCoaches.add(owner);
        const coachPhone = isVIP ? (c.ownerPhone || 'Liên hệ') : maskPhone(c.ownerPhone || '0902030185');
        suggestions.coaches.push({
          id: c.id,
          title: owner,
          sub: `Chủ nhóm • ${c.name} (${coachPhone})`,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(owner)}`
        });
      }
      if (c.coOperators && Array.isArray(c.coOperators)) {
        c.coOperators.forEach(co => {
          const coName = co.name || '';
          if (coName && coName.toLowerCase().includes(q) && !seenCoaches.has(coName)) {
            seenCoaches.add(coName);
            suggestions.coaches.push({
              id: c.id,
              title: coName,
              sub: `Đồng vận hành • ${c.name}`,
              image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(coName)}`
            });
          }
        });
      }
    });

    // 3. Khớp Địa điểm (Tỉnh/Thành phố, Xã/Phường/Thị trấn/Đặc khu 2 cấp & Địa danh lịch sử)
    if (typeof LocationManager !== "undefined") {
      const locResults = LocationManager.searchLocations(q);
      locResults.forEach(l => {
        suggestions.locations.push({
          title: l.title,
          type: l.subtitle || (l.type === "PROVINCE" ? "Tỉnh / Thành phố" : "Xã / Phường / Đặc khu"),
          province: l.provinceName,
          ward: l.wardName || l.provinceName
        });
      });
    } else if (typeof VIETNAM_LOCATIONS !== "undefined" && Array.isArray(VIETNAM_LOCATIONS)) {
      const seenLocs = new Set();
      VIETNAM_LOCATIONS.forEach(p => {
        if ((p.province || '').toLowerCase().includes(q) && !seenLocs.has(p.province)) {
          seenLocs.add(p.province);
          suggestions.locations.push({ title: p.province, type: "Tỉnh / Thành phố", province: p.province });
        }
        if (p.wards && Array.isArray(p.wards)) {
          p.wards.forEach(w => {
            const wName = typeof w === 'string' ? w : w.name;
            if (wName && wName.toLowerCase().includes(q) && !seenLocs.has(wName)) {
              seenLocs.add(wName);
              suggestions.locations.push({ title: `${wName} (${p.province})`, type: "Xã / Phường / Đặc khu", province: p.province, ward: wName });
            }
          });
        }
      });
    }

    return suggestions;
  },

  // Tạo nhóm dinh dưỡng mới
  createClub(clubData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: "Vui lòng đăng nhập để đăng nhóm dinh dưỡng!" };
    }

    const clubs = this.getClubs();

    // Tạo toạ độ mặc định hoặc theo tỉnh nếu chưa chỉ định
    let defaultLat = 21.0285;
    let defaultLng = 105.8542;
    if (clubData.province === "TP. Hồ Chí Minh") {
      defaultLat = 10.7769 + (Math.random() * 0.05 - 0.025);
      defaultLng = 106.7009 + (Math.random() * 0.05 - 0.025);
    } else if (clubData.province === "Đà Nẵng") {
      defaultLat = 16.0544 + (Math.random() * 0.04 - 0.02);
      defaultLng = 108.2022 + (Math.random() * 0.04 - 0.02);
    } else {
      defaultLat = 21.0285 + (Math.random() * 0.04 - 0.02);
      defaultLng = 105.8542 + (Math.random() * 0.04 - 0.02);
    }

    const newClub = {
      id: "club_" + Date.now(),
      name: clubData.name,
      type: clubData.type || "Nhóm dinh dưỡng chuyên sâu",
      image: clubData.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: currentUser.id,
      ownerName: currentUser.name, // Lấy mặc định tên user
      ownerPhone: currentUser.phone, // Lấy mặc định SĐT đăng ký
      coOperators: clubData.coOperators || [], // Danh sách đồng vận hành đã chọn
      province: clubData.province,
      district: clubData.district,
      ward: clubData.ward,
      addressDetail: clubData.addressDetail,
      openingHours: clubData.openingHours || "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: clubData.story || "Chào mừng bạn đến với nhóm dinh dưỡng của chúng tôi! Nơi cùng nhau chia sẻ thói quen sống khỏe, năng động và hạnh phúc.",
      lat: clubData.lat || defaultLat,
      lng: clubData.lng || defaultLng,
      rating: 5.0,
      memberCount: 1,
      features: clubData.features || ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh", "Đo chỉ số cơ thể miễn phí"]
    };

    clubs.unshift(newClub);
    this.saveClubs(clubs);
    return { success: true, club: newClub };
  },

  // Alias tương thích
  addClub(clubData) {
    return this.createClub(clubData);
  },

  // Render HTML danh sách nhóm dạng Card
  renderClubCards(clubs) {
    if (!clubs || clubs.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3>Không tìm thấy Nhóm Dinh Dưỡng phù hợp</h3>
          <p>Hãy thử thay đổi điều kiện tìm kiếm, chọn khu vực khác hoặc đăng nhóm dinh dưỡng mới của bạn!</p>
          <button class="btn btn-primary" onclick="App.openCreateClubModal()">
            <i class="fa-solid fa-plus"></i>
            Đăng Nhóm Dinh Dưỡng Của Bạn
          </button>
        </div>
      `;
    }

    const isVIP = AuthManager.isVIPUser();

    return clubs.map(club => {
      const isDeep = (club.type || '').includes("chuyên sâu");
      const badgeClass = isDeep ? "badge-deep" : "badge-sport";
      const coOpCount = club.coOperators && Array.isArray(club.coOperators) ? club.coOperators.length : 0;

      const safeName = escapeHtml(club.name || 'Nhóm Dinh Dưỡng');
      const safeType = escapeHtml(club.type || 'Nhóm dinh dưỡng');
      const safeOwnerName = escapeHtml(club.ownerName || 'Chủ nhiệm CLB');
      const safeOpeningHours = escapeHtml(club.openingHours || 'Giờ mở cửa: 05:30 - 09:30');
      const safeImage = sanitizeUrl(club.image, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80');

      // Xử lý bảo mật thông tin cho tài khoản Dùng Thử
      const displayAddress = isVIP
        ? `${escapeHtml(club.addressDetail || '')}, ${escapeHtml(club.ward || '')}, ${escapeHtml(club.province || '')}`
        : `${escapeHtml(club.ward || '')}, ${escapeHtml(club.province || '')} (<i class="fa-solid fa-lock"></i> Số nhà & Tên đường bị khóa)`;

      return `
        <div class="club-card" onclick="ClubManager.showClubDetailModal('${escapeJsAttr(club.id)}')">
          <div class="club-image-wrap">
            <img src="${safeImage}" alt="${safeName}" class="club-img" onerror="this.src='https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'">
            <span class="club-type-badge ${badgeClass}">${safeType}</span>
            <span class="club-rating-badge"><i class="fa-solid fa-star" style="color:#f59e0b;"></i> ${escapeHtml(club.rating || '5.0')}</span>
          </div>
          <div class="club-body">
            <h3 class="club-title">${safeName}</h3>

            <div class="club-location-text">
              <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i>
              <span>${displayAddress}</span>
            </div>

            <div class="club-hours">
              <i class="fa-solid fa-clock" style="color: var(--text-muted);"></i>
              <span>${safeOpeningHours}</span>
            </div>

            <div class="club-owner-row">
              <div class="owner-profile" onclick="event.stopPropagation(); App.openUserProfilePage();" style="cursor: pointer;" title="Bấm để xem hồ sơ Chủ nhóm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(club.ownerName || 'Host')}" class="owner-avatar" alt="${safeOwnerName}">
                <div class="owner-info">
                  <span class="owner-title-role">Chủ nhóm</span>
                  <span class="owner-name">${safeOwnerName}</span>
                </div>
              </div>

              ${!isVIP ? `<span class="vip-lock-badge" onclick="event.stopPropagation(); App.openVIPUpgradeModal();"><i class="fa-solid fa-lock"></i> Nâng Cấp VIP</span>` : ''}
              ${coOpCount > 0 && isVIP ? `<span class="co-op-count-tag">+${coOpCount} Đồng vận hành</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Hiển thị modal chi tiết nhóm
  showClubDetailModal(clubId) {
    const club = this.getClubById(clubId);
    if (!club) return;

    const modalContent = document.getElementById("clubDetailModalBody");
    const modalTitle = document.getElementById("clubDetailModalTitle");

    if (modalTitle) modalTitle.innerText = club.name || 'Chi Tiết Nhóm Dinh Dưỡng';

    const isDeep = (club.type || '').includes("chuyên sâu");
    const badgeClass = isDeep ? "badge-deep" : "badge-sport";

    // Kiểm tra quyền VIP của người dùng hiện tại
    const isVIP = AuthManager.isVIPUser();

    const safeName = escapeHtml(club.name || 'Nhóm dinh dưỡng');
    const safeType = escapeHtml(club.type || 'Nhóm dinh dưỡng');
    const safeOwnerName = escapeHtml(club.ownerName || 'Huấn luyện viên');
    const safeOpeningHours = escapeHtml(club.openingHours || 'Sáng: 05:30 - 09:30');
    const safeStory = escapeHtml(club.story || 'Chào mừng bạn đến với nhóm dinh dưỡng!');
    const safeImage = sanitizeUrl(club.image, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80');

    // Định dạng Địa chỉ và Số điện thoại bảo mật
    const displayAddress = isVIP
      ? `${escapeHtml(club.addressDetail || '')}, ${escapeHtml(club.ward || '')}, ${escapeHtml(club.province || '')}`
      : `${escapeHtml(club.ward || '')}, ${escapeHtml(club.province || '')} <span style="color:#ef4444; font-weight:700; font-size:0.85rem;">(<i class="fa-solid fa-lock"></i> Số nhà & Tên đường bị ẩn)</span>`;

    const rawPhone = escapeHtml(club.ownerPhone || '0902030185');
    const displayPhone = isVIP
      ? rawPhone
      : `${escapeHtml(maskPhone(club.ownerPhone))} <span style="color:#ef4444; font-weight:700; font-size:0.82rem;">(<i class="fa-solid fa-lock"></i> Nâng cấp VIP để xem đầy đủ)</span>`;

    const phoneActionBtn = isVIP
      ? `<a href="tel:${encodeURIComponent(club.ownerPhone || '0902030185')}" class="btn btn-primary">
          <i class="fa-solid fa-phone"></i>
          Gọi: ${rawPhone}
         </a>`
      : `<button class="btn btn-primary" onclick="App.openVIPUpgradeModal()">
          <i class="fa-solid fa-lock"></i> Gọi: ${escapeHtml(maskPhone(club.ownerPhone))}
         </button>`;

    const mapActionBtn = isVIP
      ? `<button class="btn btn-outline" onclick="App.showOnMap(${Number(club.lat) || 21.0285}, ${Number(club.lng) || 105.8542}, '${escapeJsAttr(club.name || '')}')">
          <i class="fa-solid fa-map-location-dot"></i>
          Xem Bản Đồ
         </button>`
      : `<button class="btn btn-outline" onclick="App.openVIPUpgradeModal()">
          <i class="fa-solid fa-lock"></i> Mở Khóa Bản Đồ
         </button>`;

    const vipLockBanner = !isVIP ? `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1.5px solid #f59e0b; border-radius: var(--radius-md); padding: 16px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #92400e; margin-bottom: 4px;">
              🔒 Bạn chưa đăng nhập hoặc đang dùng Tài Khoản Dùng Thử
            </div>
            <div style="font-size: 0.88rem; color: #78350f;">
              Nâng cấp gói thành viên <strong>(99k/tháng - 999k/năm)</strong> để mở khóa Số điện thoại đầy đủ, Số nhà/Tên đường và Bản đồ chỉ đường!
            </div>
          </div>
          <button class="btn btn-primary" onclick="App.openVIPUpgradeModal()">
            🚀 Nâng Cấp VIP Ngay (99k)
          </button>
        </div>
      </div>
    ` : '';

    // Tìm các sự kiện của nhóm này
    const events = typeof EventManager !== "undefined" ? EventManager.getEventsByClubId(club.id) : [];

    let coOperatorsHtml = '';
    if (club.coOperators && Array.isArray(club.coOperators) && club.coOperators.length > 0) {
      coOperatorsHtml = `
        <div style="margin-top: 18px;">
          <h4 style="font-size: 1rem; margin-bottom: 8px;">Đội ngũ Đồng Vận Hành:</h4>
          <div class="co-operators-list-grid">
            ${club.coOperators.map(co => {
              const safeCoName = escapeHtml(co.name || 'Đồng vận hành');
              const safeCoPhone = escapeHtml(isVIP ? (co.phone || 'Liên hệ') : maskPhone(co.phone || '0902030185'));
              return `
              <div class="co-op-card-mini">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(co.name || 'CoOp')}" class="co-op-item-avatar" alt="${safeCoName}">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">${safeCoName}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">SĐT: ${safeCoPhone}</div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    let eventsHtml = '';
    if (events && events.length > 0) {
      eventsHtml = `
        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-color);">
          <h4 style="font-size: 1.1rem; margin-bottom: 12px; color: var(--secondary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-star" style="color: var(--secondary);"></i> Sự Kiện Sắp Diễn Ra Tại Nhóm:
          </h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${events.map(ev => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);"><i class="fa-solid fa-sparkles" style="color: var(--secondary); margin-right: 4px;"></i> ${escapeHtml(ev.title)}</div>
                  <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                    <span><i class="fa-solid fa-calendar-days" style="color: var(--secondary);"></i> ${escapeHtml(ev.date)} (${escapeHtml(ev.time)})</span>
                    <span><i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${escapeHtml(ev.locationType)}</span>
                  </div>
                </div>
                <button class="btn btn-sm btn-primary" style="font-weight: 700; padding: 6px 14px;" onclick="EventManager.joinEvent('${escapeJsAttr(ev.id)}')">
                  <i class="fa-solid fa-calendar-check"></i> Đăng Ký
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (modalContent) {
      modalContent.innerHTML = `
        ${vipLockBanner}

        <div class="club-detail-hero">
          <img src="${safeImage}" class="club-detail-img" alt="${safeName}">
          <span class="club-type-badge ${badgeClass}" style="top: 16px; left: 16px;">${safeType}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.95rem; margin-bottom: 6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <strong>Địa chỉ:</strong> ${displayAddress}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; color: var(--secondary-hover); font-size: 0.95rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <strong>Giờ mở cửa:</strong> ${safeOpeningHours}
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            ${phoneActionBtn}
            ${mapActionBtn}
          </div>
        </div>

        <!-- Chủ nhóm & Câu chuyện -->
        <div style="background: var(--bg-main); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 14px;">
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(club.ownerName || 'Host')}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--primary);" alt="${safeOwnerName}">
            <div>
              <div style="font-weight: 800; font-size: 1.05rem;">Chủ Nhóm: ${safeOwnerName}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Hotline / Zalo: ${displayPhone}</div>
            </div>
          </div>

          <h4 style="font-size: 0.95rem; color: var(--primary); margin-bottom: 6px;">📖 Câu Chuyện Chủ Nhóm:</h4>
          <div class="club-detail-story-box">
            "${safeStory}"
          </div>
        </div>

        ${coOperatorsHtml}
        ${eventsHtml}
      `;
    }

    App.openModal("clubDetailModal");
  }
};

if (typeof window !== "undefined") {
  window.ClubManager = ClubManager;
}

