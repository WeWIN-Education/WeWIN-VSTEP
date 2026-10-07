# Trạng thái tab trong lớp — kiểm thử local 07/10/2026

Đã bổ sung vào phòng Zoom hiện có, giữ giao diện và token WEWIN, hỗ trợ sáng/tối. Giáo viên được phân công và admin mở **Trạng thái tab**; học viên thấy thông báo trước khi vào phòng. Panel cạnh Zoom trên desktop, dialog có Escape và trả focus trên điện thoại.

## Xử lý

- Chỉ gửi sau tín hiệu kết nối thành công của SDK. Theo `document.visibilityState`, không theo blur, nhấp chuột hay thao tác trong iframe.
- Gửi ngay khi đổi trạng thái, duy trì mỗi 20 giây; chỉ một yêu cầu đang gửi, gộp các thay đổi chờ thành trạng thái mới nhất.
- Giáo viên cập nhật mỗi 5 giây khi mở panel và trang đang hiển thị. Đóng panel dừng cập nhật; số đếm giữ lần xem trước, cập nhật khi mở lại.
- Server dùng giờ nhận: ẩn dưới 30 giây là **Vừa rời tab**, từ 30 giây là **Rời tab hơn 30 giây**, thiếu tín hiệu quá 90 giây là **Chưa có tín hiệu**. Quay lại hiển thị **Đang mở tab lớp** và bỏ thời gian rời hiện tại.
- Khi lỗi tải, giữ snapshot và ghi rõ dữ liệu đã cũ; thời gian rời không tiếp tục chạy như dữ liệu mới.
- Chỉ ba trường nullable trên grant; không nhật ký chuyển tab, không URL tab khác. Xóa khi rời/giải phóng thiết bị, hủy/kết thúc buổi; worker dọn trạng thái hết hạn mỗi phút. Không thay đổi điểm danh, điểm số hoặc XP.

## Kết quả đã chạy

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| Migration | `20261007040000_classroom_tab_attention` áp dụng thành công trên database QA riêng localhost:5434; không sửa database VSTEP chính |
| Prisma, lint, build | Đạt |
| Unit toàn dự án | 213 đạt, 16 bỏ qua theo cấu hình; không phải tất cả ca đều đã chạy |
| Suite tập trung có QA database | 14/14 đạt trong 4 file; kiểm ranh giới thời gian, phân quyền, cùng nguồn, thiết bị/grant, hết hạn, ghi danh, tài khoản khóa, worker, leave/release/cancel/end |
| Browser với API và đăng nhập thật | Học viên báo trạng thái; giáo viên đọc danh sách; thao tác mic/chat trong iframe không báo rời; rời lớp xóa trạng thái; 375px và trả focus đạt; không pageerror |
| Chuỗi thời gian qua API thật | Visibility event fixture → Vừa rời tab → sau 30 giây thật Rời tab hơn 30 giây → quay lại Đang mở tab lớp; UI/API cùng xác nhận đạt |
| Giao diện với dữ liệu giả đủ bốn trạng thái | 1440px/375px sáng/tối đạt; tên dài không tràn; hiển thị lỗi và dữ liệu cũ; đóng panel dừng polling |
| Gửi chậm và thay đổi liên tục | Fixture sự kiện visibility và yêu cầu trễ 1,2 giây cho kết quả `[visible, hidden, visible]`, các thay đổi chờ được gộp; polling dừng khi ẩn và tiếp tục khi hiển thị |

Browser kiểm API thật dùng fixture thay bước kết nối SDK, **không chứng minh mic/camera/Zoom media thật**. Chromium tự động hóa giữ các trang hiển thị khi đổi tab, nên kiểm chuỗi visibility bằng fixture sự kiện và giờ server thật; chưa xác nhận thao tác đổi tab của hệ điều hành. Bộ kiểm trước ngày 06/10 có kết quả Zoom riêng. Cần thử thủ công đổi tab, khóa màn hình, thu nhỏ trình duyệt, mất mạng lâu và thiết bị thật; trình duyệt có thể trì hoãn heartbeat nền, khi đó server báo thiếu tín hiệu thay vì kết luận học viên không học.

## Đối chiếu probe giao diện

Probe chạy 375/768/1024/1440/1920px, báo 36 nhóm quy tắc hình thức, không báo tràn ngang cho panel. Đã sửa nút trạng thái thành tối thiểu 44px, căn giữa cùng link buổi học và tăng nền hover nút Đóng. Giữ focus bàn phím, token border, native chọn theme và khung VSTEP hiện có.

| Mục probe | Đối chiếu |
| --- | --- |
| P1: thống kê VSTEP xuống hàng trên mobile | Khung chung có wrap chủ ý; không đổi thống kê trong chức năng này |
| P2–P5, P8–P12: hover thông báo/tài khoản/sidebar/XP | Thuộc giao diện chung đã có; giữ brand, không thay cả khung |
| P6: hover nút vào lớp | Giữ Button brand hiện có; không thay hành động vào phòng |
| P7: hover Đóng | Đã thêm nền brand-soft và chữ brand tại component mới |
| Focus, native select theme, border, độ dày sidebar/header | Giữ thao tác bàn phím và hệ thống hiện có; không áp quy tắc thẩm mỹ để bỏ focus |

Probe cuối tại 375/1440px xác nhận hết lệch chiều cao nút, còn 10 nhóm hình thức/7 mục P: P1 wrap thống kê chung; P2–P6 hover khung chung giữ nguyên; P7 Đóng là phép đo trong chuyển động hover. Kiểm trực tiếp nút Đóng mới sau 300ms đạt nền `rgb(232,240,252)`; không tiếp tục coi nền đó là trắng. Dữ liệu probe cuối ở `output/attention-probe-final/report.json`.

Ảnh tại `output/playwright/attention-*.png`, probe tại `output/attention-probe/report.json`. Các ảnh có chữ Zoom giả lập/dữ liệu mẫu chỉ là fixture kiểm thử, không nội dung đưa vào sản phẩm.

## Thử local

Mở http://localhost:3000/classes, dùng tài khoản giáo viên/học viên trong `.qa/classroom-review.txt` ở hai trình duyệt hoặc hai máy. Giáo viên mở phòng và **Trạng thái tab**. Học viên được duyệt vào Zoom rồi chuyển tab, chờ hơn 30 giây và quay lại. Khi rời phòng, giáo viên thấy **Chưa có tín hiệu**.

Không push GitHub hoặc triển khai production. Không cần thêm biến môi trường cho chức năng này; dùng cấu hình lớp học hiện có.
