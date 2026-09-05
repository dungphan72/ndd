/**
 * Interactive BMI Calculator & Personalized Health Advisor
 */

const BMICalculator = {
  // Chuẩn phân loại BMI theo chuẩn dành cho người châu Á (WPRO / IDI)
  classifyAsianBMI(bmi) {
    if (bmi < 18.5) {
      return {
        status: "Thiếu Cân (Gầy)",
        color: "#0d9488",
        badgeBg: "rgba(13, 148, 136, 0.15)",
        advice: "Bạn đang ở mức thiếu cân. Cần tăng cường nạp đủ dinh dưỡng cân bằng, bổ sung thêm Protein thực vật, bữa phụ dinh dưỡng lành mạnh và tập luyện tăng khối cơ thay vì tăng mỡ.",
        recommendedClubType: "Nhóm dinh dưỡng chuyên sâu"
      };
    } else if (bmi >= 18.5 && bmi <= 22.9) {
      return {
        status: "Vóc Dáng Chuẩn (Bình Thường)",
        color: "#059669",
        badgeBg: "rgba(5, 150, 105, 0.15)",
        advice: "Chúc mừng bạn! Chỉ số cơ thể đang ở mức rất lý tưởng. Hãy tiếp tục duy trì chế độ ăn giàu chất xơ, đủ đạm, uống đủ nước và sinh hoạt tại Nhóm dinh dưỡng vận động để nâng cao sức bền thể chất.",
        recommendedClubType: "Nhóm dinh dưỡng vận động"
      };
    } else if (bmi >= 23.0 && bmi <= 24.9) {
      return {
        status: "Tiền Béo Phì (Thừa Cân)",
        color: "#d97706",
        badgeBg: "rgba(217, 119, 6, 0.15)",
        advice: "Bạn đang có xu hướng dư thừa mỡ cơ thể. Cần cắt giảm lượng tinh bột chuyển hóa nhanh, đồ ngọt, đồ chiên rán và chuyển sang bữa sáng lành mạnh ít calo nhưng giàu vi chất tại Nhóm Dinh Dưỡng.",
        recommendedClubType: "Nhóm dinh dưỡng chuyên sâu"
      };
    } else if (bmi >= 25.0 && bmi <= 29.9) {
      return {
        status: "Béo Phì Độ I",
        color: "#b45309",
        badgeBg: "rgba(180, 83, 9, 0.15)",
        advice: "Mức mỡ cơ thể và mỡ nội tạng đang ở mức báo động, có nguy cơ gây áp lực lên tim mạch, huyết áp và gan. Bạn nên tham gia ngay một Nhóm Dinh Dưỡng Chuyên Sâu để được HLV thiết kế thực đơn cá nhân hóa và theo sát 1:1.",
        recommendedClubType: "Nhóm dinh dưỡng chuyên sâu"
      };
    } else {
      return {
        status: "Béo Phì Độ II (Nguy Hiểm)",
        color: "#e11d48",
        badgeBg: "rgba(225, 29, 72, 0.15)",
        advice: "Cảnh báo chỉ số béo phì cấp độ cao! Cần có sự can thiệp nghiêm túc về chế độ dinh dưỡng tế bào và thanh lọc cơ thể ngay lập tức để phòng ngừa các bệnh chuyển hóa.",
        recommendedClubType: "Nhóm dinh dưỡng chuyên sâu"
      };
    }
  },

  // Phân loại % Mỡ Cơ Thể theo giới tính (tham chiếu American Council on Exercise)
  getBodyFatRating(bodyFatPercent, gender) {
    const t = gender === "male" ? [14, 20, 25] : [21, 27, 32];
    if (bodyFatPercent < t[0]) return { status: "Thấp (VĐV)", color: "#0d9488" };
    if (bodyFatPercent < t[1]) return { status: "Lý Tưởng", color: "#059669" };
    if (bodyFatPercent < t[2]) return { status: "Hơi Cao", color: "#d97706" };
    return { status: "Cao (Cảnh báo)", color: "#e11d48" };
  },

  // Tính toán chỉ số tổng hợp
  calculate({ heightCm, weightKg, gender = "male", age = 30 }) {
    const heightM = heightCm / 100;
    const bmi = +(weightKg / (heightM * heightM)).toFixed(1);
    const genderVal = gender === "male" ? 1 : 0;

    // Cân nặng lý tưởng (Ideal Weight theo chuẩn BMI Châu Á 18.5 - 22.9)
    const minIdealWeight = +(18.5 * heightM * heightM).toFixed(1);
    const maxIdealWeight = +(22.9 * heightM * heightM).toFixed(1);

    // Lượng nước tối thiểu mỗi ngày (công thức: 0.4 lít nước / 10kg cân nặng)
    const minWater = +(weightKg * 0.04).toFixed(1);

    // Năng lượng chuyển hóa cơ bản ước tính (BMR Mifflin-St Jeor)
    let bmr = 0;
    if (gender === "male") {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }

    const classification = this.classifyAsianBMI(bmi);

    // Tính % vị trí trên thanh đo (từ BMI 15 đến 35)
    let markerPercent = ((bmi - 15) / (35 - 15)) * 100;
    markerPercent = Math.max(2, Math.min(98, markerPercent));

    // ===================================================================
    // ƯỚC TÍNH 9 CHỈ SỐ KIỂU INBODY TỪ CHIỀU CAO - CÂN NẶNG - TUỔI - GIỚI TÍNH
    // (Công thức nhân trắc học tham khảo: Deurenberg, Watson, Lee - chỉ mang
    // tính chất ước lượng, không thay thế máy đo InBody chuyên dụng)
    // ===================================================================

    // % Mỡ cơ thể (Deurenberg, 1991)
    let bodyFatPercent = 1.20 * bmi + 0.23 * age - 10.8 * genderVal - 5.4;
    bodyFatPercent = +Math.max(5, Math.min(55, bodyFatPercent)).toFixed(1);

    // % Tổng lượng nước cơ thể (Watson, 1980)
    const tbwLiters = gender === "male"
      ? 2.447 - 0.09156 * age + 0.1074 * heightCm + 0.3362 * weightKg
      : -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;
    const waterPercent = +Math.max(35, Math.min(70, (tbwLiters / weightKg) * 100)).toFixed(1);

    // Khối lượng cơ xương (Lee et al., 2000)
    let muscleMass = 0.244 * weightKg + 7.80 * heightM - 0.098 * age + 6.6 * genderVal - 3.3;
    muscleMass = +Math.max(15, Math.min(60, muscleMass)).toFixed(1);

    // Mỡ nội tạng (ước tính tương quan theo BMI, tuổi & giới tính, thang 1-30)
    let visceralFat = Math.round((bmi - 21) * 1.1 + (age - 25) * 0.15 + (genderVal ? 1 : -1));
    visceralFat = Math.max(1, Math.min(30, visceralFat));

    // Tuổi sinh học (so sánh % mỡ hiện tại với % mỡ lý tưởng theo giới tính)
    const idealBodyFat = gender === "male" ? 15 : 23;
    let metabolicAge = Math.round(age + (bodyFatPercent - idealBodyFat) * 0.6);
    metabolicAge = Math.max(18, Math.min(75, metabolicAge));

    // Đánh giá vóc dáng (Physique Rating 1-9): kết hợp mức mỡ & tỷ lệ cơ so với TB
    const muscleRatio = muscleMass / weightKg;
    const avgMuscleRatio = gender === "male" ? 0.42 : 0.34;
    const fatScore = (idealBodyFat - bodyFatPercent) / 10;
    const muscleScore = (muscleRatio - avgMuscleRatio) * 20;
    let physiqueRating = Math.round(5 + fatScore * 2 + muscleScore * 2);
    physiqueRating = Math.max(1, Math.min(9, physiqueRating));

    const bodyFatRating = this.getBodyFatRating(bodyFatPercent, gender);
    const visceralRating = MetricsManager.getVisceralFatRating(visceralFat);
    const physiqueLabel = MetricsManager.getPhysiqueLabel(physiqueRating);

    return {
      bmi,
      gender,
      age,
      minIdealWeight,
      maxIdealWeight,
      minWater,
      bmr,
      markerPercent,
      bodyFatPercent,
      bodyFatRating,
      waterPercent,
      muscleMass,
      visceralFat,
      visceralRating,
      metabolicAge,
      physiqueRating,
      physiqueLabel,
      ...classification
    };
  }
};

if (typeof window !== "undefined") {
  window.BMICalculator = BMICalculator;
}

