import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Điều khoản sử dụng");

export default function TermsPage() {
  return (
    <LegalLayout title="Điều khoản sử dụng">
      <p>
        Khi sử dụng WEWIN EDUCATION, bạn đồng ý dùng nền tảng cho mục đích học tập cá nhân, không
        sao chép nội dung thương mại trái phép, và không làm gián đoạn hệ thống.
      </p>
      <p>
        Tài khoản demo chỉ dùng để trải nghiệm. Nội dung giáo trình có thể thay đổi khi cập nhật
        phiên bản.
      </p>
      <p>
        WEWIN có quyền tạm ngưng tài khoản vi phạm. Mọi tranh chấp sẽ ưu tiên thương lượng qua kênh
        hỗ trợ.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05.</p>
    </LegalLayout>
  );
}
