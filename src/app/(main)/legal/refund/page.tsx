import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Chính sách hoàn tiền");

export default function RefundPage() {
  return (
    <LegalLayout title="Chính sách hoàn tiền">
      <p>
        Các yêu cầu bảo lưu hoặc hoàn phí được xử lý theo chính sách của chương trình và thỏa thuận trực tiếp với trung tâm.
      </p>
      <p>
        LMS không lưu thông tin thanh toán và không tự động gia hạn chương trình.
      </p>
      <p>
        Liên hệ hỗ trợ qua trang Liên hệ kèm mã đơn hàng. Bản demo hiện tại không phát sinh giao
        dịch nên không có hoàn tiền.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05 · Bản stub.</p>
    </LegalLayout>
  );
}
