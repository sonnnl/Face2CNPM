import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from "@mui/material";
import {
  School,
  Class,
  Person,
  People,
  Event,
  EventAvailable,
  CheckCircle,
  Face,
  Today,
  AccessTime,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const [stats, setStats] = useState({
    classes: [],
    attendanceSessions: [],
    todayAttendance: [],
    totalAttendedSessions: 0,
    totalSessions: 0,
    attendancePercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        if (user.role === "student") {
          // Dữ liệu cho sinh viên

          // Lấy các lớp mà sinh viên tham gia
          const classesResponse = await axios.get(
            `${API_URL}/classes/teaching?student=${user._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Lấy thống kê điểm danh
          const scoresResponse = await axios.get(
            `${API_URL}/attendance/student/${user._id}/scores`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Lấy lịch sử điểm danh gần đây
          const logsResponse = await axios.get(
            `${API_URL}/attendance/student/${user._id}/logs`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Tính toán tổng số buổi đã tham gia
          const totalAttended = scoresResponse.data.data.reduce(
            (total, score) =>
              total + (score.total_sessions - score.absent_sessions),
            0
          );

          const totalSessions = scoresResponse.data.data.reduce(
            (total, score) => total + score.total_sessions,
            0
          );

          // Lọc phiên điểm danh hôm nay
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayAttendance = logsResponse.data.data.filter((log) => {
            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
          });

          setStats({
            classes: classesResponse.data.data || [],
            attendanceSessions: logsResponse.data.data || [],
            todayAttendance,
            totalAttendedSessions: totalAttended,
            totalSessions,
            attendancePercentage:
              totalSessions > 0
                ? Math.round((totalAttended / totalSessions) * 100)
                : 0,
          });
        } else if (user.role === "teacher") {
          // Dữ liệu cho giáo viên

          // Lấy các lớp do giáo viên dạy
          const classesResponse = await axios.get(
            `${API_URL}/classes/teaching?teacher=${user._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Lấy các phiên điểm danh gần đây
          const sessionsResponse = await axios.get(
            `${API_URL}/attendance/sessions?teacher=${user._id}&limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Lọc phiên điểm danh hôm nay
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayAttendance = sessionsResponse.data.data.filter(
            (session) => {
              const sessionDate = new Date(session.date);
              sessionDate.setHours(0, 0, 0, 0);
              return sessionDate.getTime() === today.getTime();
            }
          );

          setStats({
            classes: classesResponse.data.data || [],
            attendanceSessions: sessionsResponse.data.data || [],
            todayAttendance,
            totalClasses: classesResponse.data.data.length,
          });
        } else if (user.role === "admin") {
          // Dữ liệu cho admin

          // Lấy tổng số lớp học
          const classesResponse = await axios.get(
            `${API_URL}/classes/teaching?limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Lấy tổng số người dùng
          const usersResponse = await axios.get(`${API_URL}/users/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Lấy các phiên điểm danh gần đây
          const sessionsResponse = await axios.get(
            `${API_URL}/attendance/sessions?limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          setStats({
            classes: classesResponse.data.data || [],
            attendanceSessions: sessionsResponse.data.data || [],
            totalClasses: classesResponse.data.totalCount || 0,
            totalUsers: usersResponse.data.totalUsers || 0,
            totalStudents: usersResponse.data.students || 0,
            totalTeachers: usersResponse.data.teachers || 0,
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu dashboard:", error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, token]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Render dựa trên vai trò
  const renderContent = () => {
    switch (user.role) {
      case "student":
        return renderStudentDashboard();
      case "teacher":
        return renderTeacherDashboard();
      case "admin":
        return renderAdminDashboard();
      default:
        return <Typography>Vai trò không hợp lệ</Typography>;
    }
  };

  // Dashboard cho sinh viên
  const renderStudentDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">Xin chào, {user.full_name}!</Typography>
              <Typography variant="body2" color="textSecondary">
                Mã sinh viên: {user.student_code}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Số lớp đang học
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">{stats.classes.length}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tỷ lệ tham gia
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <CheckCircle
                      sx={{ fontSize: 32, mr: 2, color: "success.main" }}
                    />
                    <Typography variant="h4">
                      {stats.attendancePercentage}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Buổi đã tham gia
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <EventAvailable
                      sx={{ fontSize: 32, mr: 2, color: "info.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalAttendedSessions}/{stats.totalSessions}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Các lớp học của bạn
            </Typography>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Bạn chưa tham gia lớp học nào
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.classes.map((classItem) => (
                  <Grid item xs={12} sm={6} key={classItem._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {classItem.class_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          noWrap
                        >
                          <strong>Môn học:</strong>{" "}
                          {classItem.subject_id?.name ||
                            "Chưa có thông tin môn học"}{" "}
                          ({classItem.subject_id?.code || "N/A"})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Lớp chính:</strong>{" "}
                          {classItem.main_class_id?.name || "Chưa có thông tin"}{" "}
                          ({classItem.main_class_id?.class_code || ""})
                        </Typography>
                        <Box mt={1} display="flex" alignItems="center">
                          <Person sx={{ mr: 1, fontSize: 18 }} />
                          <Typography variant="body2">
                            {classItem.teacher_id?.full_name ||
                              "Chưa có giáo viên"}
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/student/attendance/${classItem._id}`)
                          }
                        >
                          Xem điểm danh
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>

          {stats.classes.length > 0 && (
            <CardActions>
              <Button size="small" onClick={() => navigate("/student/classes")}>
                Xem tất cả lớp học
              </Button>
            </CardActions>
          )}
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hôm nay ({new Date().toLocaleDateString("vi-VN")})
            </Typography>

            {stats.todayAttendance.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Không có điểm danh nào hôm nay
              </Typography>
            ) : (
              <List dense>
                {stats.todayAttendance.map((log) => (
                  <ListItem key={log._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={log.session_id?.teaching_class_id?.class_name}
                      secondary={`${new Date(log.timestamp).toLocaleTimeString(
                        "vi-VN"
                      )} - ${log.status === "present" ? "Có mặt" : "Vắng mặt"}`}
                    />
                    <Chip
                      size="small"
                      color={log.status === "present" ? "success" : "error"}
                      label={log.status === "present" ? "Có mặt" : "Vắng mặt"}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Điểm danh gần đây
            </Typography>

            {stats.attendanceSessions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có lịch sử điểm danh
              </Typography>
            ) : (
              <List dense>
                {stats.attendanceSessions.slice(0, 5).map((log) => (
                  <ListItem key={log._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={log.session_id?.teaching_class_id?.class_name}
                      secondary={`${new Date(log.timestamp).toLocaleDateString(
                        "vi-VN"
                      )} - ${log.status === "present" ? "Có mặt" : "Vắng mặt"}`}
                    />
                    <Chip
                      size="small"
                      color={log.status === "present" ? "success" : "error"}
                      label={log.status === "present" ? "Có mặt" : "Vắng mặt"}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          {!user.faceFeatures?.descriptors?.length && (
            <Box p={2} bgcolor="action.hover">
              <Typography variant="subtitle2" gutterBottom>
                Bạn chưa đăng ký khuôn mặt cho điểm danh tự động
              </Typography>
              <Button
                variant="contained"
                startIcon={<Face />}
                size="small"
                onClick={() => navigate("/register-face")}
              >
                Đăng ký ngay
              </Button>
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  );

  // Dashboard cho giáo viên
  const renderTeacherDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">Xin chào, {user.full_name}!</Typography>
              <Typography variant="body2" color="textSecondary">
                Mã giảng viên: {user.teacher_code}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Số lớp đang dạy
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">{stats.classes.length}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Đang diễn ra hôm nay
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Today
                      sx={{ fontSize: 32, mr: 2, color: "success.main" }}
                    />
                    <Typography variant="h4">
                      {stats.todayAttendance.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Phiên gần đây
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <AccessTime
                      sx={{ fontSize: 32, mr: 2, color: "info.main" }}
                    />
                    <Typography variant="h4">
                      {stats.attendanceSessions.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Các lớp bạn đang dạy
            </Typography>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Bạn chưa được phân công lớp học nào
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.classes.map((classItem) => (
                  <Grid item xs={12} sm={6} key={classItem._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {classItem.class_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          noWrap
                        >
                          <strong>Môn học:</strong>{" "}
                          {classItem.subject_id?.name ||
                            "Chưa có thông tin môn học"}{" "}
                          ({classItem.subject_id?.code || "N/A"})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Lớp:</strong>{" "}
                          {classItem.main_class_id?.name || "Chưa có thông tin"}{" "}
                          ({classItem.main_class_id?.class_code || ""})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Học kỳ:</strong>{" "}
                          {classItem.semester_id?.name || "Chưa có thông tin"}{" "}
                          {classItem.semester_id?.year || ""}
                        </Typography>
                        <Box mt={1} display="flex" alignItems="center">
                          <People sx={{ mr: 1, fontSize: 18 }} />
                          <Typography variant="body2">
                            {classItem.students?.length || 0} sinh viên
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/teacher/classes/${classItem._id}`)
                          }
                        >
                          Chi tiết
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>

          {stats.classes.length > 0 && (
            <CardActions>
              <Button size="small" onClick={() => navigate("/teacher/classes")}>
                Xem tất cả lớp học
              </Button>
            </CardActions>
          )}
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hôm nay ({new Date().toLocaleDateString("vi-VN")})
            </Typography>

            {stats.todayAttendance.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Không có phiên điểm danh nào hôm nay
              </Typography>
            ) : (
              <List dense>
                {stats.todayAttendance.map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active" ? "success" : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/teacher/classes")}>
              Tạo phiên điểm danh mới
            </Button>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phiên điểm danh gần đây
            </Typography>

            {stats.attendanceSessions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có phiên điểm danh nào
              </Typography>
            ) : (
              <List dense>
                {stats.attendanceSessions.slice(0, 5).map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${new Date(
                        session.date
                      ).toLocaleDateString("vi-VN")}`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active" ? "success" : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Dashboard cho admin
  const renderAdminDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">Xin chào, {user.full_name}!</Typography>
              <Typography variant="body2" color="textSecondary">
                Quản trị viên hệ thống
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng số lớp học
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalClasses || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng số người dùng
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <People
                      sx={{ fontSize: 32, mr: 2, color: "secondary.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalUsers || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Sinh viên
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Person
                      sx={{ fontSize: 32, mr: 2, color: "success.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalStudents || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Giáo viên
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Person sx={{ fontSize: 32, mr: 2, color: "info.main" }} />
                    <Typography variant="h4">
                      {stats.totalTeachers || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Lớp học gần đây
            </Typography>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có lớp học nào
              </Typography>
            ) : (
              <List dense>
                {stats.classes.map((classItem) => (
                  <ListItem key={classItem._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Class />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={classItem.class_name}
                      secondary={`${
                        classItem.subject_id?.name ||
                        "Chưa có thông tin môn học"
                      } (${classItem.subject_id?.code || "N/A"}) - GV: ${
                        classItem.teacher_id?.full_name || "Chưa phân công"
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/admin/classes")}>
              Quản lý lớp học
            </Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phiên điểm danh gần đây
            </Typography>

            {stats.attendanceSessions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có phiên điểm danh nào
              </Typography>
            ) : (
              <List dense>
                {stats.attendanceSessions.slice(0, 5).map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${new Date(
                        session.date
                      ).toLocaleDateString("vi-VN")}`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active" ? "success" : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/admin/users")}>
              Quản lý người dùng
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trang chủ
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {renderContent()}
    </Box>
  );
};

export default DashboardPage;
