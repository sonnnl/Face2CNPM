import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Collapse,
  Card,
  CardContent,
  FormHelperText,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Alert,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Search,
  Refresh,
  School,
  People,
  Dashboard,
  FilterList,
  Person,
  PersonAdd,
  AccessTime,
  Check,
  Close,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ClassesPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // State cho danh sách lớp chính riêng biệt
  const [mainClasses, setMainClasses] = useState([]);

  // Lookup data states
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedClass, setSelectedClass] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Main Class Form Data
  const [mainClassForm, setMainClassForm] = useState({
    name: "",
    code: "",
    department_id: "",
    advisor_id: "",
    students: [],
  });

  // Teaching Class Form Data
  const [teachingClassForm, setTeachingClassForm] = useState({
    class_name: "",
    class_code: "",
    subject_id: "",
    semester_id: "",
    teacher_id: "",
    main_class_id: "",
    selected_students: [],
    description: "",
  });

  // State nâng cao
  const [filterOptions, setFilterOptions] = useState({
    department: "",
    teacher: "",
    course: "",
    semester: "",
  });

  // Thêm states cho thống kê
  const [stats, setStats] = useState({
    mainClasses: 0,
    teachingClasses: 0,
    students: 0,
    teachers: 0,
  });

  // Thêm state cho lỗi validation
  const [formErrors, setFormErrors] = useState({
    main: {
      name: false,
      code: false,
    },
    teaching: {
      class_name: false,
      class_code: false,
      subject_id: false,
      semester_id: false,
    },
  });

  // State cho tìm kiếm và phân trang
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });
  const [studentApprovalDialog, setStudentApprovalDialog] = useState({
    open: false,
    classItem: null,
    tabValue: 0,
    pendingStudents: [],
    approvedStudents: [],
    loading: false,
    rejectDialog: {
      open: false,
      studentId: null,
      reason: "",
    },
  });

  // Load data on mount and when pagination/search changes
  useEffect(() => {
    loadClasses();
  }, [page, rowsPerPage, tabValue]);

  useEffect(() => {
    loadLookupData();
    loadMainClasses();
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  const loadLookupData = async () => {
    try {
      setIsLoading(true);
      // Load teachers với tham số tìm kiếm nâng cao
      const teachersResponse = await axios.get(
        `${API_URL}/users?role=teacher&status=approved&limit=200&sort=full_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTeachers(teachersResponse.data.data || []);

      // Load departments
      const departmentsResponse = await axios.get(
        `${API_URL}/departments?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(departmentsResponse.data.data || []);

      // Load students
      const studentsResponse = await axios.get(
        `${API_URL}/users?role=student&status=approved&limit=200&sort=full_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStudents(studentsResponse.data.data || []);

      // Load subjects
      const subjectsResponse = await axios.get(
        `${API_URL}/subjects?limit=200&sort=name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSubjects(subjectsResponse.data.data || []);

      // Load semesters
      const semestersResponse = await axios.get(
        `${API_URL}/semesters?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSemesters(semestersResponse.data.data || []);

      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tham chiếu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu tham chiếu", { variant: "error" });
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      const endpoint = tabValue === 0 ? "classes/main" : "classes/teaching";

      // Xây dựng query params với bộ lọc
      let queryParams = `page=${
        page + 1
      }&limit=${rowsPerPage}&search=${searchTerm}`;

      if (tabValue === 0 && filterOptions.department) {
        queryParams += `&department_id=${filterOptions.department}`;
      }

      if (tabValue === 0 && filterOptions.teacher) {
        queryParams += `&advisor_id=${filterOptions.teacher}`;
      }

      if (tabValue === 1 && filterOptions.course) {
        queryParams += `&subject_id=${filterOptions.course}`;
      }

      if (tabValue === 1 && filterOptions.teacher) {
        queryParams += `&teacher_id=${filterOptions.teacher}`;
      }

      if (tabValue === 1 && filterOptions.semester) {
        queryParams += `&semester=${filterOptions.semester}`;
      }

      const response = await axios.get(
        `${API_URL}/${endpoint}?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setClasses(response.data.data || []);
      setTotalCount(response.data.totalCount || 0);
      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp:", error);
      enqueueSnackbar("Lỗi khi tải danh sách lớp", { variant: "error" });
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadClasses();
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
    setSearchTerm("");
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Thêm hàm xử lý lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions({
      ...filterOptions,
      [name]: value,
    });
  };

  // Thêm hàm áp dụng bộ lọc
  const applyFilters = () => {
    setPage(0);
    loadClasses();
  };

  // Thêm hàm xóa bộ lọc
  const clearFilters = () => {
    setFilterOptions({
      department: "",
      teacher: "",
      course: "",
      semester: "",
    });
    setSearchTerm("");
    setPage(0);
    loadClasses();
  };

  // Dialog handlers
  const openDialog = (mode, classItem = null) => {
    setDialogMode(mode);

    if (tabValue === 0) {
      // Main Class
      if (mode === "edit" && classItem) {
        setMainClassForm({
          name: classItem.name,
          code: classItem.class_code,
          department_id: classItem.department_id?._id || "",
          advisor_id: classItem.advisor_id?._id || "",
          students: classItem.students?.map((s) => s._id) || [],
        });
      } else {
        setMainClassForm({
          name: "",
          code: "",
          department_id: "",
          advisor_id: "",
          students: [],
        });
      }
    } else {
      // Teaching Class - cần tải danh sách lớp chính trước
      loadMainClasses();

      if (mode === "edit" && classItem) {
        setTeachingClassForm({
          class_name: classItem.class_name || classItem.name,
          class_code: classItem.class_code,
          subject_id:
            classItem.subject_id?._id || classItem.course_id?._id || "",
          semester_id: classItem.semester_id?._id || "",
          teacher_id: classItem.teacher_id?._id || "",
          main_class_id: classItem.main_class_id?._id || "",
          selected_students: classItem.students?.map((s) => s._id) || [],
          description: classItem.description || "",
        });
      } else {
        setTeachingClassForm({
          class_name: "",
          class_code: "",
          subject_id: "",
          semester_id: "",
          teacher_id: "",
          main_class_id: "",
          selected_students: [],
          description: "",
        });
      }
    }

    setSelectedClass(classItem);
    setDialogOpen(true);
  };

  // Cập nhật hàm handleMainClassFormChange để có validation
  const handleMainClassFormChange = (e) => {
    const { name, value } = e.target;
    setMainClassForm({
      ...mainClassForm,
      [name]: value,
    });

    // Xóa lỗi khi người dùng nhập liệu
    if (name in formErrors.main && value.trim() !== "") {
      setFormErrors({
        ...formErrors,
        main: {
          ...formErrors.main,
          [name]: false,
        },
      });
    }
  };

  // Cập nhật hàm handleTeachingClassFormChange để có validation
  const handleTeachingClassFormChange = (e) => {
    const { name, value } = e.target;
    setTeachingClassForm({
      ...teachingClassForm,
      [name]: value,
    });

    // Xóa lỗi khi người dùng nhập liệu
    if (name in formErrors.teaching && value.trim() !== "") {
      setFormErrors({
        ...formErrors,
        teaching: {
          ...formErrors.teaching,
          [name]: false,
        },
      });
    }
  };

  // Thêm hàm validateMainClassForm
  const validateMainClassForm = () => {
    const errors = {
      name: mainClassForm.name.trim() === "",
      code: mainClassForm.code.trim() === "",
    };

    setFormErrors({
      ...formErrors,
      main: errors,
    });

    return !Object.values(errors).some(Boolean);
  };

  // Thêm hàm validateTeachingClassForm
  const validateTeachingClassForm = () => {
    const errors = {
      class_name: teachingClassForm.class_name.trim() === "",
      class_code: teachingClassForm.class_code.trim() === "",
      subject_id: teachingClassForm.subject_id === "",
      semester_id: teachingClassForm.semester_id === "",
    };

    setFormErrors({
      ...formErrors,
      teaching: errors,
    });

    return !Object.values(errors).some(Boolean);
  };

  // Cập nhật hàm handleFormSubmit để tải lại danh sách lớp chính sau khi thêm/sửa
  const handleFormSubmit = async () => {
    try {
      let isValid = false;

      if (tabValue === 0) {
        isValid = validateMainClassForm();
        if (!isValid) {
          enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
            variant: "error",
          });
          return;
        }

        // Main class
        if (dialogMode === "create") {
          await axios.post(`${API_URL}/classes/main`, mainClassForm, {
            headers: { Authorization: `Bearer ${token}` },
          });
          enqueueSnackbar("Tạo lớp chính mới thành công", {
            variant: "success",
          });
        } else {
          await axios.put(
            `${API_URL}/classes/main/${selectedClass._id}`,
            mainClassForm,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          enqueueSnackbar("Cập nhật lớp chính thành công", {
            variant: "success",
          });
        }
        // Tải lại danh sách lớp chính sau khi cập nhật
        loadMainClasses();
      } else {
        isValid = validateTeachingClassForm();
        if (!isValid) {
          enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
            variant: "error",
          });
          return;
        }

        // Teaching class
        if (dialogMode === "create") {
          await axios.post(`${API_URL}/classes/teaching`, teachingClassForm, {
            headers: { Authorization: `Bearer ${token}` },
          });
          enqueueSnackbar("Tạo lớp giảng dạy mới thành công", {
            variant: "success",
          });
        } else {
          await axios.put(
            `${API_URL}/classes/teaching/${selectedClass._id}`,
            teachingClassForm,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          enqueueSnackbar("Cập nhật lớp giảng dạy thành công", {
            variant: "success",
          });
        }
      }

      setDialogOpen(false);
      loadClasses();
      loadStats(); // Cập nhật lại thống kê sau khi thao tác
    } catch (error) {
      console.error("Lỗi khi thao tác với lớp học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi thao tác với lớp học",
        { variant: "error" }
      );
    }
  };

  // Mở hộp thoại xóa
  const openDeleteDialog = (classItem) => {
    setDeleteDialog({
      open: true,
      item: classItem,
    });
  };

  // Mở hộp thoại quản lý sinh viên
  const openStudentApproval = async (classItem) => {
    try {
      setStudentApprovalDialog({
        ...studentApprovalDialog,
        open: true,
        classItem: classItem,
        loading: true,
      });

      // Lấy danh sách sinh viên chờ duyệt
      const pendingResponse = await axios.get(
        `${API_URL}/classes/main/${classItem._id}/pending-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Lấy danh sách sinh viên đã được duyệt
      const approvedResponse = await axios.get(
        `${API_URL}/classes/main/${classItem._id}/approved-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStudentApprovalDialog({
        ...studentApprovalDialog,
        open: true,
        classItem: classItem,
        pendingStudents: pendingResponse.data.data || [],
        approvedStudents: approvedResponse.data.data || [],
        loading: false,
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sinh viên:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu sinh viên", { variant: "error" });
      setStudentApprovalDialog({
        ...studentApprovalDialog,
        loading: false,
      });
    }
  };

  // Đóng hộp thoại quản lý sinh viên
  const closeStudentApproval = () => {
    setStudentApprovalDialog({
      open: false,
      classItem: null,
      tabValue: 0,
      pendingStudents: [],
      approvedStudents: [],
      loading: false,
      rejectDialog: {
        open: false,
        studentId: null,
        reason: "",
      },
    });
  };

  // Xử lý thay đổi tab trong quản lý sinh viên
  const handleApprovalTabChange = (event, newValue) => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      tabValue: newValue,
    });
  };

  // Phê duyệt sinh viên
  const handleApproveStudent = async (studentId) => {
    try {
      const { classItem } = studentApprovalDialog;

      await axios.put(
        `${API_URL}/classes/main/${classItem._id}/approve-student/${studentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Phê duyệt sinh viên thành công", { variant: "success" });

      // Cập nhật lại danh sách
      openStudentApproval(classItem);
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
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        open: true,
        studentId,
        reason: "",
      },
    });
  };

  // Đóng dialog từ chối sinh viên
  const closeRejectDialog = () => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        open: false,
        studentId: null,
        reason: "",
      },
    });
  };

  // Từ chối sinh viên
  const handleRejectStudent = async () => {
    try {
      const { classItem, rejectDialog } = studentApprovalDialog;

      await axios.put(
        `${API_URL}/classes/main/${classItem._id}/reject-student/${rejectDialog.studentId}`,
        { reason: rejectDialog.reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Đã từ chối sinh viên", { variant: "success" });
      closeRejectDialog();

      // Cập nhật lại danh sách
      openStudentApproval(classItem);
    } catch (error) {
      console.error("Lỗi khi từ chối sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi từ chối sinh viên",
        { variant: "error" }
      );
    }
  };

  // Xử lý thay đổi lý do từ chối
  const handleRejectReasonChange = (e) => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        ...studentApprovalDialog.rejectDialog,
        reason: e.target.value,
      },
    });
  };

  // Xử lý xóa lớp
  const handleDeleteClass = async () => {
    try {
      const endpoint = tabValue === 0 ? "classes/main" : "classes/teaching";

      await axios.delete(`${API_URL}/${endpoint}/${selectedClass._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      enqueueSnackbar(
        `Xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"} thành công`,
        { variant: "success" }
      );
      setDeleteDialogOpen(false);
      loadClasses();
      if (tabValue === 0) {
        loadMainClasses(); // Tải lại danh sách lớp chính nếu xóa lớp chính
      }
      loadStats(); // Cập nhật lại thống kê sau khi thao tác
    } catch (error) {
      console.error(
        `Lỗi khi xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}:`,
        error
      );
      enqueueSnackbar(
        error.response?.data?.message ||
          `Lỗi khi xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}`,
        { variant: "error" }
      );
    }
  };

  // Cập nhật hàm loadStats để sử dụng API endpoint mới
  const loadStats = async () => {
    try {
      const mainClassResponse = await axios.get(
        `${API_URL}/classes/main-statistics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const teachingClassResponse = await axios.get(
        `${API_URL}/classes/teaching-statistics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const userStatsResponse = await axios.get(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats({
        mainClasses: mainClassResponse.data.totalCount || 0,
        teachingClasses: teachingClassResponse.data.totalCount || 0,
        students: userStatsResponse.data.approvedStudents || 0,
        teachers: userStatsResponse.data.approvedTeachers || 0,
      });
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
      // Tiếp tục hiển thị giao diện ngay cả khi không thể tải thống kê
    }
  };

  // Thêm lại hàm handleStudentSelection bị xóa nhầm
  const handleStudentSelection = (event, newValue) => {
    if (tabValue === 0) {
      setMainClassForm({
        ...mainClassForm,
        students: newValue.map((student) => student._id),
      });
    } else {
      setTeachingClassForm({
        ...teachingClassForm,
        selected_students: newValue.map((student) => student._id),
      });
    }
  };

  // Thêm hàm tải danh sách lớp chính
  const loadMainClasses = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/classes/main?all=true&sort=name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMainClasses(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp chính:", error);
      enqueueSnackbar("Không thể tải danh sách lớp chính", {
        variant: "error",
      });
    }
  };

  // Render main class table
  const renderMainClassesTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Tên lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Mã lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Khoa</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>
              Giáo viên chủ nhiệm
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold" }}>
              Số lượng SV
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>
              Hành động
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              </TableCell>
            </TableRow>
          ) : classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Không tìm thấy lớp học nào
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    onClick={clearFilters}
                    sx={{ mt: 1 }}
                  >
                    Xóa bộ lọc
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classItem) => (
              <TableRow
                key={classItem._id}
                hover
                sx={{ "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
              >
                <TableCell>
                  <Typography variant="body1">{classItem.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={classItem.class_code}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {classItem.department_id?.name ? (
                    <Chip
                      label={classItem.department_id.name}
                      size="small"
                      sx={{ bgcolor: "#e3f2fd" }}
                    />
                  ) : (
                    <Chip
                      label="Chưa phân khoa"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.advisor_id?.full_name ? (
                    <Box>
                      <Typography variant="body2">
                        {classItem.advisor_id.full_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.advisor_id.email || ""}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip
                      label="Chưa phân công"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={classItem.students?.length || 0}
                    color={
                      classItem.students?.length > 0 ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end">
                    <Tooltip title="Sửa lớp">
                      <IconButton
                        color="primary"
                        onClick={() => openDialog("edit", classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa lớp">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quản lý sinh viên">
                      <IconButton
                        color="info"
                        onClick={() => openStudentApproval(classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <People fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count}`
        }
      />
    </TableContainer>
  );

  // Render teaching class table
  const renderTeachingClassesTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Tên lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Môn học</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Kỳ học</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Giáo viên</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Lớp chính</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold" }}>
              Số lượng SV
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Trạng thái</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>
              Hành động
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              </TableCell>
            </TableRow>
          ) : classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Box sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Không tìm thấy lớp học nào
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    onClick={clearFilters}
                    sx={{ mt: 1 }}
                  >
                    Xóa bộ lọc
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classItem) => (
              <TableRow
                key={classItem._id}
                hover
                sx={{ "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
              >
                <TableCell>
                  <Typography variant="body1">
                    {classItem.class_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {classItem.subject_id?.name || classItem.course_id?.name ? (
                    <Box>
                      <Typography variant="body2">
                        {classItem.subject_id?.name ||
                          classItem.course_id?.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.subject_id?.code ||
                          classItem.course_id?.code ||
                          ""}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip label="N/A" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.semester_id ? (
                    <Chip
                      label={classItem.semester_id.name}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Không xác định"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.teacher_id?.full_name ? (
                    <Box>
                      <Typography variant="body2">
                        {classItem.teacher_id.full_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.teacher_id.email || ""}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip
                      label="Chưa phân công"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.main_class_id?.name ? (
                    <Chip
                      label={classItem.main_class_id.name}
                      size="small"
                      sx={{ bgcolor: "#e3f2fd" }}
                    />
                  ) : (
                    <Chip
                      label="Không có"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={classItem.students?.length || 0}
                    color={
                      classItem.students?.length > 0 ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {classItem.status === "đang học" ? (
                    <Chip
                      label="Đang học"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : classItem.status === "đã kết thúc" ? (
                    <Chip
                      label="Đã kết thúc"
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Chưa bắt đầu"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end">
                    <Tooltip title="Sửa lớp">
                      <IconButton
                        color="primary"
                        onClick={() => openDialog("edit", classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa lớp">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count}`
        }
      />
    </TableContainer>
  );

  // Render main class form dialog
  const renderMainClassFormDialog = () => (
    <Dialog
      open={dialogOpen && tabValue === 0}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {dialogMode === "create" ? "Thêm lớp chính mới" : "Sửa lớp chính"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label="Tên lớp"
              fullWidth
              required
              value={mainClassForm.name}
              onChange={handleMainClassFormChange}
              error={formErrors.main.name}
              helperText={
                formErrors.main.name ? "Tên lớp không được để trống" : ""
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="code"
              label="Mã lớp"
              fullWidth
              required
              value={mainClassForm.code}
              onChange={handleMainClassFormChange}
              error={formErrors.main.code}
              helperText={
                formErrors.main.code
                  ? "Mã lớp không được để trống"
                  : "Nhập đầy đủ mã lớp (VD: D22CQCN02-N)"
              }
              placeholder="VD: D22CQCN02-N"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Khoa</InputLabel>
              <Select
                name="department_id"
                value={mainClassForm.department_id}
                onChange={handleMainClassFormChange}
                label="Khoa"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="advisor-select"
              options={teachers}
              getOptionLabel={(option) =>
                `${option.full_name} ${option.email ? `(${option.email})` : ""}`
              }
              value={
                teachers.find((t) => t._id === mainClassForm.advisor_id) || null
              }
              onChange={(event, newValue) => {
                setMainClassForm({
                  ...mainClassForm,
                  advisor_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Giáo viên chủ nhiệm"
                  variant="outlined"
                  fullWidth
                  helperText="Quan trọng: Mỗi lớp cần có một giáo viên chủ nhiệm"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={students}
              getOptionLabel={(option) =>
                `${option.full_name} (${
                  option.school_info?.student_id || option.email
                })`
              }
              value={students.filter((student) =>
                mainClassForm.students.includes(student._id)
              )}
              onChange={handleStudentSelection}
              filterSelectedOptions
              autoHighlight
              disableCloseOnSelect
              limitTags={3}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chọn sinh viên"
                  placeholder="Tìm sinh viên theo tên hoặc mã sinh viên"
                  helperText={`Đã chọn ${mainClassForm.students.length} sinh viên`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={`${option.full_name} (${
                      option.school_info?.student_id || option.email
                    })`}
                    {...getTagProps({ index })}
                    key={option._id}
                    size="small"
                  />
                ))
              }
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.school_info?.student_id || option.email}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ width: 200 }}
              isOptionEqualToValue={(option, value) =>
                option._id === value._id ||
                (option.school_info?.student_id || option.email) ===
                  (value.school_info?.student_id || value.email)
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
        <Button
          onClick={handleFormSubmit}
          variant="contained"
          color="primary"
          disabled={!mainClassForm.name || !mainClassForm.code}
        >
          {dialogMode === "create" ? "Tạo mới" : "Cập nhật"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render teaching class form dialog
  const renderTeachingClassFormDialog = () => (
    <Dialog
      open={dialogOpen && tabValue === 1}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {dialogMode === "create"
          ? "Thêm lớp giảng dạy mới"
          : "Sửa lớp giảng dạy"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="class_name"
              label="Tên lớp"
              fullWidth
              required
              value={teachingClassForm.class_name}
              onChange={handleTeachingClassFormChange}
              error={formErrors.teaching.class_name}
              helperText={
                formErrors.teaching.class_name
                  ? "Tên lớp không được để trống"
                  : ""
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="class_code"
              label="Mã lớp"
              fullWidth
              required
              value={teachingClassForm.class_code}
              onChange={handleTeachingClassFormChange}
              placeholder="VD: IT4060.TH01.N22"
              helperText="Mã định danh của lớp học phần"
              error={formErrors.teaching.class_code}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              required
              error={formErrors.teaching.subject_id}
            >
              <InputLabel>Môn học</InputLabel>
              <Select
                name="subject_id"
                value={teachingClassForm.subject_id}
                onChange={handleTeachingClassFormChange}
                label="Môn học"
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </MenuItem>
                ))}
              </Select>
              {formErrors.teaching.subject_id && (
                <FormHelperText>Vui lòng chọn môn học</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="teacher-select"
              options={teachers}
              getOptionLabel={(option) =>
                `${option.full_name} ${option.email ? `(${option.email})` : ""}`
              }
              value={
                teachers.find((t) => t._id === teachingClassForm.teacher_id) ||
                null
              }
              onChange={(event, newValue) => {
                setTeachingClassForm({
                  ...teachingClassForm,
                  teacher_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Giáo viên"
                  variant="outlined"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl
              fullWidth
              required
              error={formErrors.teaching.semester_id}
            >
              <InputLabel>Kỳ học</InputLabel>
              <Select
                name="semester_id"
                value={teachingClassForm.semester_id}
                onChange={handleTeachingClassFormChange}
                label="Kỳ học"
              >
                {semesters.map((semester) => (
                  <MenuItem key={semester._id} value={semester._id}>
                    {semester.name} ({semester.year})
                  </MenuItem>
                ))}
              </Select>
              {formErrors.teaching.semester_id && (
                <FormHelperText>Vui lòng chọn kỳ học</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12}>
            <Autocomplete
              id="main-class-select"
              options={mainClasses}
              getOptionLabel={(option) =>
                `${option.name} (${option.class_code})`
              }
              value={
                mainClasses.find(
                  (cls) => cls._id === teachingClassForm.main_class_id
                ) || null
              }
              onChange={(event, newValue) => {
                setTeachingClassForm({
                  ...teachingClassForm,
                  main_class_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Lớp chính" fullWidth />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.class_code}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <FormHelperText>
              Liên kết với lớp chính. Sinh viên từ mọi lớp đều có thể tham gia
              lớp giảng dạy này.
            </FormHelperText>
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={students}
              getOptionLabel={(option) =>
                `${option.full_name} (${
                  option.school_info?.student_id || option.email
                })`
              }
              value={students.filter((student) =>
                teachingClassForm.selected_students.includes(student._id)
              )}
              onChange={handleStudentSelection}
              filterSelectedOptions
              autoHighlight
              disableCloseOnSelect
              limitTags={3}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chọn sinh viên"
                  placeholder="Tìm sinh viên theo tên hoặc mã sinh viên"
                  helperText={`Đã chọn ${teachingClassForm.selected_students.length} sinh viên`}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={`${option.full_name} (${
                      option.school_info?.student_id || option.email
                    })`}
                    {...getTagProps({ index })}
                    key={option._id}
                    size="small"
                  />
                ))
              }
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.school_info?.student_id || option.email}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ width: 200 }}
              isOptionEqualToValue={(option, value) =>
                option._id === value._id ||
                (option.school_info?.student_id || option.email) ===
                  (value.school_info?.student_id || value.email)
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Mô tả"
              fullWidth
              multiline
              rows={3}
              value={teachingClassForm.description}
              onChange={handleTeachingClassFormChange}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
        <Button
          onClick={handleFormSubmit}
          variant="contained"
          color="primary"
          disabled={
            !teachingClassForm.class_name ||
            !teachingClassForm.class_code ||
            !teachingClassForm.subject_id ||
            !teachingClassForm.semester_id
          }
        >
          {dialogMode === "create" ? "Tạo mới" : "Cập nhật"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Thêm component hiển thị thống kê
  const renderStatCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #3f51b5",
            boxShadow: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Lớp chính
            </Typography>
            <Typography variant="h4">{stats.mainClasses}</Typography>
          </CardContent>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(63, 81, 181, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => {
              setTabValue(0);
              clearFilters();
            }}
          >
            <School fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Xem tất cả lớp chính</Typography>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #f50057",
            boxShadow: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Lớp giảng dạy
            </Typography>
            <Typography variant="h4">{stats.teachingClasses}</Typography>
          </CardContent>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(245, 0, 87, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => {
              setTabValue(1);
              clearFilters();
            }}
          >
            <People fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Xem tất cả lớp giảng dạy</Typography>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #4caf50",
            boxShadow: 2,
            height: "100%",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Sinh viên
            </Typography>
            <Typography variant="h4">{stats.students}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tổng số sinh viên đã phê duyệt
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #ff9800",
            boxShadow: 2,
            height: "100%",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Giáo viên
            </Typography>
            <Typography variant="h4">{stats.teachers}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tổng số giáo viên đã phê duyệt
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Thêm component hiển thị thẻ thông tin khi không có dữ liệu
  const renderEmptyState = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 5,
        px: 2,
        bgcolor: "#f5f5f5",
        borderRadius: 2,
      }}
    >
      <Box sx={{ mb: 2 }}>
        {tabValue === 0 ? (
          <School sx={{ fontSize: 60, color: "#3f51b5" }} />
        ) : (
          <People sx={{ fontSize: 60, color: "#f50057" }} />
        )}
      </Box>
      <Typography variant="h6" gutterBottom>
        {tabValue === 0 ? "Chưa có lớp chính nào" : "Chưa có lớp giảng dạy nào"}
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        align="center"
        sx={{ mb: 3 }}
      >
        {tabValue === 0
          ? "Lớp chính dùng để quản lý danh sách sinh viên theo khóa học và khoa phòng. Mỗi lớp chính có một giáo viên chủ nhiệm."
          : "Lớp giảng dạy dùng để quản lý các môn học cụ thể. Mỗi lớp giảng dạy có một giáo viên giảng dạy và có thể liên kết với lớp chính."}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => openDialog("create")}
      >
        {tabValue === 0 ? "Tạo lớp chính mới" : "Tạo lớp giảng dạy mới"}
      </Button>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Quản lý lớp học
      </Typography>

      {/* Thống kê */}
      {renderStatCards()}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Lớp chính" icon={<School />} iconPosition="start" />
          <Tab label="Lớp giảng dạy" icon={<People />} iconPosition="start" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          gap={2}
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            <TextField
              label={`Tìm kiếm ${
                tabValue === 0 ? "lớp chính" : "lớp giảng dạy"
              }`}
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              startIcon={<Search />}
            >
              Tìm
            </Button>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadClasses}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog("create")}
            >
              Thêm {tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}
            </Button>
          </Box>
        </Box>

        {/* Bộ lọc nâng cao */}
        <Collapse in={true}>
          <Box
            sx={{ p: 1, border: "1px solid #e0e0e0", borderRadius: 1, mt: 1 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Bộ lọc nâng cao
            </Typography>
            <Grid container spacing={2}>
              {tabValue === 0 ? (
                // Bộ lọc cho lớp chính
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Khoa/Bộ môn</InputLabel>
                      <Select
                        name="department"
                        value={filterOptions.department}
                        onChange={handleFilterChange}
                        label="Khoa/Bộ môn"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {departments.map((dept) => (
                          <MenuItem key={dept._id} value={dept._id}>
                            {dept.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Giáo viên chủ nhiệm</InputLabel>
                      <Select
                        name="teacher"
                        value={filterOptions.teacher}
                        onChange={handleFilterChange}
                        label="Giáo viên chủ nhiệm"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {teachers.map((teacher) => (
                          <MenuItem key={teacher._id} value={teacher._id}>
                            {teacher.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                // Bộ lọc cho lớp giảng dạy
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Môn học</InputLabel>
                      <Select
                        name="course"
                        value={filterOptions.course}
                        onChange={handleFilterChange}
                        label="Môn học"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {subjects.map((subject) => (
                          <MenuItem key={subject._id} value={subject._id}>
                            {subject.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Giáo viên</InputLabel>
                      <Select
                        name="teacher"
                        value={filterOptions.teacher}
                        onChange={handleFilterChange}
                        label="Giáo viên"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {teachers.map((teacher) => (
                          <MenuItem key={teacher._id} value={teacher._id}>
                            {teacher.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Học kỳ"
                      name="semester"
                      value={filterOptions.semester}
                      onChange={handleFilterChange}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={applyFilters}
                  >
                    Áp dụng
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={clearFilters}
                  >
                    Xóa lọc
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Hiển thị kết quả hoặc trạng thái trống */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : classes.length === 0 &&
        searchTerm === "" &&
        !filterOptions.department &&
        !filterOptions.teacher &&
        !filterOptions.course &&
        !filterOptions.semester ? (
        renderEmptyState()
      ) : tabValue === 0 ? (
        renderMainClassesTable()
      ) : (
        renderTeachingClassesTable()
      )}

      {/* Dialog forms */}
      {tabValue === 0
        ? renderMainClassFormDialog()
        : renderTeachingClassFormDialog()}

      {/* Dialog xác nhận xóa */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {tabValue === 0
              ? "Bạn có chắc chắn muốn xóa lớp chính này? Hành động này không thể hoàn tác."
              : "Bạn có chắc chắn muốn xóa lớp giảng dạy này? Hành động này không thể hoàn tác."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
            color="inherit"
          >
            Hủy
          </Button>
          <Button onClick={handleDeleteClass} color="error" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog quản lý sinh viên */}
      <Dialog
        open={studentApprovalDialog.open}
        onClose={closeStudentApproval}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Quản lý sinh viên - {studentApprovalDialog.classItem?.name}
        </DialogTitle>
        <DialogContent>
          {studentApprovalDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ width: "100%" }}>
              <Tabs
                value={studentApprovalDialog.tabValue}
                onChange={handleApprovalTabChange}
                indicatorColor="primary"
                textColor="primary"
                centered
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <AccessTime sx={{ mr: 1 }} />
                      Sinh viên chờ duyệt{" "}
                      {studentApprovalDialog.pendingStudents.length > 0 && (
                        <Chip
                          label={studentApprovalDialog.pendingStudents.length}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <School sx={{ mr: 1 }} />
                      Sinh viên của lớp
                    </Box>
                  }
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {studentApprovalDialog.tabValue === 0 && (
                  <>
                    {studentApprovalDialog.pendingStudents.length === 0 ? (
                      <Alert severity="info">
                        Không có sinh viên nào đang chờ phê duyệt
                      </Alert>
                    ) : (
                      <List>
                        {studentApprovalDialog.pendingStudents.map(
                          (student) => (
                            <ListItem
                              key={student._id}
                              sx={{
                                mb: 1,
                                border: "1px solid #e0e0e0",
                                borderRadius: 1,
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar>
                                  {student.full_name.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {student.full_name}
                                    <Chip
                                      label="Chờ duyệt"
                                      color="warning"
                                      size="small"
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2">
                                      Email: {student.email}
                                    </Typography>
                                    <Typography variant="body2">
                                      MSSV:{" "}
                                      {student.school_info?.student_id ||
                                        "Chưa có mã SV"}
                                    </Typography>
                                    <Typography variant="body2">
                                      Ngày đăng ký:{" "}
                                      {new Date(
                                        student.created_at
                                      ).toLocaleDateString()}
                                    </Typography>
                                  </>
                                }
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  color="success"
                                  onClick={() =>
                                    handleApproveStudent(student._id)
                                  }
                                  title="Phê duyệt"
                                >
                                  <Check />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  color="error"
                                  onClick={() => openRejectDialog(student._id)}
                                  title="Từ chối"
                                  sx={{ ml: 1 }}
                                >
                                  <Close />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )
                        )}
                      </List>
                    )}
                  </>
                )}

                {studentApprovalDialog.tabValue === 1 && (
                  <>
                    {studentApprovalDialog.approvedStudents.length === 0 ? (
                      <Alert severity="info">
                        Chưa có sinh viên nào trong lớp
                      </Alert>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Họ tên</TableCell>
                              <TableCell>MSSV</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell>Trạng thái</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {studentApprovalDialog.approvedStudents.map(
                              (student) => (
                                <TableRow key={student._id}>
                                  <TableCell>{student.full_name}</TableCell>
                                  <TableCell>
                                    {student.school_info?.student_id ||
                                      "Chưa có mã SV"}
                                  </TableCell>
                                  <TableCell>{student.email}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label="Đã phê duyệt"
                                      color="success"
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStudentApproval} color="primary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog từ chối sinh viên */}
      {studentApprovalDialog.rejectDialog.open && (
        <Dialog
          open={studentApprovalDialog.rejectDialog.open}
          onClose={closeRejectDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Từ chối sinh viên</DialogTitle>
          <DialogContent>
            <Typography variant="body2" paragraph>
              Bạn có chắc muốn từ chối sinh viên này?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Lý do từ chối"
              placeholder="Nhập lý do từ chối để thông báo cho sinh viên"
              value={studentApprovalDialog.rejectDialog.reason}
              onChange={handleRejectReasonChange}
              variant="outlined"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeRejectDialog} color="inherit">
              Hủy
            </Button>
            <Button
              onClick={handleRejectStudent}
              color="error"
              variant="contained"
              startIcon={<Close />}
            >
              Từ chối
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ClassesPage;
