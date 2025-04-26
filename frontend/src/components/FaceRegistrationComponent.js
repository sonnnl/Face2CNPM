import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSnackbar } from "notistack";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Camera, CheckCircle, Error } from "@mui/icons-material";
import { loadModels, detectFace } from "../utils/faceUtils";
import * as faceapi from "face-api.js";

// Lazy load Webcam
const Webcam = lazy(() => import("react-webcam"));

const FaceRegistrationComponent = ({ onFaceDataCapture, maxImages = 3 }) => {
  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showLandmarks, setShowLandmarks] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const [detectionInterval, setDetectionInterval] = useState(null);

  // Load face recognition models
  useEffect(() => {
    const initModels = async () => {
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
    };

    initModels();
  }, [enqueueSnackbar]);

  // Check if camera is ready
  useEffect(() => {
    if (webcamRef.current?.video?.readyState === 4) {
      setIsCameraReady(true);
    }
  }, [webcamRef.current?.video?.readyState]);

  // Run face detection in real-time
  useEffect(() => {
    let intervalId;

    const runFaceDetection = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        canvasRef.current &&
        modelsLoaded &&
        isCameraReady &&
        showLandmarks &&
        !isProcessing
      ) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;

        // Match dimensions
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        try {
          // Kiểm tra video đã sẵn sàng chưa
          if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            // Video chưa sẵn sàng, bỏ qua detection ở lần này
            return;
          }

          // Detect face with landmarks
          const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

          // Clear canvas
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (detections) {
            // Kiểm tra tính hợp lệ của box
            const { box } = detections.detection;
            if (
              !box ||
              box.x === null ||
              box.y === null ||
              box.width === null ||
              box.height === null ||
              isNaN(box.x) ||
              isNaN(box.y) ||
              isNaN(box.width) ||
              isNaN(box.height) ||
              box.width <= 0 ||
              box.height <= 0
            ) {
              // Box không hợp lệ, bỏ qua
              console.warn("Phát hiện box không hợp lệ:", box);
              return;
            }

            // Resize detection results
            const resizedDetections = faceapi.resizeResults(
              detections,
              displaySize
            );

            // Draw detection results
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          }
        } catch (error) {
          console.error("Error detecting face in real-time:", error);
          // Không hiển thị lỗi cho người dùng để tránh gây khó chịu
          // Chỉ ghi log để debug
        }
      }
    };

    if (modelsLoaded && isCameraReady && showLandmarks) {
      // Sử dụng requestAnimationFrame thay vì setInterval để tối ưu hóa hiệu suất
      let animationFrameId;
      const runDetectionLoop = async () => {
        await runFaceDetection();
        animationFrameId = requestAnimationFrame(runDetectionLoop);
      };

      animationFrameId = requestAnimationFrame(runDetectionLoop);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [modelsLoaded, isCameraReady, showLandmarks, isProcessing]);

  // Capture and detect face
  const captureImage = async () => {
    if (!webcamRef.current || !isCameraReady) {
      enqueueSnackbar("Camera chưa sẵn sàng, vui lòng thử lại", {
        variant: "warning",
      });
      return;
    }

    try {
      setIsProcessing(true);
      // Capture image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        enqueueSnackbar("Không thể chụp ảnh, vui lòng thử lại", {
          variant: "error",
        });
        setIsProcessing(false);
        return;
      }

      // Detect face
      const detections = await detectFace(imageSrc);

      if (!detections) {
        enqueueSnackbar(
          "Không phát hiện được khuôn mặt, vui lòng thử lại và đảm bảo khuôn mặt của bạn nằm trong khung hình",
          { variant: "warning" }
        );
        setIsProcessing(false);
        return;
      }

      // Save image and face info
      const newImage = {
        img: imageSrc,
        descriptor: Array.from(detections.descriptor),
      };

      setCapturedImages((prev) => [...prev, newImage]);

      enqueueSnackbar(`Đã chụp ảnh ${capturedImages.length + 1}/${maxImages}`, {
        variant: "success",
      });

      // If enough images, pass data to parent
      if (capturedImages.length + 1 >= maxImages) {
        onFaceDataCapture([...capturedImages, newImage]);
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi chụp ảnh", { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImages([]);
  };

  // Webcam config
  const videoConstraints = {
    width: 320,
    height: 320,
    facingMode: "user",
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Đăng ký khuôn mặt
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Vui lòng chụp {maxImages} ảnh khuôn mặt của bạn từ các góc khác nhau
            để hệ thống nhận diện tốt hơn.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Đã chụp: {capturedImages.length}/{maxImages} ảnh
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={showLandmarks}
                onChange={(e) => setShowLandmarks(e.target.checked)}
              />
            }
            label="Hiển thị landmark khuôn mặt"
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          {isLoading ? (
            <CircularProgress />
          ) : (
            <Suspense fallback={<CircularProgress />}>
              <Box
                sx={{
                  border: "2px solid #ddd",
                  borderRadius: 2,
                  overflow: "hidden",
                  width: 320,
                  height: 320,
                  position: "relative",
                }}
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  style={{ width: "100%", height: "100%" }}
                  onUserMedia={() => setIsCameraReady(true)}
                  width={320}
                  height={320}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                  width={320}
                  height={320}
                />
                {isProcessing && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    <CheckCircle
                      color="success"
                      sx={{ fontSize: 48, color: "#4caf50" }}
                    />
                  </Box>
                )}
              </Box>
            </Suspense>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            startIcon={<Camera />}
            disabled={
              isProcessing ||
              !modelsLoaded ||
              !isCameraReady ||
              capturedImages.length >= maxImages
            }
            onClick={captureImage}
          >
            {isProcessing ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Chụp ảnh"
            )}
          </Button>

          <Button
            variant="outlined"
            onClick={resetCapture}
            disabled={isProcessing || capturedImages.length === 0}
          >
            Chụp lại
          </Button>
        </Box>

        {capturedImages.length > 0 && (
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {capturedImages.map((img, index) => (
              <Box
                key={index}
                component="img"
                src={img.img}
                alt={`Captured ${index + 1}`}
                sx={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceRegistrationComponent;
