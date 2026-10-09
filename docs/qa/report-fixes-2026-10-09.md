# Đối chiếu báo cáo kiểm thử ngày 09/10/2026

Đây là kết quả kiểm tra bản local trước khi push GitHub. Báo cáo không xác nhận trạng thái deployment production. Không thay đổi schema, không xóa bài làm hoặc dữ liệu production.

| Mục | Xử lý | Kiểm chứng |
| --- | --- | --- |
| F03: Reading mất đáp án và đặt lại thời gian khi tải lại | Giữ đáp án, nội dung Writing và hạn kết thúc tuyệt đối trong trình duyệt, tách theo tài khoản, bài và phiên bản nội dung. Khôi phục trước khi mở thao tác. Có nút làm lại sau nộp. | Kiểm thử trình duyệt tải lại, hết giờ, đổi danh tính; thao tác trên Next local giữ hai đáp án đã chọn, đồng hồ tiếp tục từ thời gian còn lại. |
| F04: bài cộng đồng chỉ có chữ bị lỗi ảnh | Bỏ trường ảnh rỗng ở client; server nhận trường File rỗng không tên như không đính kèm. Giữ kiểm loại và dung lượng ảnh thật. Bài chỉ có chữ không cần dịch vụ lưu ảnh. | 7 kiểm thử API; gửi bài từ giao diện local thành công. Database xác nhận PENDING, imageUrl=null. |
| F05: tra từ báo chưa cấu hình | Bổ sung tra từ tiếng Anh trong từ vựng cá nhân, sửa chiều Việt–Anh theo nghĩa tiếng Việt, hỗ trợ nghĩa nhiều từ ngắn. Thông báo rõ từ ngoài kho cần dịch vụ; giới hạn thời gian chờ dịch 10 giây. | 5 kiểm thử từ điển với dữ liệu giả, phân tách tài khoản, lỗi mạng và dịch vụ. Google thật chưa kiểm được: dự án mới yêu cầu billing, người dùng chọn để sau. |
| F07: Reading/Writing hiện 179 phút | Danh sách kỹ năng đọc thời lượng phần tương ứng; đề đầy đủ giữ tổng thời lượng. | 3 kiểm thử render trang: Reading/Writing 60 phút, đề đầy đủ 179 phút. |
| F09: mở lại URL Writing đã nộp thành bài trắng | Một URL gắn một attempt ngay khi bắt đầu. URL có attempt chỉ tải đúng attempt, không tạo lượt mới; kiểm khớp đề và kho kỹ năng trước khi hiển thị. | Kiểm thử trình duyệt hai tab, nộp tab thứ nhất rồi tải lại tab thứ hai, tải lại URL đã nộp; không tạo attempt mới. |
| Đáp án chưa tải ngay sau nộp | Thử lại tối đa hai lần khi lỗi mạng/404/5xx, có nút tải lại đáp án riêng. Không ghi đè kết quả chấm mới bằng phản hồi review cũ. | Kiểm thử trình duyệt giả lập 503 ba lần rồi tải lại thành công. |
| Lịch đã qua vẫn ghi sắp diễn ra | Nhãn dựa trên thời gian thực: Đến giờ học / Đã qua giờ học. Không đổi dữ liệu trạng thái buổi hoặc điểm danh. | 5 kiểm thử nhãn lịch, gồm đã hủy/kết thúc. |
| Độ tương phản bài tập dark mode | Nền đồng hồ dùng token bề mặt; số câu dùng nền xanh với chữ trắng. | Kiểm tra trực quan bản build local sáng/tối. |

## Kết quả chạy

- Bộ kiểm thử với database QA riêng: 242 passed, 14 skipped; giới hạn 2 worker. Một lần chạy mặc định nhiều worker trước đó có timeout ở attention, lần chạy toàn bộ có giới hạn worker đã qua.
- Kiểm thử trình duyệt ExamTake/LearningExercisePlayer: 1 passed, gồm nhiều bước tải lại, hai tab, ghi âm giả, nộp bài và lỗi tạm thời. API và micro trong kiểm thử này được giả lập; không phải nghiệm thu OpenAI hoặc Zoom thật.
- ESLint: passed.
- Build production local sau thay đổi màu: passed.
- Prisma validation: passed. Không có migration mới.
- Kiểm tra giao diện Next thực tế: desktop sáng/tối, bố cục di động ở chiều rộng thực tế 500px, không tràn ngang. Công cụ trình duyệt áp ngưỡng 500px dù yêu cầu 375px; chưa xác nhận trực quan ở đúng 375px.

## Giới hạn và phần chờ

- Giữ bài tập bằng localStorage chỉ áp dụng cùng trình duyệt, không đồng bộ sang thiết bị khác. Khi trình duyệt chặn lưu, giao diện cảnh báo. Audio Speaking của bài tập vẫn chỉ nằm trong phiên hiện tại.
- GOOGLE_TRANSLATE_API_KEY chưa được tạo. Dự án Google Cloud `wewin-vstep-translation` đã tạo nhưng API bị chặn bởi yêu cầu billing. Người dùng yêu cầu để phần này sau; chưa đặt quota, chưa thêm biến vào Vercel.
- Writing tổng chưa hiện khi một task không đánh giá được là hành vi giữ nguyên: cần hai điểm task để tính trọng số 1:2, không tự suy diễn điểm thiếu.
- Không tuyên bố nghiệm thu lại toàn bộ Speaking, game, Zoom thật, quyền của mọi vai trò hoặc kiểm tải từ đợt sửa này.
- Dữ liệu QA mới chỉ nằm ở database local riêng: một bài Reading và một bài cộng đồng chờ duyệt. Không có dữ liệu bị xóa; không cần khôi phục backup.

## Tự kiểm tra local

1. Mở `http://localhost:3000/practice/content/qa-report-reading-20261009` bằng tài khoản QA local (thông tin nằm ở `.qa/classroom-review.txt`, không commit).
2. Chọn đáp án, tải lại: đáp án vẫn được chọn và thời gian không quay về 7 phút.
3. Nộp bài, tải lại: bài vẫn đã nộp; bấm Làm lại bài để bắt đầu lại.
4. Tại `/feed`, gửi nội dung tối thiểu 10 ký tự không chọn ảnh: nhận thông báo đang chờ admin duyệt.
5. Dùng bản đề thực có trên môi trường cần nghiệm thu để kiểm lại thời lượng danh sách kỹ năng và mở URL Writing đã nộp từ lịch sử sau khi triển khai.
