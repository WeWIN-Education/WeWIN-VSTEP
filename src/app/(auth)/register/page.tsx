import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký | WEWIN EDUCATION",
};

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      badge="🎁 MIỄN PHÍ • LỚP 1"
      title="Bắt đầu hành trình 🚀"
      subtitle="Đăng ký miễn phí, học Lớp 1 không giới hạn."
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
