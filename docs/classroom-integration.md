# Lớp học online trong VSTEP

Bản này bổ sung vào Auth.js/Prisma hiện có, không nhập database hoặc tài khoản từ dự án Zoom. Web đã triển khai trên Vercel; database production nhận migration bổ sung qua bước build.

## Quyền truy cập

| Vai trò   | Được làm                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Khách     | Danh mục/trial VSTEP hiện có; đăng nhập để xem lớp                                                            |
| Học viên  | Lớp được ghi danh, vào Zoom, học liệu công bố, nháp/nộp bài của mình, điểm/điểm danh của mình                 |
| Giáo viên | Các lớp được phân công: học liệu, giao/chấm/trả/mở lại bài, xác nhận điểm danh, giải phóng thiết bị kèm lý do |
| Admin     | Toàn bộ quyền giáo viên, cấp/khóa/reset tài khoản, lớp, phân công, ghi danh, lịch/host, kết nối và tác vụ     |

Giáo viên không thêm/sửa/xóa/khóa/reset học viên, không ghi danh, không đổi lịch, không sửa kho nội dung chung. Kiểm quyền tại server bằng trạng thái tài khoản mới nhất. Tài khoản có hồ sơ lớp học dùng khóa thay cho xóa để giữ lịch sử.

## Chạy thử tại máy này

Database **riêng**: Docker container `wewin-classroom-qa`, PostgreSQL cổng 5434, database `wewin_classroom_test`. Kiểm thử tự động có ghi dữ liệu chỉ chạy trên database riêng này, không chạy trên database production.

Chạy `node scripts/classroom-local.mjs` rồi mở `http://localhost:3000/classes`. Tài khoản thử nằm ở `.qa/classroom-review.txt`. Runner đọc `.qa/classroom-env.json`, không ghi đè `.env.local`. Dữ liệu QA, mật khẩu và storage-state không đưa vào Git.

`--build` build với cấu hình QA; `--start` chạy bản build; `--worker` chạy worker với cùng database. Không chạy dev và build vào cùng thư mục `.next` đồng thời.

## Routes

- `/classes`, `/classes/[classId]`: tổng quan, buổi, học liệu, bài tập, kết quả.
- `/sessions/[sessionId]`, `/sessions/[sessionId]/room`.
- `/assignments/[assignmentId]`.
- `/manage/classes`, `/manage/sessions`, `/manage/integrations` (admin).
- API tương ứng: classes, sessions, assignments, notifications, classroom-files, classroom-options, classroom-integrations.
- Webhook HTTPS: `/api/zoom/webhook`.

## Biến môi trường cần cấu hình

Giữ `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` và các biến AI VSTEP hiện có. Thêm:

| Biến                                               | Công dụng                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `CLASSROOM_ENABLED`                                | Mặc định false; bật sau khi đã chuẩn bị migration và Zoom       |
| `APP_ORIGIN`                                       | Origin HTTPS web; local dùng localhost                             |
| `ZOOM_ACCOUNT_ID`                                  | Tài khoản Zoom WEWIN                                               |
| `ZOOM_OAUTH_CLIENT_ID`, `ZOOM_OAUTH_CLIENT_SECRET` | Server-to-Server OAuth tạo/cập nhật/xóa phòng và lấy ZAK           |
| `ZOOM_MEETING_SDK_KEY`, `ZOOM_MEETING_SDK_SECRET`  | Client ID/Secret app có Meeting SDK, ký grant trên server          |
| `ZOOM_ALLOW_BASIC` | Bật rõ ràng `true` để thử host Basic trên web, tối đa 40 phút |
| `ZOOM_WEBHOOK_SECRET`                              | Xác minh chữ ký và URL validation                                  |
| `DATA_ENCRYPTION_KEY`                              | 32 byte ngẫu nhiên, base64; giữ ổn định và giống nhau ở web/worker |
| `CLAMAV_HOST`, `CLAMAV_PORT`                       | Scanner trong mạng riêng của worker, mặc định cổng 3310            |
| `CLASSROOM_WORKER_ID`                              | Tùy chọn tên worker                                                |

Zoom cần các quyền quản trị tương ứng cho đọc người dùng/giấy phép, đọc/tạo/cập nhật/xóa meetings, đọc token ZAK; đối chiếu đúng scope trong app đang dùng. Đăng ký meeting.started, meeting.ended, meeting.participant_joined, meeting.participant_left. Admin xác minh host bằng email và tài khoản WEWIN trước khi tạo lịch. Host phải cùng account và đang hoạt động. Mặc định cần giấy phép; có thể cho phép Basic tối đa 40 phút bằng ZOOM_ALLOW_BASIC=true trên môi trường dùng thử, kể cả Vercel. Cờ QA cũ ZOOM_ALLOW_BASIC_LOCAL vẫn chỉ áp dụng khi database/origin đúng môi trường local riêng. Không hỗ trợ external-account hosts.

SDK 6.5.0 dùng React 18. Phòng Zoom chạy trong iframe cùng origin, với vendor React 18 riêng; VSTEP giữ React 19. `postinstall` copy SDK vào public/zoom (không track vendor). Desktop component view, điện thoại client view; cần nghiệm thu media thật trên thiết bị thật. Không ghi hình, không thêm AI vào lớp.

## Triển khai worker

Web giữ Vercel + Neon + private Blob. Railway dùng `deploy/classroom-worker.Dockerfile`, cùng database/khóa mã hóa/Zoom/Blob với web; ClamAV là service riêng trong mạng nội bộ. Chạy worker bằng `npm run classroom:worker`. Web chạy tác vụ Zoom ngay khi lưu/đổi/hủy/đối soát buổi, dùng chung bộ xử lý lease với worker để không gọi Zoom trùng. Signed webhook dùng Next.js after để xử lý sau khi trả phản hồi. Worker vẫn cần cho quét tệp, retry tự động và dọn dữ liệu định kỳ; admin có thể thử lại tác vụ Zoom đang chờ/lỗi ngay trên web. Hàng việc có lease, retry/backoff và heartbeat, không xử lý `ExamGradingJob` và không tác động worker chấm VSTEP.

Scanner mất kết nối hoặc trả kết quả không xác định: tệp không thành CLEAN. Tệp 25 MB upload trực tiếp private Blob, web kiểm quyền và cấp token cho đúng pathname; worker kiểm signature/MIME và quét trước khi công bố. Tổng mỗi nội dung tối đa 5 tệp/100 MB. Local có upload qua server để thử; production không sử dụng đường multipart này.

## Dữ liệu và đồng thời

Migration `20261006040000_classrooms` chỉ thêm role TEACHER và bảng Classroom*. Có FK RESTRICT để giữ hồ sơ. Không reset/drop bảng VSTEP. Trước migration staging/production phải snapshot database hiện có; chạy `prisma migrate deploy` trên đúng database, không dùng `migrate reset`.

Nháp có revision; bài nộp bất biến theo phiên bản, requestKey chống gửi trùng. Nộp muộn đánh dấu theo giờ server. Giáo viên mở lại để nộp bản mới, grade null khác 0; chấm lớp không cộng XP.

Webhook xác minh raw bytes/timestamp, dedup và enqueue, không chờ xử lý Zoom trong request. Bộ xử lý chung rebuild từ sự kiện đã lưu, gộp reconnect/overlap, chỉ dùng customer_key grant được cấp, không tin tên/email từ participant. Thiếu danh tính/sự kiện/thời gian thực: PENDING. Đủ dữ liệu gợi ý >=80%; đi muộn >10 phút. Xác nhận của nhân sự và lý do được giữ riêng, webhook muộn không ghi đè.

Tạo phòng timeout/crash: NEEDS_RECONCILE, không thử tạo lại mù. Đối soát yêu cầu đúng host và agenda WEWIN_SESSION. Link app chỉ là fallback sau kiểm quyền, không là bằng chứng danh tính.

## Nghiệm thu

### Trạng thái tab học viên

Migration bổ sung `20261007040000_classroom_tab_attention` thêm ba trường nullable vào `ClassroomJoinGrant`. API `POST /api/sessions/:id/attention` chỉ nhận học viên có ghi danh, grant và thiết bị hợp lệ; `GET` chỉ cho giáo viên được phân công và admin. Chỉ giữ trạng thái hiện tại, không audit chuyển tab. Worker hiện có dọn mỗi phút; cần khởi động lại cả web và worker sau migration. Không cần biến môi trường hoặc dịch vụ mới. Xem `qa/classroom-tab-attention.md` để biết ngưỡng thời gian, kiểm thử và giới hạn tín hiệu tham khảo.

Unit/domain và integration database nằm ở `tests/classroom-*.test.ts`; integration chỉ chạy khi `CLASSROOM_DATABASE_QA=1` và URL chính xác database local riêng. Không dùng database chung để chạy test này. QA API/browser chỉ dùng tài khoản local. Các test mock/provider không chứng minh Zoom media thật.

Cần tiếp tục nghiệm thu khi đã có credentials: phòng 2 thiết bị, desktop/mobile audio/video/chat/raise-hand/share-screen, phòng 30 người, signed webhook trên public HTTPS, private Blob + ClamAV thật, rồi kiểm API/web với 200 tài khoản và 4 phòng tùy giấy phép Zoom. Chưa chứng nhận 200 hoặc 1.000 học viên Zoom đồng thời. Việc bật cờ dùng thử không thay thế nghiệm thu tải, media và quét tệp.

## Kiểm tra Zoom local thật ngày 06/10/2026

Đã vào phòng thật bằng giáo viên và học viên QA, duyệt phòng chờ, nhận chat, giơ/hạ tay và bật camera/mic mô phỏng. Đã thử client view ở viewport điện thoại, rời và vào lại. Camera/mic dùng thiết bị mô phỏng, chưa chứng minh chất lượng phần cứng hoặc hai máy thật. Chia sẻ màn hình và tải nhiều người chưa nghiệm thu.

Webhook tạm thời chỉ chuyển POST /api/zoom/webhook tới local; các đường khác trả 404. Zoom đã xác thực URL và app đăng ký đủ bốn sự kiện với scope meeting:read:participant:admin được tự thêm. Đã nhận/xử lý meeting.started và meeting.ended thật; chưa nhận được participant_joined/participant_left nên điểm danh tự động còn PENDING. Không suy đoán thiếu giấy phép là nguyên nhân khi chưa có bằng chứng.

Đường tunnel thay đổi khi mở lại và ngừng khi tắt tiến trình; cần cập nhật/xác thực lại subscription WEWIN local QA — temporary khi chạy lại. Không dùng endpoint này cho production. Tài khoản và hướng dẫn thử hiện tại ở .qa/classroom-review.txt.
