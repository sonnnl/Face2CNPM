import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "axios";
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
  Autocomplete,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { register, clearError } from "../redux/slices/authSlice";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { isAuthenticated, error, isLoading } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: "",
    advisor_id: null,
    school_info: {
      student_id: "",
      teacher_code: "",
      department: "",
    },
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: "",
    advisor_id: "",
    "school_info.student_id": "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [advisors, setAdvisors] = useState([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);

  useEffect(() => {
    // Nếu đã đăng nhập, chuyển hướng đến trang chủ
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Hiển thị lỗi nếu có
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
      dispatch(clearError());
    }
  }, [error, enqueueSnackbar, dispatch]);

  // Tải danh sách giáo viên cố vấn khi người dùng chọn vai trò sinh viên
  useEffect(() => {
    if (formData.role === "student") {
      fetchAdvisors();
    }
  }, [formData.role]);

  const fetchAdvisors = async () => {
    try {
      setLoadingAdvisors(true);
      const response = await axios.get(`${API_URL}/users/advisors`);
      if (response.data.success) {
        setAdvisors(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching advisors:", error);
      enqueueSnackbar("Không thể tải danh sách giáo viên cố vấn", {
        variant: "error",
      });
    } finally {
      setLoadingAdvisors(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      // Xử lý nested properties (school_info)
      const [parent, child] = name.split(".");
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // Xóa lỗi khi người dùng nhập
    setFormErrors({ ...formErrors, [name]: "" });
  };

  const handleAdvisorChange = (event, newValue) => {
    setFormData({ ...formData, advisor_id: newValue?._id || null });
    setFormErrors({ ...formErrors, advisor_id: "" });
  };

  const validateForm = () => {
    let valid = true;
    const errors = { ...formErrors };

    // Kiểm tra email
    if (!formData.email) {
      errors.email = "Email là bắt buộc";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email không hợp lệ";
      valid = false;
    }

    // Kiểm tra họ tên
    if (!formData.full_name) {
      errors.full_name = "Họ tên là bắt buộc";
      valid = false;
    }

    // Kiểm tra mật khẩu
    if (!formData.password) {
      errors.password = "Mật khẩu là bắt buộc";
      valid = false;
    } else if (formData.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      valid = false;
    }

    // Kiểm tra xác nhận mật khẩu
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu không khớp";
      valid = false;
    }

    // Kiểm tra vai trò
    if (!formData.role) {
      errors.role = "Vui lòng chọn vai trò";
      valid = false;
    }

    // Kiểm tra giáo viên cố vấn nếu là sinh viên
    if (formData.role === "student" && !formData.advisor_id) {
      errors.advisor_id = "Vui lòng chọn giáo viên cố vấn";
      valid = false;
    }

    // Kiểm tra mã số sinh viên (MSSV) nếu là sinh viên
    if (formData.role === "student" && !formData.school_info.student_id) {
      errors["school_info.student_id"] = "Mã số sinh viên (MSSV) là bắt buộc";
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Loại bỏ confirmPassword khỏi dữ liệu gửi đi
      const { confirmPassword, ...registerData } = formData;
      dispatch(register(registerData));
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
          sx={{
            padding: 4,
            width: "100%",
            borderRadius: 3,
          }}
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
            Tạo tài khoản mới
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
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
              variant="outlined"
              error={!!formErrors.full_name}
              helperText={formErrors.full_name}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              error={!!formErrors.email}
              helperText={formErrors.email}
            />

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
              >
                <MenuItem value="student">Sinh viên</MenuItem>
                <MenuItem value="teacher">Giảng viên</MenuItem>
              </Select>
              {formErrors.role && (
                <FormHelperText>{formErrors.role}</FormHelperText>
              )}
            </FormControl>

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
                  variant="outlined"
                  error={!!formErrors["school_info.student_id"]}
                  helperText={formErrors["school_info.student_id"]}
                />

                <FormControl
                  fullWidth
                  margin="normal"
                  required
                  error={!!formErrors.advisor_id}
                >
                  <Autocomplete
                    id="advisor_id"
                    options={advisors}
                    getOptionLabel={(option) =>
                      `${option.full_name} ${
                        option.school_info?.teacher_code
                          ? `(${option.school_info.teacher_code})`
                          : ""
                      }`
                    }
                    loading={loadingAdvisors}
                    onChange={handleAdvisorChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Giáo viên cố vấn"
                        required
                        error={!!formErrors.advisor_id}
                        helperText={formErrors.advisor_id}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingAdvisors ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </FormControl>

                <TextField
                  margin="normal"
                  fullWidth
                  id="department"
                  label="Khoa/Ngành"
                  name="school_info.department"
                  value={formData.school_info.department}
                  onChange={handleChange}
                  variant="outlined"
                />
              </>
            )}

            {formData.role === "teacher" && (
              <TextField
                margin="normal"
                fullWidth
                id="teacher_code"
                label="Mã giảng viên"
                name="school_info.teacher_code"
                value={formData.school_info.teacher_code}
                onChange={handleChange}
                variant="outlined"
              />
            )}

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
              variant="outlined"
              error={!!formErrors.password}
              helperText={formErrors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
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
              variant="outlined"
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Lưu ý: Tài khoản của bạn sẽ được xét duyệt trước khi có thể sử
              dụng.
            </Alert>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              color="primary"
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Đăng Ký"
              )}
            </Button>

            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/login" variant="body2">
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
