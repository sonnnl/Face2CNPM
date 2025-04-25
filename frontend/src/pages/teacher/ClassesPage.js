import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormHelperText,
} from "@mui/material";
import {
  Search,
  School,
  CalendarToday,
  Class,
  Add,
  BarChart,
  Room as RoomIcon,
  Home as HomeIcon,
  Business as BuildingIcon,
  Event,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const TeacherClassesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClasses, setTotalClasses] = useState(0);

  // State cho tìm kiếm và phân trang
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State cho dialog thêm lớp học
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClass, setNewClass] = useState({
    class_name: "",
    class_code: "",
    subject_id: "",
    teacher_id: user?._id || "",
    main_class_id: "",
    semester_id: "",
    total_sessions: 15,
    room_id: "",
    course_start_date: "",
    course_end_date: "",
    auto_generate_sessions: true,
    schedule: [],
  });

  // State cho danh sách dữ liệu tham chiếu
  const [subjects, setSubjects] = useState([]);
  const [mainClasses, setMainClasses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [scheduleDays, setScheduleDays] = useState([
    {
      day_of_week: 1,
      start_period: 1,
      end_period: 2,
      start_time: "07:00",
      end_time: "08:40",
      room_id: "",
      is_recurring: true,
      specific_dates: [],
      excluded_dates: [],
    },
  ]);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Load các học kỳ
        const semestersResponse = await axios.get(`${API_URL}/semesters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSemesters(semestersResponse.data.data || []);

        // Load lớp học theo mặc định
        await fetchClasses();
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [token, enqueueSnackbar]);

  // Tải danh sách lớp học
  const fetchClasses = async () => {
    try {
      setIsLoading(true);

      let url = `${API_URL}/classes/teaching/teacher/${user._id}?page=${
        page + 1
      }&limit=${rowsPerPage}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (semester) {
        url += `&semester_id=${semester}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Lưu nhật ký để gỡ lỗi
      console.log("Danh sách lớp học đã tải:", response.data.data);

      setClasses(response.data.data || []);
      setTotalClasses(response.data.count || 0);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách lớp học", {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi trang hoặc số dòng mỗi trang
  useEffect(() => {
    fetchClasses();
  }, [page, rowsPerPage, token]);

  // Tải dữ liệu tham chiếu cho dialog thêm lớp
  const fetchReferenceData = async () => {
    try {
      const [subjectsRes, mainClassesRes, campusesRes] = await Promise.all([
        axios.get(`${API_URL}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/classes/main?all=true`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/facilities/campus`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSubjects(subjectsRes.data.data || []);
      setMainClasses(mainClassesRes.data.data || []);
      setCampuses(campusesRes.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tham chiếu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu tham chiếu", { variant: "error" });
    }
  };

  // Tải danh sách tòa nhà khi chọn campus
  const fetchBuildings = async (campusId) => {
    if (!campusId) {
      setBuildings([]);
      setSelectedBuilding("");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/facilities/buildings/campus/${campusId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBuildings(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tòa nhà:", error);
      enqueueSnackbar("Lỗi khi tải danh sách tòa nhà", { variant: "error" });
    }
  };

  // Tải danh sách phòng học khi chọn tòa nhà
  const fetchRooms = async (buildingId) => {
    if (!buildingId) {
      setRooms([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/facilities/rooms/building/${buildingId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRooms(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách phòng học", { variant: "error" });
    }
  };

  // Xử lý tìm kiếm
  const handleSearch = () => {
    setPage(0); // Reset về trang đầu tiên
    fetchClasses();
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

  // Xử lý khi nhấn Enter trong ô tìm kiếm
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Lọc theo học kỳ hoặc năm học
  const handleFilterChange = () => {
    setPage(0);
    fetchClasses();
  };

  // Mở trang chi tiết lớp học
  const handleViewClass = (classId) => {
    // Kiểm tra classId có tồn tại không
    if (!classId) {
      enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
      return;
    }

    // Không kiểm tra định dạng ObjectId nữa, chấp nhận mọi định dạng ID từ BE
    navigate(`/teacher/classes/${classId}`);
  };

  // Mở dialog thêm lớp học
  const handleOpenAddClassDialog = () => {
    fetchReferenceData();
    setOpenAddClassDialog(true);
  };

  // Đóng dialog thêm lớp học
  const handleCloseAddClassDialog = () => {
    setOpenAddClassDialog(false);
    resetNewClassForm();
  };

  // Reset form thêm lớp
  const resetNewClassForm = () => {
    setNewClass({
      class_name: "",
      class_code: "",
      subject_id: "",
      teacher_id: user?._id || "",
      main_class_id: "",
      semester_id: "",
      total_sessions: 15,
      room_id: "",
      course_start_date: "",
      course_end_date: "",
      auto_generate_sessions: true,
      schedule: [],
    });
    setSelectedCampus("");
    setSelectedBuilding("");
    setScheduleDays([
      {
        day_of_week: 1,
        start_period: 1,
        end_period: 2,
        start_time: "07:00",
        end_time: "08:40",
        room_id: "",
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ]);
  };

  // Xử lý thay đổi các trường thông tin lớp học
  const handleNewClassChange = (e) => {
    const { name, value } = e.target;
    setNewClass((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xử lý thay đổi campus
  const handleCampusChange = (e) => {
    const campusId = e.target.value;
    setSelectedCampus(campusId);
    fetchBuildings(campusId);
    setSelectedBuilding("");
    setNewClass((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Xử lý thay đổi building
  const handleBuildingChange = (e) => {
    const buildingId = e.target.value;
    setSelectedBuilding(buildingId);
    fetchRooms(buildingId);
    setNewClass((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Xử lý thay đổi thông tin lịch học
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...scheduleDays];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      [field]: value,
    };
    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc khi lịch học thay đổi
    setNewClass((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Thêm hàm lấy thứ trong tuần từ ngày
  const getDayOfWeekFromDate = (dateString) => {
    if (!dateString) return 1; // Mặc định là thứ 2 nếu không có ngày

    const date = new Date(dateString);
    // getDay() trả về 0 cho Chủ Nhật, 1-6 cho Thứ 2 đến Thứ 7
    const day = date.getDay();

    // Chuyển đổi để 0 = Chủ Nhật, 1 = Thứ Hai, ...
    return day;
  };

  // Thêm hàm để lấy tên của thứ
  const getDayOfWeekName = (dayOfWeek) => {
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return days[dayOfWeek];
  };

  // Thêm hàm để lấy tên của thứ
  const addScheduleDay = () => {
    // Lấy ngày bắt đầu
    const startDate = newClass.course_start_date;
    if (!startDate) {
      enqueueSnackbar("Vui lòng chọn ngày bắt đầu trước", {
        variant: "warning",
      });
      return;
    }

    // Lấy thứ từ ngày bắt đầu
    const baseDayOfWeek = getDayOfWeekFromDate(startDate);

    // Tìm thứ tiếp theo chưa có trong lịch
    const existingDays = scheduleDays.map((day) => day.day_of_week);
    let nextDay = (baseDayOfWeek + 1) % 7; // Thứ tiếp theo

    // Tìm một thứ chưa có trong lịch hiện tại
    for (let i = 0; i < 7; i++) {
      if (!existingDays.includes(nextDay)) {
        break;
      }
      nextDay = (nextDay + 1) % 7;
    }

    // Nếu đã có đủ 7 ngày trong tuần, thì dùng thứ 2
    if (existingDays.length >= 7) {
      nextDay = 1;
    }

    const updatedSchedule = [
      ...scheduleDays,
      {
        day_of_week: nextDay,
        start_period: 1,
        end_period: 2,
        start_time: "07:00",
        end_time: "08:40",
        room_id: newClass.room_id,
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ];

    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc sau khi thêm buổi học
    setNewClass((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Thêm một hàm để tính ngày kết thúc dựa trên ngày bắt đầu và lịch học
  const calculateEndDate = (startDate, schedule, totalSessions) => {
    if (!startDate || !schedule || schedule.length === 0 || !totalSessions) {
      return "";
    }

    try {
      // Chuyển ngày bắt đầu thành đối tượng Date
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return "";
      }

      // Tổng số tuần cần thiết = tổng số buổi học / số buổi học mỗi tuần
      const sessionsPerWeek = schedule.length;
      const weeksNeeded = Math.ceil(totalSessions / sessionsPerWeek);

      // Tạo mảng chứa các ngày trong tuần từ lịch học (0-6, với 0 là Chủ Nhật)
      const daysOfWeek = schedule.map((day) => day.day_of_week);

      // Sắp xếp các ngày trong tuần
      daysOfWeek.sort((a, b) => a - b);

      // Tìm ngày đầu tiên trong lịch học sau ngày bắt đầu
      let currentDate = new Date(start);

      // Đếm số buổi học đã xếp lịch
      let sessionCount = 0;

      // Lặp qua từng tuần
      for (let week = 0; week < weeksNeeded * 2; week++) {
        // Nhân 2 để đảm bảo đủ số buổi
        // Lặp qua các ngày trong tuần từ lịch học
        for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
          const targetDayOfWeek = daysOfWeek[dayIndex];

          // Tìm ngày tiếp theo có thứ phù hợp
          while (currentDate.getDay() !== targetDayOfWeek) {
            currentDate.setDate(currentDate.getDate() + 1);
          }

          sessionCount++;

          // Nếu đã đủ số buổi học, trả về ngày hiện tại
          if (sessionCount >= totalSessions) {
            return currentDate.toISOString().split("T")[0];
          }

          // Di chuyển đến ngày tiếp theo
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Nếu không tính được, trả về chuỗi rỗng
      return "";
    } catch (error) {
      console.error("Lỗi khi tính ngày kết thúc:", error);
      return "";
    }
  };

  // Cập nhật hàm xử lý thay đổi ngày bắt đầu
  const handleStartDateChange = (e) => {
    const startDate = e.target.value;

    // Lấy thứ từ ngày bắt đầu
    const dayOfWeek = getDayOfWeekFromDate(startDate);

    // Cập nhật lịch học với thứ mới
    const updatedSchedule = [
      {
        day_of_week: dayOfWeek,
        start_period: 1,
        end_period: 2,
        start_time: "07:00",
        end_time: "08:40",
        room_id: newClass.room_id,
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ];

    // Cập nhật lịch học
    setScheduleDays(updatedSchedule);

    // Cập nhật ngày bắt đầu và tính ngày kết thúc
    setNewClass((prev) => ({
      ...prev,
      course_start_date: startDate,
      course_end_date: calculateEndDate(
        startDate,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Cập nhật hàm xử lý thay đổi số buổi học
  const handleTotalSessionsChange = (e) => {
    const totalSessions = e.target.value;

    setNewClass((prev) => ({
      ...prev,
      total_sessions: totalSessions,
      // Tính lại ngày kết thúc khi thay đổi số buổi học
      course_end_date: calculateEndDate(
        prev.course_start_date,
        scheduleDays,
        totalSessions
      ),
    }));
  };

  // Tạo lớp học mới
  const handleCreateClass = async () => {
    // Kiểm tra dữ liệu nhập
    if (
      !newClass.class_name ||
      !newClass.class_code ||
      !newClass.subject_id ||
      !newClass.semester_id ||
      !newClass.total_sessions ||
      !newClass.course_start_date
    ) {
      enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
        variant: "warning",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Cập nhật room_id cho mỗi lịch học nếu chưa có
      const updatedSchedule = scheduleDays.map((schedule) => ({
        ...schedule,
        room_id: schedule.room_id || newClass.room_id,
      }));

      const classData = {
        ...newClass,
        schedule: updatedSchedule,
        teacher_id: user._id,
      };

      const response = await axios.post(
        `${API_URL}/classes/teaching`,
        classData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Tạo lớp học thành công", { variant: "success" });
      handleCloseAddClassDialog();
      fetchClasses(); // Tải lại danh sách lớp
    } catch (error) {
      console.error("Lỗi khi tạo lớp học:", error);
      enqueueSnackbar(error.response?.data?.message || "Lỗi khi tạo lớp học", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thêm lại hàm removeScheduleDay
  const removeScheduleDay = (index) => {
    if (scheduleDays.length > 1) {
      const updatedSchedule = scheduleDays.filter((_, i) => i !== index);
      setScheduleDays(updatedSchedule);

      // Tính lại ngày kết thúc sau khi xóa buổi học
      setNewClass((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          <Class sx={{ mr: 1, verticalAlign: "middle" }} />
          Quản lý lớp học
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleOpenAddClassDialog}
        >
          Thêm lớp học
        </Button>
      </Box>

      {/* Bộ lọc và tìm kiếm */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Tìm kiếm lớp học"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Học kỳ</InputLabel>
              <Select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  handleFilterChange();
                }}
                label="Học kỳ"
              >
                <MenuItem value="">Tất cả học kỳ</MenuItem>
                {semesters.map((sem) => (
                  <MenuItem key={sem._id} value={sem._id}>
                    {sem.name} (
                    {sem.academic_year || `${sem.year}-${sem.year + 1}`})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSearch}
            >
              Tìm kiếm
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Danh sách lớp học */}
      <Paper>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tên lớp</TableCell>
                    <TableCell>Môn học</TableCell>
                    <TableCell>Kỳ học</TableCell>
                    <TableCell>Lớp chính</TableCell>
                    <TableCell align="center">Số lượng SV</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classes.length > 0 ? (
                    classes.map((classItem) => (
                      <TableRow key={classItem._id}>
                        <TableCell>
                          <Typography variant="body2">
                            {classItem.class_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {classItem.subject_id ? (
                            <Box>
                              <Typography variant="body2">
                                {classItem.subject_id.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                {classItem.subject_id.code}
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
                          {classItem.main_class_id ? (
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
                              classItem.students?.length > 0
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {classItem.status === "đang học" ? (
                            <Chip
                              label="Đang học"
                              color="success"
                              size="small"
                            />
                          ) : classItem.status === "đã kết thúc" ? (
                            <Chip
                              label="Đã kết thúc"
                              color="default"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="Chưa bắt đầu"
                              color="primary"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewClass(classItem._id)}
                          >
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Không có lớp học nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalClasses}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Dòng mỗi trang:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} trong số ${count !== -1 ? count : `hơn ${to}`}`
              }
            />
          </>
        )}
      </Paper>

      {/* Dialog thêm lớp học */}
      <Dialog
        open={openAddClassDialog}
        onClose={handleCloseAddClassDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
        >
          <Add sx={{ verticalAlign: "middle", mr: 1 }} />
          Thêm lớp học mới
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tên lớp"
                name="class_name"
                value={newClass.class_name}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="VD: Lập trình web - Nhóm 1"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mã lớp"
                name="class_code"
                value={newClass.class_code}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="VD: WEB101-G1"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Môn học</InputLabel>
                <Select
                  label="Môn học"
                  name="subject_id"
                  value={newClass.subject_id}
                  onChange={handleNewClassChange}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Học kỳ</InputLabel>
                <Select
                  label="Học kỳ"
                  name="semester_id"
                  value={newClass.semester_id}
                  onChange={handleNewClassChange}
                >
                  {semesters.map((sem) => (
                    <MenuItem key={sem._id} value={sem._id}>
                      {sem.name} ({sem.academic_year})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Lớp chính</InputLabel>
                <Select
                  label="Lớp chính"
                  name="main_class_id"
                  value={newClass.main_class_id}
                  onChange={handleNewClassChange}
                >
                  <MenuItem value="">Không chọn lớp chính</MenuItem>
                  {mainClasses.map((mainClass) => (
                    <MenuItem key={mainClass._id} value={mainClass._id}>
                      {mainClass.name} ({mainClass.class_code})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Có thể để trống nếu lớp dành cho nhiều lớp chính
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Tổng số buổi học"
                name="total_sessions"
                value={newClass.total_sessions}
                onChange={handleTotalSessionsChange}
                required
                variant="outlined"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày bắt đầu khóa học"
                name="course_start_date"
                value={newClass.course_start_date}
                onChange={handleStartDateChange}
                required
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày kết thúc khóa học (tự động tính)"
                name="course_end_date"
                value={newClass.course_end_date}
                disabled
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                helperText="Được tính tự động từ ngày bắt đầu và lịch học"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tự động tạo buổi học</InputLabel>
                <Select
                  label="Tự động tạo buổi học"
                  name="auto_generate_sessions"
                  value={newClass.auto_generate_sessions}
                  onChange={handleNewClassChange}
                >
                  <MenuItem value={true}>Có</MenuItem>
                  <MenuItem value={false}>Không</MenuItem>
                </Select>
                <FormHelperText>
                  Khi bật, hệ thống sẽ tự động tạo các buổi học dựa trên lịch
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Chọn phòng học */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: "bold", mt: 2 }}
              >
                <RoomIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                Thông tin phòng học
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Cơ sở</InputLabel>
                <Select
                  label="Cơ sở"
                  value={selectedCampus}
                  onChange={handleCampusChange}
                >
                  <MenuItem value="">Chọn cơ sở</MenuItem>
                  {campuses.map((campus) => (
                    <MenuItem key={campus._id} value={campus._id}>
                      {campus.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={!selectedCampus}>
                <InputLabel>Tòa nhà</InputLabel>
                <Select
                  label="Tòa nhà"
                  value={selectedBuilding}
                  onChange={handleBuildingChange}
                >
                  <MenuItem value="">Chọn tòa nhà</MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building._id} value={building._id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={!selectedBuilding}>
                <InputLabel>Phòng học</InputLabel>
                <Select
                  label="Phòng học"
                  name="room_id"
                  value={newClass.room_id}
                  onChange={handleNewClassChange}
                >
                  <MenuItem value="">Chọn phòng học</MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.room_number} (Sức chứa: {room.capacity})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Lịch học */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: "bold", mt: 2 }}
              >
                <Event sx={{ verticalAlign: "middle", mr: 1 }} />
                Lịch học
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {scheduleDays.map((day, index) => (
              <Grid
                container
                spacing={2}
                key={index}
                sx={{
                  ml: 0,
                  mt: 1,
                  width: "100%",
                  pb: 2,
                  borderBottom:
                    index < scheduleDays.length - 1
                      ? "1px dashed #ddd"
                      : "none",
                }}
              >
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Thứ trong tuần"
                    value={getDayOfWeekName(day.day_of_week)}
                    InputProps={{
                      readOnly: true,
                    }}
                    variant="outlined"
                    helperText="Được xác định từ ngày bắt đầu"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    label="Tiết bắt đầu"
                    type="number"
                    value={day.start_period}
                    onChange={(e) =>
                      handleScheduleChange(
                        index,
                        "start_period",
                        parseInt(e.target.value)
                      )
                    }
                    InputProps={{ inputProps: { min: 1, max: 15 } }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    label="Tiết kết thúc"
                    type="number"
                    value={day.end_period}
                    onChange={(e) =>
                      handleScheduleChange(
                        index,
                        "end_period",
                        parseInt(e.target.value)
                      )
                    }
                    InputProps={{
                      inputProps: { min: day.start_period, max: 15 },
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    label="Giờ bắt đầu"
                    type="time"
                    value={day.start_time}
                    onChange={(e) =>
                      handleScheduleChange(index, "start_time", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    label="Giờ kết thúc"
                    type="time"
                    value={day.end_time}
                    onChange={(e) =>
                      handleScheduleChange(index, "end_time", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={1}
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <IconButton
                    color="error"
                    onClick={() => removeScheduleDay(index)}
                    disabled={scheduleDays.length <= 1}
                  >
                    <Chip
                      label="Xóa"
                      color="error"
                      size="small"
                      variant="outlined"
                      disabled={scheduleDays.length <= 1}
                    />
                  </IconButton>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Phòng học riêng</InputLabel>
                    <Select
                      label="Phòng học riêng"
                      value={day.room_id || ""}
                      onChange={(e) =>
                        handleScheduleChange(index, "room_id", e.target.value)
                      }
                    >
                      <MenuItem value="">Dùng phòng mặc định</MenuItem>
                      {rooms.map((room) => (
                        <MenuItem key={room._id} value={room._id}>
                          {room.room_number} (Sức chứa: {room.capacity})
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Phòng học riêng cho buổi này, để trống sẽ dùng phòng mặc
                      định của lớp
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Loại lịch</InputLabel>
                    <Select
                      label="Loại lịch"
                      value={day.is_recurring}
                      onChange={(e) =>
                        handleScheduleChange(
                          index,
                          "is_recurring",
                          e.target.value
                        )
                      }
                    >
                      <MenuItem value={true}>Định kỳ hàng tuần</MenuItem>
                      <MenuItem value={false}>Các ngày cụ thể</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  {day.is_recurring ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Hàm để mở dialog chọn ngày nghỉ
                        // Có thể triển khai sau
                      }}
                    >
                      Thêm ngày nghỉ
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Hàm để mở dialog chọn ngày cụ thể
                        // Có thể triển khai sau
                      }}
                    >
                      Chọn ngày học cụ thể
                    </Button>
                  )}
                </Grid>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Add />}
                onClick={addScheduleDay}
                sx={{ mt: 1 }}
              >
                Thêm lịch học
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddClassDialog} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateClass}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Add />}
          >
            {isSubmitting ? "Đang tạo..." : "Tạo lớp học"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherClassesPage;
