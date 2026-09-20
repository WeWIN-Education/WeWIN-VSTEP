import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { PageHero } from "@/components/ui/PageHero";
import {
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  Gamepad2,
  Lightbulb,
  Mic2,
  NotebookPen,
  PlayCircle,
  Repeat2,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { Metadata } from "next";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCurrentUser } from "@/lib/access";

export const metadata: Metadata = { title: "Mẹo nhớ từ vựng | WEWIN EDUCATION" };

const methods = [
  { icon: Brain, title: "Học theo ngữ cảnh", text: "Đừng chỉ ghi nhớ word = meaning. Đặt từ vào một câu và liên kết với tình huống quen thuộc.", example: "The steak sizzled in the pan. · Miếng bít tết phát ra tiếng xèo xèo trong chảo." },
  { icon: Volume2, title: "Lặp lại và đọc thành tiếng", text: "Nghe cách phát âm, nhẩm lại, đọc thành tiếng và ghi âm để kiểm tra. Kết hợp mắt, tai và giọng nói.", example: "Nghe → nhẩm → nói lại → ghi âm → nghe lại." },
  { icon: Lightbulb, title: "Tạo liên tưởng", text: "Dùng hình ảnh, câu chuyện hoặc người quen để tạo một móc nhớ riêng cho từ mới.", example: "reliable friend · một người bạn luôn xuất hiện khi bạn cần giúp đỡ." },
  { icon: NotebookPen, title: "Tự đặt câu", text: "Khi tự viết câu, bạn học được vị trí của từ, từ đi cùng và ngữ cảnh phù hợp.", example: "I am learning English in the classroom. · Tôi đang học tiếng Anh trong lớp." },
  { icon: Mic2, title: "Nói liên tục 2–4 phút", text: "Chọn một chủ đề, nói về công việc hoặc lớp học, rồi cố tình dùng các từ mới trong lần ghi âm thứ hai.", example: "Sau khi nghe lại, thay một từ quen thuộc bằng từ mới vừa học." },
  { icon: Gamepad2, title: "Chơi và học theo chủ đề", text: "Câu đố, trò chơi và nhóm chủ đề giúp não xử lý từ sâu hơn thay vì nhìn một danh sách rời rạc.", example: "Giáo dục · Công nghệ · Công việc · Du lịch · Môi trường." },
  { icon: NotebookPen, title: "Viết nhật ký ngắn", text: "Mỗi ngày viết vài câu hoặc một đoạn ngắn bằng tiếng Anh. Viết trước, đọc lại và sửa sau.", example: "Hãy cố gắng đưa ít nhất một từ mới vào đoạn viết của hôm nay." },
  { icon: PlayCircle, title: "Học từ nội dung thật", text: "Chọn từ hoặc cụm xuất hiện nhiều lần, hữu ích với bạn và gắn với video, phim, podcast bạn yêu thích.", example: "Không cần ghi lại mọi từ chưa biết. Chọn từ bạn thực sự muốn dùng." },
] as const;

const forgettingReasons = [
  ["Nhồi quá nhiều", "Vốn từ hình thành qua tích lũy đều đặn. Một buổi quá nặng dễ khiến bạn mệt và bỏ cuộc."],
  ["Chỉ học nghĩa", "Một từ có thể đổi nghĩa theo ngữ cảnh. Hãy học câu và tình huống đi cùng từ đó."],
  ["Không ôn thường xuyên", "Học một lần rồi bỏ quãng dài khiến từ rơi khỏi trí nhớ. Sự đều đặn quan trọng hơn số lượng."],
] as const;

const reviewSteps = ["Ngày 1", "Ngày 2", "Ngày 4", "Ngày 7", "Ngày 14", "Ngày 30"];

export default async function VocabularyTipsPage() {
  if (!(await getCurrentUser())) return <div className="mx-auto w-full max-w-[1120px]"><PageHero eyebrow="TỪ VỰNG · PHƯƠNG PHÁP" title="Mẹo học từ nhanh thuộc, nhớ lâu" description="Đăng nhập để mở mẹo học." /><LoginGate title="Đăng nhập để mở mẹo học" description="Đăng nhập để xem đầy đủ nội dung." callbackUrl="/vocabulary/tips">{null}</LoginGate></div>;
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-7">
      <PageHero
        eyebrow="TỪ VỰNG · PHƯƠNG PHÁP"
        title="Mẹo học từ nhanh thuộc, nhớ lâu"
        description="Chuyển từ việc nhận ra một từ sang hiểu, nhớ lại và dùng được từ đó trong lớp học, bài thi và giao tiếp."
        aside={<Mascot state="curious" size={118} className="hidden md:block" />}
      />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-wide text-brand">BẮT ĐẦU TỪ NGUYÊN NHÂN</p><h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Vì sao học mãi không thuộc?</h2></div>
          <BookOpen className="hidden size-6 text-brand sm:block" aria-hidden="true" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {forgettingReasons.map(([title, text], index) => <Card key={title} padding="lg"><span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-xs font-extrabold text-brand">0{index + 1}</span><h3 className="mt-4 font-extrabold text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p></Card>)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-brand">THÓI QUEN CÓ THỂ DÙNG NGAY</p><h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Học từ để dùng được</h2></div><span className="text-xs text-ink-muted">Mỗi lần chọn 1–2 cách là đủ</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {methods.map(({ icon: Icon, title, text, example }, index) => <Card key={title} padding="lg" className="relative overflow-hidden"><span className="absolute right-5 top-5 text-4xl font-black text-brand/10">{String(index + 1).padStart(2, "0")}</span><span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-5" aria-hidden="true" /></span><h3 className="mt-4 pr-10 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p><p className="mt-4 rounded-xl bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink"><span className="font-bold text-brand">Ví dụ: </span>{example}</p></Card>)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card padding="lg" className="overflow-hidden bg-brand text-white">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-100">SPACED REPETITION</p><h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-xl font-extrabold">Ôn đúng lúc bắt đầu quên</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">Ôn lại theo khoảng cách giãn dần. Từ khó xuất hiện nhiều hơn, từ đã nhớ tốt được giãn ra để tiết kiệm thời gian.</p></div><CalendarClock className="size-8 shrink-0 text-[#F8D99D]" aria-hidden="true" /></div>
          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">{reviewSteps.map((step, index) => <div key={step} className="rounded-xl border border-white/15 bg-white/10 p-2 text-center"><span className="block text-sm font-extrabold text-white">{index + 1}</span><span className="mt-1 block text-[10px] text-blue-100">{step}</span></div>)}</div>
        </Card>
        <Card padding="lg"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F8D99D]/45 text-[#966A23]"><Repeat2 className="size-5" aria-hidden="true" /></span><div><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Mục tiêu của mỗi lần ôn</h2><p className="mt-2 text-sm leading-relaxed text-ink-muted">Không chỉ nhận ra từ khi nhìn thấy, mà còn hiểu khi nghe, nhớ lại khi cần và sử dụng được khi nói hoặc viết.</p></div></div><div className="mt-5 space-y-2">{["Hiểu khi nghe", "Hiểu khi đọc", "Nhớ lại khi cần", "Dùng khi nói và viết"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-semibold text-ink"><CheckCircle2 className="size-4 text-brand" aria-hidden="true" />{item}</div>)}</div></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg"><div className="flex items-center gap-3"><Sparkles className="size-5 text-brand" aria-hidden="true" /><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Một flashcard nên có gì?</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["Mặt trước", "Từ hoặc cụm từ cần học"], ["Mặt sau", "Nghĩa, phiên âm, loại từ, ví dụ và ngữ cảnh"]].map(([title, text]) => <div key={title} className="rounded-xl border border-border p-3"><p className="text-xs font-extrabold text-brand">{title}</p><p className="mt-1 text-sm text-ink-muted">{text}</p></div>)}</div></Card>
        <Card padding="lg" className="border-brand/20 bg-brand-soft"><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Công thức học một mục từ</h2><p className="mt-3 text-sm font-extrabold leading-relaxed text-brand">Từ → Phát âm → Nghĩa → Ngữ cảnh → Ví dụ → Thực hành → Ôn tập</p><p className="mt-3 text-sm leading-relaxed text-ink-muted">Khi gặp từ mới, hãy nghe, đọc, tự đặt một câu liên quan đến cuộc sống hoặc lớp học, rồi lưu vào sổ tay để ôn theo chu kỳ.</p></Card>
      </section>
    </div>
  );
}
