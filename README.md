# FWF KPI Next.js Prototype

Prototype giao diện `Next.js + Tailwind CSS` cho hệ thống quản lý task và giám sát KPI đa phòng ban.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Biến môi trường realtime

Để bật realtime chat bằng Ably, thêm biến sau vào môi trường:

```bash
ABLY_API_KEY=your-ably-api-key
```

Nếu chưa cấu hình `ABLY_API_KEY`, chat vẫn hoạt động theo cơ chế fetch hiện tại nhưng chưa có push realtime.

## Thành phần chính

- `app/page.tsx`: entry page
- `app/login/page.tsx`: trang đăng nhập
- `app/register/page.tsx`: trang đăng ký
- `app/dashboard/page.tsx`: dashboard sau khi xác thực
- `components/dashboard-shell.tsx`: giao diện chính và dữ liệu mẫu
- `components/auth-provider.tsx`: state đăng nhập phía client
- `components/auth-shell.tsx`: form auth
- `lib/auth.ts`: dữ liệu mẫu, role, department, rule email công ty
- `app/globals.css`: global styles
- `tailwind.config.ts`: theme Tailwind

## Rule auth demo

- Chỉ chấp nhận email có đuôi `@facewashfox.com`
- Đăng ký có chọn `phòng ban` và `vai trò`
- Đăng ký phải qua bước xác minh `OTP` trước khi tạo tài khoản
- Đăng nhập xong sẽ vào dashboard theo tài khoản tương ứng
- Dữ liệu demo đang lưu ở `localStorage`

## Quyền nhân viên trong demo

- Với `task cá nhân`: thêm mới, sửa, xóa, ghi chú, cập nhật tiến độ và trạng thái
- Với `task trong nhóm`: chỉ xem để theo dõi, không được thao tác

## Tài khoản mẫu

- `admin@facewashfox.com` / `facewashfox123`
- `director@facewashfox.com` / `facewashfox123`
- `lan.tran@facewashfox.com` / `facewashfox123`
- `trang.nguyen@facewashfox.com` / `facewashfox123`
