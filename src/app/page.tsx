import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/access";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "WEWIN VSTEP | Mỗi ngày một bước, tự tin vào kỳ thi",
  description: "Luyện thi VSTEP cùng WEWIN: luyện 4 kỹ năng, học từ vựng qua flashcard, học qua video và xem nhận xét bài Viết, bài Nói.",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  return <LandingPage loggedIn={Boolean(user)} />;
}
