# Quan tri Ky nang va Bai tap

- `/manage/skills`: them, sua, xoa, an/mo bai Ky nang.
- `/manage/practice`: them, sua, xoa, an/mo bo Bai tap.
- Upload `.txt` hoac `.md` UTF-8, toi da 2 MB / 100 bai. Hai file v1 da bien soan trong `content/vstep` duoc ho tro truc tiep.
- Chon file -> xem truoc -> xac nhan nhap. Nhap file khong tu mo bai. Ma trung huy toan bo lan nhap, khong ghi de bai cu.
- Sua bang form; metadata tren form la thong tin dung de loc va hien thi. Cac dong Ma bai/Ma bo, Ten bai/Ten bo, Ky nang, Muc do huong toi trong mau duoc dong bo khi luu.
- Xoa la xoa that mot ban ghi LearningContent trong database, co xac nhan va kiem tra phien ban de tranh xoa bai vua duoc nguoi khac sua.
- File TXT/MD duoc chuyen thanh noi dung database; khong giu ban upload tren Blob.
- Moi bai co muc MP3: them/thay file MP3 toi da 3 MB, nghe thu, go file. Gioi han nay giu request duoi gioi han Vercel Function; ca 10 file duoc cung cap deu duoi 0.6 MB. He thong kiem tra ten, header MP3, dung luong va phien ban bai truoc khi gan file.
- MP3 luu trong Blob private (local storage chi dung khi phat trien). Hoc vien chi nghe duoc bai da mo; guest khong truy cap duoc. Trinh nghe ho tro tua bang HTTP Range. Khong tu dong cham AI.
- Thay/go MP3 va xoa bai se don file cu. Neu Blob khong cho xoa, giao dien bao can QTV don kho; thao tac database da hoan tat. Khong co tac vu don orphan tu dong.
- Hoc vien dang nhap xem bai da mo tai `/training` va `/practice`. Bai an chi admin xem truoc duoc. Hien tai trinh doc hien noi dung va phan mo dap an; khong tu dong cham AI hay luu tien do lam bai.

## Deploy

Migration `20260921100000_learning_content` them bang noi dung. Migration `20260921110000_learning_content_audio` them hai cot audio va bang danh dau goi nhap, khong xoa du lieu cu.
Vercel chay migrate, build, sau do `npx tsx scripts/import-learning-audio-bundle.ts`. Can DATABASE_URL, DIRECT_URL va BLOB_READ_WRITE_TOKEN hop le tren production.
Neu migration that bai, build dung va deployment production cu van duoc giu. Khong chay seed.

## Goi 10 MP3 da cung cap

- Nguon: `content/vstep/audio/`, khong nam trong `public/`. Mapping co dinh trong `src/lib/learning-audio-bundle.ts`: 4 bai Ky nang va 6 bo Bai tap.
- Script chi nhap khi `VERCEL_ENV=production`, sau khi build thanh cong. Preview va local bo qua. Can giu goi noi dung trong Git de build production doc duoc.
- Nhap 8 bai Ky nang + 12 bo Bai tap neu chua ton tai, o trang thai an. Khong ghi de body/title/trang thai cua bai da ton tai. Audio da gan cung duoc giu nguyen.
- Upload 10 file vao Blob private, kiem tra dung luong tren Blob, gan vao bai theo kind + code. Tat ca thay doi database va marker nam trong cung transaction; deploy dong thoi duoc khoa de tranh nhap trung.
- Khi hoan tat, bang LearningContentImport ghi marker `wewin-vstep-content-audio-v1`. Deploy sau khong tu nhap lai, ke ca QTV da xoa bai/MP3. Khong xoa marker de retry sau khi goi da thanh cong.
- Neu nhap loi, rollback transaction va thu don cac file vua upload. Deployment dung; kiem tra Blob/database roi redeploy. Neu mat ket noi dung luc commit, doi chieu marker va file truoc khi retry.
- Sau deploy: vao `/manage/skills` va `/manage/practice`, nghe thu, kiem tra transcript, sau do bam Mo cho nhung bai muon phat hanh. MP3 giong AI duoc cung cap boi QTV, khong phai ban ghi cham diem hoc vien.

## Kiem thu

1. Guest/learner khong duoc GET/POST/PUT/DELETE API quan tri.
2. Nhap 8 bai Ky nang va 12 bo Bai tap, xem truoc so luong; import lai bao ma trung.
3. Mo bai, kiem tra kho hoc vien; an bai, kiem tra link truc tiep tra 404 voi learner.
4. Sua ten/body, reload de kiem tra persistence. Hai cua so sua cung bai: cua so cu nhan 409.
5. Xoa bai thu, kiem tra bien mat ca kho va database. Khong dung du lieu hoc vien that de test xoa.
6. File sai muc, sai level, trung ma trong file, qua 2 MB phai bao loi ma khong nhap mot phan.
7. Thu MP3 sai dinh dang/qua 3 MB; hai cua so thay MP3 cung luc chi mot cua so duoc luu. Guest/learner khong duoc sua file.
8. Nghe va tua tren desktop/mobile; bai an khong doc duoc audio bang URL truc tiep voi learner. File da go tra 404.
9. Kiem tra production build log co `Audio bundle imported`, 10 bai co audio va 20 bai noi dung (neu database truoc do chua co goi nay). Deploy lai khong tao them ban ghi.
