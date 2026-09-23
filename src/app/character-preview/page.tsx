import type { Metadata } from "next";
import { CharacterPreview } from "@/components/battle/CharacterPreview";

export const metadata: Metadata = {
  title: "Chuyển động nhân vật | WEWIN VSTEP",
  robots: { index: false, follow: false },
};

export default function CharacterPreviewPage() {
  return <CharacterPreview />;
}
