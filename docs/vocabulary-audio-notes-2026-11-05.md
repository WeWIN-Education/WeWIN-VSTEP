# Audio từ vựng A1–A2 và B1 — ghi chú bàn giao

Đã đối chiếu 1.234 mục từ với hai thư mục audio do WEWIN cung cấp. Ghép bằng mã bộ, chủ đề và thứ tự trong chủ đề; kiểm tra lại từ đang hiển thị. Không đổi nội dung từ vựng, mã từ, sổ tay hay tiến độ học.

- A1–A2: 996 audio được gắn, 4 mục chờ kiểm tra.
- B1: 227 audio được gắn, 7 mục chờ kiểm tra.
- Tổng: 1.223 audio, khoảng 8,83 MB. Các bản sao trong `all_audio` không được nhập lại.
- Đã chuyển WebM sang MP3 mono 24 kHz / 64 kbps để dùng cùng một định dạng trên trình duyệt. Không gọi dịch vụ tạo giọng nói.

## 11 mục cần kiểm tra hoặc cung cấp audio thay thế

Các mục dưới đây tạm ẩn nút nghe, không gắn tệp đọc khác nội dung và không tự chuyển sang giọng máy. Một số mục là biến thể cách diễn đạt hoặc cách nói rút gọn, không nhất thiết là phát âm sai. WEWIN có thể xác nhận muốn dùng bản rút gọn, hoặc cung cấp tệp đọc đầy đủ.

| Bộ | Từ/cụm từ trên web | Nội dung audio theo thông tin đi kèm tệp | Tệp trong thư mục nguồn |
| --- | --- | --- | --- |
| A1–A2 | airship | Airplane | `18_GiaoThong/864_airplane.webm` |
| A1–A2 | emergency brake | Emergency | `18_GiaoThong/875_emergency.webm` |
| A1–A2 | windshield wiper | Windscreen wiper | `18_GiaoThong/896_windscreen_wiper.webm` |
| A1–A2 | kith and kin | Kith | `20_GiaDinh/999_kith.webm` |
| B1 | Argue with someone about something | Argue about | `03_Relationship/051_Argue_about.webm` |
| B1 | Look after someone | Look after | `03_Relationship/061_Look_after.webm` |
| B1 | Make friends with someone | Make friends | `03_Relationship/062_Make_friends.webm` |
| B1 | Visit a relative | Visit a relation | `03_Relationship/069_Visit_a_relation.webm` |
| B1 | Suffer from | Suffer from something | `07_Health/164_Suffer_from_something.webm` |
| B1 | Prevent someone from | Prevent from | `09_Environment/208_Prevent_from.webm` |
| B1 | By air / by car / by rail / by sea | By air, car, rail, sea | `10_Travel/220_By_air_car_rail_sea.webm` |

Hai trường hợp vẫn được gắn: `leisure center` dùng cách viết Anh–Anh `leisure centre`; `Laboratory (Lab)` đọc từ đầy đủ `Laboratory`, phần trong ngoặc là cách viết tắt.

## Phạm vi sử dụng và tốc độ tải

- Dùng audio ở kho từ theo chủ đề, danh sách từ, phòng flashcard, sổ tay các từ đã lưu từ kho chung, Học hôm nay và Tra từ nhanh.
- Chỉ tải audio khi bấm nghe; không tải sẵn cả bộ. Bấm nghe từ mới sẽ dừng tệp trước; rời thẻ hoặc trang sẽ dừng phát.
- Tệp nằm tại `public/audio/vocabulary/`, tên có mã kiểm tra nội dung và được lưu đệm dài hạn. Không thêm lượt đọc database để lấy audio, không phụ thuộc worker Railway.
- Bảng đối chiếu tại `src/data/vocabulary-audio.json` chỉ được dùng phía máy chủ; trình duyệt chỉ nhận URL của những từ trong trang đang mở.
- Audio do admin đã gắn riêng qua `audio_url` vẫn được ưu tiên. Nếu admin sửa từ, bản thu cũ không tự gắn sang từ mới.
- Từ tự thêm và các bộ chưa được cung cấp audio vẫn giữ cách phát âm cũ.

## Khi cần chỉnh hoặc phục hồi

Không có thay đổi dữ liệu trên database, không cần migration. Dữ liệu học và tệp gốc trong Downloads được giữ nguyên. Muốn đưa lên web thật cần triển khai mã nguồn cùng thư mục audio; không chỉ cập nhật URL riêng trong database.

Khi có tệp thay thế, xuất MP3, đặt tên có mã kiểm tra nội dung mới và cập nhật đúng mục trong bảng đối chiếu. Hoặc admin nhập `audio_url` hợp lệ cho từ đó để dùng audio mới ngay theo cơ chế đã có.
