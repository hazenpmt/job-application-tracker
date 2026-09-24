# Job Application Tracker

Ứng dụng web giúp sinh viên quản lý các đơn ứng tuyển việc làm và thực tập.

> **AI-assisted demo / learning reference:** Bản implementation React + Express trong repository này được tạo với trợ giúp của AI theo yêu cầu của chủ repository. Không mô tả đây là sản phẩm tự xây một mình trên CV hoặc trong phỏng vấn. Hãy dùng nó để học, chạy, đọc code và tự xây lại từng phần.

## Mục tiêu học tập

- Học cách dùng Git và GitHub
- Học HTML, CSS và JavaScript
- Xây dựng ứng dụng Full-stack với React, Node.js và PostgreSQL

## Tính năng

- Đăng ký, đăng nhập, đăng xuất bằng JWT.
- Mật khẩu được hash bằng bcrypt.
- CRUD đơn ứng tuyển: thêm, xem, sửa, xóa.
- Tìm kiếm theo công ty/vị trí và lọc theo trạng thái.
- Dashboard thống kê `Wishlist`, `Applied`, `Interview`, `Offer`, `Rejected`.
- Mỗi tài khoản chỉ truy cập dữ liệu của chính mình.
- Frontend React + Vite; backend Node.js + Express.
- Hỗ trợ PostgreSQL; khi chưa có PostgreSQL thì tự chạy bằng local JSON demo store.

## Cấu trúc

```text
frontend/   React + Vite giao diện
backend/    Express REST API, authentication, database layer
backend/db/ PostgreSQL schema
index.html  Bài HTML căn bản ban đầu
```

## Chạy bản demo local

Yêu cầu: Node.js 20 trở lên.

Mở hai terminal riêng trong VS Code.

```powershell
cd backend
npm install
npm run dev
```

Terminal thứ hai:

```powershell
cd frontend
npm install
npm run dev
```

Mở URL mà Vite in ra, thường là `http://127.0.0.1:5173`.

## Dùng PostgreSQL thật

1. Tạo database tên `job_application_tracker`.
2. Chạy schema ở `backend/db/schema.sql` trên database đó.
3. Copy `backend/.env.example` thành `backend/.env`.
4. Điền `PGPASSWORD` và thay `JWT_SECRET` bằng chuỗi bí mật dài. File `.env` bị Git bỏ qua, không được commit.
5. Khởi động lại backend.

## API chính

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/applications
POST   /api/applications
PATCH  /api/applications/:id
DELETE /api/applications/:id
GET    /api/dashboard/stats
```
