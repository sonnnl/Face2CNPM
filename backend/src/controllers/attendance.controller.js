const {
  AttendanceSession,
  AttendanceLog,
  TeachingClass,
  StudentScore,
} = require("../models/schemas");

// @desc    Tạo phiên điểm danh mới
// @route   POST /api/attendance/sessions
// @access  Private (Chỉ giáo viên)
exports.createAttendanceSession = async (req, res) => {
  try {
    const { teaching_class_id, session_number, date, room } = req.body;

    // Tìm lớp học
    const teachingClass = await TeachingClass.findById(teaching_class_id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra xem người gửi request có phải giáo viên của lớp không
    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải giáo viên của lớp này",
      });
    }

    // Kiểm tra session number
    if (session_number > teachingClass.total_sessions) {
      return res.status(400).json({
        success: false,
        message: "Số buổi vượt quá tổng số buổi học",
      });
    }

    // Kiểm tra xem đã tồn tại phiên điểm danh chưa
    const existingSession = await AttendanceSession.findOne({
      teaching_class_id,
      session_number,
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: "Phiên điểm danh đã tồn tại",
      });
    }

    // Tạo phiên điểm danh mới
    const attendanceSession = await AttendanceSession.create({
      teaching_class_id,
      session_number,
      date: date || new Date(),
      room,
      started_by: req.user.id,
      status: "active",
      start_time: new Date(),
      students_absent: [...teachingClass.students], // Ban đầu tất cả vắng mặt
      students_present: [],
    });

    res.status(201).json({
      success: true,
      data: attendanceSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy thông tin phiên điểm danh
// @route   GET /api/attendance/sessions/:id
// @access  Private
exports.getAttendanceSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate({
        path: "teaching_class_id",
        select: "class_name class_code subject_id teacher_id",
        populate: {
          path: "subject_id",
          select: "name code credits",
        },
      })
      .populate({
        path: "students_present.student_id",
        select: "full_name student_code avatar_url",
      })
      .populate({
        path: "students_absent",
        select: "full_name student_code avatar_url",
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      })
      .populate({
        path: "started_by",
        select: "full_name",
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Cập nhật phiên điểm danh
// @route   PUT /api/attendance/sessions/:id
// @access  Private (Chỉ giáo viên)
exports.updateAttendanceSession = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Tìm phiên điểm danh
    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Xác minh quyền - chỉ giáo viên tạo hoặc admin có thể cập nhật
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );

    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      session.started_by.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền cập nhật phiên điểm danh này",
      });
    }

    // Cập nhật trạng thái
    if (status) {
      session.status = status;

      // Nếu hoàn thành, chỉ cập nhật điểm chuyên cần, không cập nhật thời gian kết thúc
      if (status === "completed") {
        // Không cập nhật end_time nữa, để giữ nguyên thời gian kết thúc dự kiến
        // session.end_time = new Date(); <- dòng này đã bị xóa

        // Tự động cập nhật điểm chuyên cần
        await updateAttendanceScores(session.teaching_class_id);
      }
    }

    // Cập nhật ghi chú
    if (notes) {
      session.notes = notes;
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy danh sách phiên điểm danh của lớp học
// @route   GET /api/attendance/teaching-class/:id/sessions
// @access  Private
exports.getClassAttendanceSessions = async (req, res) => {
  try {
    const teachingClassId = req.params.id;

    // Kiểm tra lớp học
    const teachingClass = await TeachingClass.findById(teachingClassId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền
    const isTeacher = teachingClass.teacher_id.toString() === req.user.id;
    const isStudent = teachingClass.students.includes(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem phiên điểm danh của lớp này",
      });
    }

    // Lấy danh sách phiên điểm danh
    const sessions = await AttendanceSession.find({
      teaching_class_id: teachingClassId,
    })
      .sort({ session_number: 1 })
      .populate({
        path: "started_by",
        select: "full_name",
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách logs điểm danh trong một phiên
// @route   GET /api/attendance/logs/:sessionId
// @access  Private
exports.getAttendanceLogs = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Tìm phiên điểm danh
    const session = await AttendanceSession.findById(sessionId).populate({
      path: "teaching_class_id",
      select: "teacher_id subject_id students",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Kiểm tra quyền
    const isTeacher =
      session.teaching_class_id.teacher_id.toString() === req.user.id;
    const isStudent = session.teaching_class_id.students.includes(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem logs điểm danh của phiên này",
      });
    }

    // Nếu là sinh viên, chỉ xem được log của mình
    let query = { session_id: sessionId };
    if (isStudent && !isTeacher && !isAdmin) {
      query.student_id = req.user.id;
    }

    // Lấy danh sách logs
    const logs = await AttendanceLog.find(query)
      .populate({
        path: "student_id",
        select: "full_name student_code avatar_url school_info",
      })
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách logs điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy lịch sử điểm danh của sinh viên
// @route   GET /api/attendance/student/:studentId/logs
// @access  Private
exports.getStudentAttendanceLogs = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Kiểm tra quyền
    const isStudent = req.user.id === studentId;
    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";

    if (!isStudent && !isAdmin && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem lịch sử điểm danh của sinh viên này",
      });
    }

    // Lấy danh sách logs
    const logs = await AttendanceLog.find({ student_id: studentId })
      .populate({
        path: "session_id",
        select: "teaching_class_id session_number date status",
        populate: {
          path: "teaching_class_id",
          select: "class_name class_code course_id",
          populate: {
            path: "course_id",
            select: "name code",
          },
        },
      })
      .sort({ "session_id.date": -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy điểm chuyên cần của sinh viên
// @route   GET /api/attendance/student/:studentId/scores
// @access  Private
exports.getStudentScores = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Kiểm tra quyền
    const isStudent = req.user.id === studentId;
    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";

    if (!isStudent && !isAdmin && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem điểm chuyên cần của sinh viên này",
      });
    }

    // Lấy danh sách điểm
    const scores = await StudentScore.find({ student_id: studentId })
      .populate({
        path: "teaching_class_id",
        select: "class_name class_code course_id teacher_id",
        populate: [
          {
            path: "course_id",
            select: "name code credit",
          },
          {
            path: "teacher_id",
            select: "full_name",
          },
        ],
      })
      .sort({ last_updated: -1 });

    res.status(200).json({
      success: true,
      count: scores.length,
      data: scores,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Tính toán lại điểm chuyên cần
// @route   POST /api/attendance/scores/calculate
// @access  Private (Chỉ giáo viên)
exports.calculateAttendanceScores = async (req, res) => {
  try {
    const { teaching_class_id } = req.body;

    if (!teaching_class_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID lớp học",
      });
    }

    // Tìm lớp học
    const teachingClass = await TeachingClass.findById(teaching_class_id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền
    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền tính toán điểm chuyên cần cho lớp này",
      });
    }

    // Gọi hàm tính toán điểm
    const updatedScores = await updateAttendanceScores(teaching_class_id);

    res.status(200).json({
      success: true,
      count: updatedScores.length,
      data: updatedScores,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// Hàm hỗ trợ tính toán điểm chuyên cần
const updateAttendanceScores = async (teachingClassId) => {
  // Lấy thông tin lớp học
  const teachingClass = await TeachingClass.findById(teachingClassId);

  if (!teachingClass) {
    throw new Error("Không tìm thấy lớp học");
  }

  // Lấy tất cả phiên điểm danh đã hoàn thành
  const completedSessions = await AttendanceSession.find({
    teaching_class_id: teachingClassId,
    status: "completed",
  });

  // Lấy số lượng phiên điểm danh đã hoàn thành
  const totalCompletedSessions = completedSessions.length;

  // Cập nhật điểm cho từng sinh viên
  const updatedScores = [];

  for (const studentId of teachingClass.students) {
    // Đếm số buổi vắng
    const absentCount = await AttendanceLog.countDocuments({
      session_id: { $in: completedSessions.map((session) => session._id) },
      student_id: studentId,
      status: "absent",
    });

    // Tính điểm chuyên cần (10 - số buổi vắng * 2)
    let attendanceScore = 10 - absentCount * 2;
    if (attendanceScore < 0) attendanceScore = 0;

    // Kiểm tra có rớt vì vắng quá số buổi cho phép không
    const maxAbsentAllowed = teachingClass.max_absent_allowed || 3;
    const isFailedDueToAbsent = absentCount > maxAbsentAllowed;

    // Tìm điểm chuyên cần hiện tại
    let studentScore = await StudentScore.findOne({
      student_id: studentId,
      teaching_class_id: teachingClassId,
    });

    if (studentScore) {
      // Cập nhật điểm nếu đã tồn tại
      studentScore.total_sessions = totalCompletedSessions;
      studentScore.absent_sessions = absentCount;
      studentScore.attendance_score = attendanceScore;
      studentScore.max_absent_allowed = maxAbsentAllowed;
      studentScore.is_failed_due_to_absent = isFailedDueToAbsent;
      studentScore.last_updated = Date.now();

      await studentScore.save();
    } else {
      // Tạo mới nếu chưa tồn tại
      studentScore = await StudentScore.create({
        student_id: studentId,
        teaching_class_id: teachingClassId,
        total_sessions: totalCompletedSessions,
        absent_sessions: absentCount,
        attendance_score: attendanceScore,
        max_absent_allowed: maxAbsentAllowed,
        is_failed_due_to_absent: isFailedDueToAbsent,
        last_updated: Date.now(),
      });
    }

    updatedScores.push(studentScore);
  }

  return updatedScores;
};

/**
 * @desc    Lấy tất cả các phiên điểm danh với phân trang
 * @route   GET /api/attendance/sessions
 * @access  Private (Admin, Teacher)
 */
exports.getAllAttendanceSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Nếu người dùng là giáo viên, chỉ lấy các phiên do họ tạo
    if (req.user.role === "teacher") {
      query.created_by = req.user._id;
    }

    const sessions = await AttendanceSession.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "teaching_class_id",
        select: "class_name subject_id teacher_id",
        populate: [
          { path: "subject_id", select: "name code" },
          { path: "teacher_id", select: "full_name" },
        ],
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      });

    const totalCount = await AttendanceSession.countDocuments(query);

    res.status(200).json({
      success: true,
      data: sessions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách phiên điểm danh",
      error: error.message,
    });
  }
};

// @desc    Cập nhật trạng thái phiên điểm danh
// @route   PUT /api/attendance/sessions/:id/status
// @access  Private (Chỉ giáo viên)
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["pending", "active", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ. Trạng thái phải là 'pending', 'active', hoặc 'completed'",
      });
    }

    // Tìm phiên điểm danh
    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Xác minh quyền - chỉ giáo viên tạo hoặc admin có thể cập nhật
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );

    if (
      !teachingClass ||
      (teachingClass.teacher_id.toString() !== req.user.id &&
        req.user.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền cập nhật phiên điểm danh này",
      });
    }

    // Cập nhật trạng thái
    session.status = status;

    // Nếu bắt đầu, cập nhật thời gian bắt đầu
    if (status === "active" && !session.start_time) {
      session.start_time = new Date();
    }

    // Khi hoàn thành, chỉ cập nhật trạng thái và điểm chuyên cần
    if (status === "completed") {
      // Không cập nhật end_time nữa, để giữ nguyên thời gian kết thúc dự kiến
      // session.end_time = new Date(); <- dòng này đã bị xóa

      // Tự động cập nhật điểm chuyên cần
      if (typeof updateAttendanceScores === "function") {
        await updateAttendanceScores(session.teaching_class_id);
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái phiên điểm danh thành ${status}`,
      data: session,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};
