import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leaderboard/:path*",
    "/profile/settings/:path*",
    "/exam/:path*",
    "/practice/:path*",
    "/training/:path*",
    "/review/:path*",
    "/video/:path*",
    "/materials/:path*",
    "/listening/:path*",
    "/speaking/:path*",
    "/pronunciation/:path*",
    "/tools/:path*",
    "/vocabulary/:path*",
    "/manage/:path*",
  ],
};
