# Guest, User và Admin

- Guest: xem danh mục; khi admin gán đề thật vào Test 1 hoặc Test 2, guest có thể làm mỗi đề một lượt trên trình duyệt, tiếp tục và xem kết quả trong 30 ngày. Hiện không có đề học thử nào đang được gán.
- User (`LEARNER`): tài khoản trung tâm cấp, truy cập toàn bộ nội dung đã xuất bản, dữ liệu cá nhân theo chủ sở hữu.
- Admin (`ADMIN`): quyền học cùng quản lý học viên, nhập/xuất bản đề, gán đề học thử và nhập từ vựng.

Migration `20260915100000_guest_user_admin` đổi CONTENT_MANAGER thành ADMIN, giữ nguyên tài khoản và lịch sử bài làm. Khóa tài khoản hoặc đặt lại mật khẩu làm mất hiệu lực phiên cũ; người dùng cần đăng nhập lại sau migration.

## Vận hành

- Quản lý học viên tại `/manage/users`; không có tự đăng ký hay nâng quyền admin trong giao diện.
- Tạo admin qua `scripts/create-manager.ts` trên máy chủ. Không đưa mật khẩu vào Git.
- Hai vị trí học thử được gán rõ vào đề VSTEP đã xuất bản. Các đề demo `vstep-test-01` và `vstep-test-1` đã được xóa cùng 5 lượt làm; hiện Test 1 và Test 2 hiển thị “Sắp có” cho đến khi admin nhập đề thật.
- AI dùng cấu hình máy chủ hiện có; lỗi chấm không làm mất bài, không hiển thị điểm giả.
- Chạy `npx tsx scripts/cleanup-guest-sessions.ts` để dọn phiên và kết quả khách quá hạn cùng dữ liệu giới hạn tần suất. Lượt thi học viên không bị tác động.
- Không chạy seed trên dữ liệu đang dùng: seed chỉ dành cho database phát triển cô lập.

## Kiểm tra

`node scripts/test-role-access.mjs` chạy với ứng dụng local, tạo và dọn tài khoản QA riêng; kiểm tra guest/user/admin, khóa tài khoản, phiên cũ và dữ liệu trả về không có password hash.

Bản sao lưu trước migration tại `.tmp/wewin-before-roles-20260915.dump` (PostgreSQL custom format). Chỉ phục hồi vào database riêng để kiểm tra trước; không ghi đè dữ liệu mới phát sinh.
