# Bộ ảnh bốn kỹ năng WEWIN VSTEP — 31/10/2026

Tạo bằng **imagegen tích hợp** (không dùng CLI/API trả phí của dự án). Ảnh tham chiếu nhận diện: `public/brand/mascots/confident.webp`. Ảnh mới có cả nền, linh vật toàn thân và được lưu bằng tên mới; giữ nguyên ảnh cũ.

## Tệp bàn giao

| Kỹ năng | Ảnh WebP dùng trên web | Bản PNG gốc trong workspace |
| --- | --- | --- |
| listening | public/brand/skills-v2/listening.webp | output/imagegen/skills-v2/listening.png |
| reading | public/brand/skills-v2/reading.webp | output/imagegen/skills-v2/reading.png |
| writing | public/brand/skills-v2/writing.webp | output/imagegen/skills-v2/writing.png |
| speaking | public/brand/skills-v2/speaking.webp | output/imagegen/skills-v2/speaking.png |

WebP 960 × 640, chất lượng 82; Next Image tiếp tục phục vụ kích thước phù hợp màn hình. Khung 3:2 và `object-fit: contain`, trên điện thoại ảnh nằm phía trên nội dung thẻ để không cắt đầu/chân.

## Kiểm tra

- Dung lượng: Listening 47.450 byte, Reading 56.488 byte, Writing 52.024 byte, Speaking 52.930 byte.
- Lint, build, Prisma validation và `git diff --check` đều đạt. Database local chưa chạy, build có cảnh báo truy vấn từ vựng như trước.
- Chromium: desktop 1440px ở sáng/tối và điện thoại 375px. Bốn ảnh đều dùng `contain`, không cắt khung; điện thoại không tràn ngang. Không có console error/warning trong phiên kiểm tra mới.
- Ảnh chụp kiểm tra nằm tại `output/playwright/vstep-skills-v2-light.png`, `vstep-skills-v2-dark.png`, `vstep-skills-v2-mobile.png`.
- Chưa push hoặc triển khai production.

## Prompt cuối cùng cho từng ảnh

### listening

```text
Use case: identity-preserve. Asset type: final landscape illustration for a WEWIN VSTEP skill card, not a screenshot or UI mockup. Input image 1 is the edit target and exact mascot identity reference. Re-render this same friendly WEWIN superhero in a new activity scene. Preserve the round peach face, huge blue eyes, rosy cheeks, blue helmet with two tall golden V antennae, circular blue/gold headphones, glossy royal blue suit, gold W chest emblem, gold belt, white gloves, blue/gold boots and yellow cape. Premium polished 3D educational brand illustration, soft studio lighting, clean materials, consistent proportions. Composition: landscape 3:2, one centered full-body mascot from very top of both golden antennae to soles of both boots, occupying at most 72% of image height. A generous empty safe margin around ALL extremities. Both feet stand on a subtle low oval platform, visible soft contact shadow. This artwork must remain readable as a small website card. Create a beautiful restrained pastel background filling the image, softly layered architectural curves, subtle depth, tiny supporting objects only at the sides. No crop of head, hands, cape or feet, no extra characters, no UI, no title, no captions, no watermark. The only letter permitted is the established W emblem.
Activity: listening attentively, one white-gloved hand cupped beside headphone, other hand open in a welcoming gesture; a few small golden sound-wave arcs beside the ear. Backdrop: airy powder blue (#E8F0FC), distant soft acoustic wave ribbons, pale blue semicircular alcove with delicate warm-gold accents. Calm modern listening studio atmosphere.
```

### reading

```text
Use case: identity-preserve. Asset type: final landscape illustration for a WEWIN VSTEP skill card, not a screenshot or UI mockup. Input image 1 is the edit target and exact mascot identity reference. Re-render this same friendly WEWIN superhero in a new activity scene. Preserve the round peach face, huge blue eyes, rosy cheeks, blue helmet with two tall golden V antennae, circular blue/gold headphones, glossy royal blue suit, gold W chest emblem, gold belt, white gloves, blue/gold boots and yellow cape. Premium polished 3D educational brand illustration, soft studio lighting, clean materials, consistent proportions. Composition: landscape 3:2, one centered full-body mascot from very top of both golden antennae to soles of both boots, occupying at most 72% of image height. A generous empty safe margin around ALL extremities. Both feet stand on a subtle low oval platform, visible soft contact shadow. This artwork must remain readable as a small website card. Create a beautiful restrained pastel background filling the image, softly layered architectural curves, subtle depth, tiny supporting objects only at the sides. No crop of head, hands, cape or feet, no extra characters, no UI, no title, no captions, no watermark. The only letter permitted is the established W emblem.
Activity: holding an open navy book with blank cream pages in both white-gloved hands, eyes happily engaged. Backdrop: pale mint and soft sky blue, softly sculpted book alcove, two small stacks of cream and navy books at the far sides, restrained warm-gold accents. Welcoming contemporary reading corner. No lettering on books.
```

### writing

```text
Use case: identity-preserve. Asset type: final landscape illustration for a WEWIN VSTEP skill card, not a screenshot or UI mockup. Input image 1 is the edit target and exact mascot identity reference. Re-render this same friendly WEWIN superhero in a new activity scene. Preserve the round peach face, huge blue eyes, rosy cheeks, blue helmet with two tall golden V antennae, circular blue/gold headphones, glossy royal blue suit, gold W chest emblem, gold belt, white gloves, blue/gold boots and yellow cape. Premium polished 3D educational brand illustration, soft studio lighting, clean materials, consistent proportions. Composition: landscape 3:2, one centered full-body mascot from very top of both golden antennae to soles of both boots, occupying at most 72% of image height. A generous empty safe margin around ALL extremities. Both feet stand on a subtle low oval platform, visible soft contact shadow. This artwork must remain readable as a small website card. Create a beautiful restrained pastel background filling the image, softly layered architectural curves, subtle depth, tiny supporting objects only at the sides. No crop of head, hands, cape or feet, no extra characters, no UI, no title, no captions, no watermark. The only letter permitted is the established W emblem.
Activity: holding a small navy notebook with blank cream paper in one hand and a short golden pencil in the other, thoughtful happy expression. Backdrop: warm ivory and pale sand with powder-blue architectural arch, a few subtle floating blank paper shapes at the sides, restrained gold accents. Elegant uncluttered writing workspace. No lettering on notebook or pages.
```

### speaking

```text
Use case: identity-preserve. Asset type: final landscape illustration for a WEWIN VSTEP skill card, not a screenshot or UI mockup. Input image 1 is the edit target and exact mascot identity reference. Re-render this same friendly WEWIN superhero in a new activity scene. Preserve the round peach face, huge blue eyes, rosy cheeks, blue helmet with two tall golden V antennae, circular blue/gold headphones, glossy royal blue suit, gold W chest emblem, gold belt, white gloves, blue/gold boots and yellow cape. Premium polished 3D educational brand illustration, soft studio lighting, clean materials, consistent proportions. Composition: landscape 3:2, one centered full-body mascot from very top of both golden antennae to soles of both boots, occupying at most 72% of image height. A generous empty safe margin around ALL extremities. Both feet stand on a subtle low oval platform, visible soft contact shadow. This artwork must remain readable as a small website card. Create a beautiful restrained pastel background filling the image, softly layered architectural curves, subtle depth, tiny supporting objects only at the sides. No crop of head, hands, cape or feet, no extra characters, no UI, no title, no captions, no watermark. The only letter permitted is the established W emblem.
Activity: holding a small navy and golden microphone in one white-gloved hand, other hand gesturing confidently toward viewer, cheerful engaged expression. Backdrop: pale lavender blue and soft periwinkle, sculpted curved studio alcove, a few abstract blank speech-bubble forms at the sides, restrained warm-gold accents. Airy modern speaking studio, not a concert stage.
```
