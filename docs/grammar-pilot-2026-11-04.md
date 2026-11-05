# Ngữ pháp VSTEP — nhóm thử ngày 04/11/2026

> Bản ghi lịch sử của nhóm thử ban đầu. Phần mở rộng đủ 40 chuyên đề và kết quả kiểm tra mới nằm trong [bàn giao ngày 05/11/2026](grammar-40-topics-2026-11-05.md).

## Phạm vi đã làm

Một nhóm thử gồm 3 chuyên đề đại diện: **01 Danh từ**, **13 Hiện tại đơn / Hiện tại tiếp diễn**, **39 Mệnh đề quan hệ**. Mỗi chuyên đề có 2 bài, mỗi bài 5 câu: tổng cộng 30 câu, 31 đơn vị chấm vì một câu có hai ô trống.

Nội dung được biên tập từ Word trong bộ 40 chuyên đề người dùng cung cấp. Mỗi chuyên đề ghi tên tệp nguồn, SHA-256 và ghi chú chuyển thể; từng câu có vị trí nguồn. Tệp gốc không bị sửa. Đây là bản thử cần trung tâm duyệt lại nội dung trước khi công bố thật.

Hỗ trợ 7 dạng: chọn đáp án, chọn một trong hai, điền từ, điền đoạn văn, xác định vị trí và sửa lỗi, sắp xếp thẻ từ, viết lại câu. Chấm bằng quy tắc và đáp án đã duyệt; không gọi AI, không cần khóa API mới.

## Những điểm đã sửa so với bộ khung ban đầu

- Đáp án chỉ ở máy chủ; trang danh sách chỉ đọc thông tin giới thiệu, trang làm bài chỉ nhận bài được chọn và không nhận đáp án mẫu trước khi nộp.
- Bỏ suy đoán dạng rút gọn mơ hồ như `he's` và `he'd`; người biên tập khai báo rõ các cách viết được chấp nhận. Không xóa phủ định hay dấu phẩy trong câu để ép khớp đáp án.
- Sửa câu nguồn chuyên đề 39 bị lặp tân ngữ: `... that I've ever met this woman` → `... that I've ever met`. Các ví dụ chuyển thể có ghi chú nguồn.
- Hoàn thành dựa trên **từng bài bắt buộc đạt ít nhất 80%**, không lấy một điểm cao nhất để hoàn thành toàn chuyên đề. Có thể luyện lại ngay.
- Câu chưa đúng được lên lịch ôn sau 10 phút. Trả lời đúng khi ôn sẽ giãn lịch 1, 3, 7, 14, 30, 60 ngày, dùng chung quy tắc lịch ôn hiện có. Bài ôn không thay điểm kiểm tra cuối bài.
- Bài làm thuộc đúng tài khoản đang hoạt động; khóa quyền quản trị tại máy chủ. Khách đọc lý thuyết; đăng nhập để luyện và lưu tiến độ.
- Mỗi lượt nộp có mã riêng. Gửi lại cùng mã và cùng câu trả lời trả về kết quả cũ, không ghi thêm. Ghi bài, tiến độ và lịch ôn trong cùng một giao dịch; có lỗi thì hoàn tác toàn bộ.
- Giữ nháp trong phiên trình duyệt. Khi gửi lỗi, giữ đáp án và mã nộp để thử lại. Bản nháp hỏng được bỏ qua an toàn.
- Nội dung được lưu theo phiên bản: nháp → đã duyệt → công bố → lưu trữ. Công bố bản mới lưu trữ bản đang công bố của cùng chuyên đề; bài làm cũ vẫn còn. Khôi phục bản lưu trữ phải duyệt lại trước khi công bố.

## Cách mở thử

- Học viên/khách: `http://localhost:3005/grammar`.
- Admin: `http://localhost:3005/manage/grammar`.
- Tài khoản QA và mật khẩu nằm riêng ở `D:\hanbee\.qa\GRAMMAR-TEST.txt`, không đưa vào Git.
- Database thử độc lập, PostgreSQL ở `127.0.0.1:5441`, database `wewin_grammar_utf8_qa`. Không sử dụng Neon production.
- Bộ mẫu chỉ được nạp/công bố trong QA. Mã nguồn không tự công bố dữ liệu mẫu khi chạy production.

Máy local dùng bản dựng Next production để kiểm tra. Các lệnh khởi động của môi trường QA đã chuẩn bị:

```powershell
node .qa/grammar-pg.mjs
node .qa/grammar-run.cjs node_modules/next/dist/bin/next start --port 3005
```

Mỗi lệnh chạy trong một cửa sổ riêng từ thư mục `D:\hanbee`. Các tệp `.qa` là công cụ thử trên máy này, đã bị loại khỏi Git.

## Quản trị nội dung

1. Mở Quản trị → Ngữ pháp.
2. Chọn một trong ba mẫu hoặc chọn tệp JSON đã chuẩn hóa, tối đa 128 KB.
3. Xem câu hỏi, đáp án, giải thích và vị trí nguồn. Có thể chỉnh JSON trong bản thử.
4. Lưu phiên bản. Nội dung trùng dùng lại bản cũ.
5. Mở “Xem như học viên” để chấm thử mà không lưu tiến độ.
6. Đối chiếu tài liệu rồi tích xác nhận và duyệt nội dung.
7. Công bố cho học viên khi đã duyệt. Có thể lưu trữ và khôi phục thành nháp.

Admin có toàn quyền nội dung. Giáo viên không được dùng màn quản trị này. Không có thao tác xóa lịch sử bài làm qua giao diện.

## Mã nguồn chính

- `src/lib/grammar-rules.ts`: kiểm định dữ liệu, chuẩn hóa và chấm 7 dạng.
- `src/lib/grammar.ts`: nhập/duyệt/công bố, tải bài, giao dịch lưu tiến độ, sổ lỗi sai.
- `src/data/grammar-pilot.json`: ba nội dung có truy vết nguồn, chỉ trả bộ đầy đủ qua API admin.
- `src/components/grammar`: màn làm bài, quản trị, giao diện sáng/tối và điện thoại.
- `src/app/(main)/grammar`: danh sách, lý thuyết, bài luyện, ôn lỗi.
- `src/app/api/grammar` và `src/app/api/manage/grammar`: kiểm quyền, kiểm cùng nguồn, giới hạn dữ liệu, trả lỗi an toàn.
- `prisma/migrations/20261104120000_grammar_pilot`: bốn bảng mới; không sửa dữ liệu từ vựng, đề thi hay video cũ.

## Kiểm tra

20 kiểm thử riêng của ngữ pháp, gồm đủ bảy dạng, không lộ đáp án, rút gọn, phủ định, thứ tự thẻ, nộp trùng song song, tài khoản khác, tài khoản khóa, nháp chưa công bố, thay phiên bản, lịch ôn và hoàn tác khi lỗi giữa lúc lưu. Cùng các kiểm thử từ vựng và tài khoản liên quan: **39/39 đã qua**.

Prisma validation, bản dựng production và lint đã qua. Lệnh lint bỏ qua duy nhất thư mục sao chép kiểm kê cũ `disk-audit-2026-10-10` (2.326 tệp mã ngoài ứng dụng); toàn bộ mã nguồn, scripts, tests và cấu hình hiện tại được kiểm.

Đã thao tác thật trên trình duyệt: đăng nhập học viên/admin; điền nháp rồi tải lại vẫn giữ câu và nội dung; ngắt máy chủ khi nộp rồi gửi lại; kết quả 3/5 chưa đạt, 4/5 đạt; chuyên đề chỉ hoàn thành sau khi bài thứ hai đạt; câu mới không giữ lựa chọn câu cũ; sửa lỗi, xếp từ, điền đoạn và viết lại câu; sáng/tối và màn hình điện thoại không tràn ngang. Tài khoản học viên QA có đúng 3 lượt nộp, 2 bài đạt; admin chấm thử có **0 lượt nộp / 0 tiến độ** trong database. Ảnh nằm ở `output/playwright/grammar-*.png`.

Migration đã thử trên database QA và trên bản QA có dữ liệu từ vựng cũ để kiểm tra trạng thái, số lần ôn và lịch ôn không đổi. Không chạy migration trên production.

## Chưa nằm trong nhóm thử

- Chưa chuyển hết 40 chuyên đề hoặc toàn bộ bài trong từng tệp. Mỗi chuyên đề thử chỉ có 10 câu đã biên tập.
- Chưa tự biến Word/PPT/PDF thành bộ câu hỏi được công bố; tài liệu KEY có lỗi nên vẫn cần bước biên tập và duyệt.
- Chưa thêm flashcard cụm động từ, đồ thị tiến độ, XP, gợi ý AI, chấm câu tự do ngoài các đáp án đã khai báo hay tô khác biệt từng từ.
- Chưa nghiệm thu nội dung bởi trung tâm, chưa kiểm tải 100 người đồng thời, chưa đo tốc độ trên hạ tầng production.
- Chưa push GitHub và chưa triển khai. Trước khi triển khai cần sao lưu database đích, chạy migration bổ sung và duyệt nội dung thật.

## Cập nhật cách trình bày kiến thức

- Trang chuyên đề dùng `GrammarTheory`: chia câu thành thẻ quy tắc, đánh số phần, làm nổi cấu trúc có trong bài; giữ nguyên lời biên soạn và ví dụ của phiên bản đã công bố.
- Ví dụ có đúng một dấu `→` trở thành thẻ bấm mở dạng chuyển đổi. Dùng phần tử `details/summary` của trình duyệt, hỗ trợ Enter/Space và hoạt động ngay cả khi chưa tải JavaScript.
- How many dùng nền xanh nhẹ, How much dùng vàng nhẹ; nhãn chữ và biểu tượng vẫn giúp phân biệt khi không nhận biết màu. Có biến màu riêng cho giao diện tối.
- Linh vật WebP có kích thước dành sẵn, không thêm thư viện hoặc yêu cầu API. Hiệu ứng mở ví dụ bằng CSS chỉ chạy khi người dùng không yêu cầu giảm chuyển động.
- Máy tính có cột bài luyện bên cạnh kiến thức; điện thoại xếp thành một cột. Dữ liệu, quyền truy cập, câu hỏi, chấm điểm và lịch ôn không thay đổi.
- Kiểm tra bảo toàn nội dung và nhận diện ví dụ chuyển đổi nằm trong `tests/grammar-theory.test.ts` (2 kiểm thử bổ sung).
- Đợt giao diện: 12/12 kiểm thử lý thuyết và chấm ngữ pháp đã qua; lint, Prisma validation và production build đã qua. Trình duyệt đã kiểm ba chuyên đề, mở/đóng bằng Enter/Space, sáng/tối và màn hình 375px không tràn ngang. Đã sửa trường hợp `Look! và Keep silent! thường...` bị chia vụn thành nhiều thẻ.
- Ảnh giao diện: `output/playwright/grammar-theory-redesign.jpg`, `grammar-theory-dark.jpg`, `grammar-theory-mobile-light.jpg`, `grammar-theory-mobile-dark.jpg`. Bản chạy thử tại `http://localhost:3005/grammar/danh-tu`; chưa push hoặc triển khai.
