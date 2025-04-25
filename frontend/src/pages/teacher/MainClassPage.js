import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Skeleton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  AlertTitle,
  InputAdornment,
} from "@mui/material";
import {
  Check,
  Close,
  PersonAdd,
  PersonRemove,
  School,
  Info,
  Warning,
  AccessTime,
  Error,
  CheckCircle,
  HourglassEmpty,
  SwapHoriz,
  Class,
  Refresh,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add,
  Cancel,
  Face,
  Person,
  LockPerson,
  SentimentDissatisfied as NoFace,
} from "@mui/icons-material";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import NoDataSvg from "../../components/NoDataSvg";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherMainClassPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [mainClass, setMainClass] = useState(null);
  const [mainClasses, setMainClasses] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    studentId: null,
    reason: "",
  });

  // States cho modal chi tiết sinh viên
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openStudentDetail, setOpenStudentDetail] = useState(false);

  // States cho modal thêm lớp chính
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    code: "",
    department_id: "",
    advisor_id: user?._id || "",
    students: [],
  });
  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Thêm state cho tìm kiếm sinh viên
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [approvedSearchTerm, setApprovedSearchTerm] = useState("");

  // Thêm state cho tổng số sinh viên đã duyệt
  const [totalApproved, setTotalApproved] = useState(0);

  useEffect(() => {
    fetchMainClasses();
    fetchDepartments();
  }, [token]);

  // Lấy danh sách các lớp chính mà giảng viên được phân công làm cố vấn
  const fetchMainClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Lấy danh sách lớp được phân công cố vấn
      const response = await axios.get(
        `${API_URL}/classes/main?advisor_id=${user._id}&all=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        const classes = response.data.data;
        setMainClasses(classes);

        // Lấy lớp đầu tiên làm mặc định
        const classData = classes[0];
        setMainClass(classData);

        // Lấy danh sách sinh viên chờ duyệt và đã duyệt
        await fetchPendingStudents(classData._id);
        await fetchApprovedStudents(classData._id);
      } else {
        enqueueSnackbar("Bạn chưa được phân công làm cố vấn cho lớp nào", {
          variant: "info",
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lớp chính:", error);
      setError("Không thể tải thông tin lớp chính. Vui lòng thử lại sau.");
      enqueueSnackbar("Lỗi khi tải dữ liệu lớp chính", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Lấy sinh viên đang chờ duyệt
  const fetchPendingStudents = async (mainClassId) => {
    setIsLoadingPending(true);
    try {
      const response = await axios.get(
        `${API_URL}/classes/main/${mainClassId}/pending-students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingStudents(response.data.data || []);
    } catch (error) {
      const errorMessage = error.response
        ? error.response.status === 403
          ? "Bạn không có quyền xem danh sách sinh viên chờ duyệt"
          : error.response.status === 404
          ? "Không tìm thấy lớp học"
          : "Lỗi khi tải danh sách sinh viên chờ duyệt"
        : "Lỗi kết nối đến máy chủ";

      enqueueSnackbar(
        <div>
          {errorMessage}
          {!error.response && (
            <Button
              size="small"
              onClick={() => fetchPendingStudents(mainClassId)}
              sx={{ mt: 1, display: "block" }}
              variant="outlined"
            >
              Thử lại
            </Button>
          )}
        </div>
      );
      console.error("Error fetching pending students:", error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Lấy sinh viên đã được duyệt
  const fetchApprovedStudents = async (classId) => {
    try {
      setIsLoadingApproved(true);

      const response = await axios.get(
        `${API_URL}/classes/main/${classId}/approved-students`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            search: approvedSearchTerm,
            page: page + 1,
            limit: rowsPerPage,
            sort: "full_name",
          },
        }
      );

      setApprovedStudents(response.data.data?.students || []);
      setTotalApproved(response.data.data?.total || 0);
    } catch (error) {
      console.error("Lỗi khi tải danh sách sinh viên đã duyệt:", error);

      let errorMessage = "Lỗi khi tải danh sách sinh viên đã duyệt";

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }

      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Lấy danh sách khoa
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khoa:", error);
      enqueueSnackbar("Không thể tải danh sách khoa", { variant: "error" });
    }
  };

  // Xử lý thay đổi tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Xử lý thay đổi trang
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Xử lý thay đổi số dòng mỗi trang
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Phê duyệt sinh viên
  const handleApproveStudent = async (studentId) => {
    try {
      await axios.put(
        `${API_URL}/classes/main/${mainClass._id}/approve-student/${studentId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Phê duyệt sinh viên thành công", { variant: "success" });

      // Cập nhật lại danh sách
      await fetchPendingStudents(mainClass._id);
      await fetchApprovedStudents(mainClass._id);
    } catch (error) {
      console.error("Lỗi khi phê duyệt sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi phê duyệt sinh viên",
        { variant: "error" }
      );
    }
  };

  // Mở dialog từ chối sinh viên
  const openRejectDialog = (studentId) => {
    setRejectDialog({
      open: true,
      studentId,
      reason: "",
    });
  };

  // Đóng dialog từ chối sinh viên
  const closeRejectDialog = () => {
    setRejectDialog({
      open: false,
      studentId: null,
      reason: "",
    });
  };

  // Từ chối sinh viên
  const handleRejectStudent = async () => {
    try {
      await axios.put(
        `${API_URL}/classes/main/${mainClass._id}/reject-student/${rejectDialog.studentId}`,
        { reason: rejectDialog.reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Đã từ chối sinh viên", { variant: "success" });
      closeRejectDialog();

      // Cập nhật lại danh sách
      await fetchPendingStudents(mainClass._id);
    } catch (error) {
      console.error("Lỗi khi từ chối sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi từ chối sinh viên",
        { variant: "error" }
      );
    }
  };

  // Xử lý khi thay đổi lớp
  const handleChangeClass = (event) => {
    const selectedClassId = event.target.value;
    const selectedClass = mainClasses.find(
      (cls) => cls._id === selectedClassId
    );

    if (selectedClass) {
      setMainClass(selectedClass);
      setPendingStudents([]);
      setApprovedStudents([]);
      setPage(0);
      fetchPendingStudents(selectedClassId);
      fetchApprovedStudents(selectedClassId);
    }
  };

  // Render thông tin lớp
  const renderClassInfo = () => {
    if (!mainClass) return null;

    return (
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "primary.main",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Class sx={{ mr: 1 }} />
              Thông tin lớp {mainClass.name}
            </Typography>
            {mainClasses.length > 1 && (
              <Chip
                icon={<SwapHoriz />}
                label={`${mainClasses.length} lớp phụ trách`}
                color="info"
                variant="outlined"
              />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                Chi tiết lớp chính
              </Typography>
              <Box
                sx={{
                  pl: 2,
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                }}
              >
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Tên lớp:</strong> {mainClass.name}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Mã lớp:</strong> {mainClass.class_code}
                </Typography>
                {mainClass.department_id && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Khoa:</strong> {mainClass.department_id.name}
                  </Typography>
                )}
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Tổng số sinh viên:</strong>{" "}
                  <Chip
                    label={mainClass.students?.length || 0}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                Giáo viên cố vấn
              </Typography>
              <Box
                sx={{
                  pl: 2,
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                }}
              >
                {mainClass.advisor_id ? (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                        {mainClass.advisor_id.full_name?.charAt(0) || "A"}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          <strong>Họ tên:</strong>{" "}
                          {mainClass.advisor_id.full_name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong> {mainClass.advisor_id.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={<CheckCircle />}
                      label="Giáo viên cố vấn hiện tại"
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  </>
                ) : (
                  <Typography color="text.secondary">
                    <Warning
                      sx={{
                        verticalAlign: "middle",
                        mr: 1,
                        color: "warning.main",
                      }}
                    />
                    Chưa có giáo viên cố vấn
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Xem chi tiết sinh viên
  const handleViewStudent = (studentId) => {
    navigate(`/profile/${studentId}`);
  };

  // Render khi đang tải dữ liệu
  const renderLoadingState = () => (
    <Box sx={{ p: 3 }}>
      <Skeleton
        variant="rectangular"
        width="100%"
        height={100}
        sx={{ mb: 2 }}
      />
      <Skeleton variant="rectangular" width="100%" height={400} />
    </Box>
  );

  // Làm mới toàn bộ dữ liệu
  const refreshAllData = async () => {
    if (mainClass) {
      setIsLoadingPending(true);
      setIsLoadingApproved(true);
      await fetchPendingStudents(mainClass._id);
      await fetchApprovedStudents(mainClass._id);
      setIsLoadingPending(false);
      setIsLoadingApproved(false);
    }
  };

  // Render khi có lỗi
  const renderErrorState = () => (
    <Box sx={{ p: 3 }}>
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={fetchMainClasses}>
            Thử lại
          </Button>
        }
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          Lỗi khi tải dữ liệu
        </Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/teacher/dashboard")}
        startIcon={<School />}
      >
        Quay lại trang chủ
      </Button>
    </Box>
  );

  // Hàm lọc sinh viên theo từ khóa tìm kiếm
  const filteredPendingStudents = pendingStudents.filter(
    (student) =>
      student.full_name
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase())
  );

  const filteredApprovedStudents = approvedStudents.filter(
    (student) =>
      student.full_name
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(approvedSearchTerm.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase())
  );

  // Mở dialog thêm lớp chính
  const handleOpenAddClassDialog = () => {
    setOpenAddClassDialog(true);
  };

  // Đóng dialog thêm lớp chính
  const handleCloseAddClassDialog = () => {
    setOpenAddClassDialog(false);
    setNewClass({
      name: "",
      code: "",
      department_id: "",
      advisor_id: user?._id || "",
      students: [],
    });
  };

  // Xử lý thay đổi thông tin lớp mới
  const handleNewClassChange = (e) => {
    const { name, value } = e.target;
    setNewClass((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xử lý tạo lớp chính mới
  const handleCreateMainClass = async () => {
    try {
      setIsSubmitting(true);

      // Kiểm tra các trường bắt buộc
      if (!newClass.name || !newClass.code || !newClass.department_id) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin", {
          variant: "warning",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/classes/main`,
        {
          name: newClass.name,
          code: newClass.code,
          department_id: newClass.department_id,
          advisor_id: newClass.advisor_id,
          students: newClass.students,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Tạo lớp chính thành công", { variant: "success" });
      handleCloseAddClassDialog();
      fetchMainClasses(); // Tải lại danh sách lớp
    } catch (error) {
      console.error("Lỗi khi tạo lớp chính:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi tạo lớp chính",
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dialog xem chi tiết sinh viên
  const renderStudentDetailDialog = () => (
    <Dialog
      open={openStudentDetail}
      onClose={() => setOpenStudentDetail(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Thông tin sinh viên</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setOpenStudentDetail(false)}
            startIcon={<Close />}
          >
            Đóng
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {selectedStudent && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Avatar
                  src={selectedStudent.avatar_url}
                  alt={selectedStudent.full_name}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: "auto",
                    mb: 2,
                    border: "3px solid",
                    borderColor: "primary.main",
                  }}
                >
                  {selectedStudent.full_name?.charAt(0) || "S"}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {selectedStudent.full_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedStudent.email}
                </Typography>

                {/* Mã sinh viên hiển thị rõ ràng nếu có */}
                {selectedStudent.school_info?.student_id && (
                  <Typography
                    variant="subtitle1"
                    sx={{ mt: 1, fontWeight: "medium" }}
                  >
                    MSSV: {selectedStudent.school_info.student_id}
                  </Typography>
                )}
                {!selectedStudent.school_info?.student_id &&
                  selectedStudent.school_info?.student_code && (
                    <Typography
                      variant="subtitle1"
                      sx={{ mt: 1, fontWeight: "medium" }}
                    >
                      Mã SV (cũ): {selectedStudent.school_info.student_code}
                    </Typography>
                  )}

                {/* Trạng thái và mã sinh viên */}
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Chip
                    label={
                      selectedStudent.status === "pending"
                        ? "Chờ duyệt"
                        : "Đã duyệt"
                    }
                    color={
                      selectedStudent.status === "pending"
                        ? "warning"
                        : "success"
                    }
                    sx={{ mb: 1 }}
                  />
                </Box>

                {/* Thông tin có dữ liệu khuôn mặt */}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={
                      selectedStudent.has_face_data ? (
                        <CheckCircle />
                      ) : (
                        <Cancel />
                      )
                    }
                    label={
                      selectedStudent.has_face_data
                        ? "Đã đăng ký khuôn mặt"
                        : "Chưa đăng ký khuôn mặt"
                    }
                    color={selectedStudent.has_face_data ? "success" : "error"}
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "primary.main",
                }}
              >
                <School sx={{ mr: 1 }} />
                Thông tin học tập
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {selectedStudent.school_info?.department && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khoa
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.department}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.major && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Ngành học
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.major}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.class && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Lớp
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.class}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.year && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khóa
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.year}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.contact?.phone && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Số điện thoại
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.contact.phone}
                    </Typography>
                  </Grid>
                )}

                {/* Hiển thị "Chưa cập nhật" cho các trường còn thiếu */}
                {!selectedStudent.school_info?.student_id &&
                  !selectedStudent.school_info?.student_code && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        MSSV
                      </Typography>
                      <Typography
                        variant="body2"
                        color="error.main"
                        fontStyle="italic"
                      >
                        Chưa cập nhật
                      </Typography>
                    </Grid>
                  )}

                {!selectedStudent.school_info?.department && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khoa
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}

                {!selectedStudent.school_info?.major && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Ngành học
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}

                {!selectedStudent.school_info?.class && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Lớp
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Hiển thị ảnh khuôn mặt nếu có */}
              {selectedStudent.has_face_data &&
                selectedStudent.faceFeatures && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: "bold",
                        color: "primary.main",
                      }}
                    >
                      <Face sx={{ mr: 1 }} />
                      Hình ảnh khuôn mặt đã đăng ký
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedStudent.faceImages &&
                      selectedStudent.faceImages.length > 0 ? (
                        selectedStudent.faceImages.map((img, index) => (
                          <Box
                            key={index}
                            component="img"
                            src={img}
                            alt={`Khuôn mặt ${index + 1}`}
                            sx={{
                              width: 100,
                              height: 100,
                              objectFit: "cover",
                              borderRadius: 1,
                              border: "1px solid #ddd",
                            }}
                          />
                        ))
                      ) : (
                        <Alert severity="info" sx={{ width: "100%" }}>
                          <Typography variant="body2">
                            Sinh viên đã đăng ký dữ liệu khuôn mặt nhưng không
                            có hình ảnh mẫu hiển thị. Hệ thống vẫn có thể nhận
                            diện khuôn mặt này cho việc điểm danh.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Box>
                )}

              {/* Nút hành động */}
              {selectedStudent.status === "pending" && (
                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      handleApproveStudent(selectedStudent._id);
                      setOpenStudentDetail(false);
                    }}
                  >
                    Phê duyệt
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => {
                      openRejectDialog(selectedStudent._id);
                      setOpenStudentDetail(false);
                    }}
                  >
                    Từ chối
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  if (error && !mainClass) {
    return renderErrorState();
  }

  if (!mainClass) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="info"
          icon={<Info />}
          sx={{ mb: 2, display: "flex", alignItems: "center" }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Bạn chưa được phân công làm cố vấn cho lớp nào
            </Typography>
            <Typography variant="body2">
              Vui lòng liên hệ với quản trị viên để được phân công lớp cố vấn
            </Typography>
          </Box>
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/teacher/dashboard")}
          startIcon={<School />}
        >
          Quay lại trang chủ
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom={false}
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            m: 0,
          }}
        >
          <School sx={{ mr: 1, fontSize: 32 }} />
          Quản lý lớp chính
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleOpenAddClassDialog}
          >
            Thêm lớp chính
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={refreshAllData}
            startIcon={<HourglassEmpty />}
            disabled={isLoadingPending || isLoadingApproved}
          >
            {isLoadingPending || isLoadingApproved
              ? "Đang làm mới..."
              : "Làm mới dữ liệu"}
          </Button>
        </Box>
      </Box>

      {mainClasses.length > 1 && (
        <Card sx={{ mb: 3, p: 2, boxShadow: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Class sx={{ mr: 2, color: "primary.main", fontSize: 28 }} />
            <FormControl fullWidth>
              <InputLabel id="class-select-label">
                Chọn lớp để quản lý
              </InputLabel>
              <Select
                labelId="class-select-label"
                id="class-select"
                value={mainClass ? mainClass._id : ""}
                onChange={handleChangeClass}
                input={<OutlinedInput label="Chọn lớp để quản lý" />}
                renderValue={(selectedId) => {
                  const selectedClass = mainClasses.find(
                    (cls) => cls._id === selectedId
                  );
                  return (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <School sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                        {selectedClass?.name} ({selectedClass?.class_code})
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", ml: 2 }}
                      >
                        <Chip
                          size="small"
                          color="primary"
                          label={`${
                            selectedClass?.students?.length || 0
                          } sinh viên`}
                        />
                        {pendingStudents.length > 0 && (
                          <Chip
                            size="small"
                            color="error"
                            icon={<HourglassEmpty />}
                            label={`${pendingStudents.length} chờ duyệt`}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                }}
              >
                {mainClasses.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <School
                          sx={{
                            mr: 1,
                            color:
                              cls._id === mainClass?._id
                                ? "primary.main"
                                : "text.secondary",
                          }}
                        />
                        <Typography
                          color={
                            cls._id === mainClass?._id
                              ? "primary.main"
                              : "text.primary"
                          }
                          sx={{
                            fontWeight:
                              cls._id === mainClass?._id ? "bold" : "normal",
                          }}
                        >
                          {cls.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ ml: 1, color: "text.secondary" }}
                        >
                          ({cls.class_code})
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={
                          cls._id === mainClass?._id ? "primary" : "default"
                        }
                        variant={
                          cls._id === mainClass?._id ? "filled" : "outlined"
                        }
                        label={`${cls.students?.length || 0} sinh viên`}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Card>
      )}

      {renderClassInfo()}

      <Paper sx={{ width: "100%", mb: 2, overflow: "hidden", boxShadow: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { fontWeight: "bold" },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Badge
                  badgeContent={pendingStudents.length}
                  color="error"
                  max={99}
                  sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                >
                  <HourglassEmpty sx={{ mr: 1 }} />
                </Badge>
                <Box sx={{ ml: pendingStudents.length > 0 ? 1 : 0 }}>
                  Sinh viên chờ duyệt
                </Box>
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Badge
                  badgeContent={approvedStudents.length}
                  color="success"
                  max={99}
                  sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                >
                  <School sx={{ mr: 1 }} />
                </Badge>
                <Box sx={{ ml: approvedStudents.length > 0 ? 1 : 0 }}>
                  Sinh viên của lớp
                </Box>
              </Box>
            }
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
              Danh sách sinh viên chờ duyệt
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                size="small"
                label="Tìm kiếm sinh viên"
                variant="outlined"
                value={pendingSearchTerm}
                onChange={(e) => setPendingSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  fetchPendingStudents(mainClass._id);
                }}
                disabled={isLoadingPending}
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {isLoadingPending ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredPendingStudents.length > 0 ? (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Họ và tên</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>MSSV</TableCell>
                    <TableCell>Lớp</TableCell>
                    <TableCell align="center">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPendingStudents.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            src={student.avatar_url}
                            alt={student.full_name}
                            sx={{ width: 36, height: 36, mr: 1.5 }}
                          >
                            {student.full_name?.charAt(0) || "S"}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: "medium" }}
                            >
                              {student.full_name}
                            </Typography>
                            {student.has_face_data && (
                              <Chip
                                icon={<Face />}
                                label="Đã đăng ký khuôn mặt"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ mt: 0.5, height: 24 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {student.school_info?.student_id ||
                          student.school_info?.student_code || (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontStyle="italic"
                            >
                              Chưa cập nhật
                            </Typography>
                          )}
                      </TableCell>
                      <TableCell>
                        {student.school_info?.class || (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            fontStyle="italic"
                          >
                            Chưa cập nhật
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Xem chi tiết">
                          <IconButton
                            onClick={() => {
                              setSelectedStudent(student);
                              setOpenStudentDetail(true);
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duyệt sinh viên">
                          <IconButton
                            color="primary"
                            onClick={() => handleApproveStudent(student._id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Từ chối">
                          <IconButton
                            color="error"
                            onClick={() => openRejectDialog(student._id)}
                          >
                            <ClearIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <NoDataSvg width="200px" height="200px" />
              <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                Không có sinh viên nào chờ duyệt
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Khi có sinh viên đăng ký vào lớp, họ sẽ xuất hiện ở đây
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="h6" component="div">
              Danh sách sinh viên đã duyệt
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                size="small"
                label="Tìm kiếm sinh viên"
                variant="outlined"
                value={approvedSearchTerm}
                onChange={(e) => {
                  setApprovedSearchTerm(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setApprovedSearchTerm("");
                  setPage(0);
                  fetchApprovedStudents(mainClass._id);
                }}
                disabled={isLoadingApproved}
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {isLoadingApproved ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredApprovedStudents.length > 0 ? (
            <>
              <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "primary.lighter" }}>
                      <TableCell>Họ và tên</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>MSSV</TableCell>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Khuôn mặt</TableCell>
                      <TableCell align="center">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredApprovedStudents.map((student) => (
                      <TableRow key={student._id} hover>
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar
                              src={student.avatar_url}
                              alt={student.full_name}
                              sx={{ width: 36, height: 36, mr: 1.5 }}
                            >
                              {student.full_name?.charAt(0) || "S"}
                            </Avatar>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: "medium" }}
                            >
                              {student.full_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {student.school_info?.student_id ||
                            student.school_info?.student_code || (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontStyle="italic"
                              >
                                Chưa cập nhật
                              </Typography>
                            )}
                        </TableCell>
                        <TableCell>
                          {student.school_info?.class || (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontStyle="italic"
                            >
                              Chưa cập nhật
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.has_face_data ? (
                            <Chip
                              icon={<Face />}
                              label="Đã đăng ký"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              icon={<NoFace />}
                              label="Chưa đăng ký"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              onClick={() => {
                                setSelectedStudent(student);
                                setOpenStudentDetail(true);
                              }}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalApproved}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Số hàng mỗi trang:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} của ${count}`
                }
              />
            </>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <NoDataSvg width="200px" height="200px" />
              <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                Chưa có sinh viên nào được duyệt
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Khi bạn duyệt sinh viên, họ sẽ xuất hiện ở đây
              </Typography>
            </Paper>
          )}
        </TabPanel>
      </Paper>

      {/* Dialog từ chối sinh viên */}
      <Dialog
        open={rejectDialog.open}
        onClose={closeRejectDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle
          sx={{ bgcolor: "error.light", color: "white", fontWeight: "bold" }}
        >
          <Close sx={{ verticalAlign: "middle", mr: 1 }} />
          Từ chối sinh viên
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2">
              Sinh viên sẽ nhận được thông báo về việc bị từ chối và lý do.
              Trạng thái tài khoản của sinh viên sẽ chuyển sang "Từ chối".
            </Typography>
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối"
            placeholder="Nhập lý do từ chối để thông báo cho sinh viên"
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog({ ...rejectDialog, reason: e.target.value })
            }
            variant="outlined"
            required
            error={rejectDialog.reason.trim() === ""}
            helperText={
              rejectDialog.reason.trim() === ""
                ? "Vui lòng nhập lý do từ chối"
                : ""
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeRejectDialog}
            variant="outlined"
            startIcon={<Close />}
          >
            Hủy
          </Button>
          <Button
            onClick={handleRejectStudent}
            color="error"
            variant="contained"
            startIcon={<Close />}
            disabled={rejectDialog.reason.trim() === ""}
          >
            Từ chối sinh viên
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm lớp chính */}
      <Dialog
        open={openAddClassDialog}
        onClose={handleCloseAddClassDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
        >
          <Add sx={{ verticalAlign: "middle", mr: 1 }} />
          Thêm lớp chính mới
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên lớp"
                name="name"
                value={newClass.name}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="Nhập tên lớp (VD: Công nghệ thông tin K19)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mã lớp"
                name="code"
                value={newClass.code}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="Nhập mã lớp (VD: CNTT-K19)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" required>
                <InputLabel>Khoa</InputLabel>
                <Select
                  name="department_id"
                  value={newClass.department_id}
                  onChange={handleNewClassChange}
                  label="Khoa"
                >
                  {departments.map((department) => (
                    <MenuItem key={department._id} value={department._id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Giáo viên cố vấn</InputLabel>
                <Select
                  name="advisor_id"
                  value={newClass.advisor_id}
                  onChange={handleNewClassChange}
                  label="Giáo viên cố vấn"
                  disabled
                >
                  <MenuItem value={user?._id}>
                    {user?.full_name || "Bạn"} (Giáo viên hiện tại)
                  </MenuItem>
                </Select>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ mt: 1 }}
                >
                  Mặc định là giáo viên hiện tại. Chỉ admin mới có thể thay đổi
                  giáo viên cố vấn.
                </Typography>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddClassDialog} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateMainClass}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Add />}
          >
            {isSubmitting ? "Đang tạo..." : "Tạo lớp"}
          </Button>
        </DialogActions>
      </Dialog>

      {renderStudentDetailDialog()}
    </Box>
  );
};

export default TeacherMainClassPage;
