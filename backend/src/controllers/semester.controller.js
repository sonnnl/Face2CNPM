const { Semester, TeachingClass } = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý học kỳ
 */

// @desc    Lấy danh sách tất cả học kỳ
// @route   GET /api/semesters
// @access  Private
exports.getAllSemesters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const year = req.query.year || "";
    const is_current = req.query.is_current;
    const sort = req.query.sort || "-start_date";

    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (is_current !== undefined) {
      query.is_current = is_current === "true";
    }

    const sortOptions = {};
    if (sort === "name") {
      sortOptions.name = 1;
    } else if (sort === "year") {
      sortOptions.year = 1;
    } else if (sort === "start_date") {
      sortOptions.start_date = 1;
    } else if (sort === "-start_date") {
      sortOptions.start_date = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const total = await Semester.countDocuments(query);
    const semesters = await Semester.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: semesters.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: semesters,
    });
  } catch (error) {
    console.error("Error in getAllSemesters:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy học kỳ theo ID
// @route   GET /api/semesters/:id
// @access  Private
exports.getSemesterById = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    res.status(200).json({
      success: true,
      data: semester,
    });
  } catch (error) {
    console.error("Error in getSemesterById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy học kỳ hiện tại
// @route   GET /api/semesters/current
// @access  Private
exports.getCurrentSemester = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ is_current: true });

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ hiện tại",
      });
    }

    res.status(200).json({
      success: true,
      data: currentSemester,
    });
  } catch (error) {
    console.error("Error in getCurrentSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo học kỳ mới
// @route   POST /api/semesters
// @access  Private (Admin)
exports.createSemester = async (req, res) => {
  try {
    const {
      name,
      start_date,
      end_date,
      year,
      is_current,
      status,
      semester_number,
      academic_year,
      registration_start_date,
      registration_end_date,
    } = req.body;

    // Kiểm tra học kỳ đã tồn tại chưa
    const existingSemester = await Semester.findOne({
      name,
      year,
      academic_year,
      semester_number,
    });

    if (existingSemester) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ này đã tồn tại trong năm học đã chọn",
      });
    }

    // Nếu đánh dấu là kỳ hiện tại, cập nhật các kỳ khác
    if (is_current) {
      await Semester.updateMany({}, { is_current: false });
    }

    // Thiết lập thời gian đăng ký mặc định nếu không có
    let regStartDate = registration_start_date;
    let regEndDate = registration_end_date;

    if (!regStartDate && start_date) {
      regStartDate = new Date(start_date);
      regStartDate.setDate(regStartDate.getDate() - 14); // 2 tuần trước khi bắt đầu học kỳ
    }

    if (!regEndDate && start_date) {
      regEndDate = new Date(start_date);
      regEndDate.setDate(regEndDate.getDate() + 7); // 1 tuần sau khi bắt đầu học kỳ
    }

    const semester = await Semester.create({
      name,
      start_date,
      end_date,
      year,
      semester_number: semester_number || 1,
      academic_year:
        academic_year ||
        getAcademicYearByDate(end_date, year, semester_number || 1),
      is_current: is_current || false,
      status: status || "chưa bắt đầu",
      registration_start_date: regStartDate,
      registration_end_date: regEndDate,
    });

    res.status(201).json({
      success: true,
      data: semester,
      message: "Tạo học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in createSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Thêm hàm helper để tính toán năm học dựa vào ngày kết thúc và semester_number
function getAcademicYearByDate(endDateStr, year, semesterNumber = null) {
  if (!endDateStr || !year) return `${year}-${year + 1}`;

  const endDate = new Date(endDateStr);
  const endMonth = endDate.getMonth() + 1; // getMonth() trả về 0-11

  // Nếu tháng kết thúc < 9 (trước tháng 9), thì năm học là (year-1)-year
  // Tương ứng với học kỳ 2 (tháng 1-6) và học kỳ hè (tháng 7-8)
  if (endMonth < 9) {
    return `${year - 1}-${year}`;
  } else {
    // Ngược lại năm học là year-(year+1)
    // Tương ứng với học kỳ 1 (tháng 9-12)
    return `${year}-${year + 1}`;
  }
}

// @desc    Cập nhật học kỳ
// @route   PUT /api/semesters/:id
// @access  Private (Admin)
exports.updateSemester = async (req, res) => {
  try {
    const {
      name,
      start_date,
      end_date,
      year,
      is_current,
      status,
      semester_number,
      academic_year,
      registration_start_date,
      registration_end_date,
    } = req.body;

    const semesterId = req.params.id;

    // Kiểm tra học kỳ đã tồn tại chưa (trừ học kỳ hiện tại)
    if (name && year) {
      const existingSemester = await Semester.findOne({
        name,
        year,
        academic_year,
        semester_number,
        _id: { $ne: semesterId },
      });

      if (existingSemester) {
        return res.status(400).json({
          success: false,
          message: "Học kỳ này đã tồn tại trong năm học đã chọn",
        });
      }
    }

    // Nếu đánh dấu là kỳ hiện tại, cập nhật các kỳ khác
    if (is_current) {
      await Semester.updateMany(
        { _id: { $ne: semesterId } },
        { is_current: false }
      );
    }

    const updateData = {
      name,
      start_date,
      end_date,
      year,
      is_current,
      status,
      registration_start_date,
      registration_end_date,
    };

    if (semester_number) updateData.semester_number = semester_number;
    if (academic_year) {
      updateData.academic_year = academic_year;
    } else if (end_date && year) {
      updateData.academic_year = getAcademicYearByDate(
        end_date,
        year,
        semester_number
      );
    }

    const semester = await Semester.findByIdAndUpdate(semesterId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    res.status(200).json({
      success: true,
      data: semester,
      message: "Cập nhật học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in updateSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Xóa học kỳ
// @route   DELETE /api/semesters/:id
// @access  Private (Admin)
exports.deleteSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;

    // Kiểm tra xem học kỳ có được sử dụng trong lớp giảng dạy không
    const usedInClass = await TeachingClass.findOne({
      semester_id: semesterId,
    });
    if (usedInClass) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa học kỳ này vì đang được sử dụng trong lớp giảng dạy",
      });
    }

    const semester = await Semester.findByIdAndDelete(semesterId);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in deleteSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Đặt học kỳ hiện tại
// @route   PUT /api/semesters/:id/set-current
// @access  Private (Admin)
exports.setCurrentSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;

    // Cập nhật tất cả học kỳ thành không phải học kỳ hiện tại
    await Semester.updateMany({}, { is_current: false });

    // Đặt học kỳ được chọn thành học kỳ hiện tại
    const semester = await Semester.findByIdAndUpdate(
      semesterId,
      { is_current: true },
      { new: true }
    );

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    res.status(200).json({
      success: true,
      data: semester,
      message: "Đã đặt làm học kỳ hiện tại",
    });
  } catch (error) {
    console.error("Error in setCurrentSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy thống kê về học kỳ
// @route   GET /api/semesters/statistics
// @access  Private (Admin)
exports.getSemesterStatistics = async (req, res) => {
  try {
    const totalCount = await Semester.countDocuments();

    // Thống kê theo năm học
    const yearStats = await Semester.aggregate([
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Thống kê số lớp học trong mỗi học kỳ
    const classesPerSemester = await TeachingClass.aggregate([
      {
        $group: {
          _id: "$semester_id",
          classCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "semesters",
          localField: "_id",
          foreignField: "_id",
          as: "semester",
        },
      },
      {
        $unwind: {
          path: "$semester",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          semesterName: "$semester.name",
          semesterYear: "$semester.year",
          classCount: 1,
        },
      },
      {
        $sort: { semesterYear: -1, semesterName: 1 },
      },
    ]);

    // Lấy học kỳ hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });

    res.status(200).json({
      success: true,
      totalCount,
      yearStats,
      classesPerSemester,
      currentSemester,
    });
  } catch (error) {
    console.error("Error in getSemesterStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê học kỳ",
      error: error.message,
    });
  }
};

// @desc    Kiểm tra thời gian đăng ký môn học của kỳ hiện tại
// @route   GET /api/semesters/registration-status
// @access  Private
exports.getRegistrationStatus = async (req, res) => {
  try {
    // Lấy kỳ hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kỳ học hiện tại",
      });
    }

    // Lấy ngày hiện tại
    const currentDate = new Date();

    // Sử dụng trường thời gian đăng ký trong schema nếu có
    // Nếu không có, sử dụng logic mặc định
    const registrationStartDate =
      currentSemester.registration_start_date ||
      (() => {
        const date = new Date(currentSemester.start_date);
        date.setDate(date.getDate() - 14);
        return date;
      })();

    const registrationEndDate =
      currentSemester.registration_end_date ||
      (() => {
        const date = new Date(currentSemester.start_date);
        date.setDate(date.getDate() + 7);
        return date;
      })();

    // Kiểm tra hiện tại có trong thời gian đăng ký không
    const isRegistrationOpen =
      currentDate >= registrationStartDate &&
      currentDate <= registrationEndDate;

    // Tính toán số ngày còn lại cho đăng ký
    let daysRemaining = 0;
    if (isRegistrationOpen) {
      const diffTime = Math.abs(registrationEndDate - currentDate);
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    res.status(200).json({
      success: true,
      data: {
        semester: {
          _id: currentSemester._id,
          name: currentSemester.name,
          start_date: currentSemester.start_date,
          end_date: currentSemester.end_date,
          academic_year: currentSemester.academic_year,
        },
        registration: {
          is_open: isRegistrationOpen,
          start_date: registrationStartDate,
          end_date: registrationEndDate,
          days_remaining: isRegistrationOpen ? daysRemaining : 0,
          status: isRegistrationOpen
            ? "open"
            : currentDate < registrationStartDate
            ? "upcoming"
            : "closed",
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra thời gian đăng ký môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra thời gian đăng ký môn học",
      error: error.message,
    });
  }
};
