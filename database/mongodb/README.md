# MongoDB Seed

Thư mục này chứa bộ seed MongoDB được build từ dữ liệu hiện tại của app.

## Collections

- `company_teams`: team gốc trong công ty như Marketing, IT, Design
- `people`: hồ sơ nhân sự dùng cho People, Chats, assignee
- `users`: tài khoản đăng nhập thật
- `workspace_teams`: các team làm việc đang hiển thị ở sidebar/Teams
- `tasks`: toàn bộ task KPI và task vận hành
- `documents`: dữ liệu Documents
- `chat_threads`: luồng chat giữa các thành viên cùng team
- `chat_messages`: tin nhắn của từng luồng chat

## Cách build lại seed

```bash
node database/mongodb/build-seed.mjs
```

Script sẽ xuất file JSON vào:

```bash
database/mongodb/export
```

## Import vào MongoDB

Ví dụ database name là `fwf_kpi`

```bash
mongoimport --db fwf_kpi --collection company_teams --file database/mongodb/export/company_teams.json --jsonArray
mongoimport --db fwf_kpi --collection people --file database/mongodb/export/people.json --jsonArray
mongoimport --db fwf_kpi --collection users --file database/mongodb/export/users.json --jsonArray
mongoimport --db fwf_kpi --collection workspace_teams --file database/mongodb/export/workspace_teams.json --jsonArray
mongoimport --db fwf_kpi --collection tasks --file database/mongodb/export/tasks.json --jsonArray
mongoimport --db fwf_kpi --collection documents --file database/mongodb/export/documents.json --jsonArray
mongoimport --db fwf_kpi --collection chat_threads --file database/mongodb/export/chat_threads.json --jsonArray
mongoimport --db fwf_kpi --collection chat_messages --file database/mongodb/export/chat_messages.json --jsonArray
```

## Tạo index

```bash
mongosh "mongodb://127.0.0.1:27017/fwf_kpi" database/mongodb/create-indexes.js
```

Đồng bộ role cũ trong MongoDB sang role mới:

```bash
mongosh "mongodb://127.0.0.1:27017/fwf_kpi" database/mongodb/migrate-user-roles.js
```

## Gửi OTP thật qua email

Thêm các biến môi trường sau vào `.env.local`:

```env
MONGODB_URI=your-mongodb-uri
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="Face Wash Fox <no-reply@facewashfox.com>"
```

Nếu chỉ muốn test local mà chưa có SMTP thật:

```env
OTP_DEBUG=true
```

## Ghi chú

- Seed hiện tại được lấy từ data mock đang dùng trong app.
- Một số `ownerId` hoặc `assigneeId` cũ không còn tồn tại trong mock hiện tại sẽ được tự map về leader mặc định để tránh lỗi dữ liệu mồ côi.
- Trường `tasks.progress` và `tasks.target` đã được include để khớp với chức năng cập nhật tiến độ hiện tại.
- `users.password` đang giữ đúng seed login hiện tại của app để bạn có thể import và test nhanh. Khi đưa vào production, cần hash lại mật khẩu trước khi dùng thật.
