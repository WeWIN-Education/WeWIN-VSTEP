import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "LEARNER" | "TEACHER" | "ADMIN";
    sessionVersion: number;
  }

  interface Session {
    user: {
      id: string;
      role: "LEARNER" | "TEACHER" | "ADMIN";
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "LEARNER" | "TEACHER" | "ADMIN";
    sessionVersion?: number;
  }
}
