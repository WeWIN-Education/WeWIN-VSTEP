import { LoginForm } from "@/components/auth/LoginForm";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | WEWIN VSTEP",
  description: "Đăng nhập tài khoản WEWIN để tiếp tục luyện thi VSTEP và lưu tiến độ học tập.",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";

  return (
    <AuthSplitLayout
      badge="MỖI NGÀY MỘT CHÚT TIẾN BỘ"
      title="Chào mừng trở lại!"
      subtitle="Đăng nhập để tiếp tục hành trình chinh phục VSTEP."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthSplitLayout>
  );
}
