# Tải dữ liệu học tập và Học hôm nay

## Phạm vi

- Danh sách đề: 12 đề/trang, chỉ lấy thông tin tóm tắt; giữ bộ lọc kỹ năng.
- Full Test: trang chuẩn bị chỉ nhận nội dung Nghe và thông tin thời lượng/số câu của bốn kỹ năng. Khi vào làm, tải trước tối đa kỹ năng kế tiếp sau 1,5 giây. Phần đã tải được giữ trong bộ nhớ của lượt mở trang; yêu cầu trùng được gộp.
- Luyện riêng kỹ năng: đọc nội dung của hàng ExamPaperPart tương ứng, không đọc cả đề. Đề nhập cũ thiếu hàng kỹ năng vẫn có đường dự phòng đọc đề đầy đủ ở server, nhưng chỉ gửi kỹ năng đã chọn cho trình duyệt.
- Lỗi tải/chậm quá 20 giây khi chuyển kỹ năng: giữ nguyên phần đang làm và đáp án để thử lại. API luôn kiểm trạng thái công bố và tài khoản hiện hành; không trả đáp án đúng của đề.
- Audio: giữ streaming/tải từng đoạn và cache riêng một giờ. Kiểm quyền bằng truy vấn JSON có chỉ mục thay vì đọc nội dung tất cả đề vào máy chủ.
- Danh sách video: 12 bài/trang, tìm tên và lọc tại server. Chỉ lấy thông tin thẻ; không lấy transcript/câu hỏi, không tự tải trước trang chi tiết.
- Bài video được mở mới lấy transcript/câu hỏi của chính bài đó. Transcript ngoài vùng nhìn được giảm chi phí vẽ, chưa chia transcript thành các lần tải riêng. Video vẫn phát từ YouTube.
- Tiến độ video: không ghi lặp khi nội dung không đổi; gửi tuần tự/gộp yêu cầu đang chờ. Lấy/lưu tiến độ không đọc transcript. Nếu tải tiến độ cũ lỗi, không ghi đè bằng trạng thái rỗng.

## Học hôm nay

- Đường dẫn `/vocabulary/today`, có trong menu Từ vựng và trang kho từ.
- Mặc định 10 từ mới, chọn 5/10/15/20 cho lượt mới. Mục tiêu không giới hạn số bài có thể học thêm trong ngày.
- Từ đến hạn ôn được ưu tiên trước, tối đa 20 từ/lượt. Khi hết từ đến hạn mới lấy từ mới.
- Mỗi lượt chỉ đọc các từ thuộc lượt đó; không tải cả kho. Chưa tải trước bài tiếp vì danh sách còn phụ thuộc kết quả/lịch ôn mới.
- Lật thẻ, nghe phát âm, chọn đã nhớ hoặc đưa xuống cuối lượt; sau đó làm kiểm tra chọn nghĩa. Đạt ít nhất 80% mở bài mới ngay. Chưa đạt thì ôn từ sai rồi kiểm tra lại.
- Ghi tiến độ khi bài đạt: từ đúng giãn lịch ôn 1/3/7/14/30/60 ngày, từ sai hẹn lại sau 10 phút. Một bài gửi kết quả trùng chỉ được ghi một lần.
- Lưu một bài đang học cho mỗi tài khoản. Tải lại tiếp tục đúng bộ từ; vị trí thẻ/câu trả lời chưa nộp chưa được đồng bộ qua lần tải lại. Khi lỗi mạng trong trang đang mở, giữ nguyên câu trả lời để gửi lại.
- Ngày học tính theo giờ Việt Nam. Mốc ngày đầu học chỉ ghi cho từ mới hoàn thành trong lộ trình, không tự gán ngày học lịch sử.
- Kho theo chủ đề và flashcard tra cứu vẫn mở cho khách; lộ trình/lịch ôn riêng cần đăng nhập. Không thêm AI, dịch vụ ngoài hoặc phần thưởng XP.

## Dữ liệu và triển khai

Migration bổ sung: `20261104090000_vocabulary_study`.

- Thêm lịch ôn vào VocabularyProgress, bảng bài hiện tại VocabularyStudy, các chỉ mục tra lịch ôn và JSON đề thi.
- Không xóa trạng thái học, ghi chú, số lần ôn hoặc bài làm cũ. Từ đã đánh dấu đang học/đã nhớ được đưa vào hàng ôn bằng thời điểm ôn cuối có sẵn.
- Đã áp dụng và kiểm trên database QA riêng tại máy. Đã thử migration với hàng tiến độ có sẵn và xác nhận giữ trạng thái, ghi chú, số lần ôn, thời điểm ôn trước đó.
- Kiểm tra local chưa áp dụng lên Neon thật. Cấu hình `vercel.json` chạy `prisma migrate deploy` trước bước build khi triển khai qua Vercel. Cần kiểm tra kết quả migration/deployment và dữ liệu cũ sau khi triển khai; bản kiểm tra local không xác nhận trạng thái production.

## Kiểm tra

- Unit/integration: lịch ôn, mốc 80%, giờ Việt Nam, tiếp tục bài, chống ghi trùng, tách tài khoản, ưu tiên ôn, giữ ghi chú/bộ đếm, giới hạn dữ liệu danh sách video, kiểm quyền đề và tương thích đề nhập cũ.
- Trình duyệt với dữ liệu giả chỉ trên QA local: khách mở kho/flashcard; học 5 từ; tải lại giữ bài; 3/5 chưa mở bài; 4/5 mở ngay lượt tiếp; sáng/tối, chiều rộng 375px và lật thẻ không tràn ngang.
- Video: 12 thẻ/trang, sang trang tiếp, HTML danh sách không có transcript; chi tiết có transcript. Khi video dừng và dữ liệu không đổi, không có POST tiến độ lặp trong hai chu kỳ 10 giây.
- Đề: HTML chuẩn bị chỉ có nội dung Nghe; audio Range trả 206 đúng số byte; chuyển Đọc/Viết; mô phỏng lỗi tải Viết vẫn giữ Đọc; thử lại tải được và quay về Nghe vẫn giữ đáp án đã chọn.
- Chưa đo độ trễ thực trên production hoặc kiểm tải nhiều người. Chưa kiểm chấm AI/micro/ghi âm vì không thay đổi các luồng đó.
- Kết quả cuối: 28 kiểm thử qua (5 file); Prisma validation, TypeScript/build production và lint qua. Lint loại trừ thư mục kiểm kê ổ đĩa cũ `disk-audit-2026-10-10/**`, không thuộc mã ứng dụng. Trình duyệt và máy chủ/database thử nghiệm đã dừng sau kiểm tra.
