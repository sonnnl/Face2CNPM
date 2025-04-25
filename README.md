# Hệ Thống Điểm Danh Bằng Khuôn Mặt (FaceReg)

Hệ thống điểm danh bằng khuôn mặt sử dụng công nghệ nhận diện khuôn mặt hiện đại, được phát triển cho các cơ sở giáo dục. Hệ thống giúp tự động hóa quá trình điểm danh, giảm thiểu thời gian và tăng độ chính xác.

## Tính năng chính

- **Đăng nhập/Đăng ký**: Xác thực người dùng qua tài khoản hoặc Google
- **Nhận diện khuôn mặt**: Sử dụng face-api.js để nhận diện và xác thực khuôn mặt realtime
- **Điểm danh tự động**: Tự động điểm danh khi phát hiện khuôn mặt đã đăng ký
- **Quản lý lớp học**: Tạo, quản lý lớp học và phiên điểm danh
- **Phân quyền người dùng**: Admin, giáo viên, và sinh viên
- **Thống kê điểm chuyên cần**: Tính toán tự động điểm chuyên cần theo quy định

## Công nghệ sử dụng

### Backend

- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- Passport.js (Google OAuth)
- RESTful API

### Frontend

- React 18
- Redux Toolkit & Redux Persist
- Material UI (MUI)
- React Router v6
- face-api.js (TensorFlow.js)
- react-webcam

## Cấu trúc dự án

```
FaceReg/
├── backend/           # API server
│   ├── src/
│   │   ├── config/    # Cấu hình ứng dụng
│   │   ├── controllers/ # Xử lý logic
│   │   ├── middlewares/ # Middleware xác thực
│   │   ├── models/    # Schema database
│   │   ├── routes/    # API routes
│   │   └── utils/     # Tiện ích
│   └── uploads/       # Thư mục lưu ảnh
│
├── frontend/          # React application
│   ├── public/
│   │   └── models/    # Face detection models
│   └── src/
│       ├── components/ # UI components
│       ├── context/   # React context
│       ├── hooks/     # Custom React hooks
│       ├── layouts/   # Layout components
│       ├── pages/     # Page components
│       ├── redux/     # Redux store/slices
│       ├── services/  # API services
│       └── utils/     # Tiện ích
```

## Cài đặt và chạy

### Yêu cầu

- Node.js (v14+)
- MongoDB
- npm hoặc yarn

### Backend

1. Di chuyển vào thư mục backend:

```bash
cd backend
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Tạo file .env:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/facereg_attendance
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

4. Khởi động server:

```bash
npm run dev
```

### Frontend

1. Di chuyển vào thư mục frontend:

```bash
cd frontend
```

2. Cài đặt dependencies:

```bash
npm install
```

3. Tạo file .env:

```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Tải các mô hình nhận diện khuôn mặt:

```bash
mkdir -p public/models
cd public/models
# Tải mô hình từ https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

5. Khởi động ứng dụng:

```bash
npm start
```

## Vai trò người dùng

### Admin

- Quản lý tất cả người dùng, khoa, lớp
- Xem thống kê toàn hệ thống
- Phân quyền người dùng

### Giáo viên

- Quản lý lớp giảng dạy
- Tạo phiên điểm danh
- Xem thống kê chuyên cần
- Gửi thông báo cho lớp

### Sinh viên

- Đăng ký khuôn mặt
- Xem lịch học và điểm danh
- Xem điểm chuyên cần
- Gửi đơn xin phép vắng

## License

MIT
