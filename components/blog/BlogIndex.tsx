"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Clock, Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import AdUnit from "@/components/ads/AdUnit";
import {
  blogCategories,
  formatPostDate,
  getReadingTime,
  type BlogPost,
} from "@/data/blogPosts";

function Meta({ post }: { post: BlogPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
      <span>{post.author}</span>
      <span aria-hidden>•</span>
      <time dateTime={post.date.toISOString()}>{formatPostDate(post.date)}</time>
      <span aria-hidden>•</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {getReadingTime(post)} min read
      </span>
    </p>
  );
}

export function CategoryTag({ label }: { label: string }) {
  return (
    <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
      {label}
    </span>
  );
}

export function StoryCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:border-black/25 dark:border-white/10 dark:bg-neutral-900/60 dark:shadow-none dark:hover:border-white/25"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <CategoryTag label={post.category} />
        <h3 className="line-clamp-2 text-base font-bold text-neutral-900 group-hover:underline dark:text-white">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {post.excerpt}
        </p>
        <div className="mt-auto pt-2">
          <Meta post={post} />
        </div>
      </div>
    </Link>
  );
}

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");

  const filtering = query.trim() !== "" || category !== "ALL";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (category !== "ALL" && post.category !== category) return false;
      if (!q) return true;
      return [post.title, post.excerpt, post.author, post.category, ...post.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [posts, query, category]);

  const [lead, ...rest] = filtered;
  const secondary = filtering ? [] : rest.slice(0, 2);
  const latest = filtering ? filtered : rest.slice(2);
  const trending = posts.slice(0, 5);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PageHeader
        eyebrow="LoudEar Magazine"
        title="Urban entertainment news"
        description="Hip hop, Afrobeats, culture and the stories moving the scene."
      >
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search articles</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles"
            className="h-10 w-full rounded-full border border-white/15 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <nav
          aria-label="Article categories"
          className="-mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none]"
        >
          {["ALL", ...blogCategories].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              aria-pressed={category === name}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition ${
                category === name
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-black/15 text-neutral-700 hover:border-black/40 dark:border-white/15 dark:text-neutral-300 dark:hover:border-white/40"
              }`}
            >
              {name === "ALL" ? "All" : name}
            </button>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/20 py-20 text-center dark:border-white/15">
            <p className="text-lg font-semibold">No articles found</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Try a different search or category.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("ALL");
              }}
              className="mt-4 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-10">
              {!filtering && lead && (
                <section aria-label="Top stories" className="grid gap-6 md:grid-cols-5">
                  <Link
                    href={`/blog/${lead.id}`}
                    className="group relative block min-h-[320px] overflow-hidden rounded-2xl md:col-span-3"
                  >
                    <Image
                      src={lead.image}
                      alt={lead.title}
                      fill
                      priority
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute bottom-0 space-y-2 p-5 text-white">
                      <CategoryTag label={lead.category} />
                      <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                        {lead.title}
                      </h2>
                      <p className="line-clamp-2 text-sm text-neutral-300">
                        {lead.excerpt}
                      </p>
                      <p className="text-xs text-neutral-300">
                        {lead.author} • {formatPostDate(lead.date)} •{" "}
                        {getReadingTime(lead)} min read
                      </p>
                    </div>
                  </Link>
                  <div className="grid gap-6 md:col-span-2">
                    {secondary.map((post) => (
                      <StoryCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}

              {latest.length > 0 && (
                <section aria-label={filtering ? "Results" : "Latest news"}>
                  <h2 className="mb-4 text-xl font-bold">
                    {filtering
                      ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
                      : "Latest news"}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {latest.map((post) => (
                      <StoryCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-8">
              <section aria-label="Trending">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Flame className="h-5 w-5 text-red-500" /> Trending
                </h2>
                <ol className="space-y-4">
                  {trending.map((post, i) => (
                    <li key={post.id}>
                      <Link
                        href={`/blog/${post.id}`}
                        className="group flex gap-3"
                      >
                        <span className="text-2xl font-black text-black/20 dark:text-white/20">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold group-hover:underline">
                          {post.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
              <AdUnit placement="square" />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
