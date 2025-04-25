import * as faceapi from "face-api.js";

let isModelsLoaded = false;

/**
 * Tải các model face-api.js
 * @returns {Promise<boolean>}
 */
export const loadModels = async () => {
  if (isModelsLoaded) {
    return true;
  }

  try {
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    isModelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading models:", error);
    throw error;
  }
};

/**
 * Phát hiện khuôn mặt từ hình ảnh
 * @param {string} imageData - Base64 image data
 * @returns {Promise<Object>} - Kết quả phát hiện khuôn mặt
 */
export const detectFace = async (imageData) => {
  if (!isModelsLoaded) {
    await loadModels();
  }

  try {
    const img = await faceapi.fetchImage(imageData);
    const detections = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detections;
  } catch (error) {
    console.error("Error detecting face:", error);
    throw error;
  }
};

/**
 * Tính toán khoảng cách Euclid giữa các đặc trưng khuôn mặt
 * @param {Float32Array} descriptor1 - Đặc trưng khuôn mặt 1
 * @param {Float32Array} descriptor2 - Đặc trưng khuôn mặt 2
 * @returns {number} - Khoảng cách (0-1, càng nhỏ càng giống nhau)
 */
export const getFaceDistance = (descriptor1, descriptor2) => {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
};

/**
 * Kiểm tra xem khuôn mặt có phải là cùng một người không
 * @param {Float32Array} descriptor1 - Đặc trưng khuôn mặt 1
 * @param {Float32Array} descriptor2 - Đặc trưng khuôn mặt 2
 * @param {number} threshold - Ngưỡng để xác định là cùng một người (mặc định: 0.6)
 * @returns {boolean} - Có phải cùng một người không
 */
export const isSameFace = (descriptor1, descriptor2, threshold = 0.6) => {
  const distance = getFaceDistance(descriptor1, descriptor2);
  return distance < threshold;
};
