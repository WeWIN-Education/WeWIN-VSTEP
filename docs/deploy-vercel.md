# Deploy WEWIN lên Vercel

Tài liệu này dùng cho kiến trúc production đã chọn:

```text
Trình duyệt
    |
    v
Vercel: Next.js + API + Auth.js
    |                 |
    v                 v
Neon PostgreSQL    Vercel Blob
    ^
    |
Worker Speaking riêng (Node + FFmpeg + OpenAI)
```

Vercel không chạy worker Speaking dài hạn. Vercel chỉ nhận bài, lưu trạng thái và tạo job; worker lấy job từ database, xử lý audio và ghi kết quả lại.

## 1. Chuẩn bị

Cần có:

- Repository của `D:\hanbee` trên GitHub/GitLab hoặc thư mục local để import bằng Vercel CLI.
- Một project Neon PostgreSQL.
- Một Blob store trong Vercel.
- Tài khoản Vercel và một tài khoản worker managed service, ví dụ Railway.
- OpenAI API key chỉ dành cho worker.

Không đưa các giá trị sau vào Git, ảnh chụp màn hình hoặc file `.env.example`:

- `AUTH_SECRET`;
- `DATABASE_URL`, `DIRECT_URL`;
- `BLOB_READ_WRITE_TOKEN`;
- `OPENAI_API_KEY`.

## 2. Tạo database Neon

1. Vào Neon, tạo project và database production.
2. Trong phần connection details, lấy hai URL:
   - **Pooled connection**: dùng cho `DATABASE_URL`. Host thường có hậu tố `-pooler`.
   - **Direct connection**: dùng cho `DIRECT_URL`, dành cho migration.
3. Giữ nguyên `sslmode=require` nếu Neon đã thêm sẵn vào URL.
4. Tạo một branch Neon riêng cho Preview nếu muốn test không ảnh hưởng production.

Ví dụ dạng URL, không dùng nguyên giá trị này:

```text
DATABASE_URL=postgresql://user:password@ep-example-pooler.region.aws.neon.tech/db?sslmode=require
DIRECT_URL=postgresql://user:password@ep-example.region.aws.neon.tech/db?sslmode=require
```

## 3. Tạo Blob storage

1. Trong Vercel project, mở `Storage` → `Create Database` → `Blob`.
2. Tạo store cho Preview trước; có thể tạo store production riêng để tránh trộn audio test với dữ liệu thật.
3. Kết nối store với project và các environment cần dùng.
4. Sao chép `BLOB_READ_WRITE_TOKEN` vào Environment Variables của Vercel. Token này chỉ dùng phía server; không đặt tên biến có tiền tố `NEXT_PUBLIC_`.

Các file mới được lưu theo namespace:

- `exams/` — audio đề thi;
- `materials/` — tài liệu học tập;
- `posts/` — ảnh bài viết;
- `exam-recordings/` — bản ghi Speaking.

Các namespace này dùng blob private. API kiểm tra quyền trước khi stream file.

## 4. Import project vào Vercel

### Cách dùng Dashboard

1. Vào Vercel → `Add New` → `Project`.
2. Chọn repository của WEWIN.
3. Framework chọn `Next.js`, Root Directory là thư mục chứa `package.json`.
4. Giữ Build and Output Settings mặc định, hoặc đặt:

```text
Install Command: npm ci
Build Command: npx prisma generate && next build
```

5. Chưa bấm production ngay; deploy Preview trước.

### Cách dùng CLI

Chạy trong PowerShell tại thư mục project:

```powershell
npm install -g vercel
vercel login
vercel link
vercel
```

Lần đầu chọn đúng team/project. Chỉ dùng `vercel --prod` sau khi Preview đã đạt checklist Speaking.

## 5. Khai báo Environment Variables

Trong Vercel → Project → Settings → Environment Variables, thêm các biến sau cho Preview và Production tương ứng:

| Biến | Vercel API | Worker Speaking | Ghi chú |
|---|---:|---:|---|
| `DATABASE_URL` | Có | Có | Neon pooled URL |
| `DIRECT_URL` | Có | Khuyến nghị | Neon direct URL, dùng migration |
| `AUTH_SECRET` | Có | Không | Chuỗi ngẫu nhiên dài |
| `BLOB_READ_WRITE_TOKEN` | Có | Có | Token của Blob store tương ứng |
| `GRADING_MODE` | `async` | Không | Production nên là `async` |
| `OPENAI_API_KEY` | Không bắt buộc | Có | Giữ ở worker để giảm phạm vi bí mật |
| `OPENAI_GRADING_MODEL` | Không | Có | Mặc định `gpt-4o-mini` |
| `OPENAI_SPEAKING_MODEL` | Không | Có | Mặc định `gpt-audio-1.5` |
| `OPENAI_TRANSCRIPTION_MODEL` | Không | Có | Mặc định `whisper-1` |
| `FFMPEG_PATH` | Không | Có | Trong Docker worker là `ffmpeg` |

`SEED_*` không cần khai báo cho production. Không chạy seed production.

Tạo `AUTH_SECRET` an toàn trên máy local bằng Node:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 6. Chạy migration production

Migration phải chạy sau khi database đã có và trước khi mở tính năng mới. Thực hiện từ máy có `npx` và quyền truy cập Neon:

```powershell
$env:DATABASE_URL = "<NEON_POOLED_URL>"
$env:DIRECT_URL = "<NEON_DIRECT_URL>"
npx prisma migrate deploy
npx prisma generate
```

Kiểm tra migration trước khi mở production:

```powershell
npx prisma migrate status
npx prisma validate
```

Không chạy các lệnh sau trên database production:

```powershell
npm run db:seed
npx prisma migrate reset
```

## 7. Tạo tài khoản quản trị viên đầu tiên

Sau khi migration xong, chạy script này với cùng `DATABASE_URL` của production:

```powershell
$env:DATABASE_URL = "<NEON_POOLED_URL>"
$env:DIRECT_URL = "<NEON_DIRECT_URL>"
npx tsx scripts/create-manager.ts admin@example.com "<mat-khau-dai-it-nhat-8-ky-tu>" "WEWIN Admin"
```

Đăng nhập bằng tài khoản này tại `/login`, mở `/manage` và đổi mật khẩu bằng quy trình quản trị của hệ thống nếu cần.

## 8. Chuyển file local lên Blob

Chỉ làm bước này sau khi đã đặt `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL` và `DIRECT_URL` ở máy chạy lệnh.

Trước tiên kiểm tra, không upload:

```powershell
$env:DATABASE_URL = "<NEON_POOLED_URL>"
$env:DIRECT_URL = "<NEON_DIRECT_URL>"
$env:BLOB_READ_WRITE_TOKEN = "<BLOB_TOKEN>"
npm run storage:migrate -- --dry-run
```

Nếu danh sách đúng, chạy thật:

```powershell
npm run storage:migrate
```

Script này chuyển audio đề trong `.data/exams`, tài liệu trong `.data/materials` và ảnh bài viết trong `.data/posts`. Nó không xóa file local; chỉ cập nhật storage reference sau khi upload. Giữ lại thư mục `.data` làm bản dự phòng cho đến khi kiểm tra xong production.

## 9. Deploy Preview và kiểm tra

Sau khi đặt env:

```powershell
vercel
```

Trong Preview, kiểm tra theo thứ tự:

1. Đăng nhập bằng admin.
2. Mở kho tài liệu, upload file nhỏ và tải lại trang.
3. Mở feed, đăng bài có ảnh và kiểm tra ảnh chỉ hiện sau khi bài được duyệt.
4. Mở một đề Speaking, cho phép microphone và hoàn thành một phần.
5. Kiểm tra Network không có request gửi audio dạng base64 trong JSON tiến độ.
6. Kiểm tra Blob có object trong `exam-recordings/`.
7. Nộp bài, xác nhận trạng thái `QUEUED` rồi `PROCESSING`/`GRADED`.
8. Tải lại trang kết quả và phát lại audio.

Nếu Preview dùng Neon branch hoặc Blob store riêng, worker test cũng phải trỏ đúng branch và store đó.

## 10. Chạy worker Speaking

Repository có `Dockerfile.grading-worker`. Docker image đã cài FFmpeg và chạy:

```text
npm run grading:worker:loop
```

### Railway

1. Tạo một service mới từ cùng repository.
2. Chọn builder Dockerfile và đặt Dockerfile path là `Dockerfile.grading-worker`.
3. Thêm các biến môi trường:

```text
DATABASE_URL=<NEON_POOLED_URL>
DIRECT_URL=<NEON_DIRECT_URL>
BLOB_READ_WRITE_TOKEN=<BLOB_TOKEN>
OPENAI_API_KEY=<OPENAI_KEY>
OPENAI_GRADING_MODEL=gpt-4o-mini
OPENAI_SPEAKING_MODEL=gpt-audio-1.5
OPENAI_TRANSCRIPTION_MODEL=whisper-1
FFMPEG_PATH=ffmpeg
```

4. Bật restart tự động.
5. Kiểm tra log worker có thể kết nối database, không báo thiếu FFmpeg và chuyển một job từ `QUEUED` sang `GRADED`.

Không chạy hai worker bằng hai database khác nhau. Có thể chạy nhiều worker cùng một database vì job có lease và chống claim trùng.

Chạy thử một job thay vì loop:

```powershell
npm run grading:worker
```

## 11. Mở Production

Chỉ chạy sau khi Preview đạt tài liệu [speaking-test-plan.md](speaking-test-plan.md):

```powershell
vercel --prod
```

Sau khi deploy, kiểm tra nhanh:

- `/login` đăng nhập được;
- `/exam/vstep` hiển thị đề thật đã publish;
- `/materials` tải được file từ Blob;
- `/feed` đọc được ảnh bài viết đã duyệt;
- bản ghi Speaking phát được sau khi kiểm tra quyền;
- dữ liệu cá nhân trả `private, no-store`;
- Vercel Functions không có lỗi 5xx tăng đột biến;
- worker không có job `FAILED` kéo dài.

## 12. Giới hạn cần biết

Luồng import đề DOCX hiện gửi DOCX và audio qua một request admin. Vercel có giới hạn request của Function, nên không nên import một bộ đề có tổng audio lớn trực tiếp trên Vercel. Với bộ lớn hơn giới hạn Preview:

1. import bằng môi trường Node tạm thời có cùng Neon + Blob credentials; hoặc
2. chia nhỏ bộ import; hoặc
3. bổ sung flow direct upload riêng cho DOCX/audio trước khi đưa vào production.

Các luồng bản ghi Speaking, tài liệu và ảnh bài viết đã có direct upload lên Blob để tránh gửi file lớn qua Function.

## 13. Rollback an toàn

- Rollback code bằng Vercel `Redeploy` một deployment ổn định trước đó.
- Không rollback migration bằng cách xóa bảng thủ công.
- Giữ Neon backup/branch trước migration lớn.
- Không xóa Blob object khi chưa xác minh record database không còn trỏ tới object đó.
- Nếu worker lỗi, có thể dừng worker; bài làm và audio vẫn được giữ, job sẽ tiếp tục sau khi worker hoạt động lại hoặc hết lease.
