import Image from "next/image";
import { cn } from "@/lib/utils";

export type MascotState =
  | "friendly"
  | "ready"
  | "focused"
  | "curious"
  | "happy"
  | "proud"
  | "surprised"
  | "excited"
  | "determined"
  | "confident";

const mascotLabels: Record<MascotState, string> = {
  friendly: "thân thiện",
  ready: "sẵn sàng",
  focused: "tập trung",
  curious: "tò mò",
  happy: "vui vẻ",
  proud: "tự hào",
  surprised: "ngạc nhiên",
  excited: "phấn khích",
  determined: "quyết tâm",
  confident: "tự tin",
};

type MascotProps = {
  state?: MascotState;
  size?: number;
  animated?: boolean;
  className?: string;
  priority?: boolean;
};

export function Mascot({ state = "friendly", size = 156, animated = true, className, priority = false }: MascotProps) {
  return (
    <Image
      src={`/brand/mascots/${state}.png`}
      alt={`Linh vật WEWIN đang ${mascotLabels[state]}`}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={cn("object-contain", animated && "mascot-welcome", className)}
    />
  );
}
