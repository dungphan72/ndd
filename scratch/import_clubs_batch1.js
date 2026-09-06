// Chạy đoạn này trong Console trình duyệt (F12) trên nhomdinhduong.vn
// SAU KHI đã đăng nhập (bất kỳ tài khoản nào, do rules "clubs" cho phép mọi
// user đã đăng nhập ghi). Mỗi club được ghi riêng lẻ qua
// ClubManager.syncSingleClubToFirestore, không đụng tới các club đã có.

(async () => {
  const newClubs = [
    {
      id: "club_" + (Date.now() + 1),
      name: "CLB Sống Khỏe Bảo Nguyên",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Huỳnh Quang Huy",
      ownerPhone: "0988945096",
      coOperators: [],
      province: "An Giang",
      ward: "Phường Bình Đức",
      addressDetail: "110 Ỷ Lan",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Thuộc hệ thống PT Lê Thị Huệ. Đồng hành cùng cộng đồng An Giang trong hành trình sống khỏe.",
      lat: 10.3860, lng: 105.4351,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh", "Đo chỉ số cơ thể miễn phí"]
    },
    {
      id: "club_" + (Date.now() + 2),
      name: "NC & Vận Động FIT",
      type: "Nhóm dinh dưỡng vận động",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Đoàn Trọng Quang",
      ownerPhone: "0913658272",
      coOperators: [],
      province: "Ninh Bình",
      ward: "Phường Phủ Lý",
      addressDetail: "",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Nhóm dinh dưỡng kết hợp vận động tại khu vực Hà Nam (nay thuộc Ninh Bình).",
      lat: 20.5411, lng: 105.9139,
      rating: 5.0, memberCount: 1,
      features: ["Bài tập vận động nhóm", "Tư vấn dinh dưỡng thể thao"]
    },
    {
      id: "club_" + (Date.now() + 3),
      name: "Fitclub262",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Nga Trần",
      ownerPhone: "0971568056",
      coOperators: [],
      province: "Hưng Yên",
      ward: "Phường Trần Lãm",
      addressDetail: "Tầng 2, Tòa 106 Phan Bá Vành",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Fitclub262 đồng hành cùng hội viên khu vực Thái Bình (nay thuộc Hưng Yên).",
      lat: 20.4463, lng: 106.3365,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Đo chỉ số cơ thể miễn phí"]
    },
    {
      id: "club_" + (Date.now() + 4),
      name: "Nhóm Dinh Dưỡng Bùi Thị Hà",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Bùi Thị Hà",
      ownerPhone: "0326686288",
      coOperators: [],
      province: "Bắc Ninh",
      ward: "Phường Kinh Bắc",
      addressDetail: "Số 7 Văn Cao, khu Y Na",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Đồng hành cùng cộng đồng Bắc Ninh trong hành trình dinh dưỡng lành mạnh.",
      lat: 21.1861, lng: 106.0763,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh"]
    },
    {
      id: "club_" + (Date.now() + 5),
      name: "NDD Tâm An",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Hoàng Nga",
      ownerPhone: "0868595331",
      coOperators: [],
      province: "Hà Nội",
      ward: "Xã Thanh Trì",
      addressDetail: "Tự Khoát",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "NDD Tâm An - đồng hành cùng hội viên khu vực Thanh Trì, Hà Nội.",
      lat: 20.9250, lng: 105.8390,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh"]
    },
    {
      id: "club_" + (Date.now() + 6),
      name: "Ndd & FitClup Ninh Hương",
      type: "Nhóm dinh dưỡng vận động",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Đỗ Biên",
      ownerPhone: "0388829055",
      coOperators: [],
      province: "Hải Phòng",
      ward: "Phường Hồng Bàng",
      addressDetail: "",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Thuộc hệ thống MT Ninh Hương, đồng hành cùng cộng đồng Hải Phòng.",
      lat: 20.8449, lng: 106.6881,
      rating: 5.0, memberCount: 1,
      features: ["Bài tập vận động nhóm", "Tư vấn dinh dưỡng thể thao"]
    },
    {
      id: "club_" + (Date.now() + 7),
      name: "Nhóm Dinh Dưỡng Bùi Vân",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Bùi Vân",
      ownerPhone: "0849334186",
      coOperators: [],
      province: "Lào Cai",
      ward: "Phường Lào Cai",
      addressDetail: "042 Hàm Nghi",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Đồng hành cùng cộng đồng TP. Lào Cai trong hành trình dinh dưỡng lành mạnh.",
      lat: 22.4856, lng: 103.9707,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh"]
    },
    {
      id: "club_" + (Date.now() + 8),
      name: "Nhóm Dinh Dưỡng Hoàng Nghiêm Nghị",
      type: "Nhóm dinh dưỡng chuyên sâu",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
      ownerId: null,
      ownerName: "Hoàng Nghiêm Nghị",
      ownerPhone: "0977971428",
      coOperators: [],
      province: "Hưng Yên",
      ward: "Xã Như Quỳnh",
      addressDetail: "Lạc Đạo",
      openingHours: "Sáng: 05:30 - 09:30 | Chiều: 16:30 - 19:30",
      story: "Đồng hành cùng cộng đồng Văn Lâm, Hưng Yên trong hành trình dinh dưỡng lành mạnh.",
      lat: 20.9698, lng: 106.0731,
      rating: 5.0, memberCount: 1,
      features: ["Tư vấn dinh dưỡng 1:1", "Bữa sáng lành mạnh"]
    }
  ];

  for (const club of newClubs) {
    await ClubManager.syncSingleClubToFirestore(club);
    console.log("Đã thêm:", club.name);
  }
  console.log("XONG! Đã import", newClubs.length, "nhóm dinh dưỡng.");
})();
