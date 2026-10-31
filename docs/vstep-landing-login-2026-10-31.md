# Trang giới thiệu, đăng nhập và FastBots dùng chung

## Thay đổi

- Chuyển mẫu WEWIN IELTS sang nội dung WEWIN VSTEP, dùng logo, mascot WebP, font và màu hiện có.
- Trang `/` có header riêng, giới thiệu cách học, bốn kỹ năng, từ vựng, video, chấm Writing/Speaking và liên hệ. Dashboard và các trang học vẫn dùng AppShell.
- Trang `/login` dùng bố cục thẻ giữa trang; giữ nguyên Auth.js, tài khoản do trung tâm cấp và callback sau đăng nhập.
- Hỗ trợ sáng/tối, menu điện thoại, điều hướng bàn phím, giảm chuyển động và trạng thái tải.
- Các khối dưới màn hình đầu tiên hiện dần khi cuộn: mờ hiện, trượt lên 24px và lần lượt theo nhóm, tối đa trễ 180ms. Dùng một IntersectionObserver, ngừng theo dõi từng khối sau khi hiện; không thêm thư viện hay xử lý mỗi lần cuộn. Nội dung màn hình đầu tiên hiện ngay. Khi không có JavaScript, in trang hoặc bật giảm chuyển động, nội dung luôn đọc được. Focus bằng bàn phím cũng làm khối hiện ngay.
- Nút tư vấn mở cùng bot FastBots trong mẫu người dùng cung cấp. Chỉ tải iframe sau lần mở đầu tiên, giữ phiên khi thu nhỏ, bỏ iframe khi vào trang không hỗ trợ chat.
- Chat hiện ở trang chủ, đăng nhập, giới thiệu, liên hệ, danh mục đề VSTEP, từ vựng và thư viện video. Không hiện trong lúc làm đề hoặc phòng Zoom.

## Cấu hình bot

Bot dùng chung mặc định: `cm6t5x0pl1e32svk4sez4rwwq`.

Không cần thêm biến để dùng bot này. Khi muốn đổi bot, đặt biến public sau rồi build lại:

```dotenv
NEXT_PUBLIC_FASTBOTS_BOT_ID="cm6t5x0pl1e32svk4sez4rwwq"
```

ID bot công khai, không phải API key. Nội dung, lời chào và giao diện bên trong iframe được quản lý tại FastBots; đổi cấu hình bot dùng chung sẽ ảnh hưởng các website cùng sử dụng bot đó.

## Mã nguồn chính

- `src/app/page.tsx`
- `src/components/landing/LandingPage.tsx`, `LandingHeader.tsx`, `landing.module.css`
- `src/components/landing/LandingMotion.tsx`: điều khiển hiệu ứng cuộn, xử lý giảm chuyển động và focus.
- `src/components/auth/AuthSplitLayout.tsx`, `LoginForm.tsx`, `auth.module.css`
- `src/components/chat/SupportChatWidget.tsx`, `OpenChatButton.tsx`, `chat.module.css`

## Kiểm tra ngày 31/10/2026

- ESLint toàn source: đạt; bỏ qua thư mục lưu trữ `disk-audit-*` có sẵn ngoài phạm vi thay đổi.
- `npm run build`: đạt, gồm kiểm tra TypeScript.
- `npx prisma validate`: đạt; không thay đổi schema hay migration.
- Chromium: desktop 1440px, điện thoại 375px và ngang 812px; sáng/tối, menu, ẩn/hiện mật khẩu, callback, chat mở/thu nhỏ/Escape và focus trả về nút mở.
- Bản production local không có console error hoặc warning trong các trang đã kiểm tra. FastBots có hai thông báo log nội bộ từ dịch vụ.
- Không tải iframe FastBots trước khi người dùng mở chat. Đã xác nhận bot thật tải lời chào và ô nhập; không gửi tin nhắn thử.
- Hiệu ứng cuộn: 18 khối được đánh dấu; xác nhận nhóm đầu hiện khi cuộn và giữ trạng thái khi cuộn ngược. Kiểm tra desktop sáng, điện thoại 375px tối không tràn ngang, focus vào thẻ đang ẩn làm hiện ngay, bật giảm chuyển động xóa trạng thái chờ và tắt JavaScript vẫn đọc được toàn bộ 18 khối.
- Database local `localhost:5432` chưa chạy, nên chưa kiểm tra đăng nhập bằng tài khoản thật hoặc các luồng cần dữ liệu. Build có thông báo truy vấn từ vựng không kết nối được database; điều này không làm build thất bại.
- Chưa push GitHub hoặc triển khai production.

Ảnh kiểm tra nằm trong `output/playwright/` (thư mục được Git bỏ qua).
