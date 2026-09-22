import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Clock, Mail, MessagesSquare } from "lucide-react";

export default function ContactPage() { return <div className="mx-auto max-w-[1000px]"><PageHero eyebrow="HỖ TRỢ" title="Cần giúp đỡ? Cứ nhắn nhé!" description="Nếu bạn chưa thấy chương trình được cấp hoặc gặp lỗi khi học, đội hỗ trợ WEWIN sẽ kiểm tra theo tài khoản của bạn." aside={<Button>Gửi email</Button>} /><div className="mt-6 grid gap-4 md:grid-cols-3"><Card padding="lg"><Clock className="size-5 text-brand" /><h2 className="mt-3 font-bold text-ink">Thời gian phản hồi</h2><p className="mt-1 text-sm text-ink-muted">Thứ 2–Thứ 7, 9:00–18:00</p></Card><Card padding="lg"><Mail className="size-5 text-brand" /><h2 className="mt-3 font-bold text-ink">Email hỗ trợ</h2><p className="mt-1 text-sm text-ink-muted">it@wewin.edu.vn</p></Card><Card padding="lg"><MessagesSquare className="size-5 text-brand" /><h2 className="mt-3 font-bold text-ink">Tài khoản được cấp</h2><p className="mt-1 text-sm text-ink-muted">Gửi email tài khoản để được kiểm tra quyền học.</p></Card></div><SiteFooter /></div>; }
