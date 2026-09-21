# Nhiem vu hang ngay

- Hien o trang chu khi dang nhap va Dashboard, khong hien cho guest.
- Moi ngay theo Asia/Ho_Chi_Minh (UTC+7): on 30 tu khac nhau trong kho chung, kiem 50 XP va 150 XP tu bai VSTEP da nop. Hai moc XP dung chung tien do, khong yeu cau 200 XP.
- Tu vung tinh tu VocabularyProgress.lastReviewedAt; danh dau cung mot tu nhieu lan chi tinh mot tu. Day la tu danh gia muc nho, khong phai bang chung thuoc tu. Tu ca nhan chua tinh vao nhiem vu.
- Nhan thuong 180 XP bang nut Nhan thuong truoc 00:00. Reward khong tinh vao muc tieu kiem XP. XP thuong cap nhat vao User.xp va bang xep hang.
- DailyChallengeReward co unique userId + day; tao reward va tang XP trong cung transaction Serializable. Retry conflict toi da 3 lan. Goi lai khong tang XP lan hai.
- API lay user tu phien dang nhap da kiem tra trang thai tai khoan, khong nhan userId hay so XP tu client. Tra private/no-store. Guest bi tu choi.
- UI cap nhat moi 30 giay khi tab hien, khi quay lai tab va khi nhan Cap nhat tien do. Dong ho dua tren thoi gian server, tu tai lai khi sang ngay moi. Loi mang khong hien thanh tien do 0 gia.
- Migration 20260921120000_daily_challenges chi them bang reward va index truy van tu vung. Reward cascade khi xoa user; khong seed hay reset du lieu. Chay prisma migrate deploy truoc khi dua code len production (build Vercel hien da co buoc nay).
- Can kiem tra thuc te sau deploy: 30 tu rieng biet, moc XP 50/150, nhan thuong hai tab, reload, qua 00:00, doi tai khoan, guest, loi mang. Unit tests dung mock, chua thay the kiem thu transaction tren PostgreSQL.

# Banner

- PageHero dung learning-banner.webp mac dinh, tao tu anh sach 4 ky nang do nguoi dung cung cap; anh trang tri co alt rong.
- Trang chu giu bg.png trung tam WEWIN qua backgroundSrc. Khong thay nen bang du lieu, form hoac noi dung bai hoc.
- Nen co lop phu trang de giu do doc; thong tin va nut thao tac van la HTML, khong nhung vao anh.
