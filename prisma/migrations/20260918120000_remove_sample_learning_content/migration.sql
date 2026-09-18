DELETE FROM "BlogPost"
WHERE "slug" IN ('classroom-english-week-one', 'vstep-study-plan');

DELETE FROM "PracticeItem"
WHERE "prompt" IN (
    'Nghe và chọn từ còn thiếu.',
    'Chọn từ phù hợp với ngữ cảnh.',
    'Chọn câu mở đầu email chuyên nghiệp.'
);
