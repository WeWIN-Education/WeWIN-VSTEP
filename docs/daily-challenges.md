# Nhiem vu hang ngay

- Hien o trang chu khi dang nhap va Dashboard, khong hien cho guest.
- Moi ngay theo Asia/Ho_Chi_Minh (UTC+7), muc tieu luan phien trong 7 ngay: on tu, kiem XP tu bai VSTEP va mot muc tieu ky nang hoac ket hop ky nang. Muc tieu tu lan luot la 30/10/15/20/15/20/25; muc tieu XP la 100/50/50/75/50/75/100.
- Tu vung tinh tu VocabularyProgress.lastReviewedAt; danh dau cung mot tu nhieu lan chi tinh mot tu. Day la tu danh gia muc nho, khong phai bang chung thuoc tu. Tu ca nhan chua tinh vao nhiem vu.
- XP tinh tu tong XpAward trong ngay, group theo catalog de biet ky nang da hoan thanh. XP thuong hang ngay khong nam trong XpAward nen khong tu cong vao muc tieu.
- Nhan thuong 180 XP bang nut Nhan thuong sau khi hoan thanh ca ba muc tieu, truoc 00:00. Reward cap nhat vao User.xp va bang xep hang.
- DailyChallengeReward co unique userId + day; tao reward va tang XP trong cung transaction Serializable. Retry conflict toi da 3 lan. Goi lai khong tang XP lan hai.
- API lay user tu phien dang nhap da kiem tra trang thai tai khoan, khong nhan userId hay so XP tu client. Tra private/no-store. Guest bi tu choi.
- UI tu dong cap nhat khi tien do tu vung hoac bai thi duoc luu, dong bo giua cac tab qua storage event, van polling moi 30 giay khi tab hien va tai lai khi quay lai tab. Dong ho dua tren thoi gian server, tu tai lai khi sang ngay moi. Loi mang khong hien thanh tien do 0 gia.
- Migration 20260921120000_daily_challenges chi them bang reward va index truy van tu vung. Reward cascade khi xoa user; khong seed hay reset du lieu. Chay prisma migrate deploy truoc khi dua code len production (build Vercel hien da co buoc nay).
- Can kiem tra thuc te sau deploy: muc tieu 7 ngay, luu tu vung, nop bai tung kho ky nang, nhan thuong hai tab, reload, qua 00:00, doi tai khoan, guest, loi mang. Unit tests dung mock, chua thay the kiem thu transaction tren PostgreSQL.

# Banner

- PageHero dung learning-banner.webp mac dinh, tao tu anh sach 4 ky nang do nguoi dung cung cap; anh trang tri co alt rong.
- Trang chu giu bg.png trung tam WEWIN qua backgroundSrc. Khong thay nen bang du lieu, form hoac noi dung bai hoc.
- Nen co lop phu trang de giu do doc; thong tin va nut thao tac van la HTML, khong nhung vao anh.
