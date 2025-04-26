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
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tooltip,
  Checkbox,
  FormHelperText,
} from "@mui/material";
import {
  PersonAdd,
  Delete,
  Add,
  Edit,
  PlayArrow,
  Stop,
  CheckCircle,
  Warning,
  Info,
  CalendarToday,
  AccessTime,
  Room,
  Download,
  School,
  Settings,
  Event,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function a11yProps(index) {
  return {
    id: `class-tab-${index}`,
    "aria-controls": `class-tabpanel-${index}`,
  };
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`class-tabpanel-${index}`}
      aria-labelledby={`class-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherClassDetailPage = () => {
  const { classId } = useParams();
  const id = classId; // Đảm bảo sử dụng đúng tên param
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // State cho UI
  const [tabValue, setTabValue] = useState(0);
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "07:00",
    end_time: "08:40",
    room: "",
    start_period: 1,
    end_period: 2,
    notes: "",
  });

  // State cho thêm sinh viên
  const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [mainClasses, setMainClasses] = useState([]);
  const [selectedMainClass, setSelectedMainClass] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // State cho chỉnh sửa thông tin lớp học
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [editClassData, setEditClassData] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);

  // Thêm state để lưu danh sách phòng học
  const [rooms, setRooms] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");

  // Thêm state để quản lý lịch học
  const [scheduleDays, setScheduleDays] = useState([]);

  // Thêm hàm fetch danh sách phòng học
  const fetchRooms = async (buildingId) => {
    try {
      let url = `${API_URL}/facilities/rooms`;

      // Nếu có buildingId, tải phòng theo tòa nhà
      if (buildingId) {
        url = `${API_URL}/facilities/rooms/building/${buildingId}`;
      } else {
        // Nếu không có buildingId, tải tất cả phòng
        url = `${API_URL}/facilities/rooms?limit=1000`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Dữ liệu phòng học từ API:", response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        // Lưu trữ dữ liệu phòng học và ghi log để kiểm tra
        setRooms(response.data.data);
        console.log("Đã cập nhật state rooms:", response.data.data);
      } else {
        setRooms([]);
        console.error(
          "API không trả về dữ liệu phòng học hợp lệ:",
          response.data
        );
        enqueueSnackbar(
          "Không thể tải danh sách phòng học (dữ liệu không hợp lệ)",
          { variant: "warning" }
        );
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng học:", error);
      enqueueSnackbar("Không thể tải danh sách phòng học", {
        variant: "error",
      });
      setRooms([]);
    }
  };

  // Load dữ liệu ban đầu
  const fetchClassData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Kiểm tra id có tồn tại không
      if (!id) {
        enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
        navigate("/teacher/classes");
        return;
      }

      // Lấy thông tin lớp học
      const classResponse = await axios.get(
        `${API_URL}/classes/teaching/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Log dữ liệu để xem cấu trúc
      console.log("Dữ liệu lớp học nhận về:", classResponse.data);

      // Kiểm tra nếu không có dữ liệu trả về
      if (!classResponse.data.success || !classResponse.data.data) {
        enqueueSnackbar("Không tìm thấy thông tin lớp học", {
          variant: "error",
        });
        navigate("/teacher/classes");
        return;
      }

      setClassInfo(classResponse.data.data);

      // Fetch rooms right after setting class info to ensure it's done before rendering
      await fetchRooms();

      // Lấy danh sách phiên điểm danh
      const sessionsResponse = await axios.get(
        `${API_URL}/attendance/teaching-class/${id}/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAttendanceSessions(sessionsResponse.data.data || []);

      // Tính toán thống kê điểm danh
      const stats = {
        total: sessionsResponse.data.data?.length || 0,
        pending: 0,
        completed: 0,
      };

      sessionsResponse.data.data?.forEach((session) => {
        if (session.status === "completed") {
          stats.completed++;
        } else {
          stats.pending++;
        }
      });

      setAttendanceStats(stats);

      // Vì API getClassStudents không trả về đầy đủ thông tin, chúng ta sẽ lấy chi tiết từng sinh viên
      if (
        classResponse.data.data.students &&
        classResponse.data.data.students.length > 0
      ) {
        try {
          // Lấy danh sách sinh viên cơ bản
          const studentsResponse = await axios.get(
            `${API_URL}/classes/teaching/${id}/students`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          console.log("Dữ liệu sinh viên cơ bản:", studentsResponse.data);

          // Lưu danh sách sinh viên cơ bản trước
          let studentsWithBasicInfo = [];
          if (studentsResponse.data.success && studentsResponse.data.data) {
            studentsWithBasicInfo = studentsResponse.data.data;
          } else {
            studentsWithBasicInfo = classResponse.data.data.students || [];
          }

          // Lấy chi tiết cho từng sinh viên (bao gồm faceFeatures)
          const detailedStudents = await Promise.all(
            studentsWithBasicInfo.map(async (student) => {
              try {
                // Gọi API để lấy thông tin chi tiết của sinh viên
                const studentDetailResponse = await axios.get(
                  `${API_URL}/users/${student._id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/json",
                    },
                  }
                );

                console.log(
                  `Thông tin chi tiết của sinh viên ${student.full_name}:`,
                  studentDetailResponse.data
                );

                if (
                  studentDetailResponse.data.success &&
                  studentDetailResponse.data.data
                ) {
                  // Kết hợp dữ liệu từ API chi tiết sinh viên với dữ liệu cơ bản
                  const detailedInfo = studentDetailResponse.data.data;

                  // Kiểm tra dữ liệu khuôn mặt
                  const hasFaceData = !!(
                    detailedInfo.faceFeatures &&
                    detailedInfo.faceFeatures.descriptors &&
                    detailedInfo.faceFeatures.descriptors.length > 0
                  );

                  console.log(
                    `Sinh viên ${detailedInfo.full_name} có dữ liệu khuôn mặt: ${hasFaceData}`
                  );

                  return {
                    ...student,
                    ...detailedInfo,
                    has_face_data: hasFaceData,
                  };
                } else {
                  // Nếu không lấy được chi tiết, sử dụng thông tin cơ bản
                  return {
                    ...student,
                    has_face_data: false,
                  };
                }
              } catch (error) {
                console.error(
                  `Lỗi khi lấy thông tin chi tiết của sinh viên ${student._id}:`,
                  error
                );
                return {
                  ...student,
                  has_face_data: false,
                };
              }
            })
          );

          setStudents(detailedStudents);
        } catch (error) {
          console.error("Lỗi khi lấy danh sách sinh viên:", error);
          // Sử dụng danh sách cơ bản nếu có lỗi
          setStudents(classResponse.data.data.students || []);
        }
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lớp học:", error);
      // Xử lý các loại lỗi từ API
      if (error.response) {
        // Nếu máy chủ phản hồi với mã lỗi
        if (error.response.status === 404) {
          enqueueSnackbar("Không tìm thấy lớp học với ID đã cho", {
            variant: "error",
          });
        } else if (error.response.status === 400) {
          enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
        } else {
          enqueueSnackbar(
            error.response.data?.message || "Lỗi khi tải dữ liệu lớp học",
            { variant: "error" }
          );
        }
      } else {
        enqueueSnackbar("Không thể kết nối đến máy chủ", { variant: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, token, enqueueSnackbar, navigate]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  // Thay đổi tab
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  // Mở dialog tạo phiên điểm danh
  const handleOpenSessionDialog = () => {
    // Tải danh sách phòng học
    fetchRooms();

    setSessionFormData({
      title: `Buổi học ${attendanceSessions.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      start_time: "07:00",
      end_time: "08:40",
      room: "",
      start_period: 1,
      end_period: 2,
      notes: "",
    });
    setOpenSessionDialog(true);
  };

  // Đóng dialog tạo phiên điểm danh
  const handleCloseSessionDialog = () => {
    setOpenSessionDialog(false);
  };

  // Cập nhật form dữ liệu phiên điểm danh
  const handleSessionFormChange = (e) => {
    const { name, value } = e.target;
    setSessionFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tạo phiên điểm danh mới
  const handleCreateSession = async () => {
    try {
      const {
        title,
        date,
        start_time,
        end_time,
        room,
        start_period,
        end_period,
        notes,
      } = sessionFormData;

      // Kiểm tra dữ liệu
      if (!date || !start_time || !end_time) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin", { variant: "error" });
        return;
      }

      // Tạo đối tượng để gửi lên API
      const sessionData = {
        title,
        date,
        start_time,
        end_time,
        teaching_class_id: id,
        start_period: parseInt(start_period, 10) || 1,
        end_period: parseInt(end_period, 10) || 2,
        notes,
      };

      // Thêm room nếu có
      if (room) {
        sessionData.room = room;
      }

      const response = await axios.post(
        `${API_URL}/attendance/sessions`,
        sessionData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Tạo phiên điểm danh thành công", {
        variant: "success",
      });
      setOpenSessionDialog(false);

      // Cập nhật danh sách phiên
      setAttendanceSessions((prev) => [...prev, response.data.data]);
      setAttendanceStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
      }));
    } catch (error) {
      console.error("Lỗi khi tạo phiên điểm danh:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi tạo phiên điểm danh",
        { variant: "error" }
      );
    }
  };

  // Cập nhật phiên điểm danh
  const handleUpdateSession = async () => {
    try {
      const {
        _id,
        title,
        date,
        start_time,
        end_time,
        room,
        start_period,
        end_period,
        notes,
      } = sessionFormData;

      // Kiểm tra dữ liệu
      if (!date || !start_time || !end_time) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin", { variant: "error" });
        return;
      }

      // Tạo đối tượng để gửi lên API
      const sessionData = {
        title,
        date,
        start_time,
        end_time,
        start_period: parseInt(start_period, 10) || 1,
        end_period: parseInt(end_period, 10) || 2,
        notes,
      };

      // Thêm room nếu có
      if (room) {
        sessionData.room = room;
      }

      // Gọi API cập nhật
      const response = await axios.put(
        `${API_URL}/attendance/sessions/${_id}`,
        sessionData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Cập nhật phiên điểm danh thành công", {
        variant: "success",
      });
      setOpenSessionDialog(false);

      // Cập nhật danh sách phiên
      setAttendanceSessions((prev) =>
        prev.map((session) =>
          session._id === _id ? response.data.data : session
        )
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật phiên điểm danh:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi cập nhật phiên điểm danh",
        { variant: "error" }
      );
    }
  };

  // Bắt đầu phiên điểm danh
  const handleStartSession = async (sessionId) => {
    try {
      // Kiểm tra tính hợp lệ của session
      if (!sessionId) {
        enqueueSnackbar("ID phiên điểm danh không hợp lệ", {
          variant: "error",
        });
        return;
      }

      // Kiểm tra trạng thái phiên điểm danh
      const session = attendanceSessions.find((s) => s._id === sessionId);
      if (!session) {
        enqueueSnackbar("Không tìm thấy thông tin phiên điểm danh", {
          variant: "error",
        });
        return;
      }

      // Nếu phiên chưa bắt đầu hoặc đang ở trạng thái pending, cập nhật trạng thái thành active
      if (session.status === "pending") {
        try {
          await axios.put(
            `${API_URL}/attendance/sessions/${sessionId}/status`,
            { status: "active" },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Cập nhật lại trạng thái trong state
          setAttendanceSessions((prev) =>
            prev.map((s) =>
              s._id === sessionId ? { ...s, status: "active" } : s
            )
          );
        } catch (error) {
          console.error("Lỗi khi cập nhật trạng thái phiên:", error);
          // Vẫn tiếp tục điều hướng dù có lỗi
        }
      }

      enqueueSnackbar(`Đang chuyển đến trang điểm danh`, { variant: "info" });
      navigate(`/teacher/attendance/${id}/${sessionId}`);
    } catch (error) {
      console.error("Lỗi khi bắt đầu phiên điểm danh:", error);
      enqueueSnackbar("Có lỗi xảy ra khi bắt đầu phiên điểm danh", {
        variant: "error",
      });
    }
  };

  // Mở dialog thêm sinh viên
  const handleOpenAddStudentDialog = async () => {
    try {
      setIsLoadingStudents(true);
      // Lấy danh sách lớp chính
      const mainClassResponse = await axios.get(
        `${API_URL}/classes/main?all=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      console.log("Danh sách lớp chính:", mainClassResponse.data);

      if (!mainClassResponse.data?.data) {
        enqueueSnackbar("Không thể tải danh sách lớp chính", {
          variant: "error",
        });
        return;
      }

      setMainClasses(mainClassResponse.data.data || []);
      setAvailableStudents([]);
      setSelectedStudents([]);
      setSelectedMainClass("");
      setOpenAddStudentDialog(true);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp chính:", error);
      enqueueSnackbar(
        "Không thể tải danh sách lớp chính. Vui lòng thử lại sau.",
        { variant: "error" }
      );
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Lấy danh sách sinh viên từ lớp chính
  const handleMainClassChange = async (e) => {
    const mainClassId = e.target.value;
    setSelectedMainClass(mainClassId);

    if (!mainClassId) {
      setAvailableStudents([]);
      return;
    }

    try {
      setIsLoadingStudents(true);
      const studentsResponse = await axios.get(
        `${API_URL}/classes/main/${mainClassId}/approved-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      console.log("Danh sách sinh viên lớp chính:", studentsResponse.data);

      if (!studentsResponse.data?.data) {
        enqueueSnackbar("Không thể tải danh sách sinh viên từ lớp chính", {
          variant: "error",
        });
        return;
      }

      // Lọc sinh viên chưa có trong lớp
      const currentStudentIds = students.map((s) => s._id);
      const filteredStudents = studentsResponse.data.data.students.filter(
        (s) => !currentStudentIds.includes(s._id)
      );

      setAvailableStudents(filteredStudents);
    } catch (error) {
      console.error("Lỗi khi tải danh sách sinh viên từ lớp chính:", error);
      enqueueSnackbar("Không thể tải danh sách sinh viên từ lớp chính", {
        variant: "error",
      });
      setAvailableStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Đóng dialog thêm sinh viên
  const handleCloseAddStudentDialog = () => {
    setOpenAddStudentDialog(false);
  };

  // Xử lý chọn sinh viên để thêm
  const handleSelectStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // Thêm sinh viên vào lớp
  const handleAddStudents = async () => {
    try {
      if (selectedStudents.length === 0) {
        enqueueSnackbar("Vui lòng chọn ít nhất một sinh viên", {
          variant: "warning",
        });
        return;
      }

      // Gọi API thêm sinh viên
      await axios.post(
        `${API_URL}/classes/teaching/${id}/students/batch`,
        {
          student_ids: selectedStudents,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar(`Đã thêm ${selectedStudents.length} sinh viên vào lớp`, {
        variant: "success",
      });
      setOpenAddStudentDialog(false);

      // Cập nhật lại danh sách sinh viên
      fetchClassData();
    } catch (error) {
      console.error("Lỗi khi thêm sinh viên:", error);

      if (error.response) {
        enqueueSnackbar(
          `Lỗi: ${error.response.status} - ${
            error.response.data?.message || "Không thể thêm sinh viên"
          }`,
          { variant: "error" }
        );
      } else {
        enqueueSnackbar("Lỗi kết nối khi thêm sinh viên vào lớp", {
          variant: "error",
        });
      }
    }
  };

  // Xóa sinh viên khỏi lớp
  const handleRemoveStudent = async (studentId) => {
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa sinh viên này khỏi lớp không?")
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/classes/teaching/${id}/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Đã xóa sinh viên khỏi lớp", { variant: "success" });

      // Cập nhật lại danh sách sinh viên
      setStudents(students.filter((s) => s._id !== studentId));
    } catch (error) {
      console.error("Lỗi khi xóa sinh viên:", error);
      enqueueSnackbar("Lỗi khi xóa sinh viên khỏi lớp", { variant: "error" });
    }
  };

  // Xuất danh sách sinh viên
  const handleExportStudentList = () => {
    try {
      const studentsData = students.map((student, index) => {
        // Kiểm tra có face data từ cả hai nguồn có thể
        const hasFaceData =
          student.has_face_data ||
          !!(
            student.faceFeatures &&
            student.faceFeatures.descriptors &&
            student.faceFeatures.descriptors.length > 0
          );

        return {
          STT: index + 1,
          "Mã SV": student.school_info?.student_id || "N/A",
          "Họ và tên": student.full_name || student.name,
          Email: student.email,
          "Đăng ký khuôn mặt": hasFaceData ? "Đã đăng ký" : "Chưa đăng ký",
        };
      });

      const header = [
        "STT",
        "Mã SV",
        "Họ và tên",
        "Email",
        "Đăng ký khuôn mặt",
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          header.join(","),
          ...studentsData.map((row) =>
            [
              row.STT,
              row["Mã SV"],
              row["Họ và tên"],
              row.Email,
              row["Đăng ký khuôn mặt"],
            ].join(",")
          ),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `danh_sach_sinh_vien_${classInfo?.class_name}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("Xuất danh sách sinh viên thành công", {
        variant: "success",
      });
    } catch (error) {
      console.error("Lỗi khi xuất danh sách:", error);
      enqueueSnackbar("Lỗi khi xuất danh sách sinh viên", { variant: "error" });
    }
  };

  // Lọc sinh viên theo từ khóa tìm kiếm
  const filteredAvailableStudents = availableStudents.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(searchStudent.toLowerCase()) ||
      student.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Tải dữ liệu tham chiếu cho form chỉnh sửa
  const fetchReferenceDataForEdit = async () => {
    try {
      const [subjectsRes, semestersRes, mainClassesRes, campusesRes] =
        await Promise.all([
          axios.get(`${API_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/semesters`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/classes/main?all=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/facilities/campuses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      setSubjects(subjectsRes.data.data || []);
      setSemesters(semestersRes.data.data || []);
      setMainClasses(mainClassesRes.data.data || []);
      setCampuses(campusesRes.data.data || []);

      // Nếu lớp học có thông tin campus và building, tải danh sách building và room tương ứng
      if (classInfo && classInfo.room) {
        try {
          const roomDetails = await axios.get(
            `${API_URL}/facilities/rooms/${classInfo.room}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (roomDetails.data.success && roomDetails.data.data) {
            const room = roomDetails.data.data;
            if (room.building_id) {
              setSelectedCampus(room.building_id.campus_id?._id || "");

              // Tải danh sách buildings của campus
              const buildingsRes = await axios.get(
                `${API_URL}/facilities/buildings/campuses/${room.building_id.campus_id?._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setBuildings(buildingsRes.data.data || []);

              setSelectedBuilding(room.building_id._id || "");

              // Tải danh sách rooms của building
              const roomsRes = await axios.get(
                `${API_URL}/facilities/rooms/building/${room.building_id._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setRooms(roomsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi khi tải thông tin phòng học:", error);
        }
      }
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
        `${API_URL}/facilities/buildings/campuses/${campusId}`,
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

  // Mở dialog chỉnh sửa lớp học
  const handleOpenEditClassDialog = () => {
    // Chuẩn bị dữ liệu ban đầu cho form
    setEditClassData({
      class_name: classInfo.class_name || "",
      class_code: classInfo.class_code || "",
      subject_id: classInfo.subject_id?._id || "",
      main_class_id: classInfo.main_class_id?._id || "",
      semester_id: classInfo.semester_id?._id || "",
      total_sessions: classInfo.total_sessions || 15,
      room_id: classInfo.room?._id || "",
      course_start_date: classInfo.course_start_date
        ? classInfo.course_start_date.split("T")[0]
        : "",
      course_end_date: classInfo.course_end_date
        ? classInfo.course_end_date.split("T")[0]
        : "",
      auto_generate_sessions: classInfo.auto_generate_sessions !== false,
      schedule: classInfo.schedule || [],
    });

    // Chuẩn bị lịch học từ classInfo
    if (classInfo.schedule && classInfo.schedule.length > 0) {
      setScheduleDays(classInfo.schedule);
    } else {
      // Nếu không có lịch học, tạo lịch mặc định dựa trên ngày bắt đầu
      const dayOfWeek = classInfo.course_start_date
        ? getDayOfWeekFromDate(classInfo.course_start_date.split("T")[0])
        : 1;

      setScheduleDays([
        {
          day_of_week: dayOfWeek,
          start_period: 1,
          end_period: 2,
          start_time: "07:00",
          end_time: "08:40",
          room_id: classInfo.room?._id || "",
          is_recurring: true,
          specific_dates: [],
          excluded_dates: [],
        },
      ]);
    }

    // Tải dữ liệu tham chiếu
    fetchReferenceDataForEdit();

    // Mở dialog
    setOpenEditClassDialog(true);
  };

  // Đóng dialog chỉnh sửa lớp học
  const handleCloseEditClassDialog = () => {
    setOpenEditClassDialog(false);
    setEditClassData(null);
  };

  // Xử lý thay đổi các trường trong form chỉnh sửa
  const handleEditClassChange = (e) => {
    const { name, value } = e.target;
    setEditClassData((prev) => ({
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
    setEditClassData((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Xử lý thay đổi building
  const handleBuildingChange = (e) => {
    const buildingId = e.target.value;
    setSelectedBuilding(buildingId);
    fetchRooms(buildingId);
    setEditClassData((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Cập nhật thông tin lớp học
  const handleUpdateClass = async () => {
    try {
      setIsSubmittingEdit(true);

      // Kiểm tra dữ liệu
      if (
        !editClassData.class_name ||
        !editClassData.class_code ||
        !editClassData.subject_id ||
        !editClassData.semester_id
      ) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
          variant: "warning",
        });
        setIsSubmittingEdit(false);
        return;
      }

      // Gộp dữ liệu lịch học vào dữ liệu cập nhật
      const updateData = {
        ...editClassData,
        schedule: scheduleDays,
      };

      // Gọi API cập nhật
      const response = await axios.put(
        `${API_URL}/classes/teaching/${id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        enqueueSnackbar("Cập nhật thông tin lớp học thành công", {
          variant: "success",
        });
        setOpenEditClassDialog(false);

        // Cập nhật thông tin lớp học trong state
        setClassInfo({
          ...classInfo,
          ...response.data.data,
        });

        // Tải lại dữ liệu lớp học
        fetchClassData();
      } else {
        throw new Error(response.data.message || "Lỗi khi cập nhật lớp học");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin lớp học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi cập nhật thông tin lớp học",
        { variant: "error" }
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Lấy thứ trong tuần từ ngày
  const getDayOfWeekFromDate = (dateString) => {
    if (!dateString) return 1; // Mặc định là thứ 2 nếu không có ngày

    const date = new Date(dateString);
    // getDay() trả về 0 cho Chủ Nhật, 1-6 cho Thứ 2 đến Thứ 7
    const day = date.getDay();

    // Chuyển đổi để 0 = Chủ Nhật, 1 = Thứ Hai, ...
    return day;
  };

  // Lấy tên của thứ trong tuần
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

  // Thêm lịch học
  const addScheduleDay = () => {
    // Lấy ngày bắt đầu
    const startDate = editClassData.course_start_date;
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
        room_id: editClassData.room_id,
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ];

    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc sau khi thêm buổi học
    setEditClassData((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Xóa lịch học
  const removeScheduleDay = (index) => {
    if (scheduleDays.length > 1) {
      const updatedSchedule = scheduleDays.filter((_, i) => i !== index);
      setScheduleDays(updatedSchedule);

      // Tính lại ngày kết thúc sau khi xóa buổi học
      setEditClassData((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }
  };

  // Tính ngày kết thúc dựa trên ngày bắt đầu và lịch học
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

  // Xử lý thay đổi lịch học
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...scheduleDays];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      [field]: value,
    };
    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc khi lịch học thay đổi
    setEditClassData((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Xử lý thay đổi ngày bắt đầu
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
        room_id: editClassData.room_id,
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ];

    // Cập nhật lịch học
    setScheduleDays(updatedSchedule);

    // Cập nhật ngày bắt đầu và tính ngày kết thúc
    setEditClassData((prev) => ({
      ...prev,
      course_start_date: startDate,
      course_end_date: calculateEndDate(
        startDate,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Xử lý thay đổi số buổi học
  const handleTotalSessionsChange = (e) => {
    const totalSessions = e.target.value;

    setEditClassData((prev) => ({
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
      <Box sx={{ py: 3 }}>
        <Card sx={{ textAlign: "center", p: 4 }}>
          <Typography variant="h5" color="error" gutterBottom>
            Không tìm thấy lớp học
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Lớp học bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/teacher/classes")}
          >
            Quay lại danh sách lớp
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={() => navigate("/teacher/classes")}
          sx={{ mb: 2 }}
        >
          Quay lại danh sách lớp
        </Button>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              {classInfo.class_name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {classInfo.subject_id?.name} ({classInfo.subject_id?.code})
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Edit />}
            onClick={handleOpenEditClassDialog}
          >
            Chỉnh sửa thông tin lớp
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thông tin lớp học
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, display: "flex", alignItems: "center" }}
                >
                  <CalendarToday sx={{ mr: 1, fontSize: "small" }} />
                  Học kỳ: {classInfo.semester_id?.name || "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, display: "flex", alignItems: "center" }}
                >
                  <CalendarToday sx={{ mr: 1, fontSize: "small" }} />
                  Ngày bắt đầu:{" "}
                  {classInfo.course_start_date
                    ? new Date(classInfo.course_start_date).toLocaleDateString(
                        "vi-VN"
                      )
                    : "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, display: "flex", alignItems: "center" }}
                >
                  <CalendarToday sx={{ mr: 1, fontSize: "small" }} />
                  Ngày kết thúc:{" "}
                  {classInfo.course_end_date
                    ? new Date(classInfo.course_end_date).toLocaleDateString(
                        "vi-VN"
                      )
                    : "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, display: "flex", alignItems: "center" }}
                >
                  <Info sx={{ mr: 1, fontSize: "small" }} />
                  Số buổi học: {classInfo.total_sessions || 15}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Điểm danh
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Tổng số buổi: {attendanceStats.total}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Đã hoàn thành: {attendanceStats.completed}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Chưa hoàn thành: {attendanceStats.pending}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sinh viên
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Tổng số sinh viên: {students.length}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download />}
                onClick={handleExportStudentList}
                sx={{ mt: 2 }}
              >
                Xuất danh sách
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            aria-label="lớp học tabs"
          >
            <Tab label="Sinh viên" {...a11yProps(0)} />
            <Tab label="Phiên điểm danh" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={handleOpenAddStudentDialog}
            >
              Thêm sinh viên
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Mã sinh viên</TableCell>
                  <TableCell>Họ và tên</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student, index) => {
                    // Kiểm tra và log mỗi sinh viên để debug
                    console.log(`Hiển thị sinh viên ${index + 1}:`, student);

                    // Kiểm tra có face data từ cả hai nguồn có thể
                    const hasFaceData =
                      student.has_face_data ||
                      !!(
                        student.faceFeatures &&
                        student.faceFeatures.descriptors &&
                        student.faceFeatures.descriptors.length > 0
                      );

                    return (
                      <TableRow key={student._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {student.school_info?.student_id || "N/A"}
                        </TableCell>
                        <TableCell>
                          {student.full_name || student.name}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {hasFaceData ? (
                            <Chip
                              label="Đã đăng ký khuôn mặt"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="Chưa đăng ký khuôn mặt"
                              color="warning"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Xóa khỏi lớp">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveStudent(student._id)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Chưa có sinh viên nào trong lớp
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenSessionDialog}
            >
              Tạo phiên điểm danh
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Tiết/Thời gian</TableCell>
                  <TableCell>Phòng</TableCell>
                  <TableCell>Ghi chú</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceSessions.length > 0 ? (
                  attendanceSessions.map((session, index) => {
                    // Log the session.room before rendering
                    console.log(
                      `[DEBUG] Rendering room for session ${session._id}:`,
                      session.room
                    );
                    return (
                      <TableRow key={session._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {new Date(session.date).toLocaleString("vi-VN", {
                            weekday: "long",
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {session.start_period && session.end_period ? (
                            <Box>
                              <Typography variant="body2">
                                Tiết {session.start_period}-{session.end_period}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {(() => {
                                  // Hiển thị thời gian bắt đầu từ API
                                  const startTime = session.start_time
                                    ? new Date(
                                        session.start_time
                                      ).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A";

                                  // Tính thời gian kết thúc dự kiến dựa trên lịch học, không phải thời gian kết thúc thực tế
                                  // Mỗi tiết thường kéo dài 50 phút
                                  let endTimeDate;
                                  if (session.start_time) {
                                    // Tính thời gian kết thúc dự kiến dựa trên số tiết
                                    const tietsCount =
                                      session.end_period -
                                      session.start_period +
                                      1;
                                    endTimeDate = new Date(session.start_time);
                                    endTimeDate.setMinutes(
                                      endTimeDate.getMinutes() + tietsCount * 50
                                    );
                                  }

                                  const endTime = endTimeDate
                                    ? endTimeDate.toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A";

                                  return `${startTime} - ${endTime}`;
                                })()}
                              </Typography>
                            </Box>
                          ) : session.start_time ? (
                            (() => {
                              // Hiển thị thời gian bắt đầu từ API
                              const startTime = new Date(
                                session.start_time
                              ).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              });

                              // Mặc định coi mỗi buổi học kéo dài 4 tiết (200 phút) nếu không có thông tin tiết
                              const endTimeDate = new Date(session.start_time);
                              endTimeDate.setMinutes(
                                endTimeDate.getMinutes() + 200
                              );
                              const endTime = endTimeDate.toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" }
                              );

                              return `${startTime} - ${endTime}`;
                            })()
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {session.room ? (
                            <Tooltip title="Thông tin phòng học">
                              <Typography variant="body2">
                                {session.room.room_number || "Không xác định"} -{" "}
                                {session.room.building_id?.name ||
                                  "Không xác định"}{" "}
                                -{" "}
                                {session.room.building_id?.campus_id?.name ||
                                  "Không xác định"}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Không có phòng
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {session.notes ? (
                            <Tooltip title={session.notes}>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: "150px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {session.notes}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {session.status === "completed" ? (
                            <Chip
                              label="Hoàn thành"
                              color="success"
                              size="small"
                            />
                          ) : session.status === "in_progress" ? (
                            <Chip
                              label="Đang diễn ra"
                              color="primary"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="Chưa bắt đầu"
                              color="default"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              color="primary"
                              onClick={() => handleStartSession(session._id)}
                              startIcon={
                                session.status === "completed" ? (
                                  <CheckCircle />
                                ) : (
                                  <PlayArrow />
                                )
                              }
                            >
                              {session.status === "completed"
                                ? "Xem"
                                : "Bắt đầu"}
                            </Button>
                            <Tooltip title="Chỉnh sửa thông tin">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  setSessionFormData({
                                    ...session,
                                    date: session.date.split("T")[0],
                                  });
                                  // Tải danh sách phòng học
                                  fetchRooms();
                                  setOpenSessionDialog(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Chưa có phiên điểm danh nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>

      {/* Dialog tạo/chỉnh sửa phiên điểm danh */}
      <Dialog
        open={openSessionDialog}
        onClose={handleCloseSessionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {sessionFormData._id
            ? "Chỉnh sửa phiên điểm danh"
            : "Tạo phiên điểm danh mới"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Ngày"
              name="date"
              type="date"
              value={sessionFormData.date}
              onChange={handleSessionFormChange}
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Tiết bắt đầu"
                  name="start_period"
                  type="number"
                  value={sessionFormData.start_period}
                  onChange={handleSessionFormChange}
                  InputProps={{ inputProps: { min: 1, max: 15 } }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Tiết kết thúc"
                  name="end_period"
                  type="number"
                  value={sessionFormData.end_period}
                  onChange={handleSessionFormChange}
                  InputProps={{
                    inputProps: {
                      min: sessionFormData.start_period || 1,
                      max: 15,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Thời gian bắt đầu"
                  name="start_time"
                  type="time"
                  value={sessionFormData.start_time}
                  onChange={handleSessionFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="Thời gian kết thúc"
                  name="end_time"
                  type="time"
                  value={sessionFormData.end_time}
                  onChange={handleSessionFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Phòng học</InputLabel>
                  <Select
                    name="room"
                    value={sessionFormData.room || ""}
                    onChange={handleSessionFormChange}
                    label="Phòng học"
                  >
                    <MenuItem value="">-- Chọn phòng học --</MenuItem>
                    {rooms &&
                      rooms.map((room) => (
                        <MenuItem key={room._id} value={room._id}>
                          {room.room_number || "Không xác định"} -{" "}
                          {room.building_id?.name || "Không xác định"} -{" "}
                          {room.building_id?.campus_id?.name ||
                            "Không xác định"}
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText>
                    Chọn phòng học với thông tin đầy đủ
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Ghi chú"
              name="notes"
              multiline
              rows={3}
              placeholder="Nội dung buổi học, yêu cầu đặc biệt, v.v..."
              value={sessionFormData.notes}
              onChange={handleSessionFormChange}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSessionDialog}>Hủy</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={
              sessionFormData._id ? handleUpdateSession : handleCreateSession
            }
          >
            {sessionFormData._id ? "Lưu thay đổi" : "Tạo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm sinh viên */}
      <Dialog
        open={openAddStudentDialog}
        onClose={handleCloseAddStudentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Thêm sinh viên vào lớp</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chọn lớp chính</InputLabel>
              <Select
                value={selectedMainClass}
                onChange={handleMainClassChange}
                label="Chọn lớp chính"
                disabled={isLoadingStudents}
              >
                <MenuItem value="">-- Chọn lớp chính --</MenuItem>
                {mainClasses.map((mainClass) => (
                  <MenuItem key={mainClass._id} value={mainClass._id}>
                    {mainClass.name} ({mainClass.class_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedMainClass && (
              <TextField
                fullWidth
                label="Tìm kiếm sinh viên"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                disabled={isLoadingStudents}
              />
            )}
          </Box>

          {isLoadingStudents ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: "auto", mb: 2 }}>
              {!selectedMainClass ? (
                <Alert severity="info">
                  Vui lòng chọn lớp chính để xem danh sách sinh viên
                </Alert>
              ) : availableStudents.length === 0 ? (
                <Alert severity="warning">
                  Không tìm thấy sinh viên có thể thêm vào lớp
                </Alert>
              ) : (
                <List>
                  {availableStudents
                    .filter(
                      (student) =>
                        student.full_name
                          ?.toLowerCase()
                          .includes(searchStudent.toLowerCase()) ||
                        student.school_info?.student_id
                          ?.toLowerCase()
                          .includes(searchStudent.toLowerCase()) ||
                        student.email
                          ?.toLowerCase()
                          .includes(searchStudent.toLowerCase())
                    )
                    .map((student) => (
                      <React.Fragment key={student._id}>
                        <ListItem>
                          <ListItemText
                            primary={student.full_name || student.name}
                            secondary={
                              <>
                                {student.school_info?.student_id ||
                                  "Chưa có mã SV"}{" "}
                                - {student.email}
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Checkbox
                              edge="end"
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => handleSelectStudent(student._id)}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                </List>
              )}
            </Box>
          )}

          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2">
              Đã chọn: {selectedStudents.length} sinh viên
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddStudentDialog}>Hủy</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddStudents}
            disabled={selectedStudents.length === 0 || isLoadingStudents}
          >
            Thêm vào lớp
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog chỉnh sửa lớp học */}
      <Dialog
        open={openEditClassDialog}
        onClose={handleCloseEditClassDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
        >
          <Edit sx={{ verticalAlign: "middle", mr: 1 }} />
          Chỉnh sửa thông tin lớp học
        </DialogTitle>
        <DialogContent dividers>
          {editClassData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tên lớp"
                  name="class_name"
                  value={editClassData.class_name}
                  onChange={handleEditClassChange}
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
                  value={editClassData.class_code}
                  onChange={handleEditClassChange}
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
                    value={editClassData.subject_id}
                    onChange={handleEditClassChange}
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
                    value={editClassData.semester_id}
                    onChange={handleEditClassChange}
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
                    value={editClassData.main_class_id}
                    onChange={handleEditClassChange}
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
                  value={editClassData.total_sessions}
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
                  value={editClassData.course_start_date}
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
                  label="Ngày kết thúc khóa học"
                  name="course_end_date"
                  value={editClassData.course_end_date}
                  onChange={handleEditClassChange}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Chọn phòng học */}
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: "bold", mt: 2 }}
                >
                  <Room sx={{ verticalAlign: "middle", mr: 1 }} />
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
                    value={editClassData.room_id}
                    onChange={handleEditClassChange}
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
                        handleScheduleChange(
                          index,
                          "start_time",
                          e.target.value
                        )
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
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseEditClassDialog}
            disabled={isSubmittingEdit}
          >
            Hủy
          </Button>
          <Button
            onClick={handleUpdateClass}
            variant="contained"
            color="primary"
            disabled={isSubmittingEdit}
            startIcon={
              isSubmittingEdit ? <CircularProgress size={20} /> : <Edit />
            }
          >
            {isSubmittingEdit ? "Đang cập nhật..." : "Cập nhật lớp học"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherClassDetailPage;
