| ID | Phân hệ | Loại | Điều kiện và bước kiểm thử | Kết quả mong đợi | Ưu tiên |

|---|---|---|---|---|---|

| AUTH-01 | Đăng nhập | UI/API | Đăng nhập bằng tài khoản học viên hợp lệ | Đăng nhập thành công, chuyển đúng trang, hiển thị đúng tên và vai trò | P0 |

| AUTH-02 | Đăng nhập | API/SEC | Nhập sai mật khẩu nhiều lần | Báo lỗi chung, giới hạn thử lại, không tiết lộ tài khoản tồn tại | P0 |

| AUTH-03 | Phiên đăng nhập | E2E | Refresh trang, hết hạn token, đăng xuất | Phiên được duy trì đúng hạn; token hết hạn bị từ chối; đăng xuất xóa phiên | P0 |

| AUTH-04 | Phân quyền | SEC/E2E | Học viên truy cập `/manage`; admin truy cập dữ liệu học viên | Học viên bị chặn; admin truy cập đúng phạm vi | P0 |

| AUTH-05 | Deep link và sở hữu dữ liệu | SEC/API | Mở trực tiếp attempt, recording, bài viết của người khác | Trả về 403/404; không lộ dữ liệu | P0 |

| SHELL-01 | Điều hướng | UI/E2E | Mở từng mục menu: khóa học, bài tập, game, video, lịch sử, quản trị | Đúng route, không xuất hiện trang trắng hoặc lỗi console | P1 |

| SHELL-02 | Dashboard | UI/API | Kiểm tra XP, rank, streak, số bài đã làm | Số liệu khớp API và không bị nhân đôi khi refresh | P1 |

| SHELL-03 | Trạng thái giao diện | UI/A11Y | Kiểm tra loading, empty, error, mobile 390px, bàn phím | Có trạng thái rõ ràng, responsive, focus và label đầy đủ | P1 |

| EXAM-01 | Catalog VSTEP | UI/API | Xem danh sách đề theo cấp độ và kỹ năng | Chỉ hiện đề đã publish, đúng cấp độ và metadata | P0 |

| EXAM-02 | Guest trial | E2E/API | Guest làm hai đề khác nhau, thử đề thứ ba, refresh trình duyệt | Tuân thủ giới hạn guest hiện tại; resume đúng trong thời hạn | P0 |

| EXAM-03 | Quyền làm đề | API/SEC | Học viên mở đề được cấp và đề chưa được cấp | Đề được cấp mở bình thường; đề chưa cấp bị chặn | P0 |

| EXAM-04 | Tạo attempt | API | Gửi đồng thời nhiều yêu cầu bắt đầu cùng đề | Chỉ tạo một attempt hợp lệ, không tạo bản ghi trùng | P0 |

| EXAM-05 | Autosave và resume | E2E | Trả lời một phần, refresh hoặc đóng trình duyệt rồi vào lại | Khôi phục đúng câu trả lời và thời gian còn lại | P0 |

| EXAM-06 | Các loại câu hỏi | UI/API | Làm single choice, multiple choice, text, audio và speaking | Dữ liệu được lưu đúng kiểu, không mất ký tự hoặc lựa chọn | P0 |

| EXAM-07 | Biên thời gian | E2E | Gửi đáp án ngay trước và ngay sau khi hết giờ | Đáp án hợp lệ trước deadline được nhận; sau deadline xử lý theo luật đề | P0 |

| EXAM-08 | Bookmark và review | E2E | Đánh dấu câu, lọc câu chưa làm, quay lại câu trước | Bookmark và trạng thái câu được giữ chính xác | P1 |

| EXAM-09 | Submit attempt | API/E2E | Bấm nộp nhiều lần hoặc nộp khi mạng chậm | Submit idempotent, không nhân điểm hoặc tạo kết quả trùng | P0 |

| EXAM-10 | Kết quả và lịch sử | UI/API | Nộp bài rồi mở kết quả, lịch sử và chi tiết attempt | Hiển thị đúng điểm, trạng thái chấm và quyền truy cập | P0 |

| AI-01 | Tạo job chấm AI | API | Nộp Writing/Speaking | Tạo job đúng part, trạng thái bắt đầu là `QUEUED` | P0 |

| AI-02 | Điểm khách quan | API | Nộp Listening/Reading có đáp án đúng và sai | Tính điểm đúng ngay, không phụ thuộc AI | P0 |

| AI-03 | Chấm Writing | AI/API | Gửi bài Writing đủ Task 1 và Task 2 | Chấm đúng rubric, trọng số và tổng điểm cấu hình | P0 |

| AI-04 | Feedback Writing | AI/UI | Xem feedback sau khi chấm | Có điểm từng tiêu chí, bằng chứng, lỗi và giải thích bằng tiếng Việt | P1 |

| AI-05 | Ghi âm Speaking | E2E | Cấp quyền microphone, ghi âm, dừng, phát lại, gửi bài | Countdown, giới hạn thời lượng, playback và upload hoạt động đúng | P0 |

| AI-06 | Transcription Speaking | AI/API | Gửi audio rõ tiếng, có tạp âm và audio đã upload | Ưu tiên audio gốc; transcript hợp lệ được dùng để chấm | P0 |

| AI-07 | Audio lỗi | API/AI | Gửi file sai MIME, quá dài, rỗng, không nghe được | Trả lỗi phù hợp; part chuyển `FAILED` hoặc `MISSING`, không tự cho điểm | P0 |

| AI-08 | Reviewer/adjudication | AI/API | Tạo kết quả confidence thấp hoặc thiếu bằng chứng | Chạy reviewer/adjudication theo cấu hình; giữ, sửa hoặc đánh dấu không thể chấm | P0 |

| AI-09 | Chấm từng phần | API/E2E | Một part thành công, một part lỗi hoặc đang chờ | Hiển thị `PARTIAL`, `PROCESSING`, `FAILED`, `MISSING` đúng thực tế | P0 |

| AI-10 | Lỗi dịch vụ AI | API/AI | Mô phỏng timeout, 429, 5xx, response sai cấu trúc | Retry có giới hạn, lỗi được ghi nhận, không chấm điểm sai | P0 |

| AI-11 | Worker chấm điểm | API/Infra | Dừng worker giữa chừng rồi chạy worker khác | Lease hết hạn được thu hồi, checkpoint tiếp tục được, job không chạy trùng | P0 |

| AI-12 | Bảo mật kết quả AI | SEC/API | Người khác gọi grade/status; nội dung bài có prompt injection | Chỉ chủ bài được xem; không lộ prompt, key, nội bộ hoặc dữ liệu người khác | P0 |

| RUN-01 | Listening | E2E | Phát audio, tải range, chuyển câu | Audio phát đúng, range trả 206 khi cần, không lộ file khác | P0 |

| RUN-02 | Reading | E2E | Chuyển passage, quay lại, đổi đáp án | Điều hướng ổn định, đáp án và timer không mất | P1 |

| RUN-03 | Writing editor | UI/E2E | Nhập bài dài, refresh, gửi bài | Không mất nội dung, giới hạn ký tự hoạt động, submit đúng | P0 |

| RUN-04 | Speaking runner | E2E | Countdown, ghi âm, retry, upload khi mạng chậm | Cho phép retry an toàn, không tạo recording trùng | P0 |

| PRA-01 | Catalog luyện tập | UI/API | Lọc theo kỹ năng, cấp độ, trạng thái publish | Kết quả đúng filter, phân trang/cursor ổn định | P1 |

| PRA-02 | Loại bài tập | UI/E2E | Làm cloze, fill blank, word order, listening order | Chấm đúng từng loại câu hỏi | P0 |

| PRA-03 | Feedback luyện tập | E2E | Trả lời đúng, sai, bỏ trống | Hiện đáp án, giải thích và điểm đúng | P1 |

| PRA-04 | Retry và review | E2E | Làm lại, reset, next, mở review | Trạng thái tiến độ đúng, không cộng trùng | P1 |

| PRA-05 | Audio luyện tập | UI/API | Phát audio bài tập và đổi tốc độ | Phát đúng file, lỗi có fallback và thông báo rõ | P1 |

| PRA-06 | Nội dung unpublished | SEC/API | Học viên gọi ID nội dung nháp hoặc đã ẩn | Bị chặn dù biết ID trực tiếp | P0 |

| VID-01 | Danh sách video | UI/API | Lọc video theo cấp độ, chủ đề, trạng thái | Chỉ hiện video được publish, metadata đúng | P1 |

| VID-02 | YouTube playback | E2E | Mở video hợp lệ, pause, seek, reload | Player hoạt động, không tạo iframe sai hoặc trang trắng | P1 |

| VID-03 | Transcript | UI/E2E | Mở transcript, bấm dòng, xem phiên âm và dịch | Đồng bộ đúng thời gian, click dòng nhảy đúng vị trí | P1 |

| VID-04 | Tiến độ video | API/E2E | Xem một phần, refresh, tua nhanh, đổi tab | Tiến độ lưu đúng; không ghi nhận bất thường vượt quá logic hệ thống | P1 |

| VID-05 | Admin thêm video | Admin/API | Nhập link YouTube, tiêu đề, cấp độ, chủ đề | Validate link, lưu được bản nháp, không trùng video | P0 |

| VID-06 | Tự sinh dữ liệu video | AI/API | Chạy transcript, phiên âm, dịch, câu hỏi | Sinh đúng dữ liệu; lỗi từng bước không làm mất bản gốc | P0 |

| VID-07 | Import fallback video | API | Import SRT/VTT/TXT hoặc audio riêng | Parser đúng timestamp và encoding; báo lỗi dòng sai | P1 |

| VID-08 | Publish và chỉnh sửa | Admin/E2E | Sửa, ẩn, publish, mở lại video | Học viên thấy đúng phiên bản mới; tiến độ cũ được giữ | P0 |

| VOC-01 | Từ vựng | UI/API | Tìm kiếm, lọc cấp độ/chủ đề, phân trang | Kết quả đúng, không trùng hoặc mất mục | P1 |

| VOC-02 | Flashcard | UI/E2E | Lật thẻ, nghe audio, phát âm, chuyển thẻ | Thao tác và audio hoạt động đúng | P1 |

| VOC-03 | Tiến độ từ vựng | API/E2E | Đánh dấu New, Learning, Mastered | Trạng thái và thống kê cập nhật chính xác, idempotent | P0 |

| VOC-04 | Resume và accessibility | UI | Đóng trang giữa bộ thẻ, dùng bàn phím, bật reduced motion | Tiếp tục đúng vị trí, không phụ thuộc chuột hoặc animation | P1 |

| VOC-05 | Từ vựng cá nhân | API/SEC | Thêm, sửa, xóa, xem từ cá nhân của hai tài khoản | CRUD đúng; tài khoản khác không xem được | P0 |

| VOC-06 | Import và collocations | Admin/API | Import XLSX có dòng hợp lệ, trùng, thiếu cột, Unicode | Preview đúng, validate đủ, import atomic, collocation hiển thị đúng | P0 |

| GAME-01 | Tìm trận | E2E | Bấm tìm trận, chờ, hủy; kiểm tra màn hình vào game | Không còn trang trắng; có màn hình thông báo; nút hủy cách timer rõ ràng | P0 |

| GAME-02 | Luật 15 câu | E2E/API | Chơi đủ trận | Đúng 15 câu, lượt người chơi/bot và loại câu đúng cấu hình | P0 |

| GAME-03 | Kết quả tức thì | E2E | Chọn đáp án đúng/sai | Biết đúng/sai ngay, cộng điểm rồi chuyển câu tiếp theo | P0 |

| GAME-04 | Sát deadline | E2E | Chọn đáp án ở mốc còn 3 giây, 1 giây và vài mili giây | Nếu client gửi trước deadline thì server vẫn kiểm tra và cộng điểm | P0 |

| GAME-05 | Bot và tên hiển thị | E2E | Chơi với bot | Bot dùng tên tiếng Việt; không hiện thông báo người chơi đang đấu với bot | P1 |

| GAME-06 | Tốc độ và độ chính xác bot | API/E2E | Chạy nhiều trận với các tốc độ khác nhau | Thời gian trả lời thay đổi theo câu; tỉ lệ đúng theo cấu hình | P1 |

| GAME-07 | Kết thúc và lịch sử | API/E2E | Mất kết nối, gửi lại đáp án, kết thúc trận | Không nhân đôi lượt; chỉ lưu thắng/thua và cộng XP cuối trận | P0 |

| COMM-01 | Feed cộng đồng | UI/API | Guest xem feed, học viên xem feed cá nhân | Đúng quyền, phân trang ổn định, empty state rõ | P1 |

| COMM-02 | Bài viết | E2E | Tạo, sửa, lưu nháp, publish bài viết | Chỉ chủ bài hoặc admin được sửa; trạng thái publish đúng | P1 |

| COMM-03 | Upload bài viết | API/SEC | Upload ảnh hợp lệ, file sai MIME, file quá lớn | Kiểm tra MIME/kích thước, lưu an toàn, lỗi rõ ràng | P0 |

| COMM-04 | Like và bình luận | API/E2E | Like nhiều lần, thêm/xóa bình luận | Like idempotent, bình luận đúng quyền, không tạo bản ghi trùng | P1 |

| COMM-05 | Blog công khai | UI/API | Mở danh sách và `/blog/\[slug]` | Slug đúng, SEO metadata và trạng thái publish đúng | P1 |

| COMM-06 | Tài liệu học tập | UI/API | Lọc, xem chi tiết, tải file, kiểm tra range | Chỉ tài liệu được cấp quyền; download đúng file | P0 |

| GAM-01 | XP | API | Nộp bài, hoàn thành game, hoàn thành thử thách; gửi lại request | XP cộng đúng một lần, không vượt quy tắc | P0 |

| GAM-02 | Rank và huy hiệu | API/UI | Kiểm tra các mốc Đồng, Bạc, Vàng, Bạch kim, Kim cương, Cao thủ | Huy hiệu và tiến độ đổi đúng ngưỡng | P1 |

| GAM-03 | Streak và daily challenge | API/E2E | Hoàn thành ngày liên tiếp, bỏ một ngày, nhận thưởng lại | Streak và phần thưởng đúng timezone Việt Nam, không nhận trùng | P1 |

| GAM-04 | Leaderboard và lịch sử | UI/API | Xem top, vị trí cá nhân, lịch sử trận | Xếp hạng đúng, dữ liệu riêng tư được bảo vệ | P1 |

| ADM-01 | Quản lý người dùng | Admin/API | Tìm kiếm, lọc, xem chi tiết, phân trang | Dữ liệu đúng, không query trùng hoặc mất bản ghi | P0 |

| ADM-02 | Khóa tài khoản | Admin/E2E | Khóa/mở khóa người dùng đang đăng nhập | Phiên hiện tại bị vô hiệu hóa theo chính sách | P0 |

| ADM-03 | Import đề thi | Admin/API | Import DOCX/audio hợp lệ, thiếu trường, file lỗi | Preview và validate chính xác; lỗi không ghi dữ liệu dở dang | P0 |

| ADM-04 | Publish và cấp đề | Admin/API | Publish đề, gán cho học viên, hủy publish | Quyền truy cập cập nhật đúng, lịch sử attempt không bị xóa | P0 |

| ADM-05 | Learning content | Admin/API | Tạo, sửa, ẩn, publish nội dung và bài tập | Học viên thấy đúng nội dung mới nhất | P1 |

| ADM-06 | Battle manager | Admin/API | Thêm, sửa, xóa, publish câu hỏi game | Câu hỏi hợp lệ; câu nháp không vào trận | P1 |

| ADM-07 | Video manager | Admin/API | Tạo, sửa, transcript, publish, ẩn video | Quy trình admin hoàn chỉnh, audit lỗi rõ | P0 |

| ADM-08 | Vocabulary và posts manager | Admin/API | Import từ vựng, duyệt bài viết, xử lý nội dung vi phạm | Validation, moderation và rollback hoạt động đúng | P1 |

| SEC-01 | IDOR | SEC/API | Thay `attemptId`, `userId`, `postId`, `recordingId` trên request | Không đọc/sửa/xóa dữ liệu ngoài quyền | P0 |

| SEC-02 | CSRF và session | SEC/API | Gửi mutation khác origin hoặc thiếu cookie hợp lệ | Request bị chặn theo cơ chế xác thực hiện tại | P0 |

| SEC-03 | Rate limit | SEC/API | Spam guest session, login, upload, AI grade | Trả 429 đúng ngưỡng, không làm sập worker/API | P0 |

| SEC-04 | Input injection | SEC/API | Gửi HTML, script, SQL-like text, JSON sai schema | Dữ liệu được sanitize/validate, không thực thi script | P0 |

| SEC-05 | File upload | SEC/API | Đổi phần mở rộng, path traversal, file giả MIME | File bị từ chối hoặc lưu an toàn ngoài vùng thực thi | P0 |

| SEC-06 | Error và cache | SEC/API | Gây lỗi server rồi kiểm tra response/header | Không lộ stack trace, secret, prompt; dữ liệu riêng tư có `no-store` | P0 |

| NFR-01 | Hiệu năng trang | PERF | Đo dashboard, exam, game, video trên mạng chậm | Không có request lặp vô ích; loading và timeout có giới hạn | P1 |

| NFR-02 | Đồng thời | PERF/API | Nhiều người bắt đầu đề, gửi đáp án, chạy AI cùng lúc | Không deadlock, không trùng XP/attempt/job, queue xử lý ổn | P0 |

| NFR-03 | Mất dịch vụ phụ thuộc | E2E | Tắt AI, storage, YouTube hoặc database tạm thời | Có fallback/thông báo; dữ liệu đã lưu không mất | P1 |

| NFR-04 | Accessibility | A11Y | Dùng keyboard, screen reader, zoom 200%, contrast | Có focus rõ, label, heading và thông báo lỗi truy cập được | P1 |

| NFR-05 | Responsive và trình duyệt | E2E | Chrome, Edge, mobile 390px, tablet | Không tràn layout, nút không che timer, route hoạt động | P1 |

| NFR-06 | Migration và deploy | Infra | Chạy migration trên DB có dữ liệu, restart worker, deploy mới | Migration an toàn, worker resume job, rollback có hướng dẫn | P0 |
