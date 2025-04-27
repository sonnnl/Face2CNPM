import React, { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "../utils/axios";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff, School, Work } from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const availableMajors = [
  "Công nghệ thông tin",
  "Khoa học máy tính",
  "Kỹ thuật phần mềm",
  "Hệ thống thông tin",
  "An toàn thông tin",
  "Quản trị kinh doanh",
  "Marketing",
  "Kế toán",
  "Tài chính - Ngân hàng",
  "Ngôn ngữ Anh",
  // Thêm các ngành khác
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: "",
    school_info: {
      student_id: "",
      teacher_code: "",
      department_id: "",
      major: "",
      class_id: "",
    },
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: "",
    "school_info.department_id": "",
    "school_info.student_id": "",
    "school_info.teacher_code": "",
    "school_info.class_id": "",
    "school_info.major": "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [mainClasses, setMainClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải danh sách Khoa và Lớp khi component mount
  useEffect(() => {
    fetchDepartments();
    fetchMainClasses();
  }, []);

  // Lọc danh sách lớp theo khoa được chọn
  useEffect(() => {
    if (formData.school_info.department_id && mainClasses.length > 0) {
      const filtered = mainClasses.filter(
        (cls) => cls.department_id?._id === formData.school_info.department_id
      );
      setFilteredClasses(filtered);
      // Reset class_id nếu khoa thay đổi và lớp hiện tại không thuộc khoa mới
      const currentClassExistsInFiltered = filtered.some(
        (cls) => cls._id === formData.school_info.class_id
      );
      if (!currentClassExistsInFiltered) {
        setFormData((prev) => ({
          ...prev,
          school_info: { ...prev.school_info, class_id: "" },
        }));
        setFormErrors((prev) => ({ ...prev, "school_info.class_id": "" })); // Clear error too
      }
    } else {
      setFilteredClasses([]);
      setFormData((prev) => ({
        ...prev,
        school_info: { ...prev.school_info, class_id: "" },
      }));
      setFormErrors((prev) => ({ ...prev, "school_info.class_id": "" })); // Clear error too
    }
  }, [formData.school_info.department_id, mainClasses]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await axios.get(`${API_URL}/departments/public`);
      if (response.data.success) {
        setDepartments(response.data.data);
      } else {
        setDepartments([]);
        enqueueSnackbar(
          response.data.message || "Không thể tải danh sách khoa",
          { variant: "error" }
        );
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
      enqueueSnackbar("Lỗi khi tải danh sách khoa.", { variant: "error" });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchMainClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await axios.get(
        `${API_URL}/classes/main/public?all=true`
      );
      if (response.data.success) {
        setMainClasses(response.data.data);
      } else {
        setMainClasses([]);
        enqueueSnackbar(
          response.data.message || "Không thể tải danh sách lớp",
          { variant: "error" }
        );
      }
    } catch (error) {
      console.error("Error fetching main classes:", error);
      setMainClasses([]);
      enqueueSnackbar("Lỗi khi tải danh sách lớp.", { variant: "error" });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let currentErrors = { ...formErrors };

    if (name.startsWith("school_info.")) {
      const fieldName = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        school_info: { ...prev.school_info, [fieldName]: value },
      }));
      currentErrors[name] = ""; // Clear specific error
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      currentErrors[name] = ""; // Clear specific error
    }

    if (name === "role") {
      // Reset fields not applicable to the new role
      setFormData((prev) => ({
        ...prev,
        school_info: {
          ...prev.school_info,
          student_id: value === "teacher" ? "" : prev.school_info.student_id,
          teacher_code:
            value === "student" ? "" : prev.school_info.teacher_code,
          class_id: value === "teacher" ? "" : prev.school_info.class_id,
          major: value === "teacher" ? "" : prev.school_info.major,
          // Keep department_id
        },
      }));
      // Clear errors for reset fields
      currentErrors = {
        ...currentErrors,
        "school_info.student_id": "",
        "school_info.teacher_code": "",
        "school_info.class_id": "",
        "school_info.major": "",
      };
    }

    if (name === "school_info.department_id") {
      setFormData((prev) => ({
        ...prev,
        school_info: { ...prev.school_info, class_id: "" }, // Reset class on department change
      }));
      currentErrors["school_info.class_id"] = ""; // Clear class error
    }
    setFormErrors(currentErrors);
  };

  const validateForm = () => {
    let valid = true;
    const errors = {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      role: "",
      "school_info.department_id": "",
      "school_info.student_id": "",
      "school_info.teacher_code": "",
      "school_info.class_id": "",
      "school_info.major": "",
    };

    if (!formData.email) {
      errors.email = "Email là bắt buộc";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email không hợp lệ";
      valid = false;
    }
    if (!formData.full_name) {
      errors.full_name = "Họ tên là bắt buộc";
      valid = false;
    }
    if (!formData.password) {
      errors.password = "Mật khẩu là bắt buộc";
      valid = false;
    } else if (formData.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      valid = false;
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu không khớp";
      valid = false;
    }
    if (!formData.role) {
      errors.role = "Vui lòng chọn vai trò";
      valid = false;
    }

    if (formData.role) {
      if (!formData.school_info.department_id) {
        errors["school_info.department_id"] = "Vui lòng chọn khoa";
        valid = false;
      }

      if (formData.role === "student") {
        if (!formData.school_info.student_id) {
          errors["school_info.student_id"] = "MSSV là bắt buộc";
          valid = false;
        }
        if (!formData.school_info.class_id) {
          errors["school_info.class_id"] = "Vui lòng chọn lớp";
          valid = false;
        }
        if (!formData.school_info.major) {
          errors["school_info.major"] = "Vui lòng chọn ngành học";
          valid = false;
        } // Make major required
      } else if (formData.role === "teacher") {
        if (!formData.school_info.teacher_code) {
          errors["school_info.teacher_code"] = "Mã giảng viên là bắt buộc";
          valid = false;
        }
      }
    }

    setFormErrors(errors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      enqueueSnackbar("Vui lòng kiểm tra lại thông tin đã nhập", {
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { confirmPassword, ...submitData } = formData;

      // Prepare school_info based on role
      const finalSchoolInfo = {
        department_id: submitData.school_info.department_id,
      };
      if (submitData.role === "student") {
        finalSchoolInfo.student_id = submitData.school_info.student_id;
        finalSchoolInfo.class_id = submitData.school_info.class_id;
        finalSchoolInfo.major = submitData.school_info.major;
        // Ensure teacher_code is not sent
        delete finalSchoolInfo.teacher_code;
      } else if (submitData.role === "teacher") {
        finalSchoolInfo.teacher_code = submitData.school_info.teacher_code;
        // Ensure student specific fields are not sent
        delete finalSchoolInfo.student_id;
        delete finalSchoolInfo.class_id;
        delete finalSchoolInfo.major;
      }

      const finalSubmitData = {
        ...submitData,
        school_info: finalSchoolInfo,
      };

      const response = await axios.post(
        `${API_URL}/auth/register`,
        finalSubmitData
      );

      if (response.data.success) {
        enqueueSnackbar(
          response.data.message ||
            "Đăng ký thành công! Vui lòng chờ phê duyệt.",
          { variant: "success" }
        );
        navigate("/login");
      } else {
        enqueueSnackbar(response.data.message || "Đăng ký thất bại", {
          variant: "error",
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage =
        err.response?.data?.message || "Đăng ký thất bại. Lỗi máy chủ.";
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{ padding: 4, width: "100%", borderRadius: 3 }}
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Đăng Ký
          </Typography>
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            mb={3}
          >
            Tạo tài khoản mới trong hệ thống
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            {/* Basic Fields */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="full_name"
              label="Họ và tên"
              name="full_name"
              autoComplete="name"
              autoFocus
              value={formData.full_name}
              onChange={handleChange}
              error={!!formErrors.full_name}
              helperText={formErrors.full_name}
              disabled={isSubmitting}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Địa chỉ Email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              disabled={isSubmitting}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {" "}
                    <IconButton onClick={toggleShowPassword} edge="end">
                      {" "}
                      {showPassword ? <VisibilityOff /> : <Visibility />}{" "}
                    </IconButton>{" "}
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              disabled={isSubmitting}
            />

            <Divider sx={{ my: 2 }} />

            {/* Role Selection */}
            <FormControl
              fullWidth
              margin="normal"
              required
              error={!!formErrors.role}
            >
              <InputLabel id="role-label">Vai trò</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="Vai trò"
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <MenuItem value={"student"}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <School fontSize="small" sx={{ mr: 1 }} /> Sinh viên
                  </Box>
                </MenuItem>
                <MenuItem value={"teacher"}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Work fontSize="small" sx={{ mr: 1 }} /> Giảng viên
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>{formErrors.role}</FormHelperText>
            </FormControl>

            {/* Conditional Fields */}
            {formData.role && (
              <>
                <Divider sx={{ my: 2 }}>Thông tin trường học</Divider>

                {/* Department Selection (Common) */}
                <FormControl
                  fullWidth
                  margin="normal"
                  required
                  error={!!formErrors["school_info.department_id"]}
                >
                  <InputLabel id="department-label">Khoa</InputLabel>
                  <Select
                    labelId="department-label"
                    id="department"
                    name="school_info.department_id"
                    value={formData.school_info.department_id}
                    label="Khoa"
                    onChange={handleChange}
                    disabled={loadingDepartments || isSubmitting}
                  >
                    {loadingDepartments ? (
                      <MenuItem disabled value="">
                        <em>Đang tải khoa...</em>
                      </MenuItem>
                    ) : departments.length > 0 ? (
                      departments.map((dept) => (
                        <MenuItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="">
                        <em>Không có khoa nào</em>
                      </MenuItem>
                    )}
                  </Select>
                  <FormHelperText>
                    {formErrors["school_info.department_id"]}
                  </FormHelperText>
                </FormControl>

                {/* Student Specific Fields */}
                {formData.role === "student" && (
                  <>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="student_id"
                      label="Mã số sinh viên (MSSV)"
                      name="school_info.student_id"
                      value={formData.school_info.student_id}
                      onChange={handleChange}
                      error={!!formErrors["school_info.student_id"]}
                      helperText={formErrors["school_info.student_id"]}
                      disabled={isSubmitting}
                    />

                    {/* Major Selection */}
                    <FormControl
                      fullWidth
                      margin="normal"
                      required
                      error={!!formErrors["school_info.major"]}
                    >
                      <InputLabel id="major-label">Ngành học</InputLabel>
                      <Select
                        labelId="major-label"
                        id="major"
                        name="school_info.major"
                        value={formData.school_info.major}
                        label="Ngành học"
                        onChange={handleChange}
                        disabled={isSubmitting}
                      >
                        <MenuItem value="">
                          <em>Chọn ngành học</em>
                        </MenuItem>
                        {availableMajors.map((majorName) => (
                          <MenuItem key={majorName} value={majorName}>
                            {majorName}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {formErrors["school_info.major"]}
                      </FormHelperText>
                    </FormControl>

                    {/* Class Selection */}
                    <FormControl
                      fullWidth
                      margin="normal"
                      required
                      error={!!formErrors["school_info.class_id"]}
                    >
                      <InputLabel id="class-label">Lớp</InputLabel>
                      <Select
                        labelId="class-label"
                        id="class_id"
                        name="school_info.class_id"
                        value={formData.school_info.class_id}
                        label="Lớp"
                        onChange={handleChange}
                        disabled={
                          !formData.school_info.department_id ||
                          loadingClasses ||
                          isSubmitting
                        }
                      >
                        {loadingClasses ? (
                          <MenuItem disabled value="">
                            <em>Đang tải lớp...</em>
                          </MenuItem>
                        ) : filteredClasses.length > 0 ? (
                          filteredClasses.map((cls) => (
                            <MenuItem key={cls._id} value={cls._id}>
                              {cls.name} ({cls.class_code})
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled value="">
                            {formData.school_info.department_id
                              ? "Không có lớp trong khoa này"
                              : "Vui lòng chọn khoa trước"}
                          </MenuItem>
                        )}
                      </Select>
                      <FormHelperText>
                        {formErrors["school_info.class_id"]}
                      </FormHelperText>
                    </FormControl>
                  </>
                )}

                {/* Teacher Specific Fields */}
                {formData.role === "teacher" && (
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="teacher_code"
                    label="Mã giảng viên"
                    name="school_info.teacher_code"
                    value={formData.school_info.teacher_code}
                    onChange={handleChange}
                    error={!!formErrors["school_info.teacher_code"]}
                    helperText={formErrors["school_info.teacher_code"]}
                    disabled={isSubmitting}
                  />
                )}
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !formData.role}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Đăng ký"
              )}
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                {/* <<< Sử dụng RouterLink >>> */}
                <Link component={RouterLink} to="/login" variant="body2">
                  Đã có tài khoản? Đăng nhập
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;
