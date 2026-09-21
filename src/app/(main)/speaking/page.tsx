import { redirect } from "next/navigation";

export default function SpeakingPage() {
  redirect("/training?skill=SPEAKING");
}
