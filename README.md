# WEWIN EDUCATION

Nền tảng học tiếng Anh online (Next.js 15 + Auth.js + Prisma + PostgreSQL).

## Chạy local

```bash
# 1. Postgres (Docker)
npm run db:up

# 2. Apply migrations without deleting existing data
npx prisma migrate deploy
npx prisma generate

# 3. Dev server
npm run dev
```

Yêu cầu `.env`:

```
DATABASE_URL="postgresql://wewin:wewin@localhost:5432/wewin?schema=public"
AUTH_SECRET="..."   # bất kỳ chuỗi bí mật đủ dài
```

## Tài khoản QA cục bộ

| Email | Mật khẩu |
|-------|----------|
Đặt `SEED_DEMO_EMAIL` và `SEED_DEMO_PASSWORD` trong `.env` trước khi chạy seed.

## Routes

| Route | Mô tả |
|-------|--------|
| `/` | Trang chủ |
| `/login` | Auth credentials cho tài khoản WEWIN cấp |
| `/dashboard` · `/profile/settings` | Tổng quan và cài đặt cho user/admin |
| `/exam/vstep` | Hub luyện thi VSTEP; guest chỉ thấy đề đã xuất bản |
| `/exam/:program/:slug` | Exam shell; guest làm được đề VSTEP được gán Test 1–2, mỗi đề một lượt |
| `/practice` · `/training` | Danh mục luyện tập; bài chi tiết cần tài khoản |
| `/review` · `/listening` · `/speaking` | Nội dung luyện tập cần tài khoản |
| `/video` | Danh mục Classroom English; player và transcript cần tài khoản |
| `/vocabulary/topics` | Danh mục từ vựng công khai; mục từ và sổ tay cần tài khoản |
| `/vocabulary/tips` · `/vocabulary/collocations` | Nội dung từ vựng cần tài khoản |
| `/materials` | Kho học liệu VSTEP cần tài khoản |
| `/manage/users` · `/manage/exams` · `/manage/vocabulary/import` | Khu admin |
| `/about` · `/contact` | Marketing và hỗ trợ |

## Nhập từ vựng

Tải template tại `public/templates/WEWIN_Vocabulary_Import_Template.xlsx`. Admin có thể nhập file bằng trang `/manage/vocabulary/import`; tài khoản phải có role `ADMIN`.

Để nhập bằng lệnh trong môi trường local:

```bash
npx tsx scripts/import-vocabulary.ts "C:\path\to\vocabulary.xlsx"
```

Importer cập nhật theo `collection_code + entry_code`, không xóa tiến độ người học và ghi lịch sử vào database.

Kiểm tra các ranh giới guest/user/admin trong môi trường local bằng `npm run test:roles`. Dọn phiên học thử hết hạn bằng `npm run cleanup:guest`.

Tạo hoặc cập nhật tài khoản admin mà không xóa database:

```bash
npx tsx scripts/create-manager.ts manager@wewin.local "mat-khau-it-nhat-8-ky-tu" "Tên người quản lý"
```

Script dựng dữ liệu VSTEP demo cũ đã được gỡ khỏi workspace. Database hiện tại đã xóa các đề demo và không tự tạo lại chúng khi seed.

Writing/Speaking dùng prompt pack modular đã cập nhật trong `src/lib/grading-prompts.json`. Giữ `OPENAI_API_KEY` trong `.env.local` hoặc secret của máy chủ; không đưa khóa vào client hay Git. Speaking gửi audio WAV đã chuẩn hóa cùng transcript, còn Writing chạy ba lượt examiner và adjudication.

Nếu một lượt thi đã nộp bị gián đoạn khi chấm, có thể chạy lại toàn bộ Writing/Speaking bằng lệnh quản trị cục bộ:

```bash
npx tsx scripts/run-regrade.mjs cmu21xgik0001ilq47v7z064o
```

Lệnh này giữ nguyên đáp án và bản ghi đã lưu, chỉ tạo lại kết quả chấm.

## Deploy production

Kiến trúc production dùng Vercel cho Next.js/API, Neon PostgreSQL, Vercel Blob và worker Node + FFmpeg cho Speaking. Xem hướng dẫn đầy đủ tại [`docs/deploy-vercel.md`](docs/deploy-vercel.md).

Checklist kiểm thử Speaking trên Preview HTTPS nằm tại [`docs/speaking-test-plan.md`](docs/speaking-test-plan.md).

Production dùng `GRADING_MODE=async`; worker chạy `npm run grading:worker:loop`. Không chạy seed dữ liệu mẫu trên production.

## Brand

- WeWin blue `#004AAD`, gold accent
- Logo & mascot: `public/brand/`
- Font: local Be Vietnam Pro, with Inter for timers and compact numeric labels

Reference UI gốc (Hanbeego) trong `reference/hanbeego/` chỉ để đối chiếu layout — brand sản phẩm là **WEWIN**.
