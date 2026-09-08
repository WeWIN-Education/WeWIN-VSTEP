import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Chính sách hoàn tiền");

export default function RefundPage() {
  return (
    <LegalLayout title="Chính sách hoàn tiền">
      <p>
        Khi mở bán, yêu cầu hoàn tiền trong 7 ngày kể từ lần thanh toán đầu tiên sẽ được xem xét
        nếu tài khoản chưa sử dụng vượt ngưỡng nội dung Premium quy định.
      </p>
      <p>
        Gói đã gia hạn hoặc khuyến mãi đặc biệt có thể không áp dụng hoàn tiền — sẽ ghi rõ lúc
        thanh toán.
      </p>
      <p>
        Liên hệ hỗ trợ qua trang Liên hệ kèm mã đơn hàng. Bản demo hiện tại không phát sinh giao
        dịch nên không có hoàn tiền.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05 · Bản stub.</p>
    </LegalLayout>
  );
}
