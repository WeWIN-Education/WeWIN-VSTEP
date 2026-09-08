import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BookMarked,
  Gamepad2,
  GraduationCap,
  Handshake,
  Headphones,
  Languages,
  LayoutGrid,
  Library,
  Newspaper,
  PenLine,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";

export type NavLeaf = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: NavLeaf[];
};

export type NavGroup = {
  id: string;
  label?: string;
  items: NavItem[];
};

/** Icon set aligned with Drive reference sidebar (thin line icons). */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "top",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutGrid },
      { label: "Tải ứng dụng", href: "/download", icon: Smartphone },
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
          { label: "Người mới bắt đầu", href: "/beginner" },
          { label: "Giáo trình Lớp 1-9", href: "/hsk" },
          { label: "Bài tập", href: "/hsk-practice" },
          { label: "Luyện thi", href: "/exam" },
          { label: "Học qua video", href: "/video" },
        ],
      },
      {
        label: "Kỹ năng",
        icon: Headphones,
        children: [
          { label: "Luyện nghe", href: "/listening" },
          { label: "Luyện nói", href: "/speaking" },
          { label: "Luyện phát âm", href: "/pronunciation" },
        ],
      },
      { label: "Luyện tập", href: "/practice", icon: PenLine },
    ],
  },
  {
    id: "tu-vung",
    label: "TỪ VỰNG & NỀN TẢNG",
    items: [
      {
        label: "Từ vựng",
        icon: BookOpen,
        children: [
          { label: "Theo chủ đề", href: "/vocab/topics" },
          { label: "Ngữ pháp", href: "/grammar" },
        ],
      },
      {
        label: "Phát âm & từ vựng",
        icon: Languages,
        children: [
          { label: "Bảng phiên âm", href: "/pronunciation" },
          { label: "Luyện phát âm", href: "/pronunciation" },
        ],
      },
    ],
  },
  {
    id: "on-luyen",
    label: "ÔN LUYỆN & CỘNG ĐỒNG",
    items: [
      { label: "Luyện tập tổng hợp", href: "/practice", icon: Sparkles },
      { label: "Trò chơi", href: "/game", icon: Gamepad2 },
      { label: "Truyện tiếng Anh", href: "/stories", icon: BookMarked },
      { label: "Tài liệu học tập", href: "/materials", icon: Library },
      { label: "Công cụ", href: "/tools", icon: Wrench },
      { label: "Bảng xếp hạng", href: "/leaderboard", icon: Trophy },
      { label: "Bạn bè", href: "/friends", icon: Users },
      { label: "Bài viết", href: "/blog", icon: Newspaper },
      { label: "Giới thiệu bạn bè", href: "/affiliate", icon: Share2 },
      { label: "Hợp tác", href: "/partners", icon: Handshake },
      { label: "Cài đặt", href: "/profile/settings", icon: Settings },
    ],
  },
];

export const FOOTER_COLUMNS = [
  {
    title: "WEWIN",
    links: [
      { label: "Giới thiệu", href: "/about" },
      { label: "Tải ứng dụng", href: "/download" },
      { label: "Liên hệ", href: "/contact" },
      { label: "Bảng giá", href: "/pricing" },
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
