import { redirect } from "next/navigation";

/** Legacy /hanzi route → English phonics page. */
export default function HanziRedirectPage() {
  redirect("/pronunciation");
}
