import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Chính sách thanh toán");

export default function PaymentPage() {
  return (
    <LegalLayout title="Chính sách thanh toán">
      <p>
        Gói Premium (khi mở bán) sẽ được thanh toán qua cổng được công bố trên trang Bảng giá. Giá
        hiển thị đã bao gồm thuế (nếu có) trừ khi ghi chú khác.
      </p>
      <p>
        Chu kỳ thanh toán có thể theo tháng hoặc năm. Hoá đơn điện tử gửi về email đăng ký.
      </p>
      <p>
        Hiện sản phẩm đang ở giai đoạn demo — chưa thu phí thật trên môi trường này.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05 · Bản stub.</p>
    </LegalLayout>
  );
}
