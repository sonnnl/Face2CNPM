const {
  MainClass,
  TeachingClass,
  User,
  Notification,
  StudentScore,
  AttendanceSession,
  AttendanceLog,
  Semester,
} = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý lớp học
 */

// =================== MAIN CLASS CONTROLLERS ===================

// @desc    Lấy danh sách tất cả lớp chính
// @route   GET /api/classes/main
// @access  Private
exports.getAllMainClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const department = req.query.department || "";
    const getAllWithoutPagination = req.query.all === "true";
    const advisorId = req.query.advisor_id || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { class_code: { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query.department_id = department;
    }

    if (advisorId) {
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        return res.status(400).json({
          success: false,
          message: "ID giáo viên cố vấn không hợp lệ",
        });
      }
      query.advisor_id = advisorId;
    }

    if (getAllWithoutPagination) {
      // Lấy tất cả lớp chính không phân trang
      const mainClasses = await MainClass.find(query)
        .populate("department_id", "name code")
        .populate("advisor_id", "full_name email")
        .sort({ name: 1 }); // Sắp xếp theo tên lớp

      return res.status(200).json({
        success: true,
        count: mainClasses.length,
        data: mainClasses,
      });
    }

    // Phân trang bình thường
    const total = await MainClass.countDocuments(query);
    const mainClasses = await MainClass.find(query)
      .populate("department_id", "name code")
      .populate("advisor_id", "full_name email")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mainClasses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: mainClasses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy lớp chính theo ID
// @route   GET /api/classes/main/:id
// @access  Private
exports.getMainClassById = async (req, res) => {
  try {
    const mainClass = await MainClass.findById(req.params.id)
      .populate("department_id", "name")
      .populate("advisor_id", "full_name email")
      .populate("students", "full_name email student_id");

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    res.status(200).json({
      success: true,
      data: mainClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Tạo lớp chính mới
// @route   POST /api/classes/main
// @access  Private (Admin)
exports.createMainClass = async (req, res) => {
  try {
    const { name, code, department_id, advisor_id, students } = req.body;

    // Kiểm tra lớp đã tồn tại chưa
    const existingClass = await MainClass.findOne({ class_code: code });
    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: "Mã lớp đã tồn tại",
      });
    }

    const mainClass = await MainClass.create({
      name,
      class_code: code,
      department_id,
      advisor_id,
      students: students || [],
    });

    res.status(201).json({
      success: true,
      data: mainClass,
      message: "Tạo lớp chính thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Cập nhật lớp chính
// @route   PUT /api/classes/main/:id
// @access  Private (Admin, Teacher)
exports.updateMainClass = async (req, res) => {
  try {
    const { name, code, department_id, advisor_id, students } = req.body;
    const mainClassId = req.params.id;

    // Kiểm tra lớp có tồn tại không
    const existingClass = await MainClass.findById(mainClassId);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền: Admin có thể cập nhật bất kỳ lớp nào, giáo viên chỉ có thể cập nhật lớp mà họ làm cố vấn
    if (req.user.role !== "admin") {
      // Nếu không phải admin, kiểm tra xem user có phải là cố vấn của lớp không
      if (
        !existingClass.advisor_id ||
        existingClass.advisor_id.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền cập nhật lớp này vì bạn không phải là cố vấn của lớp",
        });
      }
    }

    // Kiểm tra mã lớp đã tồn tại chưa (trừ lớp hiện tại)
    if (code && code !== existingClass.class_code) {
      const duplicateCode = await MainClass.findOne({
        class_code: code,
        _id: { $ne: mainClassId },
      });

      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp đã tồn tại",
        });
      }
    }

    // Chỉ admin mới có thể thay đổi cố vấn hoặc danh sách sinh viên
    const updateData = {
      name,
      class_code: code,
      department_id,
    };

    // Chỉ admin mới được cập nhật advisor và danh sách sinh viên
    if (req.user.role === "admin") {
      if (advisor_id) updateData.advisor_id = advisor_id;
      if (students) updateData.students = students;
    }

    const mainClass = await MainClass.findByIdAndUpdate(
      mainClassId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("advisor_id", "full_name email")
      .populate("department_id", "name");

    res.status(200).json({
      success: true,
      data: mainClass,
      message: "Cập nhật lớp chính thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Xóa lớp chính
// @route   DELETE /api/classes/main/:id
// @access  Private (Admin)
exports.deleteMainClass = async (req, res) => {
  try {
    const mainClassId = req.params.id;

    const mainClass = await MainClass.findById(mainClassId);

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền: Admin có thể xóa bất kỳ lớp nào.
    // Giáo viên chỉ có thể xóa lớp chính mà họ làm cố vấn.
    if (req.user.role === "teacher") {
      if (
        !mainClass.advisor_id ||
        mainClass.advisor_id.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền xóa lớp chính này vì bạn không phải là cố vấn của lớp.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    // 1. Cập nhật User: gỡ bỏ main_class_id của các sinh viên thuộc lớp này
    await User.updateMany(
      { main_class_id: mainClassId },
      { $unset: { main_class_id: "" } }
    );

    // 2. Cập nhật TeachingClass: đặt main_class_id thành null
    await TeachingClass.updateMany(
      { main_class_id: mainClassId },
      { $set: { main_class_id: null } }
    );

    // 3. Xóa Notification liên quan đến việc phê duyệt/từ chối vào lớp này
    await Notification.deleteMany({
      $or: [{ type: "class_approval", "data.class_id": mainClassId }],
    });

    // 4. Xóa Lớp chính
    await MainClass.findByIdAndDelete(mainClassId);

    res.status(200).json({
      success: true,
      message: "Xóa lớp chính và các dữ liệu liên quan thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Lỗi khi xóa lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa lớp chính",
      error: error.message,
    });
  }
};

// @desc    Lấy thông kê của lớp chính
// @route   GET /api/classes/main-statistics
// @access  Private (Admin)
exports.getMainClassStatistics = async (req, res) => {
  try {
    const totalCount = await MainClass.countDocuments();

    // Lưu ý: trong schema, trường code được đặt tên là class_code
    const departmentStats = await MainClass.aggregate([
      {
        $match: {
          department_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$department_id",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          departmentName: "$department.name",
          count: 1,
        },
      },
    ]);

    // Tính số lượng sinh viên trong tất cả các lớp chính
    const totalStudents = await MainClass.aggregate([
      {
        $project: {
          studentCount: {
            $cond: {
              if: { $isArray: "$students" },
              then: { $size: "$students" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: "$studentCount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCount,
      departmentStats,
      totalStudents:
        totalStudents.length > 0 ? totalStudents[0].totalStudents : 0,
    });
  } catch (error) {
    console.error("Error in getMainClassStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê lớp chính",
      error: error.message,
    });
  }
};

// =================== TEACHING CLASS CONTROLLERS ===================

// @desc    Lấy danh sách tất cả lớp giảng dạy
// @route   GET /api/classes/teaching
// @access  Private
exports.getAllTeachingClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const subjectId = req.query.subject_id || ""; // Renamed for clarity
    const teacherId = req.query.teacher_id || ""; // Added teacher_id
    const semesterId = req.query.semester || ""; // Changed to read from req.query.semester
    const mainClassId = req.query.main_class_id || ""; // Renamed for clarity

    const query = {};

    if (search) {
      query.$or = [{ class_name: { $regex: search, $options: "i" } }];
    }

    if (subjectId) {
      query.subject_id = subjectId;
    }

    if (teacherId) {
      // Added filter for teacher_id
      query.teacher_id = teacherId;
    }

    if (semesterId) {
      query.semester_id = semesterId;
    }

    if (mainClassId) {
      query.main_class_id = mainClassId;
    }

    const total = await TeachingClass.countDocuments(query);
    const teachingClasses = await TeachingClass.find(query)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year academic_year start_date end_date")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Tính trạng thái của lớp học dựa vào học kỳ
    const classesWithStatus = await Promise.all(
      teachingClasses.map(async (cls) => {
        const classObj = cls.toObject();

        // Thêm trường is_active dựa vào thông tin semester
        if (classObj.semester_id) {
          const currentDate = new Date();
          const startDate = new Date(classObj.semester_id.start_date);
          const endDate = new Date(classObj.semester_id.end_date);

          if (currentDate < startDate) {
            classObj.is_active = false;
            classObj.status = "chưa bắt đầu";
          } else if (currentDate > endDate) {
            classObj.is_active = false;
            classObj.status = "đã kết thúc";
          } else {
            classObj.is_active = true;
            classObj.status = "đang học";
          }
        } else {
          classObj.is_active = false;
          classObj.status = "không xác định";
        }

        return classObj;
      })
    );

    res.status(200).json({
      success: true,
      count: classesWithStatus.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy lớp giảng dạy theo ID
// @route   GET /api/classes/teaching/:id
// @access  Private
exports.getTeachingClassById = async (req, res) => {
  try {
    const id = req.params.id;

    // Kiểm tra ID có phải là MongoDB ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID lớp học không hợp lệ",
      });
    }

    const teachingClass = await TeachingClass.findById(id)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year")
      .populate("students", "full_name email student_id");

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    res.status(200).json({
      success: true,
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy các lớp giảng dạy của giáo viên
// @route   GET /api/classes/teaching/teacher/:id
// @access  Private
exports.getTeachingClassesByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const semester_id = req.query.semester_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = { teacher_id: teacherId };

    if (semester_id) {
      if (!mongoose.Types.ObjectId.isValid(semester_id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID học kỳ không hợp lệ" });
      }
      query.semester_id = semester_id;
    }

    // Thêm điều kiện tìm kiếm nếu có
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      // Chúng ta cần tìm kiếm trên các trường của TeachingClass và các trường của Subject (thông qua populate)
      // Để làm điều này hiệu quả với populate, chúng ta sẽ query TeachingClass trước, sau đó filter
      // Hoặc sử dụng aggregation pipeline. Ở đây, chúng ta sẽ dùng một cách tiếp cận đơn giản hơn
      // là query tất cả class của teacher trong kỳ đó, rồi filter sau.
      // Tuy nhiên, để tối ưu hơn, chúng ta nên tìm cách filter ở mức database.
      // Một cách là tìm các subject_id phù hợp trước, sau đó query TeachingClass.

      const subjectIds = await mongoose
        .model("Subject")
        .find({
          $or: [{ name: searchRegex }, { code: searchRegex }],
        })
        .select("_id");

      query.$or = [
        { class_name: searchRegex },
        { class_code: searchRegex },
        { subject_id: { $in: subjectIds.map((s) => s._id) } },
      ];
    }

    const total = await TeachingClass.countDocuments(query);
    const teachingClasses = await TeachingClass.find(query)
      .populate("subject_id", "name code credits") // Thêm credits
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year start_date end_date") // Thêm start_date, end_date
      .populate({
        path: "students",
        select: "full_name email school_info.student_id",
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Tính trạng thái của lớp học dựa vào học kỳ
    const classesWithStatus = await Promise.all(
      teachingClasses.map(async (cls) => {
        const classObj = cls.toObject();

        // Thêm trường is_active và status dựa vào thông tin semester
        if (
          classObj.semester_id &&
          classObj.semester_id.start_date &&
          classObj.semester_id.end_date
        ) {
          const currentDate = new Date();
          // Đảm bảo rằng start_date và end_date là đối tượng Date
          const startDate = new Date(classObj.semester_id.start_date);
          const endDate = new Date(classObj.semester_id.end_date);

          if (currentDate < startDate) {
            classObj.is_active = false;
            classObj.status = "chưa bắt đầu";
          } else if (currentDate > endDate) {
            classObj.is_active = false;
            classObj.status = "đã kết thúc";
          } else {
            classObj.is_active = true;
            classObj.status = "đang học";
          }
        } else {
          classObj.is_active = false; // Mặc định nếu không có thông tin học kỳ
          classObj.status = "không xác định";
        }

        // Đảm bảo subject_id, teacher_id, semester_id không null trước khi truy cập
        if (classObj.subject_id === null) {
          classObj.subject_id = { name: "N/A", code: "N/A", credits: 0 };
        }
        if (classObj.teacher_id === null) {
          classObj.teacher_id = { full_name: "N/A", email: "N/A" };
        }
        if (classObj.semester_id === null) {
          classObj.semester_id = {
            name: "N/A",
            year: "N/A",
            start_date: null,
            end_date: null,
          };
        }
        if (classObj.main_class_id === null) {
          classObj.main_class_id = { name: "N/A", class_code: "N/A" };
        }

        return classObj;
      })
    );

    res.status(200).json({
      success: true,
      count: classesWithStatus.length, // Số lượng bản ghi trên trang hiện tại
      total, // Tổng số bản ghi khớp với query
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy các lớp giảng dạy của sinh viên
// @route   GET /api/classes/teaching/student/:id
// @access  Private
exports.getTeachingClassesByStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const semesterId = req.query.semester; // <<< Đọc req.query.semester thay vì semester_id
    const academicYear = req.query.academicYear; // Năm học (vd: "2023-2024")
    const search = req.query.search || "";

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID sinh viên không hợp lệ" });
    }

    const pipeline = [];

    // --- Xử lý lọc theo Học kỳ hoặc Năm học ---
    let semesterIdsToFilter = [];
    if (semesterId && mongoose.Types.ObjectId.isValid(semesterId)) {
      // Ưu tiên lọc theo semesterId cụ thể nếu được cung cấp
      semesterIdsToFilter.push(new ObjectId(semesterId));
    } else if (academicYear) {
      // Nếu không có semesterId cụ thể nhưng có academicYear
      const semestersInYear = await Semester.find({
        academic_year: academicYear,
      }).select("_id");
      semesterIdsToFilter = semestersInYear.map((s) => s._id);
      // Nếu không tìm thấy học kỳ nào trong năm -> không có lớp nào phù hợp
      if (semesterIdsToFilter.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    // Stage 1: Match TeachingClass có sinh viên
    const matchStage = {
      $match: {
        students: new ObjectId(studentId),
      },
    };
    // Thêm điều kiện lọc theo semester_id (nếu có semester_id cụ thể hoặc academicYear)
    if (semesterIdsToFilter.length > 0) {
      matchStage.$match.semester_id = { $in: semesterIdsToFilter };
    }
    pipeline.push(matchStage);

    // Stage 2: Lookup Subject (giữ nguyên)
    pipeline.push({
      $lookup: {
        from: "subjects",
        localField: "subject_id",
        foreignField: "_id",
        as: "subjectInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true },
    });

    // Stage 3: Lookup Teacher (giữ nguyên)
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "teacher_id",
        foreignField: "_id",
        as: "teacherInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true },
    });

    // Stage 4: Lookup Semester (giữ nguyên)
    pipeline.push({
      $lookup: {
        from: "semesters",
        localField: "semester_id",
        foreignField: "_id",
        as: "semesterInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$semesterInfo", preserveNullAndEmptyArrays: true },
    });

    // Stage 5: Match với điều kiện search (nếu có - giữ nguyên)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      pipeline.push({
        $match: {
          $or: [
            { class_name: searchRegex },
            { class_code: searchRegex },
            { "subjectInfo.name": searchRegex },
            { "subjectInfo.code": searchRegex },
            { "teacherInfo.full_name": searchRegex },
          ],
        },
      });
    }

    // Stage 6: Project (giữ nguyên)
    pipeline.push({
      $project: {
        _id: 1,
        class_name: 1,
        class_code: 1,
        students: 1,
        total_sessions: 1,
        max_absent_allowed: 1,
        schedule: 1,
        course_start_date: 1,
        course_end_date: 1,
        created_at: 1,
        updated_at: 1,
        subject_id: {
          _id: "$subjectInfo._id",
          name: "$subjectInfo.name",
          code: "$subjectInfo.code",
          credits: "$subjectInfo.credits",
        },
        teacher_id: {
          _id: "$teacherInfo._id",
          full_name: "$teacherInfo.full_name",
          email: "$teacherInfo.email",
        },
        semester_id: {
          _id: "$semesterInfo._id",
          name: "$semesterInfo.name",
          year: "$semesterInfo.year",
          academic_year: "$semesterInfo.academic_year",
          start_date: "$semesterInfo.start_date",
          end_date: "$semesterInfo.end_date",
        },
      },
    });

    // Stage 7: Sort (giữ nguyên)
    pipeline.push({ $sort: { created_at: -1 } });

    console.log("Executing pipeline:", JSON.stringify(pipeline, null, 2));
    // Thực thi pipeline
    const teachingClasses = await TeachingClass.aggregate(pipeline);

    // Tính trạng thái của lớp học dựa vào học kỳ (logic này giữ nguyên)
    const classesWithStatus = teachingClasses.map((cls) => {
      const currentDate = new Date();
      const startDate = cls.semester_id?.start_date
        ? new Date(cls.semester_id.start_date)
        : null;
      const endDate = cls.semester_id?.end_date
        ? new Date(cls.semester_id.end_date)
        : null;

      if (startDate && endDate) {
        if (currentDate < startDate) {
          cls.status = "chưa bắt đầu";
        } else if (currentDate > endDate) {
          cls.status = "đã kết thúc";
        } else {
          cls.status = "đang học";
        }
      } else {
        cls.status = "không xác định";
      }
      return cls;
    });

    res.status(200).json({
      success: true,
      count: classesWithStatus.length,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error("Lỗi khi lấy lớp học của sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo lớp giảng dạy mới
// @route   POST /api/classes/teaching
// @access  Private (Admin, Teacher)
exports.createTeachingClass = async (req, res) => {
  try {
    const {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id,
      semester_id,
      total_sessions,
      students,
      schedule,
      course_start_date,
      course_end_date,
      auto_generate_sessions,
    } = req.body;

    // Kiểm tra học kỳ tồn tại
    const semester = await Semester.findById(semester_id);
    if (!semester) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ không tồn tại",
      });
    }

    // Kiểm tra thời gian khóa học phải nằm trong khoảng thời gian của học kỳ
    if (course_start_date && course_end_date) {
      const startDate = new Date(course_start_date);
      const endDate = new Date(course_end_date);
      const semesterStartDate = new Date(semester.start_date);
      const semesterEndDate = new Date(semester.end_date);

      if (startDate < semesterStartDate || endDate > semesterEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Thời gian khóa học phải nằm trong khoảng thời gian của học kỳ",
          details: {
            semester_start: semester.start_date,
            semester_end: semester.end_date,
            course_start: course_start_date,
            course_end: course_end_date,
          },
        });
      }
    }

    // <<< Thêm Validation: Kiểm tra room_id trong từng schedule item >>>
    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule) {
        if (!item.room_id) {
          return res.status(400).json({
            success: false,
            message: `Vui lòng chọn phòng học cho buổi học vào ${getDayOfWeekName(
              item.day_of_week
            )}`, // Có thể thêm thông tin tiết học
          });
        }
      }
    }
    // <<< Kết thúc Validation >>>

    const teachingClass = await TeachingClass.create({
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id: main_class_id || null,
      semester_id,
      total_sessions: total_sessions || 15,
      students: students || [],
      schedule: schedule || [],
      course_start_date,
      course_end_date,
      auto_generate_sessions:
        auto_generate_sessions !== undefined ? auto_generate_sessions : true,
      updated_at: Date.now(),
    });

    // Nếu auto_generate_sessions = true và có schedule, tạo các buổi học theo lịch
    if (
      teachingClass.auto_generate_sessions &&
      schedule &&
      schedule.length > 0 &&
      course_start_date &&
      course_end_date
    ) {
      await generateAttendanceSessions(teachingClass);
    }

    res.status(201).json({
      success: true,
      data: teachingClass,
      message: "Tạo lớp giảng dạy thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Cập nhật lớp giảng dạy
// @route   PUT /api/classes/teaching/:id
// @access  Private (Admin, Teacher)
exports.updateTeachingClass = async (req, res) => {
  try {
    const {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id,
      semester_id,
      total_sessions,
      schedule,
      students,
      course_start_date,
      course_end_date,
      auto_generate_sessions,
    } = req.body;

    const teachingClass = await TeachingClass.findById(req.params.id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật lớp này",
      });
    }

    // Kiểm tra học kỳ và thời gian khóa học
    const semesterId = semester_id || teachingClass.semester_id;

    // Lấy thông tin học kỳ
    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ không tồn tại",
      });
    }

    // Kiểm tra thời gian khóa học phải nằm trong khoảng thời gian của học kỳ
    if (course_start_date && course_end_date) {
      const startDate = new Date(course_start_date);
      const endDate = new Date(course_end_date);
      const semesterStartDate = new Date(semester.start_date);
      const semesterEndDate = new Date(semester.end_date);

      if (startDate < semesterStartDate || endDate > semesterEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Thời gian khóa học phải nằm trong khoảng thời gian của học kỳ",
          details: {
            semester_start: semester.start_date,
            semester_end: semester.end_date,
            course_start: course_start_date,
            course_end: course_end_date,
          },
        });
      }
    }

    // <<< Thêm Validation: Kiểm tra room_id trong từng schedule item >>>
    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule) {
        if (!item.room_id) {
          return res.status(400).json({
            success: false,
            message: `Vui lòng chọn phòng học cho buổi học vào ${getDayOfWeekName(
              item.day_of_week
            )}`, // Có thể thêm thông tin tiết học
          });
        }
      }
    }
    // <<< Kết thúc Validation >>>

    const updateData = {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id: main_class_id || null,
      semester_id,
      total_sessions,
      schedule,
      students,
      course_start_date,
      course_end_date,
      updated_at: Date.now(),
    };

    // Chỉ cập nhật auto_generate_sessions nếu giá trị được cung cấp
    if (auto_generate_sessions !== undefined) {
      updateData.auto_generate_sessions = auto_generate_sessions;
    }

    const updatedClass = await TeachingClass.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Xử lý cập nhật lại các buổi học nếu lịch thay đổi
    if (
      updatedClass.auto_generate_sessions &&
      schedule &&
      schedule.length > 0 &&
      course_start_date &&
      course_end_date
    ) {
      await generateAttendanceSessions(updatedClass);
    }

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: "Cập nhật lớp giảng dạy thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Xóa lớp giảng dạy
// @route   DELETE /api/classes/teaching/:id
// @access  Private (Admin, Teacher)
exports.deleteTeachingClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền: Admin hoặc giáo viên được phân công của lớp đó
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa lớp giảng dạy này",
      });
    }

    // Xóa các AttendanceSession liên quan
    const sessions = await AttendanceSession.find({
      teaching_class_id: classId,
    });
    const sessionIds = sessions.map((s) => s._id);

    // Xóa AttendanceLog liên quan đến các session đó
    if (sessionIds.length > 0) {
      await AttendanceLog.deleteMany({ session_id: { $in: sessionIds } });
    }
    await AttendanceSession.deleteMany({ teaching_class_id: classId });

    // Xóa StudentScore liên quan
    await StudentScore.deleteMany({ teaching_class_id: classId });

    // (Tùy chọn) Xóa Notification liên quan (nếu có)
    // Ví dụ: await Notification.deleteMany({ "data.teaching_class_id": classId });

    // Cuối cùng, xóa lớp giảng dạy
    await TeachingClass.findByIdAndDelete(classId);

    res.status(200).json({
      success: true,
      message: "Xóa lớp giảng dạy và các dữ liệu liên quan thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa lớp giảng dạy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa lớp giảng dạy",
      error: error.message,
    });
  }
};

// @desc    Kiểm tra xung đột lịch học
// @route   POST /api/classes/teaching/check-conflicts
// @access  Private
exports.checkScheduleConflicts = async (req, res) => {
  try {
    const { teacher_id, schedule, class_id } = req.body;

    if (
      !teacher_id ||
      !schedule ||
      !Array.isArray(schedule) ||
      schedule.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết để kiểm tra xung đột lịch",
      });
    }

    // Mảng lưu các xung đột tìm thấy
    const conflicts = [];

    // 1. Kiểm tra xung đột lịch của giáo viên
    for (const scheduleItem of schedule) {
      const { day_of_week, start_time, end_time, room_id } = scheduleItem;

      if (!day_of_week || !start_time || !end_time || !room_id) {
        continue; // Bỏ qua các mục không đầy đủ thông tin
      }

      // Chuẩn bị query để tìm các lớp có lịch trùng với lịch mới
      const teacherClassesQuery = {
        teacher_id,
        schedule: {
          $elemMatch: {
            day_of_week: day_of_week,
            $or: [
              {
                // Trường hợp lịch mới bắt đầu trong khoảng thời gian của lịch hiện có
                start_time: { $lte: start_time },
                end_time: { $gte: start_time },
              },
              {
                // Trường hợp lịch mới kết thúc trong khoảng thời gian của lịch hiện có
                start_time: { $lte: end_time },
                end_time: { $gte: end_time },
              },
              {
                // Trường hợp lịch mới bao trùm lịch hiện có
                start_time: { $gte: start_time },
                end_time: { $lte: end_time },
              },
            ],
          },
        },
      };

      // Nếu đang cập nhật lớp học hiện có, loại trừ lớp đó khỏi kết quả kiểm tra
      if (class_id) {
        teacherClassesQuery._id = { $ne: class_id };
      }

      const teacherConflicts = await TeachingClass.find(teacherClassesQuery)
        .populate("subject_id", "name code")
        .select("class_name class_code subject_id schedule");

      if (teacherConflicts.length > 0) {
        teacherConflicts.forEach((conflictClass) => {
          // Tìm chính xác lịch học bị xung đột
          const conflictSchedule = conflictClass.schedule.find(
            (item) =>
              item.day_of_week === day_of_week &&
              ((item.start_time <= start_time && item.end_time >= start_time) ||
                (item.start_time <= end_time && item.end_time >= end_time) ||
                (item.start_time >= start_time && item.end_time <= end_time))
          );

          if (conflictSchedule) {
            conflicts.push({
              type: "teacher",
              day_of_week,
              time: `${conflictSchedule.start_time} - ${conflictSchedule.end_time}`,
              class_info: {
                id: conflictClass._id,
                name: conflictClass.class_name,
                code: conflictClass.class_code,
                subject: conflictClass.subject_id?.name || "Không xác định",
              },
              message: `Giáo viên đã có lịch dạy lớp ${
                conflictClass.class_name
              } (${
                conflictClass.subject_id?.name || "Không xác định"
              }) vào ${getDayOfWeekName(day_of_week)} lúc ${
                conflictSchedule.start_time
              } - ${conflictSchedule.end_time}`,
            });
          }
        });
      }

      // 2. Kiểm tra xung đột lịch của phòng học
      const roomQuery = {
        schedule: {
          $elemMatch: {
            room_id: new mongoose.Types.ObjectId(room_id),
            day_of_week: day_of_week,
            $or: [
              {
                start_time: { $lte: start_time },
                end_time: { $gte: start_time },
              },
              {
                start_time: { $lte: end_time },
                end_time: { $gte: end_time },
              },
              {
                start_time: { $gte: start_time },
                end_time: { $lte: end_time },
              },
            ],
          },
        },
      };

      // Nếu đang cập nhật lớp học hiện có, loại trừ lớp đó khỏi kết quả kiểm tra
      if (class_id) {
        roomQuery._id = { $ne: class_id };
      }

      const roomConflicts = await TeachingClass.find(roomQuery)
        .populate("subject_id", "name code")
        .populate("teacher_id", "full_name")
        .select("class_name class_code subject_id teacher_id schedule");

      if (roomConflicts.length > 0) {
        roomConflicts.forEach((conflictClass) => {
          // Tìm chính xác lịch học bị xung đột
          const conflictSchedule = conflictClass.schedule.find(
            (item) =>
              item.room_id.toString() === room_id.toString() &&
              item.day_of_week === day_of_week &&
              ((item.start_time <= start_time && item.end_time >= start_time) ||
                (item.start_time <= end_time && item.end_time >= end_time) ||
                (item.start_time >= start_time && item.end_time <= end_time))
          );

          if (conflictSchedule) {
            conflicts.push({
              type: "room",
              day_of_week,
              time: `${conflictSchedule.start_time} - ${conflictSchedule.end_time}`,
              room_id,
              class_info: {
                id: conflictClass._id,
                name: conflictClass.class_name,
                code: conflictClass.class_code,
                subject: conflictClass.subject_id?.name || "Không xác định",
                teacher:
                  conflictClass.teacher_id?.full_name || "Không xác định",
              },
              message: `Phòng học đã được đặt cho lớp ${
                conflictClass.class_name
              } (${
                conflictClass.subject_id?.name || "Không xác định"
              }) của giảng viên ${
                conflictClass.teacher_id?.full_name || "Không xác định"
              } vào ${getDayOfWeekName(day_of_week)} lúc ${
                conflictSchedule.start_time
              } - ${conflictSchedule.end_time}`,
            });
          }
        });
      }
    }

    // Trả về kết quả kiểm tra
    res.status(200).json({
      success: true,
      has_conflicts: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra xung đột lịch học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi kiểm tra xung đột lịch học",
      error: error.message,
    });
  }
};

// Hàm hỗ trợ để lấy tên thứ trong tuần từ số
const getDayOfWeekName = (day) => {
  const days = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  return days[day] || "Không xác định";
};

// Hàm hỗ trợ tạo các buổi điểm danh dựa vào lịch học
async function generateAttendanceSessions(teachingClass) {
  try {
    // Xóa các buổi điểm danh cũ của lớp học nếu cập nhật lịch
    await AttendanceSession.deleteMany({
      teaching_class_id: teachingClass._id,
      status: "pending", // Chỉ xóa các buổi chưa bắt đầu
    });

    if (!teachingClass.schedule || teachingClass.schedule.length === 0) {
      return;
    }

    const startDate = new Date(teachingClass.course_start_date);
    const endDate = new Date(teachingClass.course_end_date);

    if (!startDate || !endDate) {
      return;
    }

    // Tạo các buổi học cho từng lịch trong schedule
    for (const scheduleItem of teachingClass.schedule) {
      if (!scheduleItem.is_recurring) {
        // Nếu không lặp lại, tạo buổi học cho các ngày cụ thể
        if (
          scheduleItem.specific_dates &&
          scheduleItem.specific_dates.length > 0
        ) {
          for (const specificDate of scheduleItem.specific_dates) {
            const sessionDate = new Date(specificDate);
            await createAttendanceSession(
              teachingClass,
              scheduleItem,
              sessionDate
            );
          }
        }
        continue;
      }

      // Lặp qua tất cả các ngày từ ngày bắt đầu đến ngày kết thúc
      const currentDate = new Date(startDate);
      let sessionCount = 0;

      while (
        currentDate <= endDate &&
        sessionCount < teachingClass.total_sessions
      ) {
        // Kiểm tra nếu ngày hiện tại có khớp với lịch học (thứ trong tuần)
        if (currentDate.getDay() === scheduleItem.day_of_week) {
          // Kiểm tra xem ngày này có phải là ngày bị loại trừ không
          const isExcluded =
            scheduleItem.excluded_dates &&
            scheduleItem.excluded_dates.some(
              (date) =>
                new Date(date).toDateString() === currentDate.toDateString()
            );

          if (!isExcluded) {
            await createAttendanceSession(
              teachingClass,
              scheduleItem,
              new Date(currentDate)
            );
            sessionCount++;
          }
        }

        // Tăng ngày lên 1
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } catch (error) {
    console.error("Lỗi khi tạo buổi điểm danh:", error);
  }
}

// Hàm tạo một buổi điểm danh
async function createAttendanceSession(
  teachingClass,
  scheduleItem,
  sessionDate
) {
  // Tạo thời gian bắt đầu và kết thúc từ giờ trong lịch học
  const [startHour, startMinute] = scheduleItem.start_time
    .split(":")
    .map(Number);
  const [endHour, endMinute] = scheduleItem.end_time.split(":").map(Number);

  const startTime = new Date(sessionDate);
  startTime.setHours(startHour, startMinute, 0);

  const endTime = new Date(sessionDate);
  endTime.setHours(endHour, endMinute, 0);

  // Tạo buổi điểm danh mới
  const sessionNumber =
    (await AttendanceSession.countDocuments({
      teaching_class_id: teachingClass._id,
    })) + 1;

  await AttendanceSession.create({
    teaching_class_id: teachingClass._id,
    session_number: sessionNumber,
    date: sessionDate,
    room: scheduleItem.room_id,
    start_time: startTime,
    end_time: endTime,
    status: "pending",
    students_absent: [...teachingClass.students],
  });
}

// @desc    Tạo lại tất cả các buổi điểm danh theo lịch học
// @route   POST /api/classes/teaching/:id/generate-sessions
// @access  Private (Admin, Teacher)
exports.regenerateAttendanceSessions = async (req, res) => {
  try {
    const teachingClass = await TeachingClass.findById(req.params.id).populate(
      "students",
      "_id"
    );

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    await generateAttendanceSessions(teachingClass);

    res.status(200).json({
      success: true,
      message: "Tạo lại các buổi điểm danh thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy thông kê của lớp giảng dạy
// @route   GET /api/classes/teaching-statistics
// @access  Private (Admin)
exports.getTeachingClassStatistics = async (req, res) => {
  try {
    const totalCount = await TeachingClass.countDocuments();

    // Thống kê theo môn học
    const subjectStats = await TeachingClass.aggregate([
      {
        $match: {
          subject_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$subject_id",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      {
        $unwind: {
          path: "$subject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          subjectName: "$subject.name",
          subjectCode: "$subject.code",
          count: 1,
        },
      },
    ]);

    // Thống kê theo giáo viên
    const teacherStats = await TeachingClass.aggregate([
      {
        $match: {
          teacher_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$teacher_id",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $unwind: {
          path: "$teacher",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          teacherName: "$teacher.full_name",
          teacherEmail: "$teacher.email",
          count: 1,
        },
      },
    ]);

    // Tính số lượng sinh viên trong tất cả các lớp giảng dạy
    const totalStudents = await TeachingClass.aggregate([
      {
        $project: {
          studentCount: {
            $cond: {
              if: { $isArray: "$students" },
              then: { $size: "$students" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: "$studentCount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCount,
      subjectStats,
      teacherStats,
      totalStudents:
        totalStudents.length > 0 ? totalStudents[0].totalStudents : 0,
    });
  } catch (error) {
    console.error("Error in getTeachingClassStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê lớp giảng dạy",
      error: error.message,
    });
  }
};

// =================== STUDENT MANAGEMENT CONTROLLERS ===================

// @desc    Thêm sinh viên vào lớp giảng dạy
// @route   POST /api/classes/teaching/:id/students
// @access  Private (Admin, Teacher)
exports.addStudentToClass = async (req, res) => {
  try {
    const { student_id } = req.body;
    const classId = req.params.id;

    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thêm sinh viên vào lớp này",
      });
    }

    // Kiểm tra sinh viên đã tồn tại trong lớp chưa
    if (teachingClass.students.includes(student_id)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên đã có trong lớp",
      });
    }

    // Thêm sinh viên vào lớp
    teachingClass.students.push(student_id);
    await teachingClass.save();

    res.status(200).json({
      success: true,
      message: "Thêm sinh viên vào lớp thành công",
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Thêm nhiều sinh viên vào lớp giảng dạy
// @route   POST /api/classes/teaching/:id/students/batch
// @access  Private (Admin, Teacher)
exports.addStudentsBatch = async (req, res) => {
  try {
    const { student_ids } = req.body;
    const classId = req.params.id;

    if (!student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp danh sách ID sinh viên",
      });
    }

    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thêm sinh viên vào lớp này",
      });
    }

    // Lọc sinh viên chưa có trong lớp
    const newStudents = student_ids.filter(
      (id) => !teachingClass.students.includes(id)
    );

    // Thêm sinh viên vào lớp
    teachingClass.students = [...teachingClass.students, ...newStudents];
    await teachingClass.save();

    res.status(200).json({
      success: true,
      message: `Đã thêm ${newStudents.length} sinh viên vào lớp`,
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Xóa sinh viên khỏi lớp giảng dạy
// @route   DELETE /api/classes/teaching/:id/students/:studentId
// @access  Private (Admin, Teacher)
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params; // Ensure classId is used consistently

    const teachingClass = await TeachingClass.findById(classId); // Use classId

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa sinh viên khỏi lớp này",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không có trong lớp",
      });
    }

    // 1. Xóa sinh viên khỏi mảng students của TeachingClass
    teachingClass.students = teachingClass.students.filter(
      (id) => id.toString() !== studentId
    );
    await teachingClass.save();

    // 2. Xóa StudentScore liên quan
    await StudentScore.deleteOne({
      teaching_class_id: classId, // Use classId
      student_id: studentId,
    });

    // 3. Xóa AttendanceLog và cập nhật AttendanceSession
    const sessions = await AttendanceSession.find({
      teaching_class_id: classId, // Use classId
    });

    for (const session of sessions) {
      // Xóa AttendanceLog của sinh viên này trong buổi học này
      await AttendanceLog.deleteMany({
        session_id: session._id,
        student_id: studentId,
      });

      // Cập nhật mảng students_present và students_absent trong AttendanceSession
      session.students_present = session.students_present.filter(
        (id) => id.toString() !== studentId
      );
      session.students_absent = session.students_absent.filter(
        (id) => id.toString() !== studentId
      );
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: "Xóa sinh viên khỏi lớp và các dữ liệu liên quan thành công",
      data: teachingClass, // Trả về thông tin lớp đã cập nhật
    });
  } catch (error) {
    console.error("Lỗi khi xóa sinh viên khỏi lớp giảng dạy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa sinh viên",
      error: error.message,
    });
  }
};

// =================== STUDENT APPROVAL CONTROLLERS ===================

// @desc    Get pending students of a main class
// @route   GET /api/classes/main/:id/pending-students
// @access  Private (Admin, Advisor)
exports.getPendingStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm lớp học
    const mainClass = await MainClass.findById(id);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền truy cập - chỉ admin hoặc giáo viên cố vấn của lớp mới được xem
    if (
      req.user.role !== "admin" &&
      (req.user.role !== "teacher" ||
        !mainClass.advisor_id ||
        !mainClass.advisor_id.equals(req.user.id))
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền xem danh sách sinh viên chờ duyệt của lớp này",
      });
    }

    // Kiểm tra nếu trường pending_students không tồn tại
    if (!mainClass.pending_students) {
      // Cập nhật lớp học để thêm trường pending_students là một mảng rỗng
      mainClass.pending_students = [];
      await mainClass.save();

      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Lấy danh sách sinh viên chờ duyệt
    const pendingStudents = await User.find({
      _id: { $in: mainClass.pending_students },
      role: "student",
    }).select("-password -refresh_token");

    // Thêm thông tin có dữ liệu khuôn mặt cho mỗi sinh viên
    const pendingStudentsWithFaceInfo = pendingStudents.map((student) => {
      const studentObj = student.toObject();

      // Kiểm tra có dữ liệu khuôn mặt không
      studentObj.has_face_data = !!(
        studentObj.faceFeatures &&
        studentObj.faceFeatures.descriptors &&
        studentObj.faceFeatures.descriptors.length > 0
      );

      // Thêm mảng hình ảnh khuôn mặt nếu có
      if (
        studentObj.has_face_data &&
        studentObj.faceImages &&
        studentObj.faceImages.length > 0
      ) {
        // Nếu đã có sẵn dữ liệu hình ảnh từ database, sử dụng trực tiếp
        studentObj.faceImages = studentObj.faceImages;
      } else {
        // Nếu không có, gán một mảng rỗng
        studentObj.faceImages = [];
      }

      return studentObj;
    });

    return res.status(200).json({
      success: true,
      data: pendingStudentsWithFaceInfo,
    });
  } catch (error) {
    console.error("Error getting pending students:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Approve a student to join a main class
// @route   PUT /api/classes/main/:id/approve-student/:studentId
// @access  Private (Admin, Advisor)
exports.approveStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Kiểm tra lớp học tồn tại
    const mainClass = await MainClass.findById(id);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền truy cập
    if (
      req.user.role !== "admin" &&
      (req.user.role !== "teacher" ||
        !mainClass.advisor_id ||
        !mainClass.advisor_id.equals(req.user.id))
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền phê duyệt sinh viên vào lớp này",
      });
    }

    // Kiểm tra sinh viên tồn tại
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    // Kiểm tra sinh viên có trong danh sách chờ duyệt không
    if (!mainClass.pending_students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không nằm trong danh sách chờ duyệt",
      });
    }

    // Kiểm tra sinh viên đã được phê duyệt trước đó chưa
    if (mainClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên đã được phê duyệt vào lớp này trước đó",
      });
    }

    // Cập nhật thông tin sinh viên
    student.status = "approved"; // Chuyển trạng thái thành approved thay vì active
    student.main_class_id = id; // Thêm mã lớp chính
    await student.save();

    // Cập nhật danh sách sinh viên của lớp
    mainClass.students.push(studentId);
    mainClass.pending_students = mainClass.pending_students.filter(
      (id) => id.toString() !== studentId.toString()
    );
    await mainClass.save();

    // Tạo thông báo cho sinh viên
    await Notification.create({
      recipient_id: studentId,
      sender_id: req.user.id,
      type: "class_approval",
      title: "Đăng ký lớp học được chấp nhận",
      content: `Yêu cầu tham gia lớp ${mainClass.name} của bạn đã được chấp nhận.`,
      data: {
        class_id: id,
        class_name: mainClass.name,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Phê duyệt sinh viên thành công",
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          email: student.email,
          status: student.status,
        },
        main_class: {
          id: mainClass._id,
          name: mainClass.name,
        },
      },
    });
  } catch (error) {
    console.error("Error approving student:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Từ chối sinh viên vào lớp chính
// @route   PUT /api/classes/main/:id/reject-student/:studentId
// @access  Private (Admin, Teacher)
exports.rejectStudent = async (req, res) => {
  try {
    const mainClassId = req.params.id;
    const studentId = req.params.studentId;
    const { reason } = req.body;

    const mainClass = await MainClass.findById(mainClassId).populate(
      "advisor_id",
      "full_name email"
    );

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Cho phép tất cả giáo viên và admin từ chối sinh viên
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền từ chối sinh viên vào lớp này",
      });
    }

    // Tìm sinh viên
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    // Cập nhật trạng thái sinh viên thành rejected
    await User.findByIdAndUpdate(studentId, {
      status: "rejected",
      approved_by: req.user.id,
      approval_date: Date.now(),
    });

    // Xóa sinh viên khỏi danh sách chờ duyệt nếu tồn tại
    if (mainClass.pending_students && mainClass.pending_students.length > 0) {
      mainClass.pending_students = mainClass.pending_students.filter(
        (id) => id.toString() !== studentId.toString()
      );
      await mainClass.save();
    }

    // Thêm thông báo cho sinh viên
    if (reason) {
      await Notification.create({
        title: "Đăng ký lớp bị từ chối",
        content: `Yêu cầu tham gia lớp ${mainClass.name} của bạn đã bị từ chối. Lý do: ${reason}`,
        sender_id: req.user.id,
        receiver_id: studentId,
        main_class_id: mainClassId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã từ chối sinh viên",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách sinh viên đã được duyệt trong lớp chính
// @route   GET /api/classes/main/:id/approved-students
// @access  Private (Admin, Advisor)
exports.getApprovedStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { search, page = 1, limit = 10, sort = "full_name" } = req.query;
    const mainClass = await MainClass.findById(id);

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      req.user.role !== "teacher" &&
      (!mainClass.advisor_id || mainClass.advisor_id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem danh sách này",
      });
    }

    // Xây dựng query để tìm kiếm sinh viên
    const query = {
      _id: { $in: mainClass.students },
      role: "student",
    };

    // Nếu có từ khóa tìm kiếm
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "school_info.student_id": { $regex: search, $options: "i" } },
      ];
    }

    // Đếm tổng số lượng sinh viên thỏa mãn điều kiện
    const total = await User.countDocuments(query);

    // Tính toán phân trang
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Lấy danh sách sinh viên đã được duyệt với phân trang
    const approvedStudents = await User.find(query)
      .select("-password -refresh_token")
      .sort({ [sort]: 1 })
      .skip(skip)
      .limit(limitInt);

    // Thêm thông tin có dữ liệu khuôn mặt cho mỗi sinh viên
    const approvedStudentsWithFaceInfo = approvedStudents.map((student) => {
      const studentObj = student.toObject();

      // Kiểm tra có dữ liệu khuôn mặt không
      studentObj.has_face_data = !!(
        studentObj.faceFeatures &&
        studentObj.faceFeatures.descriptors &&
        studentObj.faceFeatures.descriptors.length > 0
      );

      // Thêm mảng hình ảnh khuôn mặt nếu có
      if (
        studentObj.has_face_data &&
        studentObj.faceImages &&
        studentObj.faceImages.length > 0
      ) {
        // Nếu đã có sẵn dữ liệu hình ảnh từ database, sử dụng trực tiếp
        studentObj.faceImages = studentObj.faceImages;
      } else {
        // Nếu không có, gán một mảng rỗng
        studentObj.faceImages = [];
      }

      return studentObj;
    });

    res.status(200).json({
      success: true,
      data: {
        students: approvedStudentsWithFaceInfo,
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách sinh viên đăng ký trong một lớp giảng dạy
// @route   GET /api/classes/teaching/:id/students
// @access  Private (Teacher, Admin)
exports.getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền hạn: chỉ admin hoặc giáo viên phụ trách mới được xem
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin lớp này",
      });
    }

    // Lấy danh sách sinh viên với thông tin chi tiết
    const students = await User.find({
      _id: { $in: teachingClass.students },
    }).select("_id full_name email avatar_url school_info.student_id");

    // Lấy danh sách bảng điểm của sinh viên trong lớp
    const studentScores = await StudentScore.find({
      teaching_class_id: id,
    });

    // Kết hợp thông tin sinh viên với bảng điểm
    const studentsWithScores = students.map((student) => {
      const score = studentScores.find(
        (score) => score.student_id.toString() === student._id.toString()
      );

      return {
        ...student.toObject(),
        score: score
          ? {
              attendance_score: score.attendance_score,
              absent_sessions: score.absent_sessions,
              final_score: score.final_score,
              is_failed_due_to_absent: score.is_failed_due_to_absent,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: students.length,
      data: studentsWithScores,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sinh viên trong lớp:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách sinh viên trong lớp",
      error: error.message,
    });
  }
};

// @desc    Cập nhật điểm môn học cho sinh viên
// @route   PUT /api/classes/teaching/:id/students/:studentId/score
// @access  Private (Teacher)
exports.updateStudentScore = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { final_score, attendance_score, note } = req.body;

    // Kiểm tra lớp học tồn tại
    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền hạn: chỉ giáo viên phụ trách mới được cập nhật điểm
    if (
      teachingClass.teacher_id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật điểm cho lớp này",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này",
      });
    }

    // Cập nhật điểm số
    let scoreRecord = await StudentScore.findOne({
      teaching_class_id: id,
      student_id: studentId,
    });

    if (!scoreRecord) {
      // Tạo mới nếu chưa có
      scoreRecord = new StudentScore({
        teaching_class_id: id,
        student_id: studentId,
        total_sessions: teachingClass.total_sessions,
        max_absent_allowed: teachingClass.max_absent_allowed || 3,
      });
    }

    if (final_score !== undefined) {
      scoreRecord.final_score = final_score;
    }

    if (attendance_score !== undefined) {
      scoreRecord.attendance_score = attendance_score;
    }

    if (note) {
      scoreRecord.note = note;
    }

    scoreRecord.last_updated = Date.now();
    await scoreRecord.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật điểm thành công",
      data: scoreRecord,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật điểm sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật điểm sinh viên",
      error: error.message,
    });
  }
};

// @desc    Lấy thông tin về tình trạng vắng mặt trong lớp học
// @route   GET /api/classes/teaching/:id/attendance-stats
// @access  Private (Teacher, Admin)
exports.getClassAttendanceStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra lớp học tồn tại
    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền hạn
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin lớp này",
      });
    }

    // Lấy danh sách buổi học
    const sessions = await AttendanceSession.find({
      teaching_class_id: id,
    }).sort({ session_number: 1 });

    // Lấy danh sách sinh viên và thông tin vắng mặt
    const studentScores = await StudentScore.find({
      teaching_class_id: id,
    });

    // Lấy thông tin chi tiết về sinh viên
    const students = await User.find({
      _id: { $in: teachingClass.students },
    }).select("_id full_name school_info.student_id");

    // Lấy tất cả log điểm danh
    const attendanceLogs = await AttendanceLog.find({
      session_id: { $in: sessions.map((s) => s._id) },
    });

    // Thống kê theo sinh viên
    const studentStats = students.map((student) => {
      const score = studentScores.find(
        (s) => s.student_id.toString() === student._id.toString()
      );

      // Thống kê tình trạng điểm danh của sinh viên qua các buổi học
      const sessionStats = sessions.map((session) => {
        const log = attendanceLogs.find(
          (log) =>
            log.session_id.toString() === session._id.toString() &&
            log.student_id.toString() === student._id.toString()
        );

        return {
          session_id: session._id,
          session_number: session.session_number,
          date: session.date,
          status: log ? log.status : "absent",
          note: log ? log.note : null,
        };
      });

      return {
        student_id: student._id,
        full_name: student.full_name,
        student_id: student.school_info?.student_id,
        absent_sessions: score ? score.absent_sessions : 0,
        attendance_score: score ? score.attendance_score : 10,
        is_failed_due_to_absent: score ? score.is_failed_due_to_absent : false,
        sessions: sessionStats,
      };
    });

    // Thống kê theo buổi học
    const sessionStats = sessions.map((session) => {
      const presentCount = session.students_present.length;
      const absentCount = session.students_absent.length;
      const totalStudents = teachingClass.students.length;

      return {
        session_id: session._id,
        session_number: session.session_number,
        date: session.date,
        present_count: presentCount,
        absent_count: absentCount,
        attendance_rate:
          totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        class_info: {
          _id: teachingClass._id,
          class_name: teachingClass.class_name,
          class_code: teachingClass.class_code,
          total_sessions: teachingClass.total_sessions,
          max_absent_allowed: teachingClass.max_absent_allowed,
        },
        sessions_completed: sessions.filter((s) => s.status === "completed")
          .length,
        total_sessions: teachingClass.total_sessions,
        student_stats: studentStats,
        session_stats: sessionStats,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê điểm danh",
      error: error.message,
    });
  }
};

// @desc    Xóa sinh viên khỏi lớp chính và cập nhật các liên kết
// @route   DELETE /api/classes/main/:id/students/:studentId
// @access  Private (Admin, Advisor)
exports.removeStudentFromMainClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const mainClass = await MainClass.findById(classId);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền: Admin hoặc Cố vấn của lớp
    if (
      req.user.role !== "admin" &&
      (!mainClass.advisor_id || mainClass.advisor_id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa sinh viên khỏi lớp này",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!mainClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không có trong lớp chính này",
      });
    }

    // 1. Xóa sinh viên khỏi mảng students của MainClass
    mainClass.students = mainClass.students.filter(
      (sId) => sId.toString() !== studentId
    );
    await mainClass.save();

    // 2. Cập nhật User: xóa main_class_id của sinh viên
    await User.findByIdAndUpdate(studentId, { $unset: { main_class_id: "" } });

    // 3. (Tùy chọn) Xóa Notification liên quan đến việc phê duyệt vào lớp này
    // Ví dụ: xóa thông báo có type 'class_approval' và data.class_id là classId
    await Notification.deleteMany({
      recipient_id: studentId,
      type: "class_approval", // Đảm bảo type này là đúng
      "data.class_id": classId,
    });

    res.status(200).json({
      success: true,
      message: "Xóa sinh viên khỏi lớp chính và cập nhật liên kết thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sinh viên khỏi lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa sinh viên khỏi lớp chính",
      error: error.message,
    });
  }
};
