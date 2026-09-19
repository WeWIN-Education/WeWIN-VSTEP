# Kế hoạch kiểm thử Speaking

Mục tiêu là xác nhận bản ghi không mất, không lưu base64 trong dữ liệu mới, quyền truy cập đúng và grading không phụ thuộc thời gian chạy của Vercel Function.

## Trạng thái cần quan sát

```text
ready -> permission -> question -> preparation -> recording -> saving -> done
```

Trạng thái chấm:

```text
NOT_STARTED -> QUEUED -> PROCESSING -> REVIEWING -> GRADED
                                                   \-> PARTIAL
                                                   \-> FAILED (retry tối đa 3 lần)
                                                   \-> MISSING
```

`PARTIAL` là trạng thái kết thúc: còn phần chưa đủ dữ liệu hoặc chưa có điểm hợp lệ, nhưng các phần hợp lệ vẫn được hiển thị. Hệ thống không tự tạo điểm thay thế. `MISSING` là trạng thái kết thúc khi thiếu dữ liệu cần thiết.

Luồng thử nghiệm dùng pipeline v2 mặc định: một examiner cho từng task Writing hoặc phần Speaking. Chỉ gọi thêm một reviewer khi confidence dưới **0,75**, bằng chứng Writing không khớp bài hoặc có mâu thuẫn về khả năng đánh giá. Reviewer Speaking phải nghe audio gốc; không gọi examiner thứ ba và không lấy trung bình examiner với reviewer. Mỗi worker xử lý tối đa **2 job đồng thời** và **3 request AI đang chạy**.

## 1. Kiểm thử giao diện và microphone

| Mã | Tình huống | Kết quả cần đạt |
|---|---|---|
| UI-01 | Cho phép microphone | Bắt đầu được, hiển thị recording và live status |
| UI-02 | Từ chối microphone | Có lỗi rõ ràng, nút thử lại hoạt động |
| UI-03 | Không có `getUserMedia` | Không crash, hướng dẫn đổi trình duyệt |
| UI-04 | Không có `MediaRecorder` hoặc MIME phù hợp | Báo không hỗ trợ, không tạo file rỗng |
| UI-05 | Permission promise bị treo | Không mở nhiều prompt, retry không tạo request song song |
| UI-06 | Bấm bắt đầu/dừng nhiều lần | Chỉ có một recorder, không tạo bản ghi trùng |
| UI-07 | Tự dừng hết giờ | Giữ đoạn cuối, chuyển sang saving |
| UI-08 | Microphone bị rút giữa chừng | Lưu lỗi có thể retry, không mất phần đã lưu |
| UI-09 | Reload khi đang upload | Sau khi mở lại không ghi đè sai attempt |
| UI-10 | Unmount khi upload | Không set state vào component đã rời trang |
| UI-11 | Mở trang kết quả | GET trạng thái chấm trước; chỉ POST khi `NOT_STARTED` |
| UI-12 | Rời trang khi đang chấm | Hủy request đang mở, quay lại đọc lại job cũ |
| UI-13 | Tab bị ẩn | Poll mỗi 15 giây; tab đang mở poll mỗi 3 giây |
| UI-14 | Kết quả `PARTIAL` | Dừng poll, giữ điểm hợp lệ và phân biệt với tiến độ đang chạy |
| UI-15 | Bấm thử lại | Chỉ POST do thao tác rõ ràng, không tạo request trùng |

## 2. Ma trận trình duyệt

Chạy ít nhất một lượt thành công và một lượt lỗi trên:

- Chrome desktop;
- Edge desktop;
- Safari macOS;
- Chrome Android;
- Safari iPhone/iPad;
- Brave nếu sản phẩm tuyên bố hỗ trợ.

MIME cần ghi nhận trong DevTools và database:

- `audio/webm;codecs=opus`;
- `audio/webm`;
- `audio/mp4`;
- `audio/m4a` và `audio/x-wav` nếu thiết bị/browser trả về các MIME này;
- MIME fallback do browser chọn;
- không có MIME được hỗ trợ.

Mỗi file thành công phải thỏa cả năm điều kiện:

1. Blob không rỗng;
2. `ExamRecording.sizeBytes` lớn hơn 0 và khớp gần đúng với Blob;
3. playback endpoint phát được;
4. duration gần với đồng hồ giao diện;
5. không mất đoạn cuối và có tín hiệu âm thanh.

## 3. Fixture lỗi

Chuẩn bị các fixture cố định:

- WebM/Opus ngắn có tiếng nói;
- MP4/M4A lấy từ Safari;
- WAV hợp lệ;
- file rỗng;
- file đổi đuôi nhưng sai signature;
- file vượt 20 MB;
- file dài hơn 360 giây;
- file im lặng;
- upload bị ngắt mạng giữa chừng.

Không ghi audio, token, cookie hay API key vào log test.

## 4. Upload và phân quyền

| Mã | Kiểm tra | Kết quả cần đạt |
|---|---|---|
| UP-01 | Direct upload lên Blob | Không gửi base64 trong request tiến độ |
| UP-02 | Complete upload | Tạo đúng một `ExamRecording` theo `attemptId + partId` |
| UP-03 | Upload retry | Không tạo bản ghi trùng hoặc orphan record |
| UP-04 | Blob sai attempt | Trả `400/409`, không ghi database |
| UP-05 | File quá lớn | Trả `413` |
| UP-06 | Chưa đăng nhập | Trả `401` |
| UP-07 | Tài khoản khác truy cập playback | Trả `401/403/404` phù hợp |
| UP-08 | Attempt đã submit | Không thể sửa hoặc upload thêm |
| UP-09 | Guest | Chỉ dùng attempt guest hợp lệ và chịu rate limit |
| UP-10 | Admin/learner | Quyền chỉ giới hạn vào attempt được phép |

Kiểm tra database sau mỗi lượt:

- record mới chỉ lưu `storageKey`, MIME, size, duration và trạng thái;
- không có `audioData` base64 trong JSON của attempt mới;
- `ExamRecording` và `ExamAttempt.recordings` trỏ cùng một blob key.

## 5. Grading worker

### Luồng thành công

1. Nộp bài.
2. `POST /grade` trả `202` và `QUEUED` khi `GRADING_MODE=async`.
3. Worker claim job, chuyển `PROCESSING` và giữ lease.
4. Worker đọc Blob, FFmpeg kiểm tra/chuyển WAV và kiểm tra silence.
5. Transcription chạy thành công.
6. Một examiner chạy cho từng task Writing hoặc phần Speaking; reviewer chỉ chạy nếu confidence < 0,75, bằng chứng không khớp hoặc có mâu thuẫn.
7. Checkpoint xuất hiện sau từng bước; kết quả từng phần được trả ngay khi có thể.
8. Trạng thái chuyển `GRADED`, `PARTIAL` hoặc `FAILED`; điểm và nhận xét công khai không chứa pipeline hay báo cáo nội bộ.

### Luồng lỗi bắt buộc

- thiếu `OPENAI_API_KEY` ở worker;
- worker thiếu FFmpeg;
- audio hỏng, rỗng hoặc im lặng;
- audio quá dài;
- OpenAI trả `429`, `5xx` hoặc timeout;
- examiner trả JSON sai cấu trúc;
- reviewer được gọi khi confidence dưới 0,75 và phải nghe audio Speaking;
- điểm null ở pronunciation/fluency khi không đủ bằng chứng;
- worker dừng giữa các bước của examiner hoặc reviewer;
- hai worker claim cùng một job;
- lease hết hạn;
- bấm chấm nhiều lần;
- thiếu một hoặc nhiều phần Speaking.

Kết quả cần đạt:

- lease ngăn hai worker chạy trùng cùng job;
- retry tối đa ba lần với backoff;
- checkpoint không bị mất khi retry;
- lỗi không xóa audio hay bài làm;
- thiếu phần giữ `PARTIAL`, không tạo điểm giả;
- hết retry chuyển `FAILED` và hiển thị nút thử lại khi `retryable=true`;
- `PARTIAL`, `GRADED`, `FAILED` và `MISSING` dừng polling; `PARTIAL` không bị hiển thị như đang xử lý;
- không có secret hoặc audio trong log.

## 6. End-to-end trên Vercel Preview

Mỗi lần thay đổi phần Speaking, chạy đủ luồng sau trên Preview HTTPS:

1. Guest mở Speaking.
2. Learner đăng nhập mở Speaking.
3. Cho phép microphone.
4. Từ chối rồi cấp lại quyền.
5. Hoàn thành đủ ba phần.
6. Reload ở preparation và recording.
7. Xác nhận Blob có `exam-recordings/<attemptId>/...`.
8. Nộp bài.
9. Xác nhận GET trạng thái trước POST; sau đó job đi qua `QUEUED` → `PROCESSING`/`REVIEWING` → `GRADED` hoặc `PARTIAL`.
10. Mở lại trang kết quả bằng URL có `attempt`.
11. Phát lại cả ba bản ghi.
12. Tạo một lỗi OpenAI/worker có kiểm soát và xác nhận retry/FAILED mà không mất checkpoint.

Đo và lưu lại:

- thời gian từ stop recorder đến Blob complete;
- kích thước request `/api/exams/attempts/...`;
- thời gian claim và xử lý job;
- số lần retry;
- lỗi Blob, Neon, FFmpeg và OpenAI;
- tỷ lệ thành công theo browser/device.

## 7. Smoke checklist trước production

- [ ] `npx prisma validate` pass.
- [ ] `npx tsc --noEmit` pass.
- [ ] `npm run lint` pass.
- [ ] `npm run build` pass.
- [ ] Preview dùng `GRADING_MODE=async`.
- [ ] Worker dùng cùng Neon branch và Blob store với Preview.
- [ ] FFmpeg chạy được trong worker.
- [ ] Một audio WebM và một audio MP4/M4A chấm thành công.
- [ ] Playback có kiểm tra quyền.
- [ ] Không có base64 audio trong bản ghi mới.
- [ ] Job lỗi không làm mất bài làm.
- [ ] Dashboard/log có thể phát hiện upload failure, grading failure, timeout và chi phí OpenAI.
- [ ] Worker có heartbeat mỗi 15 giây; chỉ đánh dấu không phản hồi sau 60 giây.
- [ ] Giới hạn worker là 2 job đồng thời và 3 request AI đang chạy.
- [ ] Reviewer chỉ chạy theo điều kiện confidence < 0,75 hoặc tín hiệu bằng chứng/mâu thuẫn.
- [ ] Pipeline v2 được bật theo rollout giới hạn; không công bố accuracy khi chưa có đối chiếu giáo viên.

## 8. Automation chưa chạy trong môi trường này

Smoke test có sẵn trong repository:

```powershell
npm run test:unit
npx playwright install chromium
$env:QA_BASE_URL = "https://<preview-domain>.vercel.app"
npm run test:e2e
```

Các test này kiểm tra URL Preview, trang login, API upload admin và ngữ cảnh được cấp quyền microphone. Chúng chưa thay thế lượt kiểm thử thủ công với thiết bị microphone thật, audio fixture và OpenAI.

Repository hiện chưa có credential Preview, OpenAI, Blob hoặc microphone browser production để chạy E2E grading thật. Ngoài ra hiện chưa có tài khoản/service Railway. Vì vậy checklist trên phải được chạy thủ công sau khi tạo Preview và service worker. Trước khi có worker Railway, production queue smoke được ghi là **BLOCKED**; push Vercel không tự kích hoạt grader. Khi cần mở rộng tự động hóa, bổ sung:

- Vitest cho parser/validation, state transition và grading checkpoint mock;
- Playwright cho quyền microphone, MediaRecorder mock và flow Preview;
- fixture audio cố định, chỉ dùng một smoke test OpenAI thật với audio ngắn.

## 9. Migration và rollout

Migration grading là additive. Trước khi áp dụng, tạo Neon backup/branch; chạy `npx prisma migrate deploy` rồi kiểm tra `npx prisma migrate status` và `npx prisma validate`. Không xóa attempt, audio, checkpoint hoặc kết quả đã hoàn tất. Bài đang xử lý hoàn tất theo pipeline version đã nhận; bài `QUEUED` chưa bắt đầu có thể dùng pipeline v2.

Sau Preview và sau khi tạo/kiểm tra Railway worker, mở pipeline v2 theo nhóm nhỏ và giữ khả năng đưa job mới về pipeline cũ. Trình tự tạo worker là: đăng ký Railway → **Deploy from GitHub repo** → để `railway.json` chọn `Dockerfile.grading-worker` và `npm run grading:health` → thêm Neon/Blob/OpenAI env → kiểm tra heartbeat và một job test. Đây là rollout thử nghiệm kỹ thuật; mục tiêu thời gian và ngưỡng chất lượng chỉ là điều kiện đo kiểm, chưa phải số đo đã đạt hoặc cam kết accuracy. Chỉ công bố kết luận sau khi có dữ liệu audio thật được phép sử dụng và đối chiếu giáo viên ẩn danh.
