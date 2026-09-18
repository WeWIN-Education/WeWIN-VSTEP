"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export type AuthFormState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestedUrl = String(formData.get("callbackUrl") ?? "/dashboard");
  const callbackUrl = requestedUrl.startsWith("/") && !requestedUrl.startsWith("//") && !requestedUrl.includes("\\")
    ? requestedUrl : "/dashboard";

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email hoặc mật khẩu không đúng." };
    }
    throw error;
  }

  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
