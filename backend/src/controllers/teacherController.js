const mongoose = require("mongoose");
const User = mongoose.model("User"); // Giả sử model được đăng ký với tên 'User'
const Department = mongoose.model("Department"); // Giả sử model Department

const getAllTeachers = async (req, res) => {
  try {
    // Tìm tất cả user có vai trò là 'teacher'
    // Lựa chọn các trường cần thiết: id, full_name, email, department_id, teacher_code
    const teachers = await User.find({ role: "teacher" })
      .populate({
        path: "school_info.department_id",
        select: "name code", // Chỉ lấy tên và mã khoa
      })
      .select(
        "_id full_name email school_info.teacher_code school_info.department_id"
      )
      .lean(); // Sử dụng lean() để có plain JS objects

    // Map lại kết quả để có cấu trúc phẳng hơn và chuẩn hóa tên khoa
    const formattedTeachers = teachers.map((teacher) => ({
      id: teacher._id,
      name: teacher.full_name,
      email: teacher.email,
      teacher_code: teacher.school_info?.teacher_code,
      department: teacher.school_info?.department_id?.name || "N/A", // Lấy tên khoa hoặc 'N/A'
      // Bạn có thể thêm các trường khác nếu cần
    }));

    res.status(200).json(formattedTeachers);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách giảng viên:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ khi lấy danh sách giảng viên." });
  }
};

module.exports = {
  getAllTeachers,
};
