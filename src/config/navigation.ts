import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Dumbbell,
  GraduationCap,
  Gamepad2,
  History,
  Library,
  Newspaper,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

export type NavRole = "LEARNER" | "ADMIN";

export type NavLeaf = {
  label: string;
  href: string;
  roles?: readonly NavRole[];
};

export type NavItem = {
  label: string;
  href?: string;
  authenticatedLabel?: string;
  authenticatedHref?: string;
  icon: LucideIcon;
  children?: NavLeaf[];
  roles?: readonly NavRole[];
};

export type NavGroup = {
  id: string;
  label?: string;
  items: NavItem[];
};

/** Learner-facing navigation aligned with Hanbeego's grouped sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "top",
    items: [
      {
        label: "Trang chủ",
        authenticatedLabel: "Tổng quan",
        href: "/",
        authenticatedHref: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "hoc-tap",
    label: "HỌC TẬP",
    items: [
      {
        label: "Khóa học",
        icon: GraduationCap,
        children: [
          { label: "Luyện thi VSTEP", href: "/exam/vstep" },
          { label: "Bài tập", href: "/practice" },
          { label: "Học qua video", href: "/video" },
        ],
      },
      {
        label: "Từ vựng",
        icon: BookMarked,
        children: [
          { label: "Sổ tay từ vựng", href: "/vocabulary/notebook", roles: ["LEARNER", "ADMIN"] },
          { label: "Từ vựng theo chủ đề", href: "/vocabulary/topics" },
          { label: "Mẹo nhớ từ vựng", href: "/vocabulary/tips" },
          { label: "Cụm từ & collocations", href: "/vocabulary/collocations" },
        ],
      },
    ],
  },
  {
    id: "on-luyen",
    label: "HỌC LIỆU & ÔN LUYỆN",
    items: [
      { label: "Luyện tập tổng hợp", href: "/review", icon: Dumbbell },
      { label: "Trò chơi", href: "/game", icon: Gamepad2 },
      { label: "Cộng đồng", href: "/feed", icon: Users },
      { label: "Lịch sử bài làm", href: "/history", icon: History, roles: ["LEARNER", "ADMIN"] },
      { label: "Tài liệu học tập", href: "/materials", icon: Library },
      { label: "Công cụ", href: "/tools", icon: Wrench },
      { label: "Bài viết", href: "/blog", icon: Newspaper },
      { label: "Cài đặt", href: "/profile/settings", icon: Settings, roles: ["LEARNER", "ADMIN"] },
    ],
  },
  {
    id: "quan-tri",
    label: "QUẢN TRỊ",
    items: [
      {
        label: "Quản trị",
        icon: ShieldCheck,
        roles: ["ADMIN"],
        children: [
          { label: "Tài khoản", href: "/manage/users", roles: ["ADMIN"] },
          { label: "Đề thi", href: "/manage/exams", roles: ["ADMIN"] },
          { label: "Kỹ năng", href: "/manage/skills", roles: ["ADMIN"] },
          { label: "Bài tập", href: "/manage/practice", roles: ["ADMIN"] },
          { label: "Câu hỏi Quick Battle", href: "/manage/battle", roles: ["ADMIN"] },
          { label: "Duyệt bài viết", href: "/manage/posts", roles: ["ADMIN"] },
          { label: "Nhập từ vựng", href: "/manage/vocabulary/import", roles: ["ADMIN"] },
          { label: "Nhập collocations", href: "/manage/collocations/import", roles: ["ADMIN"] },
          { label: "Tải tài liệu", href: "/manage/materials", roles: ["ADMIN"] },
          { label: "Video luyện VSTEP", href: "/manage/videos", roles: ["ADMIN"] },
        ],
      },
    ],
  },
];

export const FOOTER_COLUMNS = [
  {
    title: "WEWIN",
    links: [
      { label: "Giới thiệu", href: "/about" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { label: "Chính sách bảo mật", href: "/legal/privacy" },
      { label: "Điều khoản sử dụng", href: "/legal/terms" },
      { label: "Chính sách thanh toán", href: "/legal/payment" },
      { label: "Chính sách hoàn tiền", href: "/legal/refund" },
    ],
  },
];
