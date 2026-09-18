# Hướng dẫn nhập đề VSTEP từ DOCX

Tài liệu này dành cho quản lý nội dung WEWIN. Quy trình dùng một file DOCX có cấu trúc cố định và các file audio được tham chiếu trong DOCX. Sau khi tải lên, hệ thống xem trước toàn bộ nội dung; chỉ bản đề đủ cấu trúc, không còn nội dung mẫu và có đủ audio mới được xuất bản.

## Quy trình nhanh

1. Tải [mẫu nhập đề VSTEP](/templates/WEWIN_VSTEP_Exam_Import_Template.docx) và tạo một bản sao.
2. Mở bản sao bằng Microsoft Word hoặc Google Docs. Nếu dùng Google Docs, chọn **File → Download → Microsoft Word (.docx)** sau khi hoàn tất.
3. Giữ nguyên các thẻ trong ngoặc vuông, tên trường và mã `id`. Chỉ thay phần giá trị sau dấu hai chấm hoặc nội dung trong khối `[TEXT]` và `[INSTRUCTIONS]`.
4. Đặt các file audio cùng tên với giá trị `audio:` trong DOCX. Tên file không phân biệt chữ hoa/chữ thường, nhưng nên dùng tên ASCII không dấu để tránh nhầm khi chia sẻ.
5. Vào **Quản lý nội dung → Nhập đề VSTEP**, chọn DOCX và tất cả audio, rồi bấm **Xem trước và kiểm tra**.
6. Sửa các lỗi được báo và xem trước lại. Khi bản xem trước báo hợp lệ, bấm **Xuất bản đề**.

## Cấu trúc bắt buộc

Đề VSTEP đầy đủ phải có:

- 35 câu Listening, thường chia thành 8, 12 và 15 câu trong ba `LISTENING_PART`.
- 40 câu Reading, thường chia thành bốn `READING_PASSAGE`, mỗi bài 10 câu.
- 2 `WRITING_TASK`.
- 3 `SPEAKING_PART`.

Mỗi câu Listening và Reading cần có `id`, `number`, `prompt`, đủ bốn lựa chọn `A`, `B`, `C`, `D`, `answer` và `explanation`. Đáp án được lưu ở phía máy chủ, không gửi vào dữ liệu công khai của bài thi.

## Quy tắc định dạng

- Mỗi thẻ đứng riêng trên một dòng, ví dụ `[QUESTION]` hoặc `[/TEXT]`.
- Mỗi trường dùng dạng `tên_trường: giá trị`.
- Không đổi tên thẻ, không đổi tên trường và không dùng bảng để thay thế các dòng cấu trúc. Google Docs có thể thay đổi kiểu chữ, nhưng phải giữ nguyên thứ tự văn bản và nội dung thẻ.
- Mỗi `id` phải duy nhất trong toàn bộ đề. Nên dùng tiền tố theo phần: `listening-1`, `reading-1`, `writing-1`, `speaking-1`.
- Các trường `prompt`, lựa chọn, nội dung bài đọc, đề Writing và đề Speaking phải là nội dung thật. Không để lại `[Điền ...]`, `{{...}}` hoặc slug mẫu.
- `strict_vstep: true` là mặc định và bật kiểm tra đủ 35/40/2/3. Chỉ dùng `strict_vstep: false` cho đề luyện rút gọn đã được phê duyệt.

## Khối thông tin đề

```text
[EXAM]
slug: vstep-2026-01
title: Tên đề VSTEP tháng 1
subtitle: Bài luyện VSTEP bốn kỹ năng
target: B1-C1
duration_minutes: 179
strict_vstep: true
```

`slug` chỉ nên gồm chữ thường, số và dấu gạch ngang. Slug đã tồn tại sẽ bị từ chối để tránh ghi đè đề cũ.

## Listening

```text
[LISTENING]
[INSTRUCTIONS]
Hướng dẫn chung cho phần Nghe.
[/INSTRUCTIONS]

[LISTENING_PART]
id: listening-part-1
title: Part 1
audio: listening-part-1.mp3
duration_seconds: 347
instructions: Hướng dẫn riêng cho Part 1

[QUESTION]
id: listening-1
number: 1
prompt: Nội dung câu hỏi
A: Lựa chọn A
B: Lựa chọn B
C: Lựa chọn C
D: Lựa chọn D
answer: B
explanation: Giải thích đáp án đúng
```

Tạo ba khối `LISTENING_PART` và đặt `audio:` là tên file audio tương ứng. `duration_seconds` dùng cho thông tin thời lượng; nên điền thời lượng thực tế của file.

## Reading

```text
[READING]
[INSTRUCTIONS]
Hướng dẫn chung cho phần Đọc.
[/INSTRUCTIONS]

[READING_PASSAGE]
id: reading-passage-1
title: Passage 1
[TEXT]
Nội dung bài đọc thật. Có thể gồm nhiều đoạn văn.
[/TEXT]

[QUESTION]
id: reading-1
number: 1
prompt: Nội dung câu hỏi
A: Lựa chọn A
B: Lựa chọn B
C: Lựa chọn C
D: Lựa chọn D
answer: A
explanation: Giải thích đáp án đúng
```

Mỗi bài đọc cần một khối `TEXT` riêng. Tạo bốn bài đọc và 40 câu hỏi theo thứ tự số câu.

## Writing

```text
[WRITING]
[WRITING_TASK]
id: writing-1
title: Task 1
duration_minutes: 20
minimum_words: 120
prompt: Đề bài Writing 1
bullet: Yêu cầu thứ nhất
bullet: Yêu cầu thứ hai

[WRITING_TASK]
id: writing-2
title: Task 2
duration_minutes: 40
minimum_words: 250
prompt: Đề bài Writing 2
bullet: Yêu cầu thứ nhất
```

Có thể lặp dòng `bullet` để đưa ra các ý cần triển khai. Không đưa đáp án mẫu của Writing vào trường `answer`.

## Speaking

```text
[SPEAKING]
[SPEAKING_PART]
id: speaking-1
title: Part 1
preparation_seconds: 15
speaking_seconds: 180
audio: speaking-part-1.mp3
prompt: Đề bài Speaking Part 1
question: Câu hỏi phụ thứ nhất
question: Câu hỏi phụ thứ hai
```

`audio:` của Speaking là tùy chọn. Nếu có audio câu hỏi, tên file phải được tải lên cùng DOCX. Nếu bỏ trống, trình duyệt có thể đọc đề bằng giọng máy. Tạo đủ ba `SPEAKING_PART` và lặp `question` khi cần.

## Audio và lỗi thường gặp

Hệ thống nhận MP3, WAV, M4A, MP4, OGG và WEBM. Mỗi file tối đa 25 MB, tổng các file tối đa 100 MB. Audio được đối chiếu theo tên cơ sở của file, vì vậy `listening-part-1.mp3` trong DOCX phải trùng với file được chọn khi tải lên.

Trong bản xem trước:

- **Audio còn thiếu**: cần chọn thêm đúng file hoặc sửa giá trị `audio:` trong DOCX.
- **Audio chưa dùng**: file đã chọn nhưng không được tham chiếu; có thể bỏ chọn hoặc kiểm tra lại tên.
- **Cảnh báo**: dòng không theo định dạng được nhận diện; cần xem lại thứ tự và tên trường.
- **Còn nội dung mẫu**: một hoặc nhiều trường vẫn có placeholder; phải thay bằng nội dung và đáp án thật.
- **Slug đã tồn tại**: đổi `slug` trong khối `[EXAM]`, không sửa trực tiếp đề đã xuất bản.

Không thể xuất bản khi thiếu audio được khai báo, thiếu đáp án, trùng `id`, thiếu số lượng phần bắt buộc hoặc còn nội dung mẫu. Bản xem trước hợp lệ chỉ là bước kiểm tra cấu trúc; người duyệt nội dung vẫn chịu trách nhiệm về chất lượng đề và đáp án trước khi xuất bản.
