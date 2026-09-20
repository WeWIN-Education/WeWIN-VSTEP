import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Chính sách thanh toán");

export default function PaymentPage() {
  return (
    <LegalLayout title="Chính sách thanh toán">
      <p>
        WEWIN cấp tài khoản theo chương trình sau khi trung tâm xác nhận đăng ký. Thông tin thanh toán được trao đổi ngoài LMS theo kênh chính thức của WEWIN.
      </p>
      <p>
        Quyền học được gắn theo chương trình và tài khoản được cấp, không có checkout hoặc thanh toán trực tiếp trong LMS này.
      </p>
      <p>
        Hiện sản phẩm đang ở giai đoạn demo và chưa thu phí trực tiếp trên môi trường này.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05.</p>
    </LegalLayout>
  );
}
