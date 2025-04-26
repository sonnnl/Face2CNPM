import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "../utils/axios";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { Person, Edit } from "@mui/icons-material";
import { setCredentials } from "../redux/slices/authSlice";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    student_id: "",
    teacher_code: "",
    department: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.contact?.phone || "",
        student_id: user.school_info?.student_id || "",
        teacher_code: user.school_info?.teacher_code || "",
        department: user.school_info?.department || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const updateData = {
        full_name: formData.full_name,
        contact: {
          phone: formData.phone,
        },
        school_info: {
          student_id: formData.student_id,
          teacher_code: formData.teacher_code,
          department: formData.department,
        },
      };

      const response = await axios.put(
        `${API_URL}/users/${user._id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Cập nhật thông tin người dùng trong redux store
      dispatch(
        setCredentials({
          user: response.data.data,
          token,
        })
      );

      setSuccessMessage("Cập nhật thông tin thành công");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật thông tin");
      console.error("Error updating profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Tính năng đặt lại mật khẩu sẽ được triển khai sau
    setSuccessMessage("Chức năng đặt lại mật khẩu đang được phát triển");
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hồ sơ cá nhân
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessMessage("")} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              mr: 2,
            }}
          >
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h5">{user?.full_name}</Typography>
            <Typography color="textSecondary">
              {user?.role === "admin"
                ? "Quản trị viên"
                : user?.role === "teacher"
                ? "Giảng viên"
                : "Sinh viên"}
            </Typography>
          </Box>
          {!isEditing && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              sx={{ ml: "auto" }}
              onClick={() => setIsEditing(true)}
            >
              Chỉnh sửa
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                disabled
                variant="filled"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            {user?.role === "student" && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mã số sinh viên (MSSV)"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant={isEditing ? "outlined" : "filled"}
                  />
                </Grid>
              </>
            )}
            {user?.role === "teacher" && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mã giảng viên"
                  name="teacher_code"
                  value={formData.teacher_code}
                  onChange={handleChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Khoa/Phòng ban"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>

            {isEditing && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      // Đặt lại giá trị form
                      setFormData({
                        full_name: user.full_name || "",
                        email: user.email || "",
                        phone: user.contact?.phone || "",
                        student_id: user.school_info?.student_id || "",
                        teacher_code: user.school_info?.teacher_code || "",
                        department: user.school_info?.department || "",
                      });
                    }}
                    disabled={isLoading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bảo mật
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Button
          variant="outlined"
          color="primary"
          onClick={handleResetPassword}
          sx={{ mt: 1 }}
        >
          Đổi mật khẩu
        </Button>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
