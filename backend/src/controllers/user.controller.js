const { User, Major, Department } = require("../models/schemas");
const mongoose = require("mongoose");

/**
 * @desc    Lấy tất cả người dùng
 * @route   GET /api/users
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, status } = req.query;
    const query = {};

    // Tìm kiếm theo email hoặc họ tên
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo vai trò
    if (role) {
      query.role = role;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Thực hiện phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select("-password")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("advisor_id", "full_name email")
      .populate({
        path: "school_info.major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      });

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy người dùng theo ID
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("advisor_id", "full_name email")
      .populate({
        path: "school_info.major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = async (req, res) => {
  try {
    const { role, status, ...updateData } = req.body;
    const userId = req.params.id;
    const currentUser = req.user;

    // Kiểm tra xem người dùng hiện tại có phải là chủ tài khoản hoặc admin không
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật thông tin người dùng này",
      });
    }

    // Không cho phép người dùng thông thường thay đổi role hoặc status
    if ((role || status) && currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thay đổi vai trò hoặc trạng thái",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Nếu cập nhật school_info và có major_id
    if (updateData.school_info && updateData.school_info.major_id) {
      const majorId = updateData.school_info.major_id;
      if (!mongoose.Types.ObjectId.isValid(majorId)) {
        return res
          .status(400)
          .json({ success: false, message: "ID Ngành không hợp lệ." });
      }
      const majorExists = await Major.findById(majorId);
      if (!majorExists) {
        return res
          .status(404)
          .json({ success: false, message: "Ngành học không tồn tại." });
      }
      // Xóa các trường department, department_id, major cũ nếu có trong school_info
      if (updateData.school_info.department)
        delete updateData.school_info.department;
      if (updateData.school_info.department_id)
        delete updateData.school_info.department_id;
      if (updateData.school_info.major) delete updateData.school_info.major;
    } else if (
      updateData.school_info &&
      user.role === "student" &&
      !updateData.school_info.major_id
    ) {
      // Nếu là sinh viên và school_info được cập nhật nhưng không có major_id,
      // thì xóa major_id hiện có (nếu có) và các trường liên quan cũ
      updateData.school_info.major_id = null; // hoặc unset tùy theo logic
      if (updateData.school_info.department)
        delete updateData.school_info.department;
      if (updateData.school_info.department_id)
        delete updateData.school_info.department_id;
      if (updateData.school_info.major) delete updateData.school_info.major;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate({
        path: "school_info.major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Cập nhật thông tin thành công",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Xóa người dùng
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Đã xóa người dùng thành công",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Phê duyệt người dùng
 * @route   PUT /api/users/:id/approve
 * @access  Private (Admin/Teacher)
 */
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const approver = req.user;

    // Tìm người dùng cần phê duyệt
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra quyền phê duyệt
    if (user.role === "teacher" && approver.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền phê duyệt giảng viên",
      });
    }

    if (user.role === "student") {
      // Sinh viên chỉ có thể được phê duyệt bởi giáo viên cố vấn hoặc admin
      if (
        approver.role !== "admin" &&
        (!user.advisor_id ||
          user.advisor_id.toString() !== approver._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải là giáo viên cố vấn của sinh viên này",
        });
      }
    }

    // Cập nhật trạng thái
    user.status = "approved";
    user.approved_by = approver._id;
    user.approval_date = Date.now();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Phê duyệt người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Từ chối người dùng
 * @route   PUT /api/users/:id/reject
 * @access  Private (Admin/Teacher)
 */
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const rejector = req.user;

    // Tìm người dùng cần từ chối
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra quyền từ chối
    if (user.role === "teacher" && rejector.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền từ chối giảng viên",
      });
    }

    if (user.role === "student") {
      // Sinh viên chỉ có thể bị từ chối bởi giáo viên cố vấn hoặc admin
      if (
        rejector.role !== "admin" &&
        (!user.advisor_id ||
          user.advisor_id.toString() !== rejector._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải là giáo viên cố vấn của sinh viên này",
        });
      }
    }

    // Cập nhật trạng thái
    user.status = "rejected";
    user.approved_by = rejector._id;
    user.approval_date = Date.now();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Từ chối người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Cập nhật vai trò người dùng
 * @route   PUT /api/users/:id/role
 * @access  Private (Admin)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role || !["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật vai trò thành công",
      data: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách người dùng chờ phê duyệt
 * @route   GET /api/users/pending
 * @access  Private (Admin/Teacher)
 */
exports.getPendingUsers = async (req, res) => {
  try {
    const approver = req.user;
    let query = { status: "pending" };

    // Nếu là giáo viên, chỉ lấy những sinh viên có advisor_id là mình
    if (approver.role === "teacher") {
      query = {
        status: "pending",
        role: "student",
        advisor_id: approver._id,
      };
    }

    const pendingUsers = await User.find(query)
      .select("-password")
      .populate("advisor_id", "full_name email");

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error) {
    console.error("Get pending users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cố vấn
 * @route   GET /api/users/advisors
 * @access  Public
 */
exports.getAdvisors = async (req, res) => {
  try {
    const advisors = await User.find({
      role: "teacher",
      status: "approved",
    })
      .select("_id full_name email department")
      .sort({ full_name: 1 });

    res.status(200).json({
      success: true,
      count: advisors.length,
      data: advisors,
    });
  } catch (error) {
    console.error("Get advisors error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cho sinh viên đăng ký
 * @route   GET /api/users/teachers
 * @access  Public
 */
exports.getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", department_id } = req.query;
    const query = { role: "teacher" };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
    }

    // Lưu ý: Giáo viên hiện tại không có liên kết trực tiếp với Major/Department trong UserSchema
    // Nếu cần lọc giáo viên theo khoa, cần một cơ chế khác, ví dụ:
    // - Giáo viên có thể thuộc một department_id trực tiếp trong UserSchema (cần thêm trường này)
    // - Hoặc dựa trên các lớp họ dạy thuộc khoa nào (phức tạp hơn)
    // Hiện tại, bộ lọc department_id này sẽ không hoạt động như mong đợi cho teacher
    // nếu không có trường department_id trong User schema cho teacher.

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const teachers = await User.find(query)
      .select("-password -refresh_token")
      .populate({
        // Giữ lại populate cho major/departmentเผื่อ trường hợp user schema có thay đổi
        path: "school_info.major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      })
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTeachers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: teachers.length,
      total: totalTeachers,
      totalPages: Math.ceil(totalTeachers / parseInt(limit)),
      currentPage: parseInt(page),
      data: teachers,
    });
  } catch (error) {
    console.error("Error getting teachers:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách giáo viên.",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy thống kê người dùng theo vai trò
 * @route   GET /api/users/stats
 * @access  Private (Admin)
 */
exports.getUserStats = async (req, res) => {
  try {
    // Tổng số người dùng đã được phê duyệt
    const totalApprovedUsers = await User.countDocuments({
      status: "approved",
    });

    // Tổng số người dùng (bao gồm cả chưa phê duyệt)
    const totalUsers = await User.countDocuments();

    // Số giáo viên đã được phê duyệt
    const approvedTeachers = await User.countDocuments({
      role: "teacher",
      status: "approved",
    });

    // Tổng số giáo viên
    const teachers = await User.countDocuments({ role: "teacher" });

    // Số sinh viên đã được phê duyệt
    const approvedStudents = await User.countDocuments({
      role: "student",
      status: "approved",
    });

    // Tổng số sinh viên
    const students = await User.countDocuments({ role: "student" });

    // Giáo viên đang chờ phê duyệt
    const pendingTeachers = await User.countDocuments({
      role: "teacher",
      status: "pending",
    });

    // Sinh viên đang chờ phê duyệt
    const pendingStudents = await User.countDocuments({
      role: "student",
      status: "pending",
    });

    res.status(200).json({
      success: true,
      totalUsers, // Giữ lại để tương thích với code cũ
      totalApprovedUsers, // Thêm số liệu mới
      teachers,
      approvedTeachers,
      students,
      approvedStudents,
      pendingTeachers,
      pendingStudents,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê người dùng",
    });
  }
};

/**
 * @desc    Sinh viên đăng ký vào lớp học
 * @route   POST /api/users/register-class
 * @access  Private (Student)
 */
exports.registerClass = async (req, res) => {
  try {
    const { mainClassId } = req.body;
    const userId = req.user.id;

    // Kiểm tra xem lớp học tồn tại không
    const mainClass = await MainClass.findById(mainClassId);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra xem sinh viên đã đăng ký vào lớp này chưa
    if (mainClass.students.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã được duyệt vào lớp này",
      });
    }

    // Kiểm tra xem sinh viên đã đăng ký chờ duyệt chưa
    if (
      mainClass.pending_students &&
      mainClass.pending_students.includes(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đăng ký vào lớp này và đang chờ duyệt",
      });
    }

    // Thêm sinh viên vào danh sách chờ duyệt
    if (!mainClass.pending_students) {
      mainClass.pending_students = [];
    }
    mainClass.pending_students.push(userId);
    await mainClass.save();

    // Cập nhật thông tin lớp cho sinh viên
    await User.findByIdAndUpdate(userId, {
      "school_info.class": mainClass.class_code,
      status: "pending",
    });

    // Tạo thông báo cho giáo viên cố vấn
    if (mainClass.advisor_id) {
      await Notification.create({
        title: "Sinh viên đăng ký vào lớp",
        content: `Có sinh viên mới đăng ký vào lớp ${mainClass.name} và đang chờ duyệt`,
        sender_id: userId,
        receiver_id: mainClass.advisor_id,
        main_class_id: mainClassId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đăng ký vào lớp thành công, vui lòng chờ duyệt",
    });
  } catch (error) {
    console.error("Error registering for class:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cố vấn cho người dùng chưa đăng nhập
 * @route   GET /api/users/advisors/public
 * @access  Public
 */
exports.getPublicAdvisors = async (req, res) => {
  try {
    const advisors = await User.find({
      role: "teacher",
      status: "approved",
    })
      .select("_id full_name email department")
      .sort({ full_name: 1 });

    res.status(200).json({
      success: true,
      count: advisors.length,
      data: advisors,
    });
  } catch (error) {
    console.error("Get public advisors error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("advisor_id", "full_name email")
      .populate({
        path: "main_class_id",
        select: "name class_code year_start year_end major_id",
        populate: {
          path: "major_id",
          select: "name code department_id",
          populate: {
            path: "department_id",
            select: "name code",
          },
        },
      })
      .populate({
        path: "school_info.major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user me error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách người dùng để thêm vào lớp học
 * @route   GET /api/users/to-add-to-class
 * @access  Private
 */
exports.getUsersToAddToClass = async (req, res) => {
  try {
    const { role, search, excludeIds } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    } else {
      // Mặc định là tìm sinh viên nếu không có role
      query.role = "student";
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
      if (query.role === "student") {
        query.$or.push({
          "school_info.student_id": { $regex: search, $options: "i" },
        });
      }
    }

    if (excludeIds) {
      const idsToExclude = excludeIds
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idsToExclude.length > 0) {
        query._id = { $nin: idsToExclude };
      }
    }

    // Thêm populate cho school_info.major_id nếu là sinh viên
    let usersQuery = User.find(query).select(
      "full_name email role school_info.student_id avatar_url"
    );

    if (query.role === "student") {
      usersQuery = usersQuery.populate({
        path: "school_info.major_id",
        select: "name code",
        populate: {
          // Thêm populate department_id từ major_id
          path: "department_id",
          select: "name code",
        },
      });
    }

    const users = await usersQuery.limit(20).sort({ full_name: 1 }); // Giới hạn kết quả để không quá tải

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error getting users to add to class:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách người dùng.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  approveUser: exports.approveUser,
  rejectUser: exports.rejectUser,
  updateUserRole: exports.updateUserRole,
  getPendingUsers: exports.getPendingUsers,
  getAdvisors: exports.getAdvisors,
  getTeachers: exports.getTeachers,
  getUserStats: exports.getUserStats,
  registerClass: exports.registerClass,
  getPublicAdvisors: exports.getPublicAdvisors,
  getMe: exports.getMe,
  getUsersToAddToClass: exports.getUsersToAddToClass,
};
