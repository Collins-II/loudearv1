import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { blogPosts } from "@/data/blogPosts";

export const metadata: Metadata = {
  title: "Magazine | LoudEar",
  description:
    "Urban entertainment news: hip hop, Afrobeats, culture, charts and events from the LoudEar editorial team.",
};

export default function BlogPage() {
  const posts = [...blogPosts].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  return <BlogIndex posts={posts} />;
}
