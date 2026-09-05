/**
 * Vietnam 2-Level Administrative Location & Historical Mapping Engine
 * Models: Province (Tỉnh/TP) -> Ward (Xã/Phường/Đặc khu)
 * Includes: Historical Administrative Mapping (AdministrativeMapping Table), Autocomplete & Quality Audit
 */

const LocationManager = {
  STORAGE_KEY_PROVINCES: "nutriclub_provinces",
  STORAGE_KEY_WARDS: "nutriclub_wards",
  STORAGE_KEY_MAPPINGS: "nutriclub_mappings",

  LOCATION_VERSION: "2026_excel_v34_3321",

  // -------------------------------------------------------------------
  // 1. DATA INITIALIZATION & GETTERS
  // -------------------------------------------------------------------
  getProvinces() {
    const seed = this.getOfficialProvincesSeed();
    try {
      const ver = localStorage.getItem("nutriclub_location_version");
      if (ver !== this.LOCATION_VERSION) {
        localStorage.removeItem(this.STORAGE_KEY_PROVINCES);
        localStorage.removeItem(this.STORAGE_KEY_WARDS);
        localStorage.setItem("nutriclub_location_version", this.LOCATION_VERSION);
      }
      const stored = localStorage.getItem(this.STORAGE_KEY_PROVINCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === seed.length) return parsed;
      }
    } catch (e) {
      console.error("Error reading provinces:", e);
    }
    this.saveProvinces(seed);
    return seed;
  },

  getWards(provinceCode = null) {
    let wards = [];
    const seed = this.getOfficialWardsSeed();
    try {
      const ver = localStorage.getItem("nutriclub_location_version");
      if (ver !== this.LOCATION_VERSION) {
        localStorage.removeItem(this.STORAGE_KEY_PROVINCES);
        localStorage.removeItem(this.STORAGE_KEY_WARDS);
        localStorage.setItem("nutriclub_location_version", this.LOCATION_VERSION);
      }
      const stored = localStorage.getItem(this.STORAGE_KEY_WARDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === seed.length) wards = parsed;
      }
    } catch (e) {
      console.error("Error reading wards:", e);
    }

    if (!wards || wards.length === 0 || wards.length !== seed.length) {
      wards = seed;
      this.saveWards(wards);
    }

    if (provinceCode && provinceCode !== "all") {
      const pCode = String(provinceCode).toLowerCase().trim();
      return wards.filter(w => String(w.provinceCode).toLowerCase().trim() === pCode || String(w.provinceName).toLowerCase().trim() === pCode);
    }
    return wards;
  },

  getMappings() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_MAPPINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading mappings:", e);
    }
    return typeof SEED_ADMINISTRATIVE_MAPPINGS !== "undefined" ? SEED_ADMINISTRATIVE_MAPPINGS : [];
  },

  saveProvinces(data) {
    try { localStorage.setItem(this.STORAGE_KEY_PROVINCES, JSON.stringify(data)); } catch (e) {}
  },

  saveWards(data) {
    try { localStorage.setItem(this.STORAGE_KEY_WARDS, JSON.stringify(data)); } catch (e) {}
  },

  saveMappings(data) {
    try { localStorage.setItem(this.STORAGE_KEY_MAPPINGS, JSON.stringify(data)); } catch (e) {}
  },

  // -------------------------------------------------------------------
  // 2. OFFICIAL SEED GENERATORS (63 PROVINCES & WARDS / SPECIAL ZONES / TOWNS)
  // -------------------------------------------------------------------
  getOfficialProvincesSeed() {
    if (typeof VIETNAM_LOCATIONS !== "undefined" && Array.isArray(VIETNAM_LOCATIONS)) {
      return VIETNAM_LOCATIONS.map((p, idx) => ({
        provinceCode: "PROV_" + String(idx + 1).padStart(3, "0"),
        provinceName: p.province,
        provinceType: p.province.startsWith("TP.") ? "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG" : "TỈNH",
        oldNames: p.oldNames || [],
        status: "ACTIVE"
      }));
    }
    return [
      { provinceCode: "PROV_001", provinceName: "Hà Nội", provinceType: "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG", oldNames: ["Thủ đô Hà Nội"], status: "ACTIVE" },
      { provinceCode: "PROV_002", provinceName: "TP. Hồ Chí Minh", provinceType: "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG", oldNames: ["Sài Gòn"], status: "ACTIVE" },
      { provinceCode: "PROV_003", provinceName: "Đà Nẵng", provinceType: "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG", oldNames: [], status: "ACTIVE" },
      { provinceCode: "PROV_004", provinceName: "Hải Phòng", provinceType: "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG", oldNames: [], status: "ACTIVE" },
      { provinceCode: "PROV_005", provinceName: "Cần Thơ", provinceType: "THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG", oldNames: [], status: "ACTIVE" }
    ];
  },

  getOfficialWardsSeed() {
    const wardsList = [];
    if (typeof VIETNAM_LOCATIONS !== "undefined" && Array.isArray(VIETNAM_LOCATIONS)) {
      VIETNAM_LOCATIONS.forEach((p, pIdx) => {
        const pCode = "PROV_" + String(pIdx + 1).padStart(3, "0");
        (p.wards || []).forEach((wName, wIdx) => {
          let wType = "PHƯỜNG";
          if (wName.startsWith("Xã")) wType = "XÃ";
          else if (wName.startsWith("Thị trấn")) wType = "THỊ TRẤN";
          else if (wName.includes("Đặc khu")) wType = "ĐẶC KHU";

          wardsList.push({
            wardCode: `WARD_${pIdx + 1}_${wIdx + 1}`,
            wardName: wName,
            wardType: wType,
            provinceCode: pCode,
            provinceName: p.province,
            oldNames: [],
            status: "ACTIVE"
          });
        });
      });
    }
    return wardsList;
  },


  // -------------------------------------------------------------------
  // 3. SEARCH & AUTOCOMPLETE ENGINE (SUPPORTING HISTORICAL ALIASES)
  // -------------------------------------------------------------------
  searchLocations(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    // Search Provinces
    const provinces = this.getProvinces();
    provinces.forEach(p => {
      if (p.provinceName.toLowerCase().includes(q) || (p.oldNames && p.oldNames.some(o => o.toLowerCase().includes(q)))) {
        results.push({
          type: "PROVINCE",
          title: p.provinceName,
          subtitle: p.provinceType,
          provinceName: p.provinceName,
          provinceCode: p.provinceCode
        });
      }
    });

    // Search Wards & Special Zones
    const wards = this.getWards();
    wards.forEach(w => {
      if (w.wardName.toLowerCase().includes(q) || (w.oldNames && w.oldNames.some(o => o.toLowerCase().includes(q)))) {
        results.push({
          type: "WARD",
          title: `${w.wardName}, ${w.provinceName}`,
          subtitle: `Đơn vị 2 cấp (${w.wardType})`,
          wardName: w.wardName,
          wardCode: w.wardCode,
          provinceName: w.provinceName,
          provinceCode: w.provinceCode
        });
      }
    });

    // Search Historical District Mappings (e.g. "Quận 9", "Huyện Từ Liêm", "Thị xã Hà Đông")
    const mappings = this.getMappings();
    mappings.forEach(m => {
      const matchOld = (m.oldDistrictName && m.oldDistrictName.toLowerCase().includes(q)) ||
                       (m.oldWardName && m.oldWardName.toLowerCase().includes(q)) ||
                       (m.oldProvinceName && m.oldProvinceName.toLowerCase().includes(q));
      if (matchOld) {
        results.push({
          type: "HISTORICAL_MAPPING",
          title: `${m.newWardName}, ${m.newProvinceName}`,
          subtitle: `📍 Quy đổi từ địa danh cũ: ${m.oldWardName || ''} ${m.oldDistrictName || ''} (${m.oldProvinceName})`,
          wardName: m.newWardName,
          wardCode: m.newWardCode,
          provinceName: m.newProvinceName,
          provinceCode: m.newProvinceCode,
          historicalDistrict: m.oldDistrictName,
          effectiveDate: m.effectiveDate,
          sourceDocument: m.sourceDocument
        });
      }
    });

    return results.slice(0, 10);
  },

  // -------------------------------------------------------------------
  // 4. LEGACY ADDRESS MAPPING ENGINE
  // -------------------------------------------------------------------
  mapLegacyAddress(rawAddressStr) {
    if (!rawAddressStr) return { success: false, confidence: 0 };
    const cleanStr = rawAddressStr.toLowerCase().trim();
    const mappings = this.getMappings();

    // 1. Direct Mapping Lookup
    for (const m of mappings) {
      const matchDist = m.oldDistrictName && cleanStr.includes(m.oldDistrictName.toLowerCase());
      const matchWard = m.oldWardName && cleanStr.includes(m.oldWardName.toLowerCase());
      const matchProv = m.oldProvinceName && cleanStr.includes(m.oldProvinceName.toLowerCase());

      if (matchDist && (matchWard || matchProv)) {
        return {
          success: true,
          confidence: matchWard ? 0.95 : 0.85,
          mappedProvince: m.newProvinceName,
          mappedWard: m.newWardName,
          historicalDistrict: m.oldDistrictName,
          sourceDocument: m.sourceDocument,
          effectiveDate: m.effectiveDate,
          note: `Đã quy đổi theo ${m.sourceDocument || 'quy định hiện hành'}`
        };
      }
    }

    // 2. Fallback Matching to Current 2-Level Units
    const provinces = this.getProvinces();
    for (const p of provinces) {
      if (cleanStr.includes(p.provinceName.toLowerCase())) {
        const wards = this.getWards(p.provinceCode);
        for (const w of wards) {
          if (cleanStr.includes(w.wardName.toLowerCase())) {
            return {
              success: true,
              confidence: 0.9,
              mappedProvince: p.provinceName,
              mappedWard: w.wardName,
              historicalDistrict: null,
              note: "Khớp địa danh 2 cấp hiện hành"
            };
          }
        }
        return {
          success: true,
          confidence: 0.6,
          mappedProvince: p.provinceName,
          mappedWard: null,
          historicalDistrict: null,
          note: "Khớp cấp Tỉnh/Thành phố"
        };
      }
    }

    return { success: false, confidence: 0, rawAddressStr };
  },

  // -------------------------------------------------------------------
  // 5. VALIDATION & INTEGRITY CHECKS
  // -------------------------------------------------------------------
  validateWardInProvince(wardNameOrCode, provinceNameOrCode) {
    if (!wardNameOrCode || !provinceNameOrCode) return { valid: false, reason: "Thiếu dữ liệu Tỉnh hoặc Xã/Phường" };
    const wards = this.getWards();
    const provinces = this.getProvinces();
    const normProv = (name) => String(name || '').toLowerCase().replace(/^(tp\.|thành phố|tỉnh)\s*/i, '').trim();
    const inputProvNorm = normProv(provinceNameOrCode);

    const matchedWard = wards.find(w => {
      const wardMatch = w.wardCode === wardNameOrCode || w.wardName.toLowerCase() === String(wardNameOrCode).toLowerCase();
      if (!wardMatch) return false;

      const provMatch = w.provinceCode === provinceNameOrCode ||
                        w.provinceName.toLowerCase() === String(provinceNameOrCode).toLowerCase() ||
                        normProv(w.provinceName) === inputProvNorm;
      if (provMatch) return true;

      const pObj = provinces.find(p => p.provinceCode === w.provinceCode || p.provinceName === w.provinceName);
      if (pObj && pObj.oldNames && pObj.oldNames.some(o => normProv(o) === inputProvNorm)) {
        return true;
      }
      return false;
    });

    if (matchedWard) {
      return { valid: true, ward: matchedWard };
    }
    return { valid: false, reason: `Xã/Phường/Đặc khu "${wardNameOrCode}" không thuộc Tỉnh/Thành phố "${provinceNameOrCode}"` };
  },

  // -------------------------------------------------------------------
  // 6. DATA QUALITY AUDIT & REPORTING
  // -------------------------------------------------------------------
  runDataQualityCheck() {
    const provinces = this.getProvinces();
    const wards = this.getWards();
    const mappings = this.getMappings();

    const provCodes = new Set(provinces.map(p => p.provinceCode));
    const wardCodes = new Set();
    const duplicateWardCodes = [];
    const orphanWards = [];

    wards.forEach(w => {
      if (wardCodes.has(w.wardCode)) {
        duplicateWardCodes.push(w.wardCode);
      } else {
        wardCodes.add(w.wardCode);
      }

      if (!provCodes.has(w.provinceCode) && !provinces.some(p => p.provinceName === w.provinceName)) {
        orphanWards.push(w);
      }
    });

    const clubs = typeof ClubManager !== "undefined" ? ClubManager.getClubs() : [];
    const clubsInvalidLocation = [];
    clubs.forEach(c => {
      if (c.province && c.ward) {
        const val = this.validateWardInProvince(c.ward, c.province);
        if (!val.valid) {
          clubsInvalidLocation.push({ clubId: c.id, name: c.name, province: c.province, ward: c.ward, reason: val.reason });
        }
      }
    });

    return {
      totalProvinces: provinces.length,
      totalWards: wards.length,
      totalCommunes: wards.filter(w => w.wardType === "XÃ").length,
      totalSpecialZones: wards.filter(w => w.wardType === "ĐẶC KHU").length,
      totalMappings: mappings.length,
      duplicateWardCodes,
      orphanWards,
      clubsInvalidLocation,
      status: (duplicateWardCodes.length === 0 && orphanWards.length === 0 && clubsInvalidLocation.length === 0) ? "EXCELLENT" : "WARNING"
    };
  },

  // -------------------------------------------------------------------
  // 7. CSV / EXCEL IMPORT & EXPORT SERVICE
  // -------------------------------------------------------------------
  exportLocationsCSV() {
    const wards = this.getWards();
    let csv = "province_code,province_name,ward_code,ward_name,ward_type,status\n";
    wards.forEach(w => {
      csv += `"${w.provinceCode}","${w.provinceName}","${w.wardCode}","${w.wardName}","${w.wardType}","${w.status}"\n`;
    });
    return csv;
  },

  importLocationsFromCSV(csvText) {
    if (!csvText || typeof csvText !== "string") {
      return { success: false, error: "Dữ liệu CSV không hợp lệ" };
    }

    const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      return { success: false, error: "Tập tin CSV rỗng hoặc chỉ có dòng tiêu đề" };
    }

    const importedWards = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.replace(/^"|"$/g, "").trim());
      if (parts.length < 5) {
        errors.push(`Dòng ${i + 1}: Cấu trúc thiếu cột (yêu cầu tối thiểu 5 cột)`);
        continue;
      }

      const [provCode, provName, wardCode, wardName, wardType] = parts;
      if (!provName || !wardName) {
        errors.push(`Dòng ${i + 1}: Thiếu tên Tỉnh hoặc tên Xã/Phường`);
        continue;
      }

      importedWards.push({
        wardCode: wardCode || `WARD_IMP_${Date.now()}_${i}`,
        wardName: wardName,
        wardType: wardType || "PHƯỜNG",
        provinceCode: provCode || "PROV_CUSTOM",
        provinceName: provName,
        status: "ACTIVE"
      });
    }

    if (errors.length > 0 && importedWards.length === 0) {
      return { success: false, errors };
    }

    // Merge with current wards
    const currentWards = this.getWards();
    const wardMap = new Map();
    currentWards.forEach(w => wardMap.set(w.wardName + "_" + w.provinceName, w));
    importedWards.forEach(w => wardMap.set(w.wardName + "_" + w.provinceName, w));

    const finalWards = Array.from(wardMap.values());
    this.saveWards(finalWards);

    return {
      success: true,
      importedCount: importedWards.length,
      totalCount: finalWards.length,
      errors
    };
  }
};

if (typeof window !== "undefined") {
  window.LocationManager = LocationManager;
}
