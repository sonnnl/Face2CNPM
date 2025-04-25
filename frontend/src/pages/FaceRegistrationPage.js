import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Camera,
  Check,
  Face,
  Info,
  ViewArray,
  SaveAlt,
  Error,
  CheckCircle,
  ArrowBack,
  Help,
  CameraAlt,
  Person,
} from "@mui/icons-material";
import { getCurrentUser } from "../redux/slices/authSlice";
import { loadModels, detectFace } from "../utils/faceUtils";

// Lazy load Webcam để giảm kích thước ban đầu
const Webcam = lazy(() => import("react-webcam"));

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const FaceRegistrationPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [detectedFace, setDetectedFace] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Kiểm tra xem user đã đăng ký khuôn mặt chưa
  useEffect(() => {
    if (user?.face_registered) {
      enqueueSnackbar("Bạn đã đăng ký khuôn mặt trước đó", {
        variant: "info",
      });
    }
  }, [user, enqueueSnackbar]);

  // Load các model nhận diện khuôn mặt khi cần thiết (chỉ khi đến bước chụp ảnh)
  useEffect(() => {
    const initModels = async () => {
      if (activeStep === 1 && !modelsLoaded) {
        try {
          setIsLoading(true);
          await loadModels();
          setModelsLoaded(true);
          enqueueSnackbar("Đã tải mô hình nhận diện khuôn mặt", {
            variant: "success",
          });
        } catch (error) {
          console.error("Lỗi khi tải mô hình:", error);
          setError(
            "Không thể tải mô hình nhận diện khuôn mặt. Vui lòng tải lại trang."
          );
          enqueueSnackbar("Lỗi khi tải mô hình nhận diện", {
            variant: "error",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    initModels();
  }, [activeStep, modelsLoaded, enqueueSnackbar]);

  // Kiểm tra camera đã sẵn sàng chưa
  useEffect(() => {
    if (webcamRef.current?.video?.readyState === 4) {
      setIsCameraReady(true);
    }
  }, [webcamRef.current?.video?.readyState]);

  // Xử lý chuyển bước
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Chụp và phát hiện khuôn mặt
  const captureImage = async () => {
    if (!webcamRef.current || !isCameraReady) {
      enqueueSnackbar("Camera chưa sẵn sàng, vui lòng thử lại", {
        variant: "warning",
      });
      return;
    }

    try {
      setIsProcessing(true);
      // Chụp ảnh
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        enqueueSnackbar("Không thể chụp ảnh, vui lòng thử lại", {
          variant: "error",
        });
        setIsProcessing(false);
        return;
      }

      // Phát hiện khuôn mặt
      const detections = await detectFace(imageSrc);

      if (!detections) {
        enqueueSnackbar(
          "Không phát hiện được khuôn mặt, vui lòng thử lại và đảm bảo khuôn mặt của bạn nằm trong khung hình",
          { variant: "warning" }
        );
        setIsProcessing(false);
        return;
      }

      // Lưu ảnh và thông tin khuôn mặt
      setDetectedFace(detections);
      setCapturedImages((prev) => [
        ...prev,
        { img: imageSrc, descriptor: Array.from(detections.descriptor) },
      ]);

      enqueueSnackbar(`Đã chụp ảnh ${capturedImages.length + 1}/5`, {
        variant: "success",
      });

      // Nếu đã đủ 5 ảnh thì chuyển bước tiếp theo
      if (capturedImages.length + 1 >= 5) {
        handleNext();
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi chụp ảnh", { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Đăng ký khuôn mặt lên server
  const registerFace = async () => {
    try {
      setIsProcessing(true);

      // Chuẩn bị dữ liệu để gửi lên server
      const faceData = {
        descriptors: capturedImages.map((img) => img.descriptor),
        images: capturedImages.map((img) => img.img),
      };

      // Gửi request đăng ký khuôn mặt
      const response = await axios.post(
        `${API_URL}/face-recognition/register`,
        faceData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        enqueueSnackbar("Đăng ký khuôn mặt thành công", {
          variant: "success",
        });
        setSuccess(true);
        handleNext();

        // Cập nhật thông tin user
        dispatch(getCurrentUser());
      } else {
        setError("Không thể đăng ký khuôn mặt. Vui lòng thử lại.");
        enqueueSnackbar("Đăng ký khuôn mặt thất bại", { variant: "error" });
      }
    } catch (error) {
      console.error("Lỗi khi đăng ký khuôn mặt:", error);
      setError(
        error.response?.data?.message ||
          "Không thể đăng ký khuôn mặt. Vui lòng thử lại."
      );
      enqueueSnackbar("Đăng ký khuôn mặt thất bại", { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset lại quá trình
  const handleReset = () => {
    setCapturedImages([]);
    setDetectedFace(null);
    setActiveStep(0);
    setError("");
    setSuccess(false);
  };

  // Quay lại trang danh sách lớp
  const navigateToClasses = () => {
    navigate("/student/classes");
  };

  // Các bước đăng ký khuôn mặt
  const steps = [
    {
      label: "Chuẩn bị",
      description: "Chuẩn bị camera và kiểm tra kết nối",
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vui lòng đảm bảo bạn đang ở trong môi trường có ánh sáng tốt và
            camera hoạt động bình thường.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Hướng dẫn
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Info fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Đứng ở nơi có ánh sáng tốt, nhìn thẳng vào camera" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Không đeo kính, mũ hoặc khẩu trang khi đăng ký" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Giữ khuôn mặt chiếm khoảng 70% khung hình" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Bạn sẽ cần chụp 5 ảnh ở các góc độ khác nhau" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Trạng thái
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {activeStep >= 1 ? (
                          modelsLoaded ? (
                            <Check color="success" />
                          ) : (
                            <CircularProgress size={20} />
                          )
                        ) : (
                          <Info color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="Tải mô hình nhận diện"
                        secondary={
                          activeStep >= 1
                            ? modelsLoaded
                              ? "Đã tải xong"
                              : "Đang tải, vui lòng đợi..."
                            : "Sẽ tải khi bắt đầu chụp ảnh"
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {isCameraReady ? (
                          <Check color="success" />
                        ) : (
                          <CircularProgress size={20} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="Kiểm tra camera"
                        secondary={
                          isCameraReady
                            ? "Camera đã sẵn sàng"
                            : "Đang kết nối với camera..."
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, textAlign: "right" }}>
            <Button
              variant="outlined"
              onClick={() => setShowHelpDialog(true)}
              sx={{ mr: 1 }}
            >
              Xem hướng dẫn chi tiết
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isCameraReady}
            >
              Tiếp tục
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: "Chụp ảnh khuôn mặt",
      description: "Chụp 5 ảnh khuôn mặt để đăng ký",
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vui lòng chụp 5 ảnh khuôn mặt ở các góc độ khác nhau (nhìn thẳng,
            nghiêng trái, nghiêng phải, hơi ngước lên, hơi cúi xuống).
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ position: "relative", width: "100%" }}>
                <Suspense
                  fallback={
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: 300,
                      }}
                    >
                      <CircularProgress />
                      <Typography sx={{ ml: 2 }}>Đang tải camera...</Typography>
                    </Box>
                  }
                >
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: "user",
                    }}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                </Suspense>
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 1,
                  }}
                />
              </Box>
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CameraAlt />}
                  onClick={captureImage}
                  disabled={
                    !isCameraReady ||
                    isProcessing ||
                    capturedImages.length >= 5 ||
                    !modelsLoaded
                  }
                >
                  {isProcessing ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Đang xử lý...
                    </>
                  ) : !modelsLoaded ? (
                    "Đang tải mô hình..."
                  ) : (
                    "Chụp ảnh"
                  )}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ảnh đã chụp ({capturedImages.length}/5)
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      maxHeight: 320,
                      overflow: "auto",
                    }}
                  >
                    {capturedImages.length > 0 ? (
                      capturedImages.map((img, index) => (
                        <Box
                          key={index}
                          sx={{
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={img.img}
                            alt={`Ảnh ${index + 1}`}
                            style={{ width: "100%" }}
                          />
                        </Box>
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ textAlign: "center", py: 2 }}
                      >
                        Chưa có ảnh nào
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
            <Button onClick={handleBack}>Quay lại</Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={capturedImages.length < 5}
            >
              Tiếp tục
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: "Xác nhận và hoàn tất",
      description: "Xác nhận thông tin và hoàn tất đăng ký",
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vui lòng xem lại thông tin và ảnh đã chụp trước khi hoàn tất đăng
            ký.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thông tin đăng ký
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Person />
                      </ListItemIcon>
                      <ListItemText
                        primary="Họ và tên"
                        secondary={user?.full_name || "N/A"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Face />
                      </ListItemIcon>
                      <ListItemText
                        primary="Số ảnh đã chụp"
                        secondary={`${capturedImages.length} ảnh`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Xem trước ảnh
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: 1,
                    }}
                  >
                    {capturedImages.map((img, index) => (
                      <Box
                        key={index}
                        sx={{
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={img.img}
                          alt={`Ảnh ${index + 1}`}
                          style={{ width: "100%" }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
            <Button onClick={handleBack}>Quay lại</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={registerFace}
              disabled={isProcessing || capturedImages.length < 5}
              startIcon={
                isProcessing ? <CircularProgress size={20} /> : <SaveAlt />
              }
            >
              {isProcessing ? "Đang xử lý..." : "Hoàn tất đăng ký"}
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: "Hoàn thành",
      description: "Đăng ký khuôn mặt thành công",
      content: (
        <Box sx={{ textAlign: "center", py: 3 }}>
          {success ? (
            <>
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Đăng ký khuôn mặt thành công!
              </Typography>
              <Typography variant="body1" paragraph>
                Từ giờ bạn có thể sử dụng tính năng điểm danh bằng khuôn mặt.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={navigateToClasses}
                sx={{ mt: 2 }}
              >
                Quay lại danh sách lớp
              </Button>
            </>
          ) : (
            <>
              <Error color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Đã xảy ra lỗi!
              </Typography>
              <Typography variant="body1" paragraph>
                {error || "Không thể đăng ký khuôn mặt. Vui lòng thử lại."}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleReset}
                sx={{ mt: 2 }}
              >
                Thử lại
              </Button>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/student/classes")}
          sx={{ mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography variant="h4" gutterBottom>
          Đăng ký khuôn mặt
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Đăng ký khuôn mặt của bạn để sử dụng tính năng điểm danh tự động
        </Typography>
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          maxWidth: 1200,
          mx: "auto",
          overflow: "hidden",
        }}
      >
        {isLoading && activeStep === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Đang tải...
            </Typography>
          </Box>
        ) : (
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="subtitle1">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {step.description}
                  </Typography>
                  {step.content}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      {/* Dialog hướng dẫn chi tiết */}
      <Dialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Hướng dẫn đăng ký khuôn mặt chi tiết</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Các bước đăng ký khuôn mặt:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Check />
              </ListItemIcon>
              <ListItemText
                primary="Bước 1: Chuẩn bị"
                secondary="Đảm bảo bạn đang ở nơi có ánh sáng tốt và camera hoạt động bình thường."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Camera />
              </ListItemIcon>
              <ListItemText
                primary="Bước 2: Chụp ảnh khuôn mặt"
                secondary="Chụp 5 ảnh khuôn mặt ở các góc độ khác nhau."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ViewArray />
              </ListItemIcon>
              <ListItemText
                primary="Bước 3: Xác nhận thông tin"
                secondary="Xem lại thông tin và ảnh đã chụp."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SaveAlt />
              </ListItemIcon>
              <ListItemText
                primary="Bước 4: Hoàn tất đăng ký"
                secondary="Hoàn tất quá trình đăng ký khuôn mặt."
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Lưu ý khi chụp ảnh:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText
                primary="Ánh sáng"
                secondary="Đảm bảo khuôn mặt được chiếu sáng tốt, tránh ngược sáng."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText
                primary="Góc độ"
                secondary="Chụp ở các góc độ khác nhau: nhìn thẳng, nghiêng trái, nghiêng phải, hơi ngước lên, hơi cúi xuống."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText
                primary="Phụ kiện"
                secondary="Không đeo kính, mũ, khẩu trang hoặc bất kỳ vật che khuôn mặt nào."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText
                primary="Khoảng cách"
                secondary="Giữ khuôn mặt ở khoảng cách vừa phải, chiếm khoảng 70% khung hình."
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelpDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceRegistrationPage;
