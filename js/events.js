/**
 * Events Management Module
 */

const EventManager = {
  getEvents() {
    try {
      const events = localStorage.getItem("nutriclub_events");
      if (events) {
        const parsed = JSON.parse(events);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading events from localStorage:", e);
    }
    return typeof SEED_EVENTS !== "undefined" ? SEED_EVENTS : [];
  },

  saveEvents(events) {
    try {
      localStorage.setItem("nutriclub_events", JSON.stringify(events));
    } catch (e) {
      console.error("Error saving events to localStorage:", e);
    }
  },

  getEventsByClubId(clubId) {
    const events = this.getEvents();
    return events.filter(e => e.clubId === clubId);
  },

  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    this.saveEvents(events);
  },

  createEvent(eventData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: "Vui lòng đăng nhập để đăng sự kiện!" };
    }

    const events = this.getEvents();
    const newEvent = {
      id: "evt_" + Date.now(),
      clubId: eventData.clubId,
      clubName: eventData.clubName,
      title: eventData.title,
      image: eventData.image || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80",
      date: eventData.date,
      time: eventData.time,
      locationType: eventData.locationType || "Trực tiếp tại nhóm",
      address: eventData.address,
      description: eventData.description,
      participantsCount: 1,
      maxParticipants: parseInt(eventData.maxParticipants) || 50,
      hostName: currentUser.name,
      isFree: eventData.isFree !== undefined ? eventData.isFree : true
    };

    events.unshift(newEvent);
    this.saveEvents(events);
    return { success: true, event: newEvent };
  },

  joinEvent(eventId) {
    if (typeof App !== "undefined" && typeof App.openEventJoinModal === "function") {
      App.openEventJoinModal(eventId);
    } else {
      const events = this.getEvents();
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) return;
      events[eventIndex].participantsCount = (events[eventIndex].participantsCount || 0) + 1;
      this.saveEvents(events);
      alert(`🎉 Bạn đã đăng ký tham gia sự kiện "${events[eventIndex].title}" thành công!`);
    }
  },

  addRegistration(eventId, regData) {
    const events = this.getEvents();
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return { success: false, message: "Không tìm thấy sự kiện!" };

    const evt = events[eventIndex];
    if (!evt.registrations) evt.registrations = [];

    const newReg = {
      id: "reg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name: (regData.name || "").trim(),
      phone: (regData.phone || "").trim(),
      note: (regData.note || "").trim(),
      numAttendees: parseInt(regData.numAttendees) || 1,
      registeredAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }),
      status: regData.status || "confirmed"
    };

    evt.registrations.unshift(newReg);
    evt.participantsCount = evt.registrations.length;
    this.saveEvents(events);
    return { success: true, registration: newReg, event: evt };
  },

  updateRegistrationStatus(eventId, regId, newStatus) {
    const events = this.getEvents();
    const evt = events.find(e => e.id === eventId);
    if (!evt || !evt.registrations) return { success: false };

    const reg = evt.registrations.find(r => r.id === regId);
    if (reg) {
      reg.status = newStatus;
      this.saveEvents(events);
      return { success: true, event: evt };
    }
    return { success: false };
  },

  deleteRegistration(eventId, regId) {
    const events = this.getEvents();
    const evt = events.find(e => e.id === eventId);
    if (!evt || !evt.registrations) return { success: false };

    evt.registrations = evt.registrations.filter(r => r.id !== regId);
    evt.participantsCount = evt.registrations.length;
    this.saveEvents(events);
    return { success: true, event: evt };
  },

  renderEventCards(events) {
    if (!events || events.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-calendar-days"></i></div>
          <h3>Chưa có sự kiện nào</h3>
          <p>Các nhóm dinh dưỡng thường xuyên tổ chức sự kiện kiểm tra InBody, Workshop và Thử thách sức khỏe. Hãy quay lại sau hoặc đăng sự kiện mới!</p>
        </div>
      `;
    }

    const currentUser = typeof AuthManager !== "undefined" ? AuthManager.getCurrentUser() : null;
    const isAdmin = typeof AuthManager !== "undefined" ? AuthManager.isAdminUser() : false;

    return events.map(evt => {
      const safeTitle = escapeHtml(evt.title || '');
      const safeClubName = escapeHtml(evt.clubName || 'Nhóm dinh dưỡng');
      const safeHostName = escapeHtml(evt.hostName || 'HLV Nhóm');
      const safeTime = escapeHtml(evt.time || '');
      const safeDate = escapeHtml(evt.date || '');
      const safeLocationType = escapeHtml(evt.locationType || '');
      const safeAddress = escapeHtml(evt.address || '');
      const safeDescription = escapeHtml(evt.description || '');
      const safeImage = sanitizeUrl(evt.image, 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80');

      const textLower = (evt.title + " " + (evt.description || "")).toLowerCase();
      let catBadge = `<span style="position: absolute; top: 12px; left: 12px; background: rgba(5, 150, 105, 0.92); backdrop-filter: blur(4px); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa-solid fa-calendar-days" style="color: #fde68a;"></i> Sự Kiện</span>`;
      
      if (textLower.includes("inbody") || textLower.includes("đo") || textLower.includes("quét")) {
        catBadge = `<span style="position: absolute; top: 12px; left: 12px; background: rgba(5, 150, 105, 0.92); backdrop-filter: blur(4px); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa-solid fa-notes-medical" style="color: #34d399;"></i> Đo InBody</span>`;
      } else if (textLower.includes("chạy") || textLower.includes("cardio") || textLower.includes("hiit") || textLower.includes("vận động")) {
        catBadge = `<span style="position: absolute; top: 12px; left: 12px; background: rgba(13, 148, 136, 0.92); backdrop-filter: blur(4px); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa-solid fa-person-running" style="color: #2dd4bf;"></i> Vận Động & HIIT</span>`;
      } else if (textLower.includes("workshop") || textLower.includes("trà") || textLower.includes("chế biến") || textLower.includes("dinh dưỡng")) {
        catBadge = `<span style="position: absolute; top: 12px; left: 12px; background: rgba(217, 119, 6, 0.92); backdrop-filter: blur(4px); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa-solid fa-utensils" style="color: #fde68a;"></i> Workshop Dinh Dưỡng</span>`;
      } else if (textLower.includes("thử thách") || textLower.includes("21 ngày")) {
        catBadge = `<span style="position: absolute; top: 12px; left: 12px; background: rgba(217, 119, 6, 0.92); backdrop-filter: blur(4px); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 0.76rem; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><i class="fa-solid fa-trophy" style="color: #fde68a;"></i> Thử Thách 21 Ngày</span>`;
      }

      const isHostOrAdmin = currentUser && (isAdmin || evt.hostName === currentUser.name || (currentUser.phone && evt.hostPhone === currentUser.phone));
      const regList = evt.registrations || [];
      const countReg = regList.length > 0 ? regList.length : (evt.participantsCount || 0);

      let actionBtnHtml = '';
      if (isHostOrAdmin) {
        actionBtnHtml = `
          <button class="btn btn-primary" style="width: 100%; padding: 8px 14px; font-size: 0.88rem; font-weight: 700; background: #059669; border-color: #059669; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="App.openEventRegistrationsModal('${escapeJsAttr(evt.id)}')">
            <i class="fa-solid fa-users-gear"></i> Quản Lý Người Đăng Ký (${countReg})
          </button>
        `;
      } else {
        const userReg = currentUser && regList.find(r => r.phone === currentUser.phone || r.name === currentUser.name);
        if (userReg) {
          actionBtnHtml = `
            <button class="btn btn-outline" style="width: 100%; padding: 8px 14px; font-size: 0.88rem; font-weight: 700; color: #059669; border-color: #059669; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="EventManager.joinEvent('${escapeJsAttr(evt.id)}')">
              <i class="fa-solid fa-circle-check"></i> Bạn Đã Đăng Ký (${userReg.numAttendees || 1} người)
            </button>
          `;
        } else {
          actionBtnHtml = `
            <button class="btn btn-primary" style="width: 100%; padding: 8px 14px; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="EventManager.joinEvent('${escapeJsAttr(evt.id)}')">
              <i class="fa-solid fa-calendar-check"></i> Đăng Ký Tham Gia
            </button>
          `;
        }
      }

      return `
        <div class="event-card">
          <div class="event-img-wrap" style="position: relative;">
            ${catBadge}
            <img src="${safeImage}" alt="${safeTitle}" class="event-img" onerror="this.src='https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80'">
            <div class="event-date-badge">
              <i class="fa-solid fa-calendar-days" style="color: var(--secondary);"></i>
              <span>${safeDate}</span>
            </div>
          </div>
          <div class="event-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
              <span class="event-club-name" style="flex: 1;"><i class="fa-solid fa-house" style="color: var(--primary);"></i> ${safeClubName}</span>
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 12px; background: rgba(5, 150, 105, 0.12); color: var(--primary); white-space: nowrap; flex-shrink: 0;"><i class="fa-solid fa-ticket"></i> ${evt.isFree !== false ? 'Miễn Phí' : 'Vé Tham Gia'}</span>
            </div>

            <h3 class="event-title">${safeTitle}</h3>

            <div class="event-info-row" style="margin-top: 6px;">
              <i class="fa-solid fa-user-tie" style="color: var(--secondary);"></i>
              <span>Chủ trì: <strong>${safeHostName}</strong></span>
            </div>

            <div class="event-info-row">
              <i class="fa-solid fa-clock" style="color: var(--secondary);"></i>
              <span>${safeTime}</span>
            </div>

            <div class="event-info-row">
              <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i>
              <span>${safeLocationType}: ${safeAddress}</span>
            </div>

            <p style="color: var(--text-muted); font-size: 0.88rem; margin: 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${safeDescription}
            </p>

            <div class="event-footer" style="display: flex; flex-direction: column; gap: 10px; align-items: stretch; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color);">
              <span style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">
                <i class="fa-solid fa-users" style="color: var(--accent-sport);"></i> Đã có ${countReg} / ${evt.maxParticipants || 50} người tham gia
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

if (typeof window !== "undefined") {
  window.EventManager = EventManager;
}

