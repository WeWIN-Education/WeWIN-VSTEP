export const CHARACTER_STATES = [
  { state: "idle", label: "Đứng chờ", detail: "Thở nhẹ, áo choàng đung đưa.", duration: 0 },
  { state: "ready", label: "Sẵn sàng", detail: "Hạ trọng tâm, nắm tay chuẩn bị.", duration: 0 },
  { state: "thinking", label: "Suy nghĩ", detail: "Nghiêng đầu, tay chạm cằm.", duration: 0 },
  { state: "answering", label: "Trả lời", detail: "Hướng tay về phía trước, tập trung chọn đáp án.", duration: 900 },
  { state: "correct", label: "Trả lời đúng", detail: "Bật nhảy vui mừng, tia sáng bung ra.", duration: 1200 },
  { state: "attack", label: "Tấn công", detail: "Lấy đà, lao tới và tung đòn năng lượng.", duration: 1000 },
  { state: "wrong", label: "Trả lời sai", detail: "Khựng lại, lắc đầu hơi bối rối.", duration: 900 },
  { state: "hit", label: "Nhận đòn", detail: "Lùi lại theo hướng đòn đánh rồi lấy lại thăng bằng.", duration: 900 },
  { state: "defense", label: "Phòng thủ", detail: "Đưa tay đỡ, khiên năng lượng lan rộng.", duration: 1400 },
  { state: "victory", label: "Chiến thắng", detail: "Giơ hai tay, nhảy ăn mừng cùng pháo sáng.", duration: 2000 },
  { state: "defeat", label: "Thất bại", detail: "Ngồi xuống, cúi đầu và thở nhẹ.", duration: 1600 },
  { state: "draw", label: "Hòa hữu nghị", detail: "Mỉm cười, đưa tay chào đối thủ.", duration: 1400 },
] as const;

export type CharacterState = (typeof CHARACTER_STATES)[number]["state"];
export type CharacterVariant = "hero" | "rival";

export function characterSource(variant: CharacterVariant, state: CharacterState) {
  return `/battle/${variant}/${state}.webp`;
}

// Wrist anchors are in source-image coordinates, before mirroring or stage motion.
const HANDS = {
  hero: [[.36,.66,.66,.69],[.31,.55,.76,.56],[.4,.67,.64,.54],[.3,.6,.78,.47],[.29,.3,.71,.55],[.19,.49,.76,.67],[.26,.49,.77,.61],[.36,.62,.75,.43],[.32,.47,.74,.51],[.22,.32,.78,.35],[.45,.8,.58,.8],[.26,.6,.58,.59]],
  rival: [[.37,.66,.65,.68],[.35,.57,.77,.53],[.51,.52,.54,.6],[.31,.46,.72,.62],[.27,.32,.71,.59],[.28,.48,.75,.57],[.36,.71,.7,.46],[.35,.58,.71,.43],[.32,.5,.74,.55],[.26,.32,.77,.4],[.44,.79,.57,.81],[.51,.56,.77,.6]],
} as const;

export function characterHands(variant: CharacterVariant, state: CharacterState) {
  return HANDS[variant][CHARACTER_STATES.findIndex((item) => item.state === state)];
}
