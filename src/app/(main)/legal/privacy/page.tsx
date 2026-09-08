import { LegalLayout, legalMeta } from "@/components/legal/LegalLayout";

export const metadata = legalMeta("Chính sách bảo mật");

export default function PrivacyPage() {
  return (
    <LegalLayout title="Chính sách bảo mật">
      <p>
        WEWIN EDUCATION thu thập thông tin tài khoản (email, tên) để cung cấp dịch vụ học tập.
        Chúng tôi không bán dữ liệu cá nhân cho bên thứ ba.
      </p>
      <p>
        Dữ liệu đăng nhập được lưu trữ an toàn (mật khẩu được băm). Cookie phiên dùng cho xác thực.
      </p>
      <p>
        Bạn có thể yêu cầu chỉnh sửa hoặc xoá tài khoản qua trang Liên hệ. Chính sách đầy đủ sẽ
        được cập nhật trước khi ra mắt thương mại.
      </p>
      <p className="text-[12px] text-ink-faint">Cập nhật gần nhất: 2026-09-05 · Bản stub.</p>
    </LegalLayout>
  );
}
