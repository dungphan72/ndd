/**
 * Course & Video E-Learning Manager for NutriClub Hub
 */

const CourseManager = {
  STORAGE_KEY: "nutriclub_courses",

  defaultCourses: [
    {
      id: "course_1",
      title: "Chương Trình Khóa Học Dinh Dưỡng Nền Tảng & Chuyển Hóa Cơ Thể",
      category: "nutrition",
      categoryLabel: "Dinh Dưỡng Chuyên Sâu",
      instructor: "ThS. Bác sĩ Nguyễn Văn Hùng",
      instructorRole: "Chuyên Gia Dinh Dưỡng Quốc Gia",
      duration: "45 phút",
      views: "12,450",
      level: "Cơ Bản",
      youtubeId: "ml6cT4AZdqI",
      thumbnail: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600",
      description: "Thấu hiểu chỉ số BMR, chỉ số đường huyết GI của thực phẩm và quy trình kiểm soát cân nặng bền vững cho hội viên.",
      lessonsCount: 8,
      rating: 4.9
    },
    {
      id: "course_2",
      title: "Bài Tập Cardio 20 Phút Đốt Mỡ Bụng Tại Nhóm Dinh Dưỡng",
      category: "workout",
      categoryLabel: "Luyện Tập & Cardio",
      instructor: "HLV Trần Thị Mai Anh",
      instructorRole: "Master Fitness Trainer",
      duration: "25 phút",
      views: "28,900",
      level: "Tất Cả Mức Độ",
      youtubeId: "VaN6oWqZ2aE",
      thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600",
      description: "Chuỗi động tác Tabata & Cardio nhịp điệu kết hợp âm nhạc sôi động, phù hợp tập nhóm mỗi buổi sáng tại câu lạc bộ.",
      lessonsCount: 5,
      rating: 5.0
    },
    {
      id: "course_3",
      title: "Quy Trình 7 Bước Mở & Vận Hành Nhóm Dinh Dưỡng Đạt Chuẩn 5 Sao",
      category: "operation",
      categoryLabel: "Vận Hành Nhóm",
      instructor: "Chủ Nhiệm Lê Hoàng Nam",
      instructorRole: "Founder Chuỗi 15 Nhóm Dinh Dưỡng",
      duration: "60 phút",
      views: "19,800",
      level: "Nâng Cao",
      youtubeId: "gC_L9qAHVJ8",
      thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600",
      description: "Hướng dẫn chọn vị trí mặt bằng, trang trí nhận diện thương hiệu, lập sổ theo dõi hội viên và quy chuẩn phục vụ bữa sáng.",
      lessonsCount: 12,
      rating: 4.9
    },
    {
      id: "course_4",
      title: "Công Thức Pha Chế Shake & Trà Thảo Mộc Thơm Ngon Chuẩn Vị",
      category: "recipes",
      categoryLabel: "Chế Biến & Thực Đơn",
      instructor: "Chef Phạm Thu Trang",
      instructorRole: "Chuyên Gia Đổi Mới Thực Đơn",
      duration: "30 phút",
      views: "34,200",
      level: "Cơ Bản",
      youtubeId: "6_3r_8x7P0c",
      thumbnail: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600",
      description: "Bí quyết pha chế 15 hương vị F1 Shake độc đáo, sinh tố đạm chuẩn calo và cách trang trí ly Shake bắt mắt thu hút hội viên.",
      lessonsCount: 6,
      rating: 4.8
    },
    {
      id: "course_5",
      title: "Kỹ Năng Tư Vấn & Chăm Sóc Hội Viên 1:1 Kết Nối Trái Tim",
      category: "coaching",
      categoryLabel: "Tư Vấn & Chăm Sóc",
      instructor: "HLV Đặng Minh Tuấn",
      instructorRole: "Chuyên Gia Tâm Lý Dinh Dưỡng",
      duration: "40 phút",
      views: "15,600",
      level: "Nâng Cao",
      youtubeId: "yS9yJ8sB9tI",
      thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600",
      description: "Lắng nghe nhu cầu hội viên, cách đọc chỉ số InBody 9 thành phần và xử lý các tình trạng chững cân, thèm ăn nhanh chóng.",
      lessonsCount: 9,
      rating: 4.9
    },
    {
      id: "course_6",
      title: "Hướng Dẫn Đo & Đọc Chi Tiết Chỉ Số Cân Phân Tích InBody",
      category: "nutrition",
      categoryLabel: "Dinh Dưỡng Chuyên Sâu",
      instructor: "Bác Sĩ Trịnh Quốc Bảo",
      instructorRole: "Cố Vấn Y Học Thể Thao",
      duration: "35 phút",
      views: "22,100",
      level: "Trung Cấp",
      youtubeId: "L1_Zqg6Lw6M",
      thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600",
      description: "Giải thích rõ ý nghĩa chỉ số mỡ nội tạng, cơ bắp, lượng xương và tuổi sinh học để lập lộ trình tăng cơ giảm mỡ cho khách hàng.",
      lessonsCount: 7,
      rating: 5.0
    }
  ],

  getCourses() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        this.saveCourses(this.defaultCourses);
        return this.defaultCourses;
      }
      const parsed = JSON.parse(data);
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : this.defaultCourses;
    } catch (e) {
      console.error("Error loading courses from localStorage:", e);
      return this.defaultCourses;
    }
  },

  saveCourses(courses) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.error("Error saving courses to localStorage:", e);
    }
  },

  addCourse(courseData) {
    const courses = this.getCourses();
    const newCourse = {
      id: "course_" + Date.now(),
      title: courseData.title,
      category: courseData.category || "nutrition",
      categoryLabel: this.getCategoryLabel(courseData.category),
      instructor: courseData.instructor || "HLV Dinh Dưỡng",
      instructorRole: courseData.instructorRole || "Chuyên Gia Dinh Dưỡng",
      duration: courseData.duration || "30 phút",
      views: "1",
      level: courseData.level || "Cơ Bản",
      youtubeId: this.extractYoutubeId(courseData.youtubeUrl),
      thumbnail: courseData.thumbnail || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600",
      description: courseData.description || "",
      lessonsCount: courseData.lessonsCount || 5,
      rating: 5.0
    };
    courses.unshift(newCourse);
    this.saveCourses(courses);
    return { success: true, course: newCourse };
  },

  deleteCourse(courseId) {
    let courses = this.getCourses();
    courses = courses.filter(c => c.id !== courseId);
    this.saveCourses(courses);
  },

  updateCourse(courseData) {
    let courses = this.getCourses();
    const index = courses.findIndex(c => c.id === courseData.id);
    if (index !== -1) {
      courses[index] = {
        ...courses[index],
        title: courseData.title || courses[index].title,
        category: courseData.category || courses[index].category,
        categoryLabel: this.getCategoryLabel(courseData.category || courses[index].category),
        instructor: courseData.instructor || courses[index].instructor,
        duration: courseData.duration || courses[index].duration,
        level: courseData.level || courses[index].level,
        youtubeId: courseData.youtubeUrl ? this.extractYoutubeId(courseData.youtubeUrl) : courses[index].youtubeId,
        thumbnail: courseData.thumbnail || courses[index].thumbnail,
        description: courseData.description || courses[index].description
      };
      this.saveCourses(courses);
      return { success: true, course: courses[index] };
    }
    return { success: false, message: "Không tìm thấy khóa học" };
  },

  defaultCategories: [
    { id: "nutrition", name: "Dinh Dưỡng Chuyên Sâu", icon: "🌿" },
    { id: "workout", name: "Luyện Tập & Cardio", icon: "🏃" },
    { id: "operation", name: "Vận Hành Nhóm", icon: "🏢" },
    { id: "recipes", name: "Chế Biến & Thực Đơn", icon: "🥗" },
    { id: "coaching", name: "Tư Vấn & Chăm Sóc", icon: "👨‍⚕️" }
  ],

  getCategories() {
    const data = localStorage.getItem("nutriclub_course_categories");
    if (!data) {
      this.saveCategories(this.defaultCategories);
      return this.defaultCategories;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return this.defaultCategories;
    }
  },

  saveCategories(categories) {
    localStorage.setItem("nutriclub_course_categories", JSON.stringify(categories));
  },

  addCategory(name, icon = "📚") {
    const categories = this.getCategories();
    const id = "cat_" + Date.now();
    const newCategory = { id, name: name.trim(), icon: icon.trim() || "📚" };
    categories.push(newCategory);
    this.saveCategories(categories);
    return { success: true, category: newCategory };
  },

  updateCategory(id, name, icon) {
    let categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      const cleanName = name.trim();
      const cleanIcon = icon ? icon.trim() : categories[index].icon;
      categories[index] = { ...categories[index], name: cleanName, icon: cleanIcon };
      this.saveCategories(categories);
      
      // Đồng bộ lại tên categoryLabel cho tất cả các khóa học thuộc category này
      let courses = this.getCourses();
      let updated = false;
      courses.forEach(course => {
        if (course.category === id) {
          course.categoryLabel = cleanName;
          updated = true;
        }
      });
      if (updated) this.saveCourses(courses);

      return { success: true, category: categories[index] };
    }
    return { success: false, message: "Không tìm thấy chủ đề" };
  },

  deleteCategory(id) {
    let categories = this.getCategories();
    categories = categories.filter(c => c.id !== id);
    this.saveCategories(categories);
    return { success: true };
  },

  getCategoryLabel(catId) {
    const categories = this.getCategories();
    const found = categories.find(c => c.id === catId);
    if (found) return found.name;

    const fallbackLabels = {
      nutrition: "Dinh Dưỡng Chuyên Sâu",
      workout: "Luyện Tập & Cardio",
      operation: "Vận Hành Nhóm",
      recipes: "Chế Biến & Thực Đơn",
      coaching: "Tư Vấn & Chăm Sóc"
    };
    return fallbackLabels[catId] || "Chủ Đề Khóa Học";
  },

  extractYoutubeId(url) {
    if (!url) return "ml6cT4AZdqI";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  }
};

if (typeof window !== "undefined") {
  window.CourseManager = CourseManager;
}

