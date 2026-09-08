# WEWIN EDUCATION

Nền tảng học tiếng Anh online (Next.js 15 + Auth.js + Prisma + PostgreSQL).

## Chạy local

```bash
# 1. Postgres (Docker)
npm run db:up

# 2. Migrate + seed
npm run db:migrate
npm run db:seed

# 3. Dev server
npm run dev
```

Yêu cầu `.env`:

```
DATABASE_URL="postgresql://hanbeego:hanbeego@localhost:5432/hanbeego?schema=public"
AUTH_SECRET="..."   # bất kỳ chuỗi bí mật đủ dài
```

## Tài khoản demo

| Email | Mật khẩu |
|-------|----------|
| `demo@wewin.local` | `password123` |

## Routes (Phase 1–3)

| Route | Mô tả |
|-------|--------|
| `/` | Trang chủ |
| `/login` · `/register` | Auth (Credentials + Prisma) |
| `/dashboard` · `/profile/settings` | Bảo vệ session (redirect login) |
| `/pricing` | Bảng giá Premium |
| `/beginner` | Lộ trình người mới |
| `/about` · `/contact` · `/download` | Marketing |
| `/hsk` | Giáo trình Lớp 1–9 |
| `/hsk/lop-1` … `/hsk/lop-9` | Chi tiết cấp độ |
| `/hsk/lop-1/[slug]` | Chi tiết bài học (Lớp 1 đã seed) |

## Brand

- Navy `#0B1F5C`, gold accent
- Logo & mascot: `public/brand/`
- Font: Plus Jakarta Sans, Inter, Be Vietnam Pro

Reference UI gốc (Hanbeego) trong `reference/hanbeego/` chỉ để đối chiếu layout — brand sản phẩm là **WEWIN**.
