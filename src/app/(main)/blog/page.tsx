import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bài viết | WEWIN EDUCATION",
};

export default async function BlogPage() {
  let posts: { slug: string; title: string; excerpt: string | null; publishedAt: Date }[] = [];
  try {
    posts = await prisma.blogPost.findMany({ orderBy: { sortOrder: "asc" } });
  } catch {
    posts = [
      {
        slug: "5-phut-moi-ngay",
        title: "Học tiếng Anh 5 phút mỗi ngày",
        excerpt: "Thói quen nhỏ giúp tiến bộ bền vững.",
        publishedAt: new Date(),
      },
    ];
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="BLOG"
        title="Bài viết"
        description="Mẹo học tiếng Anh, lộ trình và cập nhật từ WEWIN."
      />

      <div className="mt-5 space-y-3">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`}>
            <Card padding="lg" className="transition-colors hover:border-brand">
              <p className="text-[11px] text-ink-faint">
                {p.publishedAt.toLocaleDateString("vi-VN")}
              </p>
              <h2 className="mt-1 text-[16px] font-extrabold text-ink">{p.title}</h2>
              <p className="mt-1 text-[13px] text-ink-muted">{p.excerpt}</p>
            </Card>
          </Link>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
