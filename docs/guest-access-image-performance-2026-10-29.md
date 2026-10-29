# Khách học thử, từ vựng và tối ưu ảnh — 29/10/2026

## Thay đổi

- Logo header, đăng nhập, footer và màn thi dùng WebP theo đúng tỷ lệ 600 × 135; kích thước hiển thị được khai báo để tránh nhảy bố cục.
- Banner game dùng ảnh WebP qua Next Image thay cho WebGL ở màn chờ. Hoạt cảnh trong trận giữ nguyên.
- Chuyển 23 ảnh PNG/JPEG giao diện sang WebP: **26.713.904 → 1.363.572 byte**, giảm khoảng **95% dung lượng nguồn của nhóm ảnh này**. Đây không phải cam kết toàn website tải nhanh hơn 95%. PNG gốc được giữ để chỉnh sửa/tạo lại ảnh; code giao diện dùng WebP. Chạy lại bằng `node scripts/optimize-public-images.mjs`.
- Kho luyện từng kỹ năng chỉ gửi phần nội dung được chọn xuống trình duyệt. Full Test vẫn có đầy đủ bốn kỹ năng; không nén mất chữ, đáp án hoặc chất lượng audio đề.
- Khách xem chủ đề, tìm từ, phân trang, học flashcard, xem mẹo nhớ và collocations mà không cần tài khoản. Dấu nhớ của khách chỉ có trong trạng thái học hiện tại. Sổ tay và API lưu tiến độ vẫn yêu cầu đăng nhập.
- Flashcard dùng token nền và màu chữ chung trong sáng/tối, gồm cả thanh đầu và phần chân thẻ.
- Học thử: lượt đang làm còn hạn tiếp tục với đồng hồ cũ. Lượt đã hết hạn/đã nộp nhưng hoàn toàn trống được thay bằng lượt mới, dùng lại suất đề đã có. Bài cũ có câu trả lời hoặc bản ghi không bị ghi đè; không cấp thêm lượt chấm cho bài đã hoàn thành. Giữ hạn mức hai đề khác nhau mỗi kho.
- Audio của đề đã công bố có thể nghe từ màn kiểm tra loa trước khi tạo cookie học thử. Phiên bị khóa/hết hiệu lực vẫn bị từ chối; khách không đọc được audio của đề chưa công bố. Giữ giới hạn tần suất và tải audio theo từng khoảng byte.

## Kiểm tra

- Unit: 259 pass, 18 skip theo cấu hình môi trường; có test hồi quy cho khôi phục lượt trống, hạn mức, nội dung từng kỹ năng, truy cập từ vựng và quyền audio khách.
- Hai bộ kiểm tra trình duyệt: làm bài/lưu/nộp/ghi âm và flashcard/phân trang/khách/sáng-tối/375px đều pass. Dùng dữ liệu mô phỏng và media mô phỏng trong các bộ test này.
- Kiểm tra thêm trên ứng dụng local với database hiện có: mở từ vựng/flashcard bằng khách; vào Reading có đồng hồ; đánh dấu lượt QA trống của chính phiên thử là đã nộp/hết hạn rồi mở lại, nhận lượt mới thay vì màn kết quả.
- Phiên trình duyệt khách mới: nghe audio mẫu, bấm Nhận đề và vào Full Test thành công. Yêu cầu audio không có cookie trả 206, đúng 1.024 byte được yêu cầu thay vì tải toàn bộ tệp 10 MB.
- Lint, build production, Prisma validation và `git diff --check` đều qua. Database local được khởi động trước build cuối; không cần migration.
- Ảnh chụp nằm trong `output/playwright/`; ảnh kiểm tra tự động nằm trong `.qa/` (không đưa vào Git).
- Lint chạy với `--ignore-pattern "disk-audit-*/**"` để bỏ qua thư mục sao lưu máy nằm ngoài mã nguồn.

Không có thay đổi schema/migration hoặc biến môi trường mới.
