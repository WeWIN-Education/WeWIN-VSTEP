import { PracticePlayer } from "@/components/practice/PracticePlayer";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCurrentUser } from "@/lib/access";
import Link from "next/link";
import { notFound } from "next/navigation";

const items = {
  "word-order": { type: "WORD_ORDER", prompt: "Sắp xếp câu hướng dẫn hoạt động theo nhóm.", instruction: "Word order", payload: { tokens: ["Work", "in", "pairs", "please"] }, answer: ["Work", "in", "pairs", "please"] },
  "fill-blank": { type: "FILL_BLANK", prompt: "Chọn từ đúng: Before we ___, check your materials.", instruction: "Fill in the blank", payload: { sentence: "Before we ____, check your materials.", options: ["begin", "began", "begins", "beginning"] }, answer: "begin" },
  "listening-fill": { type: "LISTENING_FILL", prompt: "Nghe và chọn từ còn thiếu.", instruction: "Listening fill", payload: { transcript: "Eyes on me, please.", sentence: "Eyes on ____, please.", options: ["me", "we", "my", "mine"] }, answer: "me" },
  "listening-order": { type: "LISTENING_ORDER", prompt: "Sắp xếp lượt thoại đúng thứ tự.", instruction: "Listening order", payload: { turns: ["Good morning, everyone.", "Good morning, teacher.", "Are you ready?", "Yes, we are."] }, answer: ["Good morning, everyone.", "Good morning, teacher.", "Are you ready?", "Yes, we are."] },
  writing: { type: "FILL_BLANK", prompt: "Chọn cách mở đầu email chuyên nghiệp.", instruction: "Writing phrase", payload: { sentence: "Dear ____, thank you for your message.", options: ["Ms. Hoa", "Hey buddy", "Yo", "No name"] }, answer: "Ms. Hoa" },
} as const;

export default async function PracticeTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const item = items[type as keyof typeof items];
  if (!item) notFound();
  if (!(await getCurrentUser())) return <div className="mx-auto max-w-[760px]"><LoginGate title="Đăng nhập để mở bài tập" description="Đăng nhập để mở và lưu phiên luyện." callbackUrl={`/practice/${type}`}>{null}</LoginGate></div>;
  return <div className="mx-auto max-w-[760px]"><Link href="/practice" className="mb-5 inline-flex text-sm font-semibold text-brand hover:underline">← Bài tập</Link><h1 className="mb-5 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">{item.instruction}</h1><PracticePlayer type={item.type} items={[{ id: `${type}-1`, type: item.type, prompt: item.prompt, instruction: item.instruction, payload: item.payload, answer: item.answer }]} /></div>;
}
