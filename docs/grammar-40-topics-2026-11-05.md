# Ngữ pháp VSTEP — đủ 40 chuyên đề

## Phạm vi bàn giao local

- 40 chuyên đề theo số thứ tự của bộ tài liệu gốc, chia 6 nhóm kiến thức.
- 80 bài luyện, mỗi chuyên đề 2 bài × 5 câu: **400 câu chọn lọc**, 401 đơn vị chấm vì một câu cũ có hai ô trống. Đây không phải toàn bộ bài tập trong các worksheet gốc.
- Mỗi chuyên đề có lý thuyết tiếng Việt, ví dụ, giải thích đáp án và nguồn câu hỏi. Dùng giao diện lý thuyết trực quan đã duyệt: thẻ quy tắc, nhấn cấu trúc, ví dụ chuyển đổi mở bằng bàn phím, linh vật WebP, sáng/tối và điện thoại.
- Giữ nguyên nội dung và mã phiên bản của ba chuyên đề thử 01, 13, 39 để giữ tiến độ cũ.
- Danh mục có tìm kiếm không dấu và lọc nhóm. Chỉ nhận tóm tắt; không nhận nội dung hoặc đáp án của cả kho. Liên kết danh mục không tự tải trước 40 bài.
- Admin chọn một trong 40 chuyên đề, chỉ tải nội dung đã chọn vào trình biên tập. Giữ quy trình nháp → duyệt → công bố, xem trước và lưu trữ/khôi phục phiên bản.

Các nhóm: Từ loại và cấu tạo từ (7), Ngữ âm và trọng âm (2), Các thì và phối hợp thì (16), Dạng động từ và cụm động từ (4), Cấu trúc và biến đổi câu (6), Mệnh đề và liên từ (5).

## Dữ liệu và nội dung

- `src/data/grammar-topics.json`: nội dung chuẩn hóa đầy đủ, chỉ dùng ở máy chủ. `grammar-pilot.json` giữ ba bản gốc làm đối chiếu.
- `src/data/grammar-catalog.json`: thông tin ngắn và nhóm, dùng được ở trình duyệt; không có đáp án.
- `docs/grammar-source-audit.json`: nguồn, SHA-256 worksheet/KEY và ghi chú chỉnh sửa cho 37 chuyên đề bổ sung. Ba chuyên đề thử có thông tin nguồn trong nội dung gốc.
- Các lỗi KEY rõ ràng đã sửa, ví dụ `Max is a good singer`, `easily`, `fast enough`, `more interesting`, `would visit`. Câu nguồn hỏng hoặc mơ hồ được bỏ hoặc bổ sung chỉ dẫn rõ, thay vì ép một đáp án.
- Chuyên đề 05–06 hiện là bài nhận biết bằng chữ, chưa có audio hoặc chấm phát âm qua micro. Câu điều kiện hiện tập trung loại 1–2 theo các câu đã chọn. Lý thuyết là bản ghi nhớ ngắn, không thay thế toàn bộ giáo trình gốc.
- Không gọi AI, không cần biến môi trường hoặc khóa API mới. Không cộng XP mới cho ngữ pháp.

## Cách mở thử

- Học: http://localhost:3005/grammar
- Admin: http://localhost:3005/manage/grammar
- Tài khoản thử nằm riêng tại `D:\hanbee\.qa\GRAMMAR-TEST.txt`.
- Database QA riêng tại `127.0.0.1:5441/wewin_grammar_utf8_qa`. Đã nạp và công bố cả 40 chỉ trong QA.
- Nếu cần mở lại: chạy `node .qa/grammar-pg.mjs`, sau đó `node .qa/grammar-run.cjs node_modules/next/dist/bin/next start --port 3005`, mỗi lệnh ở một cửa sổ riêng từ `D:\hanbee`.

## Nhập ở môi trường đích sau khi duyệt

Chưa sửa database production, chưa push GitHub hoặc triển khai. Sau khi sao lưu database đích và áp dụng migration bổ sung `20261104120000_grammar_pilot`, có thể nhập bản nháp bằng:

```powershell
node --conditions=react-server --import tsx scripts/import-grammar-library.ts --admin=<ID-admin-dang-hoat-dong>
```

Thêm `--topic=<slug>` để nhập riêng một chuyên đề. Công cụ không tự duyệt/công bố. Nội dung trùng dùng lại phiên bản đã có; sửa nội dung tạo phiên bản mới. Admin cần đối chiếu học liệu và duyệt trước khi công bố thật.

## Kết quả kiểm tra

- 46/46 kiểm thử trong 8 tệp đã qua: toàn bộ 400 đáp án và các biến thể khai báo, đủ 40 số/chủ đề, nguồn, không lộ đáp án trước khi nộp, quyền API, giữ phiên bản ba bài cũ, tiến độ/lịch ôn, gửi trùng và giao dịch lỗi; cùng kiểm thử từ vựng, gamification và xóa tài khoản liên quan.
- Nhập QA giữ nguyên 3 lượt làm, 2 tiến độ và 2 bản ghi ôn cũ. Nhập lại không tạo phiên bản trùng. Sau đó kiểm thử trình duyệt tạo thêm một lượt 5/5 cho admin QA ở chuyên đề 02.
- Lint toàn ứng dụng đã qua, chỉ loại thư mục kiểm kê cũ `disk-audit-2026-10-10`; Prisma validation và Next production build đã qua.
- Trình duyệt: đủ 40 danh mục, tìm không dấu, nhóm ngữ âm trả đúng 2 bài; admin có đủ 40 lựa chọn và mở chuyên đề 40 với 10 câu; chuyên đề 02 nộp 5/5 và lưu kết quả; 375px sáng/tối không tràn ngang.
- Ảnh: `output/playwright/grammar-40-catalog.jpg`, `grammar-40-mobile-dark.jpg`, cùng ảnh lý thuyết trong thư mục này.

Chưa nghiệm thu nội dung với trung tâm hoặc kiểm tải đồng thời trên hạ tầng thật.
