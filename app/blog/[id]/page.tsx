import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { CategoryTag, StoryCard } from "@/components/blog/BlogIndex";
import { ShareButtons } from "@/components/blog/ShareButtons";
import AdUnit from "@/components/ads/AdUnit";
import {
  blogPosts,
  formatPostDate,
  getAdjacentPosts,
  getPostById,
  getReadingTime,
  getRelatedPosts,
} from "@/data/blogPosts";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://loudear.com";

type Params = Promise<{ id: string }>;

function resolvePost(id: string) {
  return /^\d+$/.test(id) ? getPostById(Number(id)) : undefined;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ id: String(post.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const post = resolvePost((await params).id);
  if (!post) return { title: "Article not found | LoudEar" };
  return {
    title: `${post.title} | LoudEar`,
    description: post.excerpt,
    keywords: post.tags,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
      publishedTime: post.date.toISOString(),
      authors: [post.author],
    },
    twitter: { card: "summary_large_image", title: post.title },
  };
}

export default async function BlogArticlePage({ params }: { params: Params }) {
  const post = resolvePost((await params).id);
  if (!post) notFound();

  const related = getRelatedPosts(post);
  const { newer, older } = getAdjacentPosts(post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: [`${BASE_URL}${post.image}`],
    datePublished: post.date.toISOString(),
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "LoudEar" },
    mainEntityOfPage: `${BASE_URL}/blog/${post.id}`,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="relative h-[55vh] min-h-[340px] w-full">
        <Image
          src={post.image}
          alt={post.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-black/20 dark:from-neutral-950 dark:via-neutral-950/50 dark:to-black/30" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl space-y-3 px-5 pb-8 sm:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Magazine
          </Link>
          <div>
            <CategoryTag label={post.category} />
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl text-neutral-900 dark:text-white">
            {post.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-neutral-700 dark:text-neutral-300">
            <span>By {post.author}</span>
            <span aria-hidden>•</span>
            <time dateTime={post.date.toISOString()}>
              {formatPostDate(post.date)}
            </time>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {getReadingTime(post)} min read
            </span>
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="mb-8 text-lg font-medium text-neutral-700 dark:text-neutral-300">
          {post.excerpt}
        </p>
        <div className="space-y-5 text-base leading-8 text-neutral-800 dark:text-neutral-200">
          {post.content.map((block, i) =>
            block.startsWith("## ") ? (
              <h2 key={i} className="pt-4 text-2xl font-bold text-neutral-900 dark:text-white">
                {block.slice(3)}
              </h2>
            ) : (
              <p key={i}>{block}</p>
            )
          )}
        </div>

        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tags">
          {post.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-black/15 px-3 py-1 text-xs text-neutral-700 dark:border-white/15 dark:text-neutral-300"
            >
              #{tag.replace(/\s+/g, "")}
            </li>
          ))}
        </ul>

        <div className="mt-8 border-y border-black/10 py-5 dark:border-white/10">
          <ShareButtons title={post.title} />
        </div>

        <AdUnit placement="leaderboard" className="my-8" />

        <nav aria-label="More articles" className="grid gap-4 sm:grid-cols-2">
          {newer ? (
            <Link
              href={`/blog/${newer.id}`}
              className="rounded-xl border border-black/10 p-4 transition hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
            >
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <ArrowLeft className="h-3 w-3" /> Newer
              </span>
              <span className="mt-1 block font-semibold">{newer.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {older && (
            <Link
              href={`/blog/${older.id}`}
              className="rounded-xl border border-black/10 p-4 text-right transition hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
            >
              <span className="flex items-center justify-end gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                Older <ArrowRight className="h-3 w-3" />
              </span>
              <span className="mt-1 block font-semibold">{older.title}</span>
            </Link>
          )}
        </nav>
      </article>

      {related.length > 0 && (
        <section
          aria-label="Related stories"
          className="mx-auto max-w-7xl px-5 pb-16 sm:px-8"
        >
          <h2 className="mb-4 text-xl font-bold">Keep reading</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <StoryCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
