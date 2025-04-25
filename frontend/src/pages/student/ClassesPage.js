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
  Stack,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Search,
  School,
  CalendarToday,
  AccessTime,
  VerifiedUser,
  Warning,
  Visibility,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const StudentClassesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [totalClasses, setTotalClasses] = useState(0);

  // State cho tìm kiếm và phân trang
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State cho thông tin đăng ký khuôn mặt
  const [faceRegistrationStatus, setFaceRegistrationStatus] = useState(false);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Kiểm tra trạng thái đăng ký khuôn mặt
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFaceRegistrationStatus(
          userResponse.data.data.face_registered || false
        );

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
  }, [token, enqueueSnackbar, user._id]);

  // Tải danh sách lớp học
  const fetchClasses = async () => {
    try {
      setIsLoading(true);

      let url = `${API_URL}/classes/teaching/student/${user._id}?page=${
        page + 1
      }&limit=${rowsPerPage}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (semester) {
        url += `&semester=${semester}`;
      }

      if (academicYear) {
        url += `&academic_year=${academicYear}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const classesData = response.data.data || [];
      setClasses(classesData);
      setTotalClasses(response.data.count || 0);

      // Lấy thống kê điểm danh cho từng lớp
      const statsPromises = classesData.map(async (classItem) => {
        try {
          const attendanceResponse = await axios.get(
            `${API_URL}/attendance/student/${user._id}/logs?teaching_class=${classItem._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Tính số buổi tham gia, vắng mặt
          const logs = attendanceResponse.data.data || [];
          const totalSessions = logs.length;
          let present = 0;
          let absent = 0;
          let late = 0;

          logs.forEach((log) => {
            if (log.status === "present") present++;
            else if (log.status === "late") late++;
            else if (log.status === "absent") absent++;
          });

          return {
            classId: classItem._id,
            stats: {
              total: totalSessions,
              present,
              absent,
              late,
              attendanceRate:
                totalSessions > 0
                  ? ((present + late) / totalSessions) * 100
                  : 0,
            },
          };
        } catch (error) {
          console.error(
            `Lỗi khi lấy thống kê điểm danh cho lớp ${classItem._id}:`,
            error
          );
          return {
            classId: classItem._id,
            stats: {
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              attendanceRate: 0,
            },
          };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach((result) => {
        statsMap[result.classId] = result.stats;
      });
      setAttendanceStats(statsMap);
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
  const handleViewAttendance = (classId) => {
    navigate(`/student/attendance/${classId}`);
  };

  // Đăng ký khuôn mặt
  const handleRegisterFace = () => {
    navigate("/register-face");
  };

  // Lấy danh sách các năm học từ các học kỳ
  const getAcademicYears = () => {
    const years = new Set();
    semesters.forEach((sem) => {
      if (sem.academic_year) {
        years.add(sem.academic_year);
      }
    });
    return Array.from(years).sort().reverse();
  };

  // Render trạng thái lớp học
  const renderClassStatus = (classItem) => {
    if (!classItem.is_active) {
      return <Chip label="Đã kết thúc" color="default" size="small" />;
    }
    if (classItem.is_active) {
      return <Chip label="Đang hoạt động" color="success" size="small" />;
    }
    return <Chip label="Chưa bắt đầu" color="primary" size="small" />;
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lớp học của tôi
      </Typography>

      {!faceRegistrationStatus && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: "warning.light" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Warning color="warning" sx={{ mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">
                Bạn chưa đăng ký khuôn mặt cho hệ thống điểm danh!
              </Typography>
              <Typography variant="body2">
                Để có thể điểm danh bằng khuôn mặt, bạn cần đăng ký khuôn mặt
                trước.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleRegisterFace}
              startIcon={<VerifiedUser />}
            >
              Đăng ký khuôn mặt
            </Button>
          </Box>
        </Paper>
      )}

      {/* Bộ lọc và tìm kiếm */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
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
          <Grid item xs={12} sm={3}>
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
                    {sem.name} ({sem.academic_year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Năm học</InputLabel>
              <Select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  handleFilterChange();
                }}
                label="Năm học"
              >
                <MenuItem value="">Tất cả năm học</MenuItem>
                {getAcademicYears().map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
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
          <Box sx={{ width: "100%" }}>
            <LinearProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tên lớp</TableCell>
                  <TableCell>Mã học phần</TableCell>
                  <TableCell>Giảng viên</TableCell>
                  <TableCell>Học kỳ</TableCell>
                  <TableCell>Tỷ lệ điểm danh</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classes.length > 0 ? (
                  classes.map((classItem) => (
                    <TableRow key={classItem._id}>
                      <TableCell>{classItem.class_name}</TableCell>
                      <TableCell>
                        {classItem.course_id?.code || "N/A"}
                      </TableCell>
                      <TableCell>
                        {classItem.teacher_id?.full_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {classItem.semester
                          ? typeof classItem.semester === "object"
                            ? classItem.semester.name
                            : "N/A"
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box sx={{ width: "100%", mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={
                                attendanceStats[classItem._id]
                                  ?.attendanceRate || 0
                              }
                              color={
                                (attendanceStats[classItem._id]
                                  ?.attendanceRate || 0) >= 80
                                  ? "success"
                                  : (attendanceStats[classItem._id]
                                      ?.attendanceRate || 0) >= 50
                                  ? "warning"
                                  : "error"
                              }
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {Math.round(
                                attendanceStats[classItem._id]
                                  ?.attendanceRate || 0
                              )}
                              %
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" display="block">
                          {`${
                            attendanceStats[classItem._id]?.present || 0
                          } có mặt, ${
                            attendanceStats[classItem._id]?.late || 0
                          } muộn, ${
                            attendanceStats[classItem._id]?.absent || 0
                          } vắng`}
                        </Typography>
                      </TableCell>
                      <TableCell>{renderClassStatus(classItem)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewAttendance(classItem._id)}
                          startIcon={<Visibility />}
                        >
                          Xem
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
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default StudentClassesPage;
