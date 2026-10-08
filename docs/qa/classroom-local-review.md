# Kiểm thử và bản xem lớp học online — 06/10/2026

> Cập nhật 08/10/2026: theo yêu cầu, đã bỏ quét virus và phụ thuộc ClamAV. Các ca quét bên dưới là kết quả lịch sử của bản cũ; cấu hình và luồng hiện tại xem `../classroom-integration.md` và `../classroom-presentation.md`. Không cần migration cho việc bỏ máy quét.

## Cập nhật 07/10/2026 — trạng thái tab

Web và worker đã chạy lại sau khi WSL phục hồi. Migration ba trường trạng thái đã áp dụng vào QA riêng; database VSTEP chính không thay đổi. Giáo viên/admin có panel Trạng thái tab, học viên có thông báo trước khi vào. Không lưu lịch sử chuyển tab. Kết quả kiểm thử và phần cần kiểm trên thiết bị thật nằm trong [classroom-tab-attention.md](classroom-tab-attention.md). Tài khoản, giờ và đường vào buổi local mới nằm trong `.qa/classroom-review.txt`. Tunnel webhook tạm trước đó không được khởi động lại trong lượt này; không coi các ghi chú tunnel ngày 06/10 bên dưới là trạng thái đang chạy hiện tại. Không push GitHub hoặc triển khai production.

Bố cục A đã chọn được triển khai vào VSTEP: danh sách lớp → mở trang chi tiết. Chưa commit, push hay triển khai công khai. Dữ liệu thử nằm trong database riêng ở localhost:5434, không phải database VSTEP đang sử dụng.

## Mở để kiểm tra

- Web: http://localhost:3000/classes (máy chủ bản build đang chạy).
- Tài khoản admin/giáo viên/học viên: `D:\hanbee\.qa\classroom-review.txt` (mật khẩu local, file không đưa vào Git).
- Chọn giao diện sáng/tối/theo thiết bị trong menu tài khoản.
- Học viên mở lớp → Bài tập → xem bài Writing Task 1 đã nộp và nhận điểm 8.5 từ giáo viên thử.
- Giáo viên mở lớp → Học liệu để thêm/chỉnh nội dung; mở Bài tập để giao/chấm/trả/mở lại bài.
- Admin còn có Quản trị → Lớp & ghi danh, Lịch học, Zoom & tác vụ, Tài khoản.

## Kết quả thực chạy

| Kiểm tra                   | Kết quả                | Phạm vi                                                                                                                                 |
| -------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Build Next.js              | Đạt                    | Compile, lint, kiểm kiểu và sinh routes                                                                                                 |
| Prisma validate            | Đạt                    | Schema có role TEACHER và bảng lớp học                                                                                                  |
| Unit suite                 | 211 đạt, 15 bỏ qua     | 31 file đạt; 5 file được skip theo cấu hình                                                                                             |
| Integration database riêng | 15/15 đạt trong 3 file | Có test quyền, ghi danh/sĩ số, draft revision, nộp đồng thời, bản nộp bất biến, điểm 0, mở lại, XP không đổi                            |
| API trên server đang chạy  | 41/41 đạt              | Khách/ngoài lớp bị chặn; teacher không quản lý tài khoản/ghi danh/lịch/kết nối; CSRF; nháp/công bố; nộp/chấm/mở lại; tệp; CSV           |
| Browser thao tác thật      | Đạt                    | Học viên lưu nháp/nộp qua xác nhận; giáo viên trả điểm 8.5/nhận xét; học viên thấy kết quả                                              |
| Device grant               | Đạt trong DB test      | Cùng thiết bị tái sử dụng grant; thiết bị khác 409; teacher giải phóng cần lý do                                                        |
| Webhook                    | Đạt trong unit + DB    | Raw signature/timestamp, URL validation, đúng leave/end time, trùng và đảo thứ tự; reconnect gộp 50 phút, final EXCUSED không bị ghi đè |
| Zoom sync                  | Đạt với provider giả   | Worker cũ hoàn tất sau đổi lịch thì tạo tác vụ đồng bộ lại; chưa gọi Zoom thật                                                          |
| Quét tệp                   | 4/4 ca đạt             | TCP scanner giả kiểm giao thức: CLEAN, malware REJECTED, scanner lỗi SCAN_FAILED, MIME giả bị chặn; không phải nghiệm thu ClamAV thật   |
| Worker một lượt            | Đạt                    | Khởi động/chạy/thoát với cấu hình QA; chưa nghiệm thu Railway                                                                           |
| Smoke UI                   | 21/21 màn/khổ đạt      | 4 vai trò, sáng/tối, 375/1280/1440/1920; HTTP 200, không pageerror, không trắng, không tràn ngang                                       |
| API bản build local        | 200/200 HTTP 200       | 20 yêu cầu đồng thời, GET /api/classes; p50 83ms, p95 212ms, max 228ms                                                                  |

200 yêu cầu với một tài khoản local **không chứng minh 200 học viên hoặc phòng Zoom đồng thời**. Suite có ca bị skip (bao gồm integration DB khi chạy unit thông thường); không tuyên bố toàn bộ production đã nghiệm thu. Các màn VSTEP cũ chỉ smoke tải trang ở local, không chạy lại chấm AI thật.

## Đối chiếu wireframe A

| Khối                | Wireframe                                            | Bản dựng                                                                                       | Đối chiếu                                                                                      |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Khung chung         | Header + sidebar                                     | Header/sidebar VSTEP, logo WEWIN, menu lớp và theme                                            | Giữ khung VSTEP để không mất các chức năng đã có; không đưa nút đổi A/B/role mẫu vào sản phẩm  |
| Đầu trang           | Tên mục, mô tả, nút tạo cho admin                    | Đủ các phần; teacher/học viên không có tạo lớp                                                 | Khớp cấu trúc; câu chữ mô tả theo quyền thật                                                   |
| Bộ lọc              | Tìm tên/mã + trạng thái                              | Tìm tên/mã + trạng thái ACTIVE/COMPLETED/ARCHIVED                                              | Khớp; 375px xuống hai hàng để không bóp ô nhập                                                 |
| Danh sách           | Hai card dữ liệu giả, CTA mở lớp                     | Card lớp thật từ DB QA; mã, giáo viên, sĩ số, bài tập, buổi gần nhất                           | Wireframe 2 lớp, QA 1 lớp nên bên phải chưa có card; không dựng lớp giả vào database hiện hành |
| Dòng chữ trong card | Tên 1 dòng desktop, giáo viên/mã 1 dòng, lịch 1 dòng | Tên 1 dòng desktop/mobile mẫu; giáo viên 1 dòng; nhãn lịch và giờ 2 dòng; sĩ số/bài tập 1 hàng | Lịch dùng ngày/giờ Việt Nam thật, mã tách đầu card để quét dễ hơn                              |
| Mở chi tiết         | A mở trang riêng                                     | Tổng quan / Buổi học / Học liệu / Bài tập / Kết quả                                            | Khớp; không áp bố cục B hai panel                                                              |
| Theme/mobile        | Có lựa chọn sáng/tối mẫu                             | Theme lưu lựa chọn, mobile menu và thanh điều hướng; teacher có shortcut Lớp học               | Khớp ý định, menu dùng phân quyền server                                                       |

## Soi bằng mắt

Đã mở ảnh 375, 1440 và 1920; cũng xem trang học liệu và màn chấm bài ở dark mode.

1. Card cùng loại dùng chung khung; dữ liệu QA chỉ có một lớp nên chưa thể dùng ảnh để kết luận nhiều card dài khác nhau luôn cân nhau. Grid/card flex giữ nút ở cuối.
2. Nút Mở lớp, Tạo lớp và Thêm học liệu rõ; link quay về màu brand và có mũi tên. Chỉnh sửa là thao tác phụ.
3. Danh sách có một khung card và nền lịch không viền. Chi tiết có khung nội dung và dòng học liệu/bài nộp để phân biệt từng tài liệu hoặc phiên bản; form chấm nằm dưới bản nộp.
4. 1920 giới hạn vùng đọc 1120px; khoảng hai bên là chủ ý, cột card thứ hai trống do một lớp thử. Không có panel chi tiết rỗng của bố cục B.
5. Hành động chính của học viên là Mở lớp; của giáo viên là học liệu/bài nộp; admin có thêm Tạo lớp. Nút được nhấn theo vai trò.

Probe cuối đo 375/768/1280/1440/1920: không overflow, không chữ dưới 12px và không cảnh báo tương phản chữ tại route lớp. Báo cáo raw vẫn có nhận xét về thiết kế/chrome; không gọi probe là hoàn toàn sạch:

- P1: thẻ thống kê VSTEP chủ ý chia hai hàng trên 375 để giữ đủ dữ liệu và dễ đọc.
- P2/P5: hover XP dùng nền rất nhạt từ khung VSTEP, giữ hiện tại; không ảnh hưởng thao tác/đọc.
- P3: đo lại bằng hover thật thấy nút Tạo lớp đổi rgb(0,74,173) → rgb(0,58,140); loại cảnh báo hover không đổi của probe.
- P4: Chỉnh sửa là nút phụ, hover đổi chữ; nền trắng trùng card nên phản hồi nền còn nhẹ.
- P6–P9: hover sidebar khung VSTEP còn nhẹ; không thay nhận diện và phân cấp menu trong đợt này.
- Giữ focus outline và control HTML có bàn phím/native mobile; không bỏ khả năng nhận biết focus để thỏa luật hình thức của probe. Select được tô theo token/theme, popup lựa chọn theo nền tảng thiết bị.
- Wireframe tự chứa toolbar A/B/role mẫu và nội dung giả; các chênh lệch chữ/data và menu VSTEP so tự động được giải thích ở bảng trên.

Còn thấy: hover của các thao tác phụ/menu cũ còn nhẹ; nếu muốn tăng độ nổi có thể chỉnh riêng sau khi xem thử. Đây không phải lỗi phân quyền hoặc cổng chặn bản xem.

## Ảnh để đối chiếu

- Desktop sáng: ../../output/playwright/classroom-final-1-admin-1440-light.png
- Desktop 1920: ../../output/playwright/classroom-final-2-admin-1920-light.png
- Mobile tối: ../../output/playwright/classroom-final-3-admin-375-dark.png
- Học liệu giáo viên mobile: ../../output/playwright/classroom-final-10-teacher-375-dark.png
- Chấm bài tối: ../../output/playwright/classroom-final-11-teacher-1440-dark.png
- Ảnh/probe dữ liệu đo: ../../output/classroom-probe-final/report.json
- Trang so sánh: ../../output/classroom-review.html

## Kiểm tra khi chưa bật lớp học online

Đã bổ sung và chạy đạt 6 ca regression: quản lý tài khoản chỉ dùng role LEARNER khi flag false, chỉ thêm TEACHER khi flag true; không cấp giáo viên khi chưa bật; xóa tài khoản không truy vấn bảng lớp chưa migration; có hồ sơ thì bị chặn khi module bật và FK vẫn bảo vệ khi module đã tắt. Đây là các ca bổ sung nằm trong tổng 211 unit/15 focused ở trên.

## Cần cấu hình và nghiệm thu tiếp

Xem `../classroom-integration.md` để biết toàn bộ biến Zoom/khóa mã hóa/Blob/ClamAV và cách chạy worker. Đã nhận và cấu hình thông tin Zoom thật trong các tệp local bị Git bỏ qua. Ngày 06/10/2026 đã cấu hình và kích hoạt app Backend trong Zoom Marketplace; OAuth, đọc host, lấy ZAK và tạo/đọc/cập nhật/xóa phòng QA thật đều đạt. Đã bổ sung kiểm tra phòng thật sau bước cấu hình; xem phần cập nhật Zoom local ở cuối tài liệu. Bản local build không có private Blob/scanner thật; đính kèm chưa dùng trọn luồng. Database VSTEP chính chưa chạy migration. Không bật production flag hoặc triển khai chỉ dựa vào các test local này.

## Kiểm tra cấu hình Zoom thật — 06/10/2026

- My Zoom Backend: bổ sung thông tin WEWIN Education, liên hệ officemanager@wewin.edu.vn, mục đích sử dụng dữ liệu và 8 granular scopes; đã kích hoạt.
- Scopes: meeting:write:meeting:admin, meeting:read:meeting:admin, meeting:update:meeting:admin, meeting:delete:meeting:admin, meeting:read:list_meetings:admin, user:read:user:admin, user:read:token:admin, user:read:list_users:admin.
- OAuth và danh sách host: HTTP 200. Hồ sơ cùng account và token ZAK: đạt. Tạo, đọc, cập nhật và xóa chỉ phòng QA vừa tạo: đạt; phòng thử đã được dọn.
- General app 421: Meeting SDK đã bật; Client ID/Secret đã đối chiếu trường trên Marketplace. Local Test vẫn Not ready; chưa xác nhận vào phòng/media thật.
- Đã sửa Account ID do chữ I/l trong ảnh khó phân biệt. Secret webhook cấu hình local được đồng bộ với app Backend; secret người dùng cung cấp ban đầu thuộc General app. Không tạo lại credential.
- Webhook local sau đồng bộ: 4/4 ca đạt. Chưa phải sự kiện gửi từ Zoom.
- Host duy nhất wewineduca@gmail.com đang Basic (type 1). Xác minh host trong ứng dụng trả 400 đúng quy tắc giấy phép của bản tích hợp; chưa có host được xác minh để mở lớp.
- Endpoint người dùng cung cấp https://we-win-vstep.vercel.app/api/zoom/webhook trả HTTP 404 (HTML) khi gửi signed URL-validation. Chưa đăng ký Event Subscriptions vào endpoint chưa hoạt động.
- Bản local đã khởi động lại với cấu hình mới. Không push/commit, không triển khai Vercel, không migration database VSTEP chính, không mua/nâng cấp giấy phép.
- Bằng chứng: ../../output/playwright/zoom-backend-activated.png và ../../output/playwright/zoom-meeting-sdk-enabled.png.

## Cập nhật kiểm tra phòng Zoom local thật — 06/10/2026

Các mục cấu hình ở phần trước là kết quả tại thời điểm trước khi cho phép Basic trên QA. Bản hiện tại đã dùng host Basic thật trong database riêng; không nâng cấp tài khoản hay thay đổi điều kiện host production.

| Ca kiểm tra | Kết quả |
| --- | --- |
| Basic 20 phút / từ chối 60 phút | Đạt, xác minh host vẫn ghi licensed=false |
| Host mở phòng bằng ZAK, học viên được duyệt | Đạt, hai participant trong phòng Zoom thật |
| Chat hai tài khoản, giơ/hạ tay | Đạt |
| Camera và mic | Bật được thiết bị mô phỏng; phần cứng thật chưa kiểm |
| Mobile client view, rời/vào lại | Đã vào/được duyệt và rời; viewport 375px trên Chrome, không phải điện thoại thật |
| Người ngoài lớp / thiết bị thứ hai | HTTP 403 / 409 đúng quyền, sau khi trả fixture outsider về trạng thái ngoài lớp |
| Webhook HTTPS thật | Zoom CRC xác thực, nhận started/ended và worker xử lý |
| Webhook participant, điểm danh tự động | Chưa nhận participant events; PENDING, chưa nghiệm thu |
| Share-screen, hai máy, nhiều người | Chưa nghiệm thu |

Đã chỉnh video desktop rộng theo iframe và báo chiều cao thực để không cắt thanh điều khiển; đưa panel/dialog Zoom vào trong iframe. Điện thoại dùng khung phòng dưới header, phủ thanh điều hướng để các nút Zoom dùng được. Nhãn host Basic đã xác minh hiển thị đúng. Trạng thái mobile dựa vào callback thành công và sự kiện kết nối của SDK; callback đã được kiểm tra bằng lần vào lại thật. Khung mobile cố định dưới header, nút Rời lớp ở trên; mic và nút Thêm bấm được ở 375×812.

Kiểm tra mã: 212 unit đạt, 15 bỏ qua theo cấu hình; 12 ca domain/rollout/webhook đạt; lint, build và Prisma validation đạt. Các ca database trước đó 16/16 đạt. Không push hoặc triển khai; database VSTEP chính không thay đổi.

Bằng chứng: ../../output/playwright/zoom-local-two-participants.png, ../../output/playwright/zoom-synthetic-video.png, ../../output/playwright/zoom-mobile-final.png và ../../output/playwright/zoom-webhook-saved.png.

Smoke cuối bản build: API lớp và trang ở ba vai trò đạt; API quản lý tài khoản admin=200, teacher/student=403. Buổi QA đã kết thúc bằng host và webhook xác nhận ENDED, giữ chỗ học viên đã được giáo viên giải phóng có audit. Đã tạo buổi mới READY để chủ dự án thử: lịch/đường vào và tài khoản nằm trong .qa/classroom-review.txt. Máy local đang chạy server, worker và tunnel nhận webhook. Không nhận participant events đến thời điểm chốt; chưa đánh dấu điểm danh tự động là đạt.
