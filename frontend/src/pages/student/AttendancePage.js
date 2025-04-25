import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Schedule,
  Help,
  School,
  Person,
  HowToReg,
  ArrowBack,
  Description,
  Book,
  CloudDownload,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const AttendanceStatusChip = ({ status }) => {
  switch (status) {
    case "present":
      return (
        <Chip
          label="Có mặt"
          color="success"
          size="small"
          icon={<CheckCircle />}
        />
      );
    case "absent":
      return (
        <Chip label="Vắng mặt" color="error" size="small" icon={<Cancel />} />
      );
    case "late":
      return (
        <Chip
          label="Đi muộn"
          color="warning"
          size="small"
          icon={<Schedule />}
        />
      );
    default:
      return (
        <Chip
          label="Không xác định"
          color="default"
          size="small"
          icon={<Help />}
        />
      );
  }
};

const StudentAttendancePage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classInfo, setClassInfo] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load dữ liệu ban đầu
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Lấy thông tin lớp học
      const classResponse = await axios.get(
        `${API_URL}/classes/teaching/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setClassInfo(classResponse.data.data);

      // Lấy lịch sử điểm danh của sinh viên trong lớp học
      const logsResponse = await axios.get(
        `${API_URL}/attendance/student/${user._id}/logs?teaching_class=${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const logs = logsResponse.data.data || [];
      setAttendanceLogs(logs);

      // Tính toán thống kê điểm danh
      let present = 0,
        absent = 0,
        late = 0;

      logs.forEach((log) => {
        if (log.status === "present") present++;
        else if (log.status === "absent") absent++;
        else if (log.status === "late") late++;
      });

      const total = logs.length;
      const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

      setAttendanceStats({
        total,
        present,
        absent,
        late,
        attendanceRate,
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu điểm danh", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [classId, token, user._id, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Xuất danh sách điểm danh
  const handleExportAttendance = () => {
    try {
      // Chuẩn bị dữ liệu CSV
      const attendanceData = attendanceLogs.map((log, index) => {
        const session = log.session_id;
        const date = new Date(session.date).toLocaleDateString("vi-VN");
        const time = `${session.start_time} - ${session.end_time}`;

        return {
          STT: index + 1,
          Buổi: session.title || `Buổi ${index + 1}`,
          Ngày: date,
          "Thời gian": time,
          "Trạng thái":
            log.status === "present"
              ? "Có mặt"
              : log.status === "late"
              ? "Đi muộn"
              : "Vắng mặt",
          "Ghi chú": log.note || "",
        };
      });

      const header = [
        "STT",
        "Buổi",
        "Ngày",
        "Thời gian",
        "Trạng thái",
        "Ghi chú",
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          header.join(","),
          ...attendanceData.map((row) =>
            [
              row.STT,
              row.Buổi,
              row.Ngày,
              row["Thời gian"],
              row["Trạng thái"],
              row["Ghi chú"],
            ].join(",")
          ),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `diem_danh_${classInfo?.class_name}_${user.full_name}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("Xuất danh sách điểm danh thành công", {
        variant: "success",
      });
    } catch (error) {
      console.error("Lỗi khi xuất danh sách điểm danh:", error);
      enqueueSnackbar("Lỗi khi xuất danh sách điểm danh", { variant: "error" });
    }
  };

  // Tính điểm chuyên cần dựa trên tỷ lệ tham gia
  const calculateAttendanceScore = () => {
    // Nếu có ít hơn 3 buổi học thì không tính điểm
    if (attendanceStats.total < 3) return "N/A";

    const rate = attendanceStats.attendanceRate;
    if (rate >= 90) return 10;
    if (rate >= 80) return 9;
    if (rate >= 70) return 8;
    if (rate >= 60) return 7;
    if (rate >= 50) return 6;
    if (rate >= 40) return 5;
    return Math.floor(rate / 10);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!classInfo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Không tìm thấy thông tin lớp học. Vui lòng thử lại sau.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/student/classes")}
          sx={{ mt: 2 }}
        >
          Quay lại danh sách lớp
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/student/classes")}
          sx={{ mb: 2 }}
        >
          Quay lại danh sách lớp
        </Button>
        <Typography variant="h4" gutterBottom>
          {classInfo.class_name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {classInfo.course_id?.name} ({classInfo.course_id?.code})
        </Typography>
      </Box>

      {/* Thông tin chung */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Book sx={{ mr: 1 }} /> Thông tin lớp học
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.5}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <School sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
                  <Typography variant="body2">
                    <strong>Học kỳ:</strong> {classInfo.semester?.name || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarToday
                    sx={{ mr: 1, fontSize: 20, color: "primary.main" }}
                  />
                  <Typography variant="body2">
                    <strong>Năm học:</strong> {classInfo.academic_year || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Person sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
                  <Typography variant="body2">
                    <strong>Giảng viên:</strong>{" "}
                    {classInfo.teacher_id?.full_name || "N/A"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AccessTime
                    sx={{ mr: 1, fontSize: 20, color: "primary.main" }}
                  />
                  <Typography variant="body2">
                    <strong>Tổng số buổi học:</strong>{" "}
                    {classInfo.total_sessions || "N/A"}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <HowToReg sx={{ mr: 1 }} /> Thống kê điểm danh
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Tỷ lệ tham gia: {Math.round(attendanceStats.attendanceRate)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={attendanceStats.attendanceRate}
                  color={
                    attendanceStats.attendanceRate >= 80
                      ? "success"
                      : attendanceStats.attendanceRate >= 50
                      ? "warning"
                      : "error"
                  }
                  sx={{ height: 10, borderRadius: 5, mb: 1 }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      bgcolor: "success.light",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h5" color="success.dark">
                      {attendanceStats.present}
                    </Typography>
                    <Typography variant="caption">Có mặt</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      bgcolor: "warning.light",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h5" color="warning.dark">
                      {attendanceStats.late}
                    </Typography>
                    <Typography variant="caption">Đi muộn</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      bgcolor: "error.light",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h5" color="error.dark">
                      {attendanceStats.absent}
                    </Typography>
                    <Typography variant="caption">Vắng mặt</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      bgcolor: "info.light",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h5" color="info.dark">
                      {calculateAttendanceScore()}
                    </Typography>
                    <Typography variant="caption">Điểm chuyên cần</Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloudDownload />}
                  onClick={handleExportAttendance}
                >
                  Xuất danh sách
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Danh sách các buổi học và trạng thái điểm danh */}
      <Paper sx={{ p: 2 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center" }}
        >
          <Description sx={{ mr: 1 }} /> Chi tiết điểm danh
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {attendanceLogs.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Buổi học</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ghi chú</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceLogs.map((log, index) => {
                  const session = log.session_id;
                  return (
                    <TableRow key={log._id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {session.title || `Buổi ${index + 1}`}
                      </TableCell>
                      <TableCell>
                        {new Date(session.date).toLocaleDateString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        {session.start_time} - {session.end_time}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusChip status={log.status} />
                      </TableCell>
                      <TableCell>{log.note || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            Chưa có dữ liệu điểm danh cho lớp học này.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAttendancePage;
