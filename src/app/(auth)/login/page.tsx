import { LoginForm } from "@/components/auth/LoginForm";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | WEWIN EDUCATION",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <AuthSplitLayout
      badge="HỌC MỖI NGÀY 15 PHÚT"
      title="Chào mừng quay lại 👋"
      subtitle="Tiếp tục lộ trình học tiếng Anh của bạn."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthSplitLayout>
  );
}
