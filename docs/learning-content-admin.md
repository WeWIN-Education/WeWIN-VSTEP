# Quan tri Ky nang va Bai tap

- `/manage/skills`: them, sua, xoa, an/mo bai Ky nang.
- `/manage/practice`: them, sua, xoa, an/mo bo Bai tap.
- Upload `.txt` hoac `.md` UTF-8, toi da 2 MB / 100 bai. Hai file v1 da bien soan trong `content/vstep` duoc ho tro truc tiep.
- Chon file -> xem truoc -> xac nhan nhap. Nhap file khong tu mo bai. Ma trung huy toan bo lan nhap, khong ghi de bai cu.
- Sua bang form; metadata tren form la thong tin dung de loc va hien thi. Cac dong Ma bai/Ma bo, Ten bai/Ten bo, Ky nang, Muc do huong toi trong mau duoc dong bo khi luu.
- Xoa la xoa that mot ban ghi LearningContent trong database, co xac nhan va kiem tra phien ban de tranh xoa bai vua duoc nguoi khac sua.
- File TXT/MD duoc chuyen thanh noi dung database; khong giu ban upload tren Blob. Chuc nang nay khong upload MP3; cac duong dan audio trong tai lieu la danh sach san xuat, khong tu tao audio player.
- Hoc vien dang nhap xem bai da mo tai `/training` va `/practice`. Bai an chi admin xem truoc duoc. Hien tai trinh doc hien noi dung va phan mo dap an; khong tu dong cham AI hay luu tien do lam bai.

## Deploy

Migration `20260921100000_learning_content` chi them bang moi, khong sua/xoa du lieu cu.
Vercel chay `npx prisma migrate deploy && npm run build` truoc khi phat hanh. Can DATABASE_URL va DIRECT_URL hop le tren moi environment deploy.
Neu migration that bai, build dung va deployment production cu van duoc giu. Khong chay seed.

## Kiem thu

1. Guest/learner khong duoc GET/POST/PUT/DELETE API quan tri.
2. Nhap 8 bai Ky nang va 12 bo Bai tap, xem truoc so luong; import lai bao ma trung.
3. Mo bai, kiem tra kho hoc vien; an bai, kiem tra link truc tiep tra 404 voi learner.
4. Sua ten/body, reload de kiem tra persistence. Hai cua so sua cung bai: cua so cu nhan 409.
5. Xoa bai thu, kiem tra bien mat ca kho va database. Khong dung du lieu hoc vien that de test xoa.
6. File sai muc, sai level, trung ma trong file, qua 2 MB phai bao loi ma khong nhap mot phan.
