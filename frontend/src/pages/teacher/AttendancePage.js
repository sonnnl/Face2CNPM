import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
} from "@mui/material";
import {
  CameraAlt,
  Check,
  Close,
  Edit,
  Refresh,
  Save,
  VerifiedUser,
  HourglassEmpty,
} from "@mui/icons-material";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import {
  getClassFaceFeatures,
  verifyAttendance,
  manualAttendance,
  setModelLoaded,
  setCameraReady,
  setDetectedFaces,
  setRecognizedStudents,
  clearRecognitionState,
} from "../../redux/slices/faceRecognitionSlice";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const AttendancePage = () => {
  const { classId, sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [intervalId, setIntervalId] = useState(null);
  const [showLandmark, setShowLandmark] = useState(true);
  const [landmarkIntervalId, setLandmarkIntervalId] = useState(null);
  const [cameraMode, setCameraMode] = useState("face_recognition");

  const { token } = useSelector((state) => state.auth);
  const {
    isModelLoaded,
    isCameraReady,
    detectedFaces,
    recognizedStudents,
    classStudents,
    isProcessing,
    error,
  } = useSelector((state) => state.faceRecognition);

  const [classInfo, setClassInfo] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    status: "present",
    note: "",
  });

  // Các hằng số cấu hình
  const RECOGNITION_THRESHOLD = 0.4; // Giảm ngưỡng nhận diện để dễ nhận diện hơn
  const DETECTION_THRESHOLD = 0.3; // Giảm ngưỡng phát hiện khuôn mặt
  const CONFIDENCE_THRESHOLD = 0.5; // Giảm ngưỡng độ tin cậy để điểm danh
  const AUTO_DETECT_INTERVAL = 1000; // Thời gian giữa các lần phát hiện (ms)
  const ENABLE_DEBUG_LOGS = true; // Bật/tắt log gỡ lỗi

  // Thêm state mới để theo dõi số lần thử lại camera
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);

  // Thêm state theo dõi interval phát hiện landmarks
  const [landmarkDetectionInterval, setLandmarkDetectionInterval] =
    useState(null);

  // Load class info, session info và models
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Bắt đầu tải dữ liệu và models song song
        const loadModelsPromise = !isModelLoaded
          ? loadFaceRecognitionModels()
          : Promise.resolve(true);

        // Lấy thông tin lớp học
        const classPromise = axios.get(
          `${API_URL}/classes/teaching/${classId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Lấy thông tin phiên điểm danh
        const sessionPromise = axios.get(
          `${API_URL}/attendance/sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Lấy danh sách điểm danh
        const logsPromise = axios.get(
          `${API_URL}/attendance/logs/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Chờ tất cả API calls hoàn thành
        const [classResponse, sessionResponse, logsResponse] =
          await Promise.all([classPromise, sessionPromise, logsPromise]);

        setClassInfo(classResponse.data.data);
        setSessionInfo(sessionResponse.data.data);
        setAttendanceLogs(logsResponse.data.data);

        // Lấy đặc trưng khuôn mặt của sinh viên trong lớp
        console.log(
          "[DEBUG] Bắt đầu lấy đặc trưng khuôn mặt của sinh viên, classId:",
          classId
        );

        try {
          // Gọi API trực tiếp để kiểm tra
          const faceDataResponse = await axios.get(
            `${API_URL}/face-recognition/class-features/${classId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log("[DEBUG] API response raw:", faceDataResponse);
          console.log("[DEBUG] API response data:", faceDataResponse.data);

          // Vẫn sử dụng redux dispatch để đảm bảo tính nhất quán
          const faceFeatureResult = await dispatch(
            getClassFaceFeatures(classId)
          ).unwrap();

          // Log toàn bộ result để debug
          console.log("[DEBUG] Redux unwrapped result:", faceFeatureResult);

          // Kiểm tra xem có dữ liệu trả về không
          if (faceFeatureResult) {
            // Log dữ liệu để debug
            console.log("[DEBUG] Bắt đầu phân tích dữ liệu khuôn mặt");
            console.log(
              "[DEBUG] faceFeatureResult structure:",
              JSON.stringify(faceFeatureResult, null, 2)
            );

            let studentsData = null;

            // Kiểm tra các cấu trúc dữ liệu có thể có
            if (Array.isArray(faceFeatureResult)) {
              studentsData = faceFeatureResult;
              console.log(
                `[DEBUG] Nhận được dữ liệu khuôn mặt dạng mảng: ${studentsData.length} sinh viên`
              );
            } else if (
              faceFeatureResult.data &&
              Array.isArray(faceFeatureResult.data)
            ) {
              studentsData = faceFeatureResult.data;
              console.log(
                `[DEBUG] Nhận được dữ liệu khuôn mặt từ faceFeatureResult.data: ${studentsData.length} sinh viên`
              );
            } else if (
              faceFeatureResult.students &&
              Array.isArray(faceFeatureResult.students)
            ) {
              studentsData = faceFeatureResult.students;
              console.log(
                `[DEBUG] Nhận được dữ liệu khuôn mặt từ faceFeatureResult.students: ${studentsData.length} sinh viên`
              );
            }

            if (studentsData && studentsData.length > 0) {
              console.log(
                `[DEBUG] Phân tích dữ liệu khuôn mặt của ${studentsData.length} sinh viên`
              );

              // Kiểm tra chi tiết dữ liệu khuôn mặt
              let validDescriptorsCount = 0;
              let invalidDescriptorsCount = 0;

              studentsData.forEach((student) => {
                console.log(
                  `[DEBUG] Kiểm tra sinh viên: ${
                    student.full_name || "Unknown"
                  }, ID: ${student._id}`
                );
                console.log(`[DEBUG] Cấu trúc dữ liệu sinh viên:`, student);

                // Kiểm tra nếu có faceFeatures
                if (student.faceFeatures) {
                  console.log(`[DEBUG] Sinh viên có dữ liệu faceFeatures`);

                  // Kiểm tra nếu có descriptors
                  const hasDescriptors =
                    student.faceFeatures &&
                    student.faceFeatures.descriptors &&
                    Array.isArray(student.faceFeatures.descriptors) &&
                    student.faceFeatures.descriptors.length > 0;

                  if (hasDescriptors) {
                    console.log(
                      `[DEBUG] Sinh viên có ${student.faceFeatures.descriptors.length} nhóm descriptors`
                    );

                    // Đếm số descriptor hợp lệ
                    let validDescriptorsInStudent = 0;

                    student.faceFeatures.descriptors.forEach(
                      (group, groupIndex) => {
                        if (Array.isArray(group)) {
                          group.forEach((descriptor, descIndex) => {
                            if (
                              Array.isArray(descriptor) &&
                              descriptor.length === 128
                            ) {
                              validDescriptorsInStudent++;
                            }
                          });
                        }
                      }
                    );

                    if (validDescriptorsInStudent > 0) {
                      validDescriptorsCount++;
                      console.log(
                        `[DEBUG] Sinh viên ${student.full_name} có ${validDescriptorsInStudent} descriptor hợp lệ`
                      );
                    } else {
                      invalidDescriptorsCount++;
                      console.log(
                        `[DEBUG] Sinh viên ${student.full_name} không có descriptor hợp lệ`
                      );
                    }
                  } else {
                    invalidDescriptorsCount++;
                    console.log(
                      `[DEBUG] Sinh viên ${student.full_name} không có descriptors`
                    );
                  }
                } else {
                  // Kiểm tra nếu có faceDescriptors (cấu trúc cũ)
                  const hasOldDescriptors =
                    student.faceDescriptors &&
                    Array.isArray(student.faceDescriptors) &&
                    student.faceDescriptors.length > 0;

                  if (hasOldDescriptors) {
                    console.log(
                      `[DEBUG] Sinh viên có ${student.faceDescriptors.length} descriptors (dạng cũ)`
                    );
                    console.log(
                      `[DEBUG] Chi tiết faceDescriptors:`,
                      JSON.stringify(student.faceDescriptors, null, 2)
                    );

                    // Thử các cách khác nhau để lấy descriptor
                    if (typeof student.faceDescriptors[0] === "object") {
                      // Nếu là object (không phải mảng), có thể nó là object có chứa descriptor
                      console.log(
                        `[DEBUG] Descriptor là object:`,
                        student.faceDescriptors[0]
                      );

                      // Kiểm tra nếu descriptor nằm trong object.descriptors hoặc object.0
                      if (
                        student.faceDescriptors[0].descriptors &&
                        Array.isArray(student.faceDescriptors[0].descriptors)
                      ) {
                        console.log(
                          `[DEBUG] Tìm thấy descriptors trong object.descriptors`
                        );
                        // Sử dụng descriptors trong object
                        const flatDescriptors =
                          student.faceDescriptors[0].descriptors;

                        const validOldDescriptors = flatDescriptors.filter(
                          (desc) => Array.isArray(desc) && desc.length === 128
                        ).length;

                        if (validOldDescriptors > 0) {
                          validDescriptorsCount++;
                          console.log(
                            `[DEBUG] Sinh viên ${student.full_name} có ${validOldDescriptors} descriptor hợp lệ trong object.descriptors`
                          );
                        }
                      } else {
                        // Duyệt tất cả các thuộc tính của object để tìm mảng
                        const foundArrays = [];
                        Object.keys(student.faceDescriptors[0]).forEach(
                          (key) => {
                            const value = student.faceDescriptors[0][key];
                            if (Array.isArray(value)) {
                              console.log(
                                `[DEBUG] Tìm thấy mảng trong thuộc tính ${key}, độ dài: ${value.length}`
                              );
                              foundArrays.push(value);
                            }
                          }
                        );

                        // Kiểm tra các mảng tìm được
                        if (foundArrays.length > 0) {
                          // Ưu tiên mảng có 128 phần tử
                          const potentialDescriptors = foundArrays.filter(
                            (arr) => arr.length === 128
                          );
                          if (potentialDescriptors.length > 0) {
                            validDescriptorsCount++;
                            console.log(
                              `[DEBUG] Sinh viên ${student.full_name} có descriptor hợp lệ trong thuộc tính object`
                            );
                          }
                        }
                      }
                    } else {
                      // Xử lý thông thường
                      const validOldDescriptors =
                        student.faceDescriptors.filter(
                          (desc) => Array.isArray(desc) && desc.length === 128
                        ).length;

                      if (validOldDescriptors > 0) {
                        validDescriptorsCount++;
                        console.log(
                          `[DEBUG] Sinh viên ${student.full_name} có ${validOldDescriptors} descriptor hợp lệ (dạng cũ)`
                        );
                      } else {
                        invalidDescriptorsCount++;
                        console.log(
                          `[DEBUG] Sinh viên ${student.full_name} không có descriptor hợp lệ (dạng cũ)`
                        );
                      }
                    }
                  } else {
                    invalidDescriptorsCount++;
                    console.log(
                      `[DEBUG] Sinh viên ${student.full_name} không có dữ liệu khuôn mặt`
                    );
                  }
                }
              });

              console.log(
                `[DEBUG] Tổng hợp: ${validDescriptorsCount} sinh viên có descriptor hợp lệ, ${invalidDescriptorsCount} sinh viên không có`
              );

              if (validDescriptorsCount === 0) {
                enqueueSnackbar(
                  "Không có sinh viên nào có dữ liệu khuôn mặt, vui lòng cập nhật dữ liệu",
                  {
                    variant: "warning",
                    autoHideDuration: 8000,
                  }
                );
              }
            } else {
              console.log("[DEBUG] Không nhận được dữ liệu khuôn mặt từ API");
              enqueueSnackbar("Không thể tải dữ liệu nhận diện khuôn mặt", {
                variant: "error",
              });
            }
          } else {
            console.log(
              "[DEBUG] Không nhận được dữ liệu khuôn mặt từ API (faceFeatureResult là null hoặc undefined)"
            );
            enqueueSnackbar("Không thể tải dữ liệu nhận diện khuôn mặt", {
              variant: "error",
            });
          }
        } catch (apiError) {
          console.error(
            "[DEBUG] Lỗi khi gọi API lấy dữ liệu khuôn mặt:",
            apiError
          );
          console.log(
            "[DEBUG] API error details:",
            apiError.response?.data || apiError.message
          );
          enqueueSnackbar(
            "Lỗi khi lấy dữ liệu khuôn mặt. Vui lòng kiểm tra API endpoint.",
            {
              variant: "error",
            }
          );
        }

        // Không chờ đợi model load xong mới hiển thị UI
        setIsLoading(false);

        // Model sẽ load song song
        await loadModelsPromise;

        // Thiết lập thời gian phát hiện ban đầu
        setLastDetectionTime(Date.now());
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Clean up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      // Dừng landmark interval nếu đang chạy
      if (landmarkIntervalId) {
        clearInterval(landmarkIntervalId);
      }

      // Dừng camera stream nếu đang chạy
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.srcObject
      ) {
        const tracks = webcamRef.current.video.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      dispatch(clearRecognitionState());

      // Reset các state theo dõi camera
      setCameraRetryCount(0);
      setLastDetectionTime(null);
    };
  }, [
    classId,
    sessionId,
    token,
    dispatch,
    enqueueSnackbar,
    isModelLoaded,
    intervalId,
    landmarkIntervalId,
  ]);

  // Hàm khởi tạo camera trực tiếp - nút duy nhất cho camera
  const initDirectCamera = async () => {
    try {
      // Tải model nhận diện và đảm bảo model đã sẵn sàng
      if (!isModelLoaded || !faceapi.nets.ssdMobilenetv1.isLoaded) {
        enqueueSnackbar("Đang tải các mô hình nhận diện...", {
          variant: "info",
        });
        const modelLoaded = await loadFaceRecognitionModels();

        if (!modelLoaded) {
          enqueueSnackbar("Không thể tải mô hình nhận diện, vui lòng thử lại", {
            variant: "error",
          });
          return;
        }
      }

      // Dừng stream cũ nếu có
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.srcObject
      ) {
        const tracks = webcamRef.current.video.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      // Truy cập camera trực tiếp thông qua MediaDevices API
      try {
        // Thêm tùy chọn camera với nhiều độ phân giải
        const constraints = {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "user",
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        };

        console.log(
          "[DEBUG] Đang yêu cầu truy cập camera với tùy chọn:",
          constraints
        );

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        console.log("Đã nhận được stream camera trực tiếp", stream.id);

        // Nếu đang sử dụng webcam component
        if (webcamRef.current && webcamRef.current.video) {
          webcamRef.current.video.srcObject = stream;

          // Kiểm tra stream đã hoạt động chưa
          webcamRef.current.video.onloadedmetadata = () => {
            webcamRef.current.video.play().catch((err) => {
              console.error("Lỗi khi play video webcam:", err);
            });
          };
        }
        // Hoặc nếu đang sử dụng video element
        else if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .catch((err) => console.error("Lỗi khi play video:", err));
          };
        }

        // Đánh dấu camera và model đã sẵn sàng
        dispatch(setModelLoaded(true));
        dispatch(setCameraReady(true));

        // Khởi động thời gian phát hiện ban đầu
        setLastDetectionTime(Date.now());

        enqueueSnackbar("Đã kết nối camera thành công", {
          variant: "success",
        });

        // Bật hiển thị landmark sau khi camera khởi động
        setTimeout(() => {
          setShowLandmark(true);
          startLandmarkDetection();
        }, 1000);

        // Đặt lại số lần thử camera
        setCameraRetryCount(0);

        return true;
      } catch (err) {
        console.error("Lỗi truy cập camera:", err);
        enqueueSnackbar(`Không thể truy cập camera: ${err.message}`, {
          variant: "error",
        });

        // Thử phương án thay thế nếu camera mặt trước thất bại
        if (cameraRetryCount < 2) {
          try {
            console.log("[DEBUG] Thử sử dụng camera phương án thay thế");
            const altStream = await navigator.mediaDevices.getUserMedia({
              video: true, // Chỉ yêu cầu bất kỳ camera nào có sẵn
              audio: false,
            });

            // Xử lý stream mới
            if (webcamRef.current && webcamRef.current.video) {
              webcamRef.current.video.srcObject = altStream;
            } else if (videoRef.current) {
              videoRef.current.srcObject = altStream;
              videoRef.current.onloadedmetadata = () => videoRef.current.play();
            }

            dispatch(setCameraReady(true));
            setLastDetectionTime(Date.now());
            enqueueSnackbar("Đã kết nối camera thay thế", {
              variant: "success",
            });
            return true;
          } catch (altErr) {
            console.error("Không thể sử dụng camera thay thế:", altErr);
          }
        }

        return false;
      }
    } catch (err) {
      console.error("Lỗi khi khởi tạo camera trực tiếp:", err);
      enqueueSnackbar(`Lỗi: ${err.message}`, { variant: "error" });
      return false;
    }
  };

  // Hàm bắt đầu phát hiện landmarks theo thời gian thực
  const startLandmarkDetection = () => {
    // Xóa interval cũ nếu có
    if (landmarkDetectionInterval) {
      clearInterval(landmarkDetectionInterval);
    }

    // Tạo interval mới để cập nhật landmarks mỗi 50ms
    const intervalId = setInterval(() => {
      if (cameraMode === "face_recognition" && showLandmark) {
        handleDetectFaces(true);
      }
    }, 50);

    setLandmarkDetectionInterval(intervalId);
  };

  // Hàm dừng phát hiện landmarks theo thời gian thực
  const stopLandmarkDetection = () => {
    if (landmarkDetectionInterval) {
      clearInterval(landmarkDetectionInterval);
      setLandmarkDetectionInterval(null);
    }
  };

  // Cập nhật useEffect để bắt đầu và dừng phát hiện landmarks khi camera hoặc chế độ thay đổi
  useEffect(() => {
    if (cameraMode === "face_recognition" && showLandmark) {
      startLandmarkDetection();
    } else {
      stopLandmarkDetection();
    }

    return () => {
      stopLandmarkDetection();
    };
  }, [cameraMode, showLandmark]);

  // Cập nhật useEffect cho việc toggle showLandmark
  useEffect(() => {
    if (showLandmark && cameraMode === "face_recognition") {
      startLandmarkDetection();
    } else {
      stopLandmarkDetection();
    }
  }, [showLandmark]);

  // Load các mô hình nhận diện khuôn mặt
  const loadFaceRecognitionModels = async () => {
    try {
      const MODEL_URL = "/models";
      console.log("Bắt đầu tải models từ:", MODEL_URL);

      // Thêm SsdMobilenetv1 vào danh sách models cần tải
      const modelPromises = [
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL), // Thêm model SSD MobileNet
      ];

      // Kiểm tra xem các models đã được tải chưa
      const modelStatuses = [
        faceapi.nets.tinyFaceDetector.isLoaded,
        faceapi.nets.faceLandmark68Net.isLoaded,
        faceapi.nets.faceRecognitionNet.isLoaded,
        faceapi.nets.ssdMobilenetv1.isLoaded, // Kiểm tra SSD MobileNet đã tải chưa
      ];

      if (modelStatuses.every((status) => status)) {
        console.log("Các models đã được tải từ trước");
        dispatch(setModelLoaded(true));
        return true;
      }

      await Promise.all(modelPromises);

      console.log("Đã tải xong models thành công");
      dispatch(setModelLoaded(true));
      enqueueSnackbar("Tải mô hình nhận diện thành công", {
        variant: "success",
      });
      return true;
    } catch (error) {
      console.error("Lỗi khi tải mô hình:", error);
      enqueueSnackbar("Không thể tải mô hình nhận diện", { variant: "error" });
      return false;
    }
  };

  // Hàm kiểm tra và đảm bảo camera hoạt động
  const ensureCameraIsWorking = () => {
    // Kiểm tra nếu camera chưa hoạt động và đã thử khởi động
    if (!isCameraReady && cameraRetryCount === 0) {
      console.log("[DEBUG] Camera chưa sẵn sàng, thử khởi động");
      setCameraRetryCount(1);
      initDirectCamera();
      return false;
    }

    // Kiểm tra stream của camera
    const videoElement = isAutoMode
      ? videoRef.current
      : webcamRef.current?.video;

    if (
      !videoElement ||
      !videoElement.srcObject ||
      videoElement.readyState !== 4
    ) {
      console.log(
        "[DEBUG] Video stream không hoạt động, thử khởi động lại camera"
      );
      if (cameraRetryCount < 3) {
        setCameraRetryCount((prev) => prev + 1);
        initDirectCamera();
        return false;
      }
    }

    return true;
  };

  // Xử lý phát hiện khuôn mặt
  const handleDetectFaces = async (landmarkOnly = false) => {
    if (cameraMode !== "face_recognition" || !faceapi || !canvasRef.current)
      return [];

    // Xác định video element hiện tại (từ webcam hoặc video trực tiếp)
    const videoElement = isAutoMode
      ? videoRef.current
      : webcamRef.current?.video;

    // Kiểm tra kỹ lưỡng video element
    if (!videoElement) {
      console.error("Không tìm thấy video element");
      return [];
    }

    // Kiểm tra video đã tải và sẵn sàng chưa
    if (videoElement.readyState !== 4) {
      console.log("Video chưa sẵn sàng, readyState =", videoElement.readyState);
      return [];
    }

    // Kiểm tra video có kích thước hợp lệ không
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      console.error(
        "Video kích thước không hợp lệ:",
        videoElement.videoWidth,
        "x",
        videoElement.videoHeight
      );
      return [];
    }

    const canvasElement = canvasRef.current;

    // Đặt kích thước canvas để khớp với video thực tế (không phải kích thước hiển thị)
    const displaySize = {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
    };

    // Cập nhật kích thước thực của canvas
    faceapi.matchDimensions(canvasElement, displaySize);

    try {
      // Phát hiện khuôn mặt với landmarks
      let detections = [];

      try {
        detections = await faceapi
          .detectAllFaces(
            videoElement,
            new faceapi.TinyFaceDetectorOptions({
              scoreThreshold: 0.3,
              inputSize: 320, // Thêm kích thước đầu vào rõ ràng
            })
          )
          .withFaceLandmarks();

        console.log(
          "[DEBUG] Phát hiện khuôn mặt với landmarks:",
          detections.length
        );
      } catch (error) {
        console.error("Lỗi khi phát hiện khuôn mặt với landmarks:", error);
        return [];
      }

      // Thêm descriptors nếu không phải chỉ vẽ landmarks
      let finalDetections = detections;

      if (!landmarkOnly && detections.length > 0) {
        // Sử dụng cả hai phương pháp phát hiện để tăng khả năng nhận diện
        try {
          // Sử dụng TinyFaceDetector có kích thước rõ ràng
          finalDetections = await faceapi
            .detectAllFaces(
              videoElement,
              new faceapi.TinyFaceDetectorOptions({
                scoreThreshold: 0.3,
                inputSize: 320,
              })
            )
            .withFaceLandmarks()
            .withFaceDescriptors();

          console.log(
            "[DEBUG] Phát hiện với TinyFaceDetector:",
            finalDetections.length
          );

          // Nếu không có kết quả, thử sử dụng SSD MobileNet
          if (
            (finalDetections.length === 0 || !finalDetections[0].descriptor) &&
            faceapi.nets.ssdMobilenetv1.isLoaded
          ) {
            finalDetections = await faceapi
              .detectAllFaces(
                videoElement,
                new faceapi.SsdMobilenetv1Options({
                  minConfidence: 0.3,
                })
              )
              .withFaceLandmarks()
              .withFaceDescriptors();

            console.log(
              "[DEBUG] Phát hiện với SsdMobilenetv1:",
              finalDetections.length
            );
          }
        } catch (error) {
          console.error("Lỗi khi lấy mô tả khuôn mặt:", error);
          // Quay lại chỉ sử dụng landmarks nếu có lỗi
          finalDetections = detections;
        }
      }

      // Kiểm tra xem finalDetections có hợp lệ không
      if (!finalDetections || finalDetections.length === 0) {
        console.log("[DEBUG] Không phát hiện được khuôn mặt");
        // Xóa canvas
        const ctx = canvasElement.getContext("2d");
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        return [];
      }

      // Đảm bảo mỗi detection có box hợp lệ
      finalDetections = finalDetections.filter((det) => {
        if (
          !det.detection ||
          !det.detection.box ||
          det.detection.box._x === null ||
          det.detection.box._y === null
        ) {
          console.log("[DEBUG] Bỏ qua detection có box không hợp lệ");
          return false;
        }
        return true;
      });

      if (finalDetections.length === 0) {
        console.log(
          "[DEBUG] Không còn detection nào sau khi lọc box không hợp lệ"
        );
        const ctx = canvasElement.getContext("2d");
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        return [];
      }

      // Điều chỉnh kết quả theo kích thước hiển thị
      const resizedDetections = faceapi.resizeResults(finalDetections, {
        width: canvasElement.width,
        height: canvasElement.height,
      });

      // Xóa canvas trước khi vẽ mới
      const ctx = canvasElement.getContext("2d");
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Vẽ các landmarks nếu showLandmark được bật
      if (showLandmark && resizedDetections.length > 0) {
        resizedDetections.forEach((detection) => {
          // Kiểm tra detection có hợp lệ không
          if (!detection.detection || !detection.detection._box) {
            return;
          }

          const landmarks = detection.landmarks;
          if (!landmarks || !landmarks.positions) {
            return;
          }

          const points = landmarks.positions;

          // Vẽ hộp giới hạn khuôn mặt
          const { _box: box } = detection.detection;
          if (
            box &&
            box._x != null &&
            box._y != null &&
            box._width != null &&
            box._height != null
          ) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(box._x, box._y, box._width, box._height);

            // Hiển thị thông tin bên dưới hộp giới hạn
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "16px Arial";
            ctx.fillText(
              "Đã phát hiện khuôn mặt",
              box._x,
              box._y + box._height + 20
            );

            // Tạo viền cho chữ
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 0.5;
            ctx.strokeText(
              "Đã phát hiện khuôn mặt",
              box._x,
              box._y + box._height + 20
            );
          }

          // Vẽ các điểm landmarks chỉ khi có đủ điểm
          if (points && points.length >= 68) {
            // Mắt trái (đỏ)
            ctx.fillStyle = "#FF0000";
            for (let i = 36; i <= 41; i++) {
              if (points[i] && points[i].x != null && points[i].y != null) {
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }

            // Mắt phải (xanh dương)
            ctx.fillStyle = "#0000FF";
            for (let i = 42; i <= 47; i++) {
              if (points[i] && points[i].x != null && points[i].y != null) {
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }

            // Mũi (vàng)
            ctx.fillStyle = "#FFFF00";
            for (let i = 27; i <= 35; i++) {
              if (points[i] && points[i].x != null && points[i].y != null) {
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }

            // Miệng (tím)
            ctx.fillStyle = "#FF00FF";
            for (let i = 48; i <= 67; i++) {
              if (points[i] && points[i].x != null && points[i].y != null) {
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }

            // Viền khuôn mặt (xanh lá)
            ctx.fillStyle = "#00FF00";
            for (let i = 0; i <= 26; i++) {
              if (points[i] && points[i].x != null && points[i].y != null) {
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }
        });
      }

      // Chỉ xử lý nhận diện nếu không phải chỉ vẽ landmarks
      if (!landmarkOnly) {
        handleFaceDetection(resizedDetections);
      }

      return resizedDetections;
    } catch (error) {
      console.error("Lỗi khi phát hiện khuôn mặt:", error);
      // Xóa canvas nếu có lỗi
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return [];
    }
  };

  // Xử lý phát hiện khuôn mặt
  const handleFaceDetection = async (detections) => {
    // Cập nhật state
    dispatch(setDetectedFaces(detections));

    try {
      // Cập nhật thời gian phát hiện
      setLastDetectionTime(Date.now());

      // Nếu không có khuôn mặt nào được phát hiện, dừng lại
      if (!detections || detections.length === 0) {
        if (ENABLE_DEBUG_LOGS) {
          console.log("[DEBUG] Không phát hiện khuôn mặt");
        }
        return;
      }

      if (ENABLE_DEBUG_LOGS) {
        console.log(`[DEBUG] Đã phát hiện ${detections.length} khuôn mặt`);
      }

      // Xử lý nhận diện khuôn mặt nếu có sinh viên
      if (classStudents && classStudents.length > 0) {
        // Xử lý nhận diện khuôn mặt sẽ được thêm sau
      }
    } catch (error) {
      console.error("Lỗi khi xử lý khuôn mặt:", error);
    }
  };

  // Điểm danh thủ công
  const openManualAttendanceDialog = (student) => {
    setSelectedStudent(student);
    setManualAttendanceData({
      status: "present",
      note: "",
    });
    setManualDialogOpen(true);
  };

  const handleManualDialogClose = () => {
    setManualDialogOpen(false);
  };

  const handleManualAttendanceChange = (e) => {
    setManualAttendanceData({
      ...manualAttendanceData,
      [e.target.name]: e.target.value,
    });
  };

  const handleManualAttendanceSubmit = async () => {
    if (!selectedStudent) return;

    try {
      const result = await dispatch(
        manualAttendance({
          sessionId,
          studentId: selectedStudent._id,
          status: manualAttendanceData.status,
          note: manualAttendanceData.note,
        })
      ).unwrap();

      // Cập nhật logs điểm danh
      if (result && result.data) {
        const updatedLogs = attendanceLogs.filter(
          (log) => log.student_id._id !== selectedStudent._id
        );

        updatedLogs.push({
          ...result.data,
          student_id: selectedStudent,
        });

        setAttendanceLogs(updatedLogs);
      }

      enqueueSnackbar("Điểm danh thủ công thành công", { variant: "success" });
      handleManualDialogClose();

      // Cập nhật lại thông tin phiên điểm danh
      const sessionResponse = await axios.get(
        `${API_URL}/attendance/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSessionInfo(sessionResponse.data.data);
    } catch (error) {
      console.error("Lỗi khi điểm danh thủ công:", error);
      enqueueSnackbar("Lỗi khi điểm danh thủ công", { variant: "error" });
    }
  };

  // Đánh dấu điểm danh từ nhận diện khuôn mặt
  const markAttendance = async (
    studentId,
    faceDescriptor,
    confidence,
    imageBase64
  ) => {
    try {
      const result = await dispatch(
        verifyAttendance({
          sessionId,
          studentId,
          faceDescriptor,
          confidence,
          imageBase64,
        })
      ).unwrap();

      // Cập nhật logs điểm danh
      if (result && result.data) {
        const student = classStudents.find((s) => s._id === studentId);

        if (student) {
          const updatedLogs = attendanceLogs.filter(
            (log) => log.student_id._id !== studentId
          );

          updatedLogs.push({
            ...result.data,
            student_id: student,
          });

          setAttendanceLogs(updatedLogs);

          enqueueSnackbar(`Đã điểm danh cho ${student.full_name}`, {
            variant: "success",
          });
        }
      }

      // Cập nhật lại thông tin phiên điểm danh
      const sessionResponse = await axios.get(
        `${API_URL}/attendance/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSessionInfo(sessionResponse.data.data);

      return true;
    } catch (error) {
      console.error("Lỗi khi xác nhận điểm danh:", error);
      enqueueSnackbar("Lỗi khi xác nhận điểm danh", { variant: "error" });
      return false;
    }
  };

  // Kết thúc phiên điểm danh
  const completeSession = async () => {
    try {
      await axios.put(
        `${API_URL}/attendance/sessions/${sessionId}`,
        { status: "completed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Phiên điểm danh đã kết thúc", { variant: "success" });
      navigate(`/teacher/classes/${classId}`);
    } catch (error) {
      console.error("Lỗi khi kết thúc phiên điểm danh:", error);
      enqueueSnackbar("Lỗi khi kết thúc phiên điểm danh", { variant: "error" });
    }
  };

  // Làm mới danh sách điểm danh
  const refreshAttendanceLogs = async () => {
    try {
      const logsResponse = await axios.get(
        `${API_URL}/attendance/logs/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAttendanceLogs(logsResponse.data.data);

      const sessionResponse = await axios.get(
        `${API_URL}/attendance/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSessionInfo(sessionResponse.data.data);

      enqueueSnackbar("Đã làm mới dữ liệu điểm danh", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu:", error);
      enqueueSnackbar("Lỗi khi làm mới dữ liệu", { variant: "error" });
    }
  };

  // Chụp ảnh và nhận diện thủ công
  const captureAndRecognize = async () => {
    try {
      setIsRecognizing(true);
      enqueueSnackbar("Đang nhận diện khuôn mặt...", { variant: "info" });

      // Kiểm tra camera hoạt động
      if (!ensureCameraIsWorking()) {
        enqueueSnackbar("Camera không hoạt động, vui lòng khởi động lại", {
          variant: "error",
        });
        setIsRecognizing(false);
        return;
      }

      // Phát hiện khuôn mặt
      const detections = await handleDetectFaces(false);

      // Kiểm tra có phát hiện khuôn mặt không
      if (!detections || detections.length === 0) {
        enqueueSnackbar("Không phát hiện khuôn mặt nào trong hình", {
          variant: "warning",
        });
        setIsRecognizing(false);
        return;
      }

      // Debug: Log số khuôn mặt phát hiện được
      console.log(
        `[DEBUG] Đã phát hiện ${detections.length} khuôn mặt với descriptor:`,
        detections[0].descriptor ? "CÓ" : "KHÔNG CÓ"
      );

      // Kiểm tra xem detection có chứa descriptor không
      if (!detections[0].descriptor) {
        console.log(
          "[DEBUG] Không tìm thấy descriptor trong kết quả phát hiện"
        );
        enqueueSnackbar(
          "Không thể trích xuất đặc trưng khuôn mặt để nhận diện",
          { variant: "error" }
        );
        setIsRecognizing(false);
        return;
      }

      // Xử lý nhận diện với dữ liệu sinh viên hiện có
      if (classStudents && classStudents.length > 0) {
        // Log số lượng sinh viên để debug
        console.log(
          `[DEBUG] Nhận diện với ${classStudents.length} sinh viên trong lớp`
        );

        // Chụp ảnh từ webcam
        const imageBase64 = webcamRef.current?.getScreenshot();

        // Lấy descriptor khuôn mặt đầu tiên được phát hiện
        const faceDescriptor = detections[0].descriptor;

        // So sánh với dữ liệu sinh viên
        const matchResults = [];

        // Duyệt từng sinh viên để so sánh
        for (const student of classStudents) {
          // Lấy descriptor từ sinh viên (dựa vào cấu trúc dữ liệu của bạn)
          let studentDescriptors = [];

          // Debug: Log thông tin sinh viên
          console.log(`[DEBUG] Xử lý sinh viên: ${student.full_name}`);

          // Thử lấy từ cấu trúc faceFeatures
          if (student.faceFeatures && student.faceFeatures.descriptors) {
            console.log(
              "[DEBUG] Sinh viên có dữ liệu faceFeatures.descriptors"
            );

            // Xử lý nhiều cấu trúc dữ liệu khác nhau
            if (Array.isArray(student.faceFeatures.descriptors)) {
              // Kiểm tra cấu trúc dữ liệu
              console.log(
                "[DEBUG] Cấu trúc descriptors:",
                JSON.stringify(student.faceFeatures.descriptors).substring(
                  0,
                  100
                ) + "..."
              );

              // Trường hợp 1: [[descriptor]]
              if (
                Array.isArray(student.faceFeatures.descriptors[0]) &&
                Array.isArray(student.faceFeatures.descriptors[0][0]) &&
                student.faceFeatures.descriptors[0][0].length === 128
              ) {
                studentDescriptors.push(student.faceFeatures.descriptors[0][0]);
                console.log(
                  "[DEBUG] Trích xuất descriptor từ cấu trúc [[descriptor]]"
                );
              }
              // Trường hợp 2: [descriptor]
              else if (
                Array.isArray(student.faceFeatures.descriptors[0]) &&
                student.faceFeatures.descriptors[0].length === 128
              ) {
                studentDescriptors.push(student.faceFeatures.descriptors[0]);
                console.log(
                  "[DEBUG] Trích xuất descriptor từ cấu trúc [descriptor]"
                );
              }
              // Trường hợp 3: Duyệt từng phần tử để tìm mảng 128 phần tử
              else {
                // Tìm tất cả mảng 128 phần tử trong cấu trúc lồng nhau
                const flattenAndFind = (arr, depth = 0) => {
                  if (depth > 3) return []; // Giới hạn độ sâu để tránh đệ quy vô hạn

                  let results = [];
                  for (const item of arr) {
                    if (Array.isArray(item)) {
                      if (
                        item.length === 128 &&
                        item.every((val) => typeof val === "number")
                      ) {
                        results.push(item);
                      } else {
                        results = [
                          ...results,
                          ...flattenAndFind(item, depth + 1),
                        ];
                      }
                    }
                  }
                  return results;
                };

                const foundDescriptors = flattenAndFind(
                  student.faceFeatures.descriptors
                );
                if (foundDescriptors.length > 0) {
                  studentDescriptors = [
                    ...studentDescriptors,
                    ...foundDescriptors,
                  ];
                  console.log(
                    `[DEBUG] Tìm thấy ${foundDescriptors.length} descriptor sau khi duyệt đệ quy`
                  );
                }
              }
            }
          }
          // Hoặc thử lấy từ cấu trúc cũ faceDescriptors
          else if (student.faceDescriptors) {
            console.log(
              "[DEBUG] Sinh viên có dữ liệu faceDescriptors (cấu trúc cũ)"
            );

            if (Array.isArray(student.faceDescriptors)) {
              // Trường hợp 1: [descriptor]
              if (
                student.faceDescriptors.some(
                  (d) => Array.isArray(d) && d.length === 128
                )
              ) {
                studentDescriptors = student.faceDescriptors.filter(
                  (d) => Array.isArray(d) && d.length === 128
                );
                console.log(
                  `[DEBUG] Tìm thấy ${studentDescriptors.length} descriptor từ faceDescriptors`
                );
              }
              // Trường hợp 2: descriptor trong object
              else if (
                student.faceDescriptors.length > 0 &&
                typeof student.faceDescriptors[0] === "object"
              ) {
                // Tìm trong thuộc tính của object
                for (const desc of student.faceDescriptors) {
                  // Tìm thuộc tính có mảng 128 phần tử
                  for (const key in desc) {
                    if (Array.isArray(desc[key]) && desc[key].length === 128) {
                      studentDescriptors.push(desc[key]);
                      console.log(
                        `[DEBUG] Tìm thấy descriptor trong thuộc tính ${key}`
                      );
                    } else if (
                      key === "descriptors" &&
                      Array.isArray(desc[key])
                    ) {
                      for (const d of desc[key]) {
                        if (Array.isArray(d) && d.length === 128) {
                          studentDescriptors.push(d);
                          console.log(
                            `[DEBUG] Tìm thấy descriptor trong descriptors`
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Log số lượng descriptor tìm được
          console.log(
            `[DEBUG] Tìm thấy ${studentDescriptors.length} descriptor cho sinh viên ${student.full_name}`
          );

          // Nếu sinh viên có dữ liệu khuôn mặt
          if (studentDescriptors.length > 0) {
            // Tính toán độ tương đồng với từng descriptor
            let bestMatch = 0;

            for (const descriptor of studentDescriptors) {
              try {
                const distance = faceapi.euclideanDistance(
                  faceDescriptor,
                  descriptor
                );
                // Chuyển đổi khoảng cách thành độ tương đồng (1 - distance) và lấy giá trị tốt nhất
                const similarity = Math.max(0, 1 - distance);
                console.log(
                  `[DEBUG] Độ tương đồng với ${student.full_name}: ${(
                    similarity * 100
                  ).toFixed(2)}%`
                );
                bestMatch = Math.max(bestMatch, similarity);
              } catch (error) {
                console.error(
                  `[DEBUG] Lỗi khi tính khoảng cách với sinh viên ${student.full_name}:`,
                  error
                );
              }
            }

            // Lưu lại tất cả kết quả để phân tích
            matchResults.push({
              studentId: student._id,
              name: student.full_name,
              confidence: bestMatch,
              studentCode: student.student_code,
            });
          }
        }

        // Sắp xếp kết quả theo độ tương đồng giảm dần
        matchResults.sort((a, b) => b.confidence - a.confidence);

        // Log tất cả kết quả
        console.log("[DEBUG] Kết quả so sánh đầy đủ:", matchResults);

        // Lọc kết quả theo ngưỡng
        const filteredResults = matchResults.filter(
          (r) => r.confidence > RECOGNITION_THRESHOLD
        );
        console.log(
          `[DEBUG] Có ${filteredResults.length}/${matchResults.length} kết quả vượt ngưỡng ${RECOGNITION_THRESHOLD}`
        );

        // Cập nhật danh sách sinh viên được nhận diện
        dispatch(setRecognizedStudents(filteredResults));

        // Hiển thị kết quả ngay cả khi dưới ngưỡng để giúp debug
        if (matchResults.length > 0) {
          const topMatches = matchResults.slice(0, 3);

          // Hiển thị top 3 kết quả để dễ dàng debug
          const matchDetails = topMatches
            .map((m) => `${m.name}: ${(m.confidence * 100).toFixed(1)}%`)
            .join(", ");

          console.log(`[DEBUG] Top 3 kết quả: ${matchDetails}`);

          if (filteredResults.length > 0) {
            const topMatch = filteredResults[0];
            enqueueSnackbar(
              `Đã nhận diện: ${topMatch.name} (${Math.round(
                topMatch.confidence * 100
              )}%)`,
              {
                variant: "success",
              }
            );

            // Tự động điểm danh nếu độ tin cậy cao
            if (topMatch.confidence > CONFIDENCE_THRESHOLD) {
              handleMarkAttendance(topMatch.studentId, topMatch.confidence);
            }
          } else {
            enqueueSnackbar(
              `Không nhận diện được sinh viên nào vượt ngưỡng. Gần nhất: ${matchDetails}`,
              {
                variant: "warning",
              }
            );
          }
        } else {
          enqueueSnackbar("Không nhận diện được sinh viên nào", {
            variant: "warning",
          });
        }
      } else {
        enqueueSnackbar("Không có dữ liệu sinh viên để so sánh", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Lỗi khi nhận diện khuôn mặt:", error);
      enqueueSnackbar(`Lỗi khi nhận diện: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsRecognizing(false);
    }
  };

  // Xử lý đánh dấu sinh viên điểm danh
  const handleMarkAttendance = async (studentId, confidence) => {
    // Kiểm tra xem sinh viên đã được điểm danh chưa
    const isAlreadyAttended = attendanceLogs.some(
      (log) => log.student_id._id === studentId && log.status === "present"
    );

    if (isAlreadyAttended) {
      if (ENABLE_DEBUG_LOGS) {
        console.log(
          `[DEBUG] Sinh viên ${studentId} đã được điểm danh trước đó`
        );
      }
      return;
    }

    try {
      // Lấy dữ liệu video
      const videoElement = isAutoMode
        ? videoRef.current
        : webcamRef.current?.video;

      if (!videoElement) return;

      // Tạo ảnh chụp từ video element
      let imageBase64 = null;

      // Nếu sử dụng webcam component
      if (!isAutoMode && webcamRef.current) {
        imageBase64 = webcamRef.current.getScreenshot();
      }
      // Nếu sử dụng video element trực tiếp
      else if (isAutoMode) {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0);
        imageBase64 = canvas.toDataURL("image/jpeg");
      }

      // Tìm sinh viên đã được phát hiện
      const student = classStudents.find((s) => s._id === studentId);

      if (!student) {
        console.error(`Không tìm thấy sinh viên với ID ${studentId}`);
        return;
      }

      // Lấy descriptor mới nhất từ sinh viên
      let descriptor = null;

      // Kiểm tra và lấy descriptor từ các cấu trúc khác nhau
      if (
        student.faceFeatures &&
        student.faceFeatures.descriptors &&
        Array.isArray(student.faceFeatures.descriptors) &&
        student.faceFeatures.descriptors.length > 0
      ) {
        // Lấy từ cấu trúc mới
        if (Array.isArray(student.faceFeatures.descriptors[0])) {
          descriptor = student.faceFeatures.descriptors[0];
        } else if (Array.isArray(student.faceFeatures.descriptors[0][0])) {
          descriptor = student.faceFeatures.descriptors[0][0];
        }
      } else if (
        student.faceDescriptors &&
        Array.isArray(student.faceDescriptors) &&
        student.faceDescriptors.length > 0
      ) {
        // Lấy từ cấu trúc cũ
        if (typeof student.faceDescriptors[0] === "object") {
          if (
            student.faceDescriptors[0].descriptors &&
            Array.isArray(student.faceDescriptors[0].descriptors) &&
            student.faceDescriptors[0].descriptors.length > 0
          ) {
            descriptor = student.faceDescriptors[0].descriptors[0];
          } else {
            // Tìm mảng 128 phần tử đầu tiên trong object
            Object.keys(student.faceDescriptors[0]).forEach((key) => {
              const value = student.faceDescriptors[0][key];
              if (!descriptor && Array.isArray(value) && value.length === 128) {
                descriptor = value;
              }
            });
          }
        } else if (
          Array.isArray(student.faceDescriptors[0]) &&
          student.faceDescriptors[0].length === 128
        ) {
          descriptor = student.faceDescriptors[0];
        }
      }

      // Gọi API điểm danh
      if (ENABLE_DEBUG_LOGS) {
        console.log(
          `[DEBUG] Đánh dấu điểm danh cho ${
            student.full_name
          } với độ tin cậy ${confidence.toFixed(2)}`
        );
      }

      // Gọi hàm điểm danh
      await markAttendance(studentId, descriptor, confidence, imageBase64);
    } catch (error) {
      console.error("Lỗi khi đánh dấu điểm danh:", error);
    }
  };

  // Bật/tắt hiển thị landmark trên khuôn mặt
  const toggleLandmarkDetection = () => {
    const newState = !showLandmark;
    setShowLandmark(newState);

    // Bắt đầu hoặc dừng interval landmark detection
    if (newState) {
      startLandmarkDetection();
    } else if (landmarkIntervalId) {
      clearInterval(landmarkIntervalId);
      setLandmarkIntervalId(null);

      // Xóa canvas khi tắt landmarks
      const canvasElement = canvasRef.current;
      if (canvasElement) {
        const ctx = canvasElement.getContext("2d");
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    }
  };

  // Thêm hàm debug để kiểm tra cấu trúc dữ liệu khuôn mặt
  const debugFaceFeatures = () => {
    if (!classStudents || classStudents.length === 0) {
      console.log(
        "[DEBUG] Không có sinh viên nào để kiểm tra dữ liệu khuôn mặt"
      );
      return;
    }

    classStudents.forEach((student, index) => {
      console.log(`[DEBUG] Sinh viên #${index + 1}: ${student.full_name}`);

      // Kiểm tra dữ liệu faceFeatures
      if (student.faceFeatures) {
        console.log(`  - Có dữ liệu faceFeatures`);

        // Kiểm tra descriptors
        if (student.faceFeatures.descriptors) {
          console.log(
            `  - Có descriptors: ${student.faceFeatures.descriptors.length} nhóm`
          );

          student.faceFeatures.descriptors.forEach((group, groupIndex) => {
            if (Array.isArray(group)) {
              console.log(
                `    - Nhóm #${groupIndex + 1}: ${group.length} descriptors`
              );

              group.forEach((descriptor, descIndex) => {
                if (Array.isArray(descriptor)) {
                  console.log(
                    `      - Descriptor #${descIndex + 1}: ${
                      descriptor.length
                    } phần tử`
                  );
                } else {
                  console.log(
                    `      - Descriptor #${descIndex + 1}: Không phải mảng`
                  );
                }
              });
            } else {
              console.log(`    - Nhóm #${groupIndex + 1}: Không phải mảng`);
            }
          });
        } else {
          console.log(`  - Không có dữ liệu descriptors`);
        }
      } else {
        console.log(`  - Không có dữ liệu faceFeatures`);
      }

      // Kiểm tra dữ liệu cũ (faceDescriptors)
      if (student.faceDescriptors) {
        console.log(
          `  - Có dữ liệu faceDescriptors (cấu trúc cũ): ${student.faceDescriptors.length} descriptors`
        );
      }
    });
  };

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

  // Lấy danh sách sinh viên vắng mặt
  const getAbsentStudents = () => {
    if (!classInfo || !sessionInfo) return [];

    const presentStudentIds = attendanceLogs
      .filter((log) => log.status === "present")
      .map((log) => log.student_id._id);

    return classInfo.students.filter(
      (student) => !presentStudentIds.includes(student._id)
    );
  };

  const absentStudents = getAbsentStudents();

  // Điểm danh thủ công trong chế độ đơn giản
  const showStudentList = () => {
    if (!classInfo) return;

    // Hiển thị danh sách sinh viên để điểm danh thủ công
    const absentStudents = getAbsentStudents();
    if (absentStudents.length === 0) {
      enqueueSnackbar("Tất cả sinh viên đã được điểm danh", {
        variant: "success",
      });
      return;
    }

    // Hiển thị dialog chọn sinh viên để điểm danh
    if (absentStudents.length > 0 && absentStudents[0]) {
      openManualAttendanceDialog(absentStudents[0]);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Điểm Danh - {classInfo?.class_name}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Buổi {sessionInfo?.session_number} -{" "}
        {new Date(sessionInfo?.date).toLocaleDateString("vi-VN")}
      </Typography>

      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Camera nhận diện</Typography>
                <Box>
                  <Chip
                    label={isAutoMode ? "Tự động đang bật" : "Tự động đang tắt"}
                    color={isAutoMode ? "success" : "default"}
                    sx={{ mr: 1 }}
                  />
                  <Button
                    variant="outlined"
                    color={isAutoMode ? "error" : "primary"}
                    onClick={
                      isAutoMode
                        ? () => {
                            // Dừng tự động
                            if (intervalId) {
                              clearInterval(intervalId);
                              setIntervalId(null);
                            }
                            setIsAutoMode(false);
                            enqueueSnackbar("Đã tắt chế độ tự động điểm danh", {
                              variant: "info",
                            });
                          }
                        : () => {
                            // Bắt đầu tự động
                            if (intervalId) {
                              clearInterval(intervalId);
                            }
                            // Khởi tạo thời gian phát hiện ban đầu
                            setLastDetectionTime(Date.now());
                            const id = setInterval(() => {
                              handleDetectFaces();
                            }, AUTO_DETECT_INTERVAL);
                            setIntervalId(id);
                            setIsAutoMode(true);
                            enqueueSnackbar("Đã bật chế độ tự động điểm danh", {
                              variant: "info",
                            });
                          }
                    }
                  >
                    {isAutoMode ? "Tắt tự động" : "Bật tự động"}
                  </Button>
                </Box>
              </Box>
            </CardContent>

            <Paper
              elevation={3}
              sx={{
                position: "relative",
                width: "100%",
                height: "400px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                mb: 2,
              }}
            >
              {isCameraReady ? (
                <>
                  {isAutoMode ? (
                    // Sử dụng video element trực tiếp thay vì Webcam component
                    <video
                      ref={videoRef}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width={640}
                      height={480}
                      videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: "user",
                      }}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onUserMedia={(stream) => {
                        console.log(
                          "Camera đã được cấp quyền và khởi tạo",
                          stream.id
                        );
                        // Đảm bảo readyState được kiểm tra khi stream đã sẵn sàng
                        setTimeout(() => {
                          if (webcamRef.current && webcamRef.current.video) {
                            console.log(
                              "Stream ready, readyState=",
                              webcamRef.current.video.readyState
                            );
                            dispatch(setCameraReady(true));
                            // Đặt thời gian phát hiện ban đầu
                            setLastDetectionTime(Date.now());
                          }
                        }, 500);
                      }}
                      onUserMediaError={(err) => {
                        console.error("Lỗi khi truy cập camera:", err);
                        enqueueSnackbar(
                          `Không thể truy cập camera: ${
                            err.name === "NotAllowedError"
                              ? "Bạn chưa cấp quyền truy cập camera"
                              : err.name === "NotFoundError"
                              ? "Không tìm thấy thiết bị camera"
                              : err.message || "Lỗi không xác định"
                          }`,
                          {
                            variant: "error",
                          }
                        );
                      }}
                    />
                  )}
                  {/* Canvas hiển thị ở cả hai chế độ */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      zIndex: 10,
                    }}
                  />
                </>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center">
                  <CircularProgress size={50} />
                  <Typography mt={2}>Đang khởi tạo camera...</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {isModelLoaded
                      ? "Chờ kết nối camera - Hãy đảm bảo bạn đã cấp quyền camera"
                      : "Đang tải mô hình nhận diện khuôn mặt"}
                  </Typography>

                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={initDirectCamera}
                    >
                      Khởi động camera trực tiếp
                    </Button>

                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => {
                        setIsAutoMode(true);
                        // Khởi tạo thời gian phát hiện ban đầu
                        setLastDetectionTime(Date.now());
                        const id = setInterval(() => {
                          handleDetectFaces();
                        }, AUTO_DETECT_INTERVAL);
                        setIntervalId(id);
                        enqueueSnackbar("Đã bật tự động điểm danh", {
                          variant: "info",
                        });
                      }}
                    >
                      Bắt đầu tự động điểm danh
                    </Button>

                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      onClick={showStudentList}
                    >
                      Điểm danh thủ công
                    </Button>

                    <Alert severity="info" sx={{ mt: 2, maxWidth: 300 }}>
                      Nếu camera không hoạt động, vui lòng thử:
                      <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                        <li>Kiểm tra quyền camera trên trình duyệt</li>
                        <li>Làm mới trang và thử lại</li>
                        <li>
                          Đảm bảo không có ứng dụng khác đang sử dụng camera
                        </li>
                      </ul>
                    </Alert>
                  </Box>
                </Box>
              )}
            </Paper>

            <Box display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={captureAndRecognize}
                startIcon={<CameraAlt />}
                disabled={!isCameraReady || isRecognizing || isAutoMode}
              >
                {isRecognizing ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Chụp & Nhận diện"
                )}
              </Button>

              <Box>
                {isCameraReady && (
                  <>
                    <Button
                      variant="outlined"
                      color={showLandmark ? "success" : "info"}
                      onClick={toggleLandmarkDetection}
                      sx={{ mr: 1 }}
                    >
                      {showLandmark ? "Tắt Landmark" : "Hiện Landmark"}
                    </Button>

                    <Button
                      variant="outlined"
                      color={isAutoMode ? "error" : "primary"}
                      onClick={() => {
                        // Dừng tự động
                        if (intervalId) {
                          clearInterval(intervalId);
                          setIntervalId(null);
                        }
                        setIsAutoMode(false);
                        enqueueSnackbar("Đã tắt chế độ tự động điểm danh", {
                          variant: "info",
                        });
                      }}
                      sx={{ mr: 1 }}
                    >
                      {isAutoMode ? "Tắt tự động" : "Bật tự động"}
                    </Button>
                  </>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  onClick={completeSession}
                  startIcon={<Save />}
                  disabled={sessionInfo?.status === "completed"}
                >
                  Kết thúc phiên
                </Button>
              </Box>
            </Box>

            {recognizedStudents.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Đã nhận diện ({recognizedStudents.length})
                </Typography>
                <Grid container spacing={1}>
                  {recognizedStudents.map((student, index) => (
                    <Grid item xs={6} sm={4} key={index}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {student.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {Math.round(student.confidence * 100)}% match
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ mt: 1 }}
                          onClick={() =>
                            handleMarkAttendance(
                              student.studentId,
                              student.confidence
                            )
                          }
                        >
                          <Check fontSize="small" sx={{ mr: 0.5 }} />
                          Điểm danh
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">
                  Có mặt (
                  {
                    attendanceLogs.filter((log) => log.status === "present")
                      .length
                  }
                  /{classInfo?.students.length})
                </Typography>
                <IconButton size="small" onClick={refreshAttendanceLogs}>
                  <Refresh />
                </IconButton>
              </Box>

              <List dense>
                {attendanceLogs
                  .filter((log) => log.status === "present")
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((log) => (
                    <ListItem
                      key={log._id}
                      secondaryAction={
                        <Chip
                          size="small"
                          icon={
                            log.recognized ? (
                              <VerifiedUser fontSize="small" />
                            ) : null
                          }
                          label={log.recognized ? "Tự động" : "Thủ công"}
                          color={log.recognized ? "success" : "primary"}
                        />
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          alt={log.student_id.full_name}
                          src={log.student_id.avatar_url}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={log.student_id.full_name}
                        secondary={`${new Date(
                          log.timestamp
                        ).toLocaleTimeString("vi-VN")}`}
                      />
                    </ListItem>
                  ))}

                {attendanceLogs.filter((log) => log.status === "present")
                  .length === 0 && (
                  <ListItem>
                    <ListItemText primary="Chưa có sinh viên nào điểm danh" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vắng mặt ({absentStudents.length}/{classInfo?.students.length})
              </Typography>

              <List dense>
                {absentStudents.map((student) => (
                  <ListItem
                    key={student._id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => openManualAttendanceDialog(student)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        alt={student.full_name}
                        src={student.avatar_url}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={student.full_name}
                      secondary={student.student_code}
                    />
                  </ListItem>
                ))}

                {absentStudents.length === 0 && (
                  <ListItem>
                    <ListItemText primary="Không có sinh viên nào vắng mặt" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog điểm danh thủ công */}
      <Dialog open={manualDialogOpen} onClose={handleManualDialogClose}>
        <DialogTitle>Điểm danh thủ công</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedStudent?.full_name} ({selectedStudent?.student_code})
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="status"
                value={manualAttendanceData.status}
                onChange={handleManualAttendanceChange}
                label="Trạng thái"
              >
                <MenuItem value="present">Có mặt</MenuItem>
                <MenuItem value="absent">Vắng mặt</MenuItem>
                <MenuItem value="late">Đi trễ</MenuItem>
                <MenuItem value="early_leave">Về sớm</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              name="note"
              label="Ghi chú"
              value={manualAttendanceData.note}
              onChange={handleManualAttendanceChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleManualDialogClose}>Hủy</Button>
          <Button onClick={handleManualAttendanceSubmit} variant="contained">
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
