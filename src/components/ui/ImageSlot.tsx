import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type ImageSlotProps = {
  label?: string;
  className?: string;
  aspect?: string;
};

/** Placeholder for missing assets — no AI-generated images. */
export function ImageSlot({
  label = "Ảnh sẽ thêm sau",
  className,
  aspect = "aspect-video",
}: ImageSlotProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-[#f8f8f9] text-ink-faint",
        aspect || null,
        className,
      )}
      role="img"
      aria-label={label}
    >
      <ImageIcon className="size-5 opacity-60" />
      <span className="px-2 text-center text-[11px] leading-tight">{label}</span>
    </div>
  );
}
