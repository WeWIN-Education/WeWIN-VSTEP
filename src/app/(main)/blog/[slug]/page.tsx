import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} | Blog WEWIN` };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post = null;
  try {
    post = await prisma.blogPost.findUnique({ where: { slug } });
  } catch {
    notFound();
  }
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href="/blog"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Bài viết
      </Link>
      <article>
        <p className="text-[12px] text-ink-faint">
          {post.publishedAt.toLocaleDateString("vi-VN")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold text-ink">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-2 text-[15px] text-ink-muted">{post.excerpt}</p>
        ) : null}
        <Card className="mt-5" padding="lg">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {post.body}
          </p>
        </Card>
      </article>
      <SiteFooter />
    </div>
  );
}
