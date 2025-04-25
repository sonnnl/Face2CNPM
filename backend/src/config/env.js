// Cấu hình biến môi trường thay thế cho .env
require("dotenv").config();

// Thiết lập các biến môi trường nếu không được định nghĩa trong .env
const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/faceregattendance",
  JWT_SECRET: process.env.JWT_SECRET || "secureJwtSecret123456789",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Google OAuth
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    "100534880319-vs2rdo9iapvie4phdcnqi6gh10mjb79r.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLIENT_SECRET || "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",
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/auth/google/callback",
};

module.exports = env;
