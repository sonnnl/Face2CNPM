import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "../utils/axios";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  Grid,
  FormHelperText,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  School,
  Work,
  Person,
  Check,
  Info,
  ExpandMore,
  Face,
} from "@mui/icons-material";
import { setCredentials } from "../redux/slices/authSlice";
import FaceRegistrationComponent from "../components/FaceRegistrationComponent";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const REQUIRED_IMAGES = 3; // Define required images consistently

const CompleteRegistrationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [mainClasses, setMainClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(true);
  const [faceRegistrationExpanded, setFaceRegistrationExpanded] =
    useState(false);
  const [faceData, setFaceData] = useState(null);
  const [isFaceRegistrationComplete, setIsFaceRegistrationComplete] =
    useState(false);
  const [derivedCourseYear, setDerivedCourseYear] = useState("");

  // Lấy thông tin từ URL params
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email");
  const googleId = queryParams.get("googleId");
  const name = queryParams.get("name");
  const avatar = queryParams.get("avatar");
  const needsRegistration = queryParams.get("needsRegistration") === "true";

  const [formData, setFormData] = useState({
    role: "",
    fullName: name || "",
    phone: "",
    department_id: "",
    studentId: "",
    studentCode: "",
    teacherCode: "",
    major_id: "",
    class: "",
  });

  const [formErrors, setFormErrors] = useState({
    role: "",
    fullName: "",
    department_id: "",
    major_id: "",
    class: "",
  });

  useEffect(() => {
    // Kiểm tra xem có đủ thông tin không
    if (!email || !googleId) {
      enqueueSnackbar("Thiếu thông tin cần thiết để hoàn tất đăng ký", {
        variant: "error",
      });
      navigate("/login", { replace: true });
    }

    // Bỏ thông báo cho người dùng mới
    // if (needsRegistration) {
    //   enqueueSnackbar("Vui lòng hoàn tất thông tin đăng ký của bạn", {
    //     variant: "info",
    //     autoHideDuration: 5000,
    //   });
    // }
  }, [email, googleId, navigate, enqueueSnackbar]);

  // Tải dữ liệu khoa và lớp khi trang được hiển thị
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Lọc danh sách lớp theo ngành được chọn
  useEffect(() => {
    if (formData.major_id && mainClasses.length > 0) {
      const filtered = mainClasses.filter(
        (cls) => cls.major_id && cls.major_id._id === formData.major_id
      );
      setFilteredClasses(filtered);
    } else {
      setFilteredClasses([]);
    }
  }, [formData.major_id, mainClasses]);

  // useEffect để cập nhật Khóa học dựa trên Lớp được chọn
  useEffect(() => {
    if (
      formData.role === "student" &&
      formData.class &&
      mainClasses.length > 0
    ) {
      const selectedClass = mainClasses.find(
        (cls) => cls._id === formData.class
      );
      if (selectedClass && selectedClass.year_start) {
        // Giả sử API của bạn trả về trường 'year_start' cho năm bắt đầu của lớp
        setDerivedCourseYear(selectedClass.year_start.toString());
      } else {
        setDerivedCourseYear(""); // Hoặc một giá trị mặc định/thông báo
      }
    } else {
      setDerivedCourseYear(""); // Reset khi không phải student hoặc chưa chọn lớp
    }
  }, [formData.class, formData.role, mainClasses]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await axios.get(`${API_URL}/departments/public`);
      if (response.data.success) {
        setDepartments(response.data.data);
      } else {
        setDepartments([]);
        enqueueSnackbar(response.data.message || "Không thể tải khoa", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
      enqueueSnackbar("Lỗi tải danh sách khoa", { variant: "error" });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchMajors = async (departmentId) => {
    if (!departmentId) {
      setMajors([]);
      return;
    }
    setLoadingMajors(true);
    try {
      // Giả sử có API public để lấy ngành theo khoa
      const response = await axios.get(
        `${API_URL}/majors/public?department_id=${departmentId}`
      );
      if (response.data.success) {
        setMajors(response.data.data || []);
      } else {
        setMajors([]);
        enqueueSnackbar(response.data.message || "Không thể tải ngành học", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching majors:", error);
      setMajors([]);
      enqueueSnackbar("Lỗi tải danh sách ngành học", { variant: "error" });
    } finally {
      setLoadingMajors(false);
    }
  };

  const fetchMainClasses = async (majorId) => {
    if (!majorId) {
      setMainClasses([]);
      return;
    }
    setLoadingClasses(true);
    try {
      const response = await axios.get(
        `${API_URL}/classes/main/public?all=true&major_id=${majorId}`
      );
      if (response.data.success) {
        setMainClasses(response.data.data);
      } else {
        setMainClasses([]);
        enqueueSnackbar(response.data.message || "Không thể tải lớp", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching main classes:", error);
      setMainClasses([]);
      enqueueSnackbar("Lỗi tải danh sách lớp", { variant: "error" });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // Xử lý logic khi thay đổi khoa hoặc ngành
      if (name === "department_id") {
        newFormData.major_id = ""; // Reset ngành khi chọn khoa mới
        newFormData.class = ""; // Reset lớp
        setMajors([]);
        setFilteredClasses([]);
        setMainClasses([]);
        if (value) {
          fetchMajors(value);
        }
      } else if (name === "major_id") {
        newFormData.class = ""; // Reset lớp khi chọn ngành mới
        setFilteredClasses([]);
        setMainClasses([]);
        if (value) {
          fetchMainClasses(value);
        }
      }
      return newFormData;
    });

    // Xóa lỗi khi người dùng nhập
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
    setFormErrors({ ...formErrors, role: "" });
    // Bỏ bước trung gian, chuyển thẳng đến form đăng ký
    setShowRoleSelection(false);
  };

  const validateForm = () => {
    let valid = true;
    const errors = { ...formErrors };

    // Kiểm tra vai trò
    if (!formData.role) {
      errors.role = "Vui lòng chọn vai trò";
      valid = false;
    }

    // Kiểm tra họ tên
    if (!formData.fullName) {
      errors.fullName = "Họ tên là bắt buộc";
      valid = false;
    }

    // Kiểm tra khoa
    if (formData.role === "student" && !formData.department_id) {
      errors.department_id = "Vui lòng chọn khoa";
      valid = false;
    }

    // Kiểm tra ngành
    if (formData.role === "student" && !formData.major_id) {
      errors.major_id = "Vui lòng chọn ngành";
      valid = false;
    }

    // Kiểm tra lớp
    if (formData.role === "student" && !formData.class) {
      errors.class = "Vui lòng chọn lớp";
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  const handleFaceDataCapture = (capturedFaceData) => {
    if (capturedFaceData && capturedFaceData.length >= REQUIRED_IMAGES) {
      setFaceData(capturedFaceData);
      setIsFaceRegistrationComplete(true);
      enqueueSnackbar("Đã chụp đủ ảnh khuôn mặt!", { variant: "success" });
    } else {
      // Handle reset case if component sends null/empty
      setFaceData(null);
      setIsFaceRegistrationComplete(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Chuẩn bị dữ liệu
      const registrationData = {
        email,
        googleId,
        fullName: formData.fullName,
        role: formData.role,
        avatarUrl: avatar,
      };

      // Tìm thông tin khoa được chọn
      const selectedDepartment = departments.find(
        (dept) => dept._id === formData.department_id
      );

      // Tìm thông tin ngành được chọn
      const selectedMajor = majors.find(
        (major) => major._id === formData.major_id
      );

      // Tìm thông tin lớp được chọn
      const selectedClass = mainClasses.find(
        (cls) => cls._id === formData.class
      );

      // Thêm thông tin trường học
      registrationData.school_info = {
        department: selectedDepartment
          ? selectedDepartment.name
          : formData.department_id,
        department_id: formData.department_id,
        major: selectedMajor ? selectedMajor.name : formData.major_id,
        major_id: formData.major_id,
        class: selectedClass ? selectedClass.name : formData.class,
        class_id: formData.role === "student" ? formData.class : undefined,
        year:
          formData.role === "student" && selectedClass
            ? selectedClass.year_start
            : undefined,
        student_id:
          formData.role === "student" ? formData.studentId : undefined,
        teacher_code:
          formData.role === "teacher" ? formData.teacherCode : undefined,
      };

      // Thêm số điện thoại
      if (formData.phone) {
        registrationData.contact = {
          phone: formData.phone,
        };
      }

      // Add face data ONLY IF registration was completed
      if (isFaceRegistrationComplete && faceData) {
        registrationData.faceFeatures = {
          descriptors: faceData.map((data) => data.descriptor),
          lastUpdated: new Date(), // Add timestamp
        };
      }

      const response = await axios.post(
        `${API_URL}/auth/google-complete`,
        registrationData
      );

      if (response.data.success) {
        dispatch(
          setCredentials({
            token: response.data.token,
            user: response.data.user,
          })
        );

        enqueueSnackbar(response.data.message || "Đăng ký thành công!", {
          variant: "success",
        });

        // Chuyển hướng đến trang chờ phê duyệt
        navigate(`/pending-approval?role=${formData.role}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Đăng ký thất bại";
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị trang chọn vai trò
  const renderRoleSelection = () => {
    return (
      <Box>
        {/* Bỏ thông báo */}
        {/* <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <Info fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
            Bạn cần chọn vai trò của mình để tiếp tục đăng ký.
          </Typography>
        </Alert> */}

        <Typography variant="h6" gutterBottom>
          Bạn là ai trong hệ thống?
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderColor:
                  formData.role === "student" ? "primary.main" : "grey.300",
                boxShadow: formData.role === "student" ? 3 : 1,
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect("student")}
                sx={{ height: "100%", p: 2 }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <School color="primary" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    Sinh Viên
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đăng ký với tư cách sinh viên và chọn giáo viên cố vấn của
                    bạn.
                  </Typography>
                  {formData.role === "student" && (
                    <Check
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: 16,
                        color: "primary.main",
                        backgroundColor: "white",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderColor:
                  formData.role === "teacher" ? "primary.main" : "grey.300",
                boxShadow: formData.role === "teacher" ? 3 : 1,
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect("teacher")}
                sx={{ height: "100%", p: 2 }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <Work color="secondary" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    Giảng Viên
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đăng ký với tư cách giảng viên để quản lý lớp học và sinh
                    viên.
                  </Typography>
                  {formData.role === "teacher" && (
                    <Check
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: 16,
                        color: "primary.main",
                        backgroundColor: "white",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Bỏ nút tiếp tục */}
        {/* <Box sx={{ mt: 3, textAlign: "right" }}>
          <Button
            variant="contained"
            onClick={() => setShowRoleSelection(false)}
            disabled={!formData.role}
            size="large"
          >
            Tiếp tục
          </Button>
        </Box> */}
      </Box>
    );
  };

  // Hiển thị form nhập thông tin
  const renderRegistrationForm = () => {
    return (
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: 3 }}>
          <Divider>
            <Chip
              icon={formData.role === "student" ? <School /> : <Work />}
              label={formData.role === "student" ? "Sinh viên" : "Giảng viên"}
              color="primary"
            />
          </Divider>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="fullName"
              label="Họ và tên"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              error={!!formErrors.fullName}
              helperText={formErrors.fullName}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="phone"
              label="Số điện thoại"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!formErrors.department_id}>
              <InputLabel id="department-label">Khoa</InputLabel>
              <Select
                labelId="department-label"
                id="department_id"
                name="department_id"
                value={formData.department_id}
                label="Khoa"
                onChange={handleChange}
                disabled={loadingDepartments}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.department_id && (
                <FormHelperText>{formErrors.department_id}</FormHelperText>
              )}
              {loadingDepartments && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="caption">
                    Đang tải danh sách khoa...
                  </Typography>
                </Box>
              )}
            </FormControl>
          </Grid>

          {formData.role === "student" && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  required
                  error={!!formErrors.major_id}
                  disabled={!formData.department_id || loadingMajors}
                >
                  <InputLabel id="major-label">Ngành học</InputLabel>
                  <Select
                    labelId="major-label"
                    id="major_id"
                    name="major_id"
                    value={formData.major_id}
                    label="Ngành học"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>
                        {loadingMajors
                          ? "Đang tải ngành..."
                          : formData.department_id
                          ? "Chọn Ngành học"
                          : "Vui lòng chọn Khoa trước"}
                      </em>
                    </MenuItem>
                    {majors.map((major) => (
                      <MenuItem key={major._id} value={major._id}>
                        {major.name} ({major.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.major_id && (
                    <FormHelperText>{formErrors.major_id}</FormHelperText>
                  )}
                  {loadingMajors && (
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="caption">
                        Đang tải danh sách ngành...
                      </Typography>
                    </Box>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!formErrors.class}>
                  <InputLabel id="class-label">Lớp</InputLabel>
                  <Select
                    labelId="class-label"
                    id="class"
                    name="class"
                    value={formData.class}
                    label="Lớp"
                    onChange={handleChange}
                    disabled={
                      !formData.major_id ||
                      loadingClasses ||
                      filteredClasses.length === 0
                    }
                  >
                    {filteredClasses.length > 0 ? (
                      filteredClasses.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          {cls.name} ({cls.class_code})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="">
                        {loadingClasses
                          ? "Đang tải lớp..."
                          : !formData.major_id
                          ? "Vui lòng chọn Ngành trước"
                          : "Không có lớp nào trong ngành này"}
                      </MenuItem>
                    )}
                  </Select>
                  {formErrors.class && (
                    <FormHelperText>{formErrors.class}</FormHelperText>
                  )}
                  {loadingClasses && (
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="caption">
                        Đang tải danh sách lớp...
                      </Typography>
                    </Box>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="studentId"
                  label="Mã số sinh viên (MSSV)"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="derivedCourseYear"
                  label="Khóa học (từ lớp)"
                  name="derivedCourseYear"
                  value={derivedCourseYear}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="filled"
                />
              </Grid>
            </>
          )}

          {formData.role === "teacher" && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="teacherCode"
                label="Mã giảng viên"
                name="teacherCode"
                value={formData.teacherCode}
                onChange={handleChange}
              />
            </Grid>
          )}
        </Grid>

        {/* Accordion for Face Registration - Conditionally render based on role */}
        {formData.role === "student" && (
          <Accordion
            expanded={faceRegistrationExpanded}
            onChange={() =>
              setFaceRegistrationExpanded(!faceRegistrationExpanded)
            }
            sx={{ mt: 3 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Face sx={{ mr: 1 }} />
                <Typography>Đăng ký khuôn mặt (tùy chọn)</Typography>
                {/* Updated Chip based on completion state */}
                {isFaceRegistrationComplete && (
                  <Chip
                    label="Đã hoàn tất chụp ảnh"
                    color="success"
                    size="small"
                    sx={{ ml: 2 }}
                    icon={<Check fontSize="small" />}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                Đăng ký khuôn mặt sẽ giúp giảng viên xác nhận danh tính và sử
                dụng cho điểm danh tự động.
              </Alert>
              {/* Use the updated component with correct props */}
              <FaceRegistrationComponent
                onFaceDataCapture={handleFaceDataCapture}
                requiredImages={REQUIRED_IMAGES} // Pass the required number
              />
            </AccordionDetails>
          </Accordion>
        )}

        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button variant="outlined" onClick={() => setShowRoleSelection(true)}>
            Quay lại chọn vai trò
          </Button>

          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Hoàn tất đăng ký"
            )}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 4,
              flexDirection: "column",
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              {showRoleSelection ? "Chọn vai trò của bạn" : "Hoàn tất đăng ký"}
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={2}>
              {showRoleSelection
                ? "Vui lòng chọn vai trò để tiếp tục quá trình đăng ký"
                : "Vui lòng cung cấp thêm thông tin để hoàn tất đăng ký"}
            </Typography>

            {avatar && (
              <Avatar
                src={avatar}
                alt={name || email}
                sx={{ width: 80, height: 80, mb: 2 }}
              />
            )}

            <Typography variant="subtitle1" gutterBottom>
              {email}
            </Typography>
          </Box>

          {showRoleSelection ? renderRoleSelection() : renderRegistrationForm()}
        </Paper>
      </Box>
    </Container>
  );
};

export default CompleteRegistrationPage;
