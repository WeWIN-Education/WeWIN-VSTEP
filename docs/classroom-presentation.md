# Zoom và học liệu WEWIN

## Chức năng

- Máy tính rộng từ 1280px: Zoom và tài liệu cạnh nhau, mặc định 50/50. Có thanh chỉnh tỷ lệ và nút mở rộng tài liệu; vùng Zoom giữ tối thiểu 450px để không cắt thanh công cụ của SDK.
- Màn hẹp: hai tab **Zoom / Học liệu**. Iframe Zoom luôn được giữ khi đổi tab; không tạo lại phòng hoặc grant.
- Giáo viên được phân công và admin chọn PDF/ảnh sạch, đã công bố cho lớp hoặc đúng buổi. Học viên tự theo trang giáo viên, có **Xem riêng** và **Theo giáo viên** để quay về trạng thái mới nhất.
- Học liệu có **Xem trên web**, **Tải về** và, đối với nhân sự, **Trình chiếu trong lớp**. PDF/JPG/PNG xem trực tiếp. Word/PowerPoint vẫn tải bản gốc; xuất PDF trước nếu muốn trình chiếu. Không chuyển đổi Office ở phiên bản này.
- PDF.js chỉ tải khi mở PDF, dùng byte Range, giữ document qua các lần đổi trang và chuẩn bị trang kế tiếp. Màu trang PDF/ảnh giữ nguyên trong dark mode.
- Trình chiếu là một bản trạng thái hiện tại mỗi buổi, có revision. Không lưu lịch sử chuyển trang. Mất kết nối giữ dữ liệu cũ và thông báo; không tự ghi đè trạng thái của người điều khiển khác.
- Quyền tài liệu được kiểm lại ở mỗi yêu cầu xem/tải. Tệp chưa sạch không được xem. Tệp lỗi/có mật khẩu hiện lỗi bản xem, bản gốc sạch vẫn tải được.

## Thử trên máy này

Mở `http://localhost:3000/classes`. Tài khoản local nằm trong `.qa/classroom-review.txt`. Vào lớp `LOCAL-VSTEP-B1`, tab Học liệu; PDF thử ba trang đã công bố. Chọn buổi phù hợp và trình chiếu. Tài khoản học viên phải được ghi danh vào cùng lớp.

Đợt QA này dùng PostgreSQL **riêng** ở `127.0.0.1:5434/wewin_classroom_test`, ClamAV ở `127.0.0.1:3312`, storage local. Docker Desktop chưa khởi động được nên PostgreSQL/ClamAV chạy bằng binary tạm trong `.qa/`; không đổi database Docker cũ hoặc production. Cấu hình/mật khẩu/tệp thử không đưa vào Git.

Web/worker dùng runner hiện có:

```powershell
node scripts/classroom-local.mjs --build
node scripts/classroom-local.mjs --start
node scripts/classroom-local.mjs --worker
```

Database và ClamAV phải đang chạy trước. Chỉ chạy một web server trên cổng 3000; không build khi dev server đang ghi `.next`.

Để thử upload với storage local, chạy `node scripts/classroom-local.mjs` (dev). Bản `--start` dùng chế độ production, yêu cầu direct upload qua private Blob; API không cho ghi tệp local ở chế độ production.

## Worker Railway riêng

Đã tạo hai service `classroom-worker` và `classroom-clamav` trong project Railway hiện có. Worker học liệu đã có heartbeat trong database production; worker chấm bài VSTEP vẫn là service riêng. ClamAV dùng private network và volume `/var/lib/clamav`, không mở public domain/TCP proxy.

**Chưa nghiệm thu quét cloud:** tài khoản Railway hiện giới hạn mỗi service ở 1 GB RAM. Yêu cầu tăng ClamAV lên 4 GB bị từ chối với thông báo `The maximum allowed memory for this service is 1 GB`; heartbeat worker đang báo `scannerOk=false`. Cần gói cho phép đủ RAM rồi xác minh scanner và chạy thử upload. Tệp chưa sạch tiếp tục bị chặn xem/tải.

1. Tạo service ClamAV từ `deploy/clamav.Dockerfile` hoặc image chính thức `clamav/clamav:stable`. Gắn volume `/var/lib/clamav` để giữ virus database. **Không tạo public domain/TCP proxy** cho scanner; dùng private network trong cùng project/environment với worker. Chờ tải definitions và scanner sẵn sàng.
2. Tạo classroom worker từ repository; đặt Dockerfile Path và biến `RAILWAY_DOCKERFILE_PATH` thành `deploy/classroom-worker.Dockerfile`, start command `npm run classroom:worker`. Không cần HTTP/public domain. Node 22 mới nhất trong image đáp ứng PDF.js. Railway không cho service mới dùng `railway.json`; cấu hình service trực tiếp hoặc dùng IaC.
3. Sao chép cấu hình server bên dưới từ **cùng môi trường của web**, đặc biệt giữ nguyên khóa mã hóa. Không lấy cấu hình/mật khẩu QA làm production.
4. Kiểm tra trang admin **Zoom & tác vụ**: heartbeat worker mới, scanner báo hoạt động. Scanner probe dùng TCP PING/PONG thật; heartbeat đơn lẻ không đủ chứng minh scanner chạy.
5. Thử upload PDF/ảnh sạch, PDF lỗi, tệp thử EICAR; chỉ file sạch mới trở thành CLEAN. Kiểm download và Range trên private Blob thật. Chỉ đưa luồng upload mới ra production sau khi kiểm hết.

Biến worker cần dùng chung với web:

```dotenv
CLASSROOM_ENABLED=true
CLASSROOM_WORKER_ID=classroom-railway
RAILWAY_DOCKERFILE_PATH=deploy/classroom-worker.Dockerfile
DATABASE_URL=<database cùng môi trường web>
DIRECT_URL=<database cùng môi trường web>
APP_ORIGIN=https://we-win-vstep.vercel.app
DATA_ENCRYPTION_KEY=<giữ nguyên khóa web>
BLOB_READ_WRITE_TOKEN=<private Blob cùng web>
ZOOM_ACCOUNT_ID=<cùng web>
ZOOM_OAUTH_CLIENT_ID=<cùng web>
ZOOM_OAUTH_CLIENT_SECRET=<cùng web>
ZOOM_ALLOW_BASIC=<giữ lựa chọn hiện có>
CLAMAV_HOST=<private hostname của service ClamAV>
CLAMAV_PORT=3310
```

Meeting SDK key/secret và webhook secret tiếp tục dùng ở web hiện có. Không đưa ClamAV lên public để Vercel kết nối: upload vào vùng chờ, worker trong private network đọc/quét/copy file sạch qua Blob. Web không cần truy cập trực tiếp scanner.

Migration bổ sung: `20261007140000_classroom_presentation`, đã áp dụng vào QA và production qua pipeline Vercel, đã kiểm lại trên database. Không thay/rotate `DATA_ENCRYPTION_KEY` trong thao tác này.

Dockerfile worker chấm bài đã được sửa để sao chép `.npmrc`, khắc phục lỗi cài đặt peer dependency React/Zoom; bản build Railway mới đã đạt. Config `railway.json` cũ của worker này vẫn còn hoạt động theo cơ chế legacy, cần chuyển sang cấu hình service/IaC trước hạn 01/12/2026 của Railway.

Worker quét tệp, tạo metadata bản xem và dọn trạng thái buổi mỗi phút. PDF sạch cũ thiếu metadata được bổ sung qua cùng hàng tác vụ. Theo dõi hàng lỗi và retry tại admin; không coi tệp là sạch khi scanner không phản hồi.

## Kết quả kiểm tra

- Prisma validation, lint, build: đạt. Migration áp dụng trên QA riêng.
- Toàn bộ suite: 219 tests đạt, 14 tests bỏ qua theo cấu hình hiện có; kiểm quyền/Origin, revision, trang vượt giới hạn, Range/HEAD/416, tài liệu gỡ công bố và dọn buổi đã kết thúc.
- Worker và ClamAV thật: PDF ba trang CLEAN + metadata; PDF lỗi và PDF khóa mật khẩu CLEAN + lỗi bản xem; EICAR bị chặn.
- Upload PNG qua giao diện → quét → bản xem sẵn sàng → công bố → xem ảnh trực tiếp: đạt. PDF lỗi hiện thông báo, download bản gốc trả 200.
- Hai vai trò trên trình duyệt với iframe Zoom giả lập tín hiệu kết nối, API/database/storage thật: theo trang, xem riêng, quay lại, mất mạng/kết nối lại, download và giữ iframe khi đổi tab; không có page error. PDF nhận các phản hồi 206 và không mở lại document khi đổi trang.
- Zoom SDK thật: host và học viên vào phòng local, theo trang/xem riêng/quay lại hoạt động; mobile đổi tab giữ iframe và trạng thái mic đang tắt. SDK không bị cắt ở chiều rộng tối thiểu 450px. Chất lượng âm thanh/camera trên thiết bị thật vẫn cần người dùng nghiệm thu, chưa khẳng định qua kiểm tra trạng thái nút.
- Kiểm lại ngày 08/10 với phòng Zoom mới: cả luồng theo trang/xem riêng/quay lại đạt. Sau khi vào phòng trên mobile, các nút mic/video được trình đọc màn hình nhận diện; không cần sửa DOM thủ công để bỏ trạng thái ẩn do modal whiteboard tải sẵn của SDK.
- Probe sáng/tối từ 375–1920px và sweep: không tràn ngang. Toolbar tài liệu chủ động xuống hai hàng ở màn hẹp để giữ kích thước nút. Các tín hiệu hover/sidebar và hình mặt trăng sáng thuộc component WEWIN sẵn có; giữ nguyên phạm vi. Nút công cụ PDF được bổ sung hover rõ hơn; vòng focus giữ cho bàn phím.

Đối chiếu probe phòng học đang kết nối: P1–P9 về tương phản trắng/trắng nằm trong panel `opacity-0` + `inert` khi tab Zoom được chọn, không phải chữ đang hiển thị; đã xem ảnh thật ở cả hai tab. P10 là toolbar chủ động xuống hàng. P11–P16 là hover của header/sidebar WEWIN sẵn có. P17 là kết quả hover khi probe ở trạng thái điều khiển/di chuyển focus; ảnh và kiểm tra nút PDF dùng hover token mới. Cảnh báo iframe không có bóng thuộc vùng Zoom đang hiển thị toàn màn, không phải modal mới. Các cảnh báo gu của component chung không được dùng để thay toàn bộ thiết kế ngoài phạm vi.

## Giới hạn

Đồng bộ dựa vào polling 2 giây khi đã kết nối Zoom và trang đang hiển thị; có độ trễ tối đa một chu kỳ cộng thời gian mạng, chưa kiểm tải lớp lớn. Zoom app dự phòng không hiển thị panel WEWIN. Không thay đổi điểm danh, XP hoặc trạng thái tab. Không có annotation, Office conversion, slide history hoặc camera/screen capture.

Nguồn kỹ thuật: [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html), [ClamAV Docker](https://docs.clamav.net/manual/Installing/Docker.html), [Railway CLI](https://docs.railway.com/cli).
