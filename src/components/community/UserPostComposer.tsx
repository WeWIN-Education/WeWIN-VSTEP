"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";

const imageTypes: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function UserPostComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); setError("");
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const image = formData.get("image");
      const capabilityResponse = await fetch("/api/posts/upload", { cache: "no-store" });
      const capabilities = await capabilityResponse.json().catch(() => ({})) as { directUpload?: boolean; serverUpload?: boolean; error?: string };
      if (!capabilityResponse.ok) throw new Error(capabilities.error || "Không kiểm tra được nơi lưu ảnh.");
      if (image instanceof File && image.size > 0 && !capabilities.directUpload && !capabilities.serverUpload) throw new Error("Blob storage chưa được kết nối với deployment hiện tại. Hãy redeploy Vercel rồi thử lại.");

      let response: Response;
      if (capabilities.directUpload && image instanceof File && image.size > 0) {
        const extension = fileExtension(image.name);
        const contentType = image.type || imageTypes[extension] || "application/octet-stream";
        const uploaded = await uploadBlob(`posts/${crypto.randomUUID()}${extension}`, image, {
          access: "private",
          contentType,
          handleUploadUrl: "/api/posts/upload",
          clientPayload: JSON.stringify({ fileName: image.name }),
        });
        response = await fetch("/api/posts/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formData.get("title"), body: formData.get("body"), pathname: uploaded.pathname }),
        });
      } else {
        response = await fetch("/api/posts", { method: "POST", body: formData });
      }
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Không thể gửi bài viết.");
      formRef.current?.reset(); setMessage("Bài viết đã được gửi và đang chờ admin duyệt.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể gửi bài viết."); }
    finally { setPending(false); }
  }

  return <form ref={formRef} onSubmit={(event) => void submit(event)} className="rounded-[24px] border border-brand/15 bg-brand-soft/45 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-brand"><ImagePlus className="size-5" aria-hidden="true" /></span><div><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Chia sẻ với cộng đồng</h2><p className="mt-1 text-sm leading-relaxed text-ink-muted">Bài viết sẽ xuất hiện trên feed sau khi admin duyệt.</p></div></div><div className="mt-4 grid gap-3"><label><span className="mb-1.5 block text-sm font-bold text-ink">Tiêu đề <span className="font-normal text-ink-muted">(không bắt buộc)</span></span><input name="title" maxLength={140} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Một điều hữu ích bạn muốn chia sẻ" /></label><label><span className="mb-1.5 block text-sm font-bold text-ink">Nội dung</span><textarea name="body" required minLength={10} maxLength={5000} rows={5} className="w-full rounded-xl border border-border bg-white p-3 text-sm leading-relaxed outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Viết điều bạn đã học, kinh nghiệm luyện thi hoặc một câu hỏi cho cộng đồng…" /></label><label className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-brand/30 bg-white px-3 text-sm font-semibold text-brand"><ImagePlus className="size-4" aria-hidden="true" /><span>Thêm ảnh JPEG, PNG hoặc WebP · tối đa 5 MB</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" /></label></div>{message ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<button type="submit" disabled={pending} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{pending ? "Đang gửi…" : "Gửi bài chờ duyệt"}</button></form>;
}
