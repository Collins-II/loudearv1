"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import AdUnit from "@/components/ads/AdUnit";

import { DropdownRadio } from "@/components/DropdownRadio";
import { ChartRow } from "@/components/music/ChartRow";
import { TopVideoCard } from "@/components/video/TopVideoCard";
import { ChartItem } from "@/actions/getCharts";
import { VideoCard } from "@/components/video/VideoCard";
import ThemedHeading from "@/components/themed-heading";

const genres = ["All", "Pop", "R&B", "Hip Hop", "Afrobeat"];
const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] as const;

type ViewMode = "grid" | "chart";
type FilterType = "latest" | "trending" | "a-z" | "genre";
type Sort = "this-week" | "last-week" | "all-time";

interface IndexVideoProps {
  videos: ChartItem[];
}

export default function IndexVideo({ videos }: IndexVideoProps) {
  // --- Filters ---
  const [filters, setFilters] = useState<{
    filter: FilterType;
    genre: string;
    letter: string;
    view: ViewMode;
    sort: Sort;
  }>({
    filter: "latest",
    genre: "All",
    letter: "All",
    view: "grid",
    sort: "this-week",
  });

  // --- Top 10 by views ---
  const trendingVideos = useMemo(
    () => [...videos].sort((a, b) => b.stats.totalViews - a.stats.totalViews).slice(0, 10),
    [videos]
  );

  // --- Filtering ---
  const filteredVideos = useMemo(() => {
    let list = [...videos];

    if (filters.filter === "genre" && filters.genre !== "All") {
      list = list.filter(
        (item) => item.genre?.toLowerCase() === filters.genre.toLowerCase()
      );
    }

    if (filters.filter === "a-z" && filters.letter !== "All") {
      list = list.filter((item) => {
        const t = item.title[0]?.toUpperCase();
        const a = item.artist?.[0]?.toUpperCase();
        return t === filters.letter || a === filters.letter;
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (filters.filter === "latest") {
      list = list.sort(
        (a, b) =>
          new Date(b.releaseDate ?? "").getTime() -
          new Date(a.releaseDate ?? "").getTime()
      );
    }

    if (filters.filter === "trending") {
      list = list.sort((a, b) => b.stats.totalViews - a.stats.totalViews).slice(0, 20);
    }

    if (filters.filter !== "a-z") {
      if (filters.sort === "this-week") {
        list.sort((a, b) => b.stats.weeklyViews - a.stats.weeklyViews);
      } else if (filters.sort === "last-week") {
        list.sort((a, b) => (a.lastWeek ?? Number.MAX_SAFE_INTEGER) - (b.lastWeek ?? Number.MAX_SAFE_INTEGER));
      } else {
        list.sort((a, b) => b.stats.totalViews - a.stats.totalViews);
      }
    }

    return list;
  }, [videos, filters]);

  // --- Infinite Scroll ---
  const itemsPerPage = 9;
  const [visibleItems, setVisibleItems] = useState(itemsPerPage);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setVisibleItems(itemsPerPage), [filters]);

  useEffect(() => {
  if (filters.view === "grid") return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        setVisibleItems((prev) =>
          Math.min(prev + itemsPerPage, filteredVideos.length)
        );
      }
    },
    { threshold: 1 }
  );

  const current = loaderRef.current;
  if (current) observer.observe(current);

  return () => {
    if (current) observer.unobserve(current);
  };
}, [filteredVideos, filters.view]);


  // --- Clear Filters ---
  const clearFilters = () =>
    setFilters({ filter: "latest", genre: "All", letter: "All", view: "grid", sort: "this-week" });

  return (
    <main className="bg-background min-h-screen">
      <PageHeader
        eyebrow="Watch"
        title="Explore Videos"
        description="Catch the latest releases and see which videos are gaining momentum."
        actions={
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1" role="group" aria-label="Video layout">
              <Button
                variant="ghost"
                aria-pressed={filters.view === "grid"}
                className={filters.view === "grid" ? "bg-sky-500 text-white hover:bg-sky-400 hover:text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}
                onClick={() => setFilters((f) => ({ ...f, view: "grid" }))}
              >
                Grid View
              </Button>
              <Button
                variant="ghost"
                aria-pressed={filters.view === "chart"}
                className={filters.view === "chart" ? "bg-sky-500 text-white hover:bg-sky-400 hover:text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}
                onClick={() => setFilters((f) => ({ ...f, view: "chart" }))}
              >
                Weekly Chart
              </Button>
          </div>
        }
      >
        <div className="flex w-full flex-wrap items-center gap-3 lg:justify-end">
              <DropdownRadio
                actionLabel="A-Z"
                label="By Alphabet"
                data={alphabet as unknown as string[]}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, letter: val, filter: "a-z" }))
                }
              />

              <DropdownRadio
                actionLabel="Genre"
                label="Select Genre"
                data={genres}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, genre: val, filter: "genre" }))
                }
              />

 {/* Sort filter */}
                            <DropdownRadio
                              actionLabel="Sort"
                              label="Select"
                              data={["latest", "trending"]}
                              onChange={(val) =>
                                setFilters((f) => ({ ...f, filter: val as FilterType }))
                              }
                            />
              
                             {/* Sort filter */}
                            <DropdownRadio
                              actionLabel="By Weeks"
                              label="Select"
                              data={["all-time", "this-week", "last-week"]}
                              onChange={(val) =>
                                setFilters((f) => ({ ...f, sort: val as Sort }))
                              }
                            />

              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
        </div>
      </PageHeader>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 xl:px-0 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Main */}
        <div className="lg:col-span-3">
          {filters.view === "chart" ? (
            <div className="space-y-4">
              <ThemedHeading>
                {`Top ${filters.genre} (${filters.filter.replace("-", " ")})`}
              </ThemedHeading>
            <div className="divide-y">
                {filteredVideos.slice(0, 10).map((item, index) => (
                <ChartRow
                  key={item.id}
                    idx={index + 1}
                  title={item.title}
                  artist={item.artist ?? ""}
                  href={`/videos/${item.id}`}
                  cover={item.image}
                  thisWeek={item.position}
                  lastWeek={item.lastWeek}
                />
              ))}
            </div>
            </div>
          ) : (
            <>
              <ThemedHeading>
                {filters.filter === "a-z"
                    ? "Browse A–Z"
                    : `${filters.filter} `}
              </ThemedHeading>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredVideos.slice(0, visibleItems).map((item) => (
                  <VideoCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    artist={item.artist as string}
                    cover={item.image}
                    downloads={item.stats.downloads}
                    category={item.genre}
                    views={item.stats.totalViews}
                    videoUrl={item.videoUrl as string}
                  />
                ))}
              </div>

              <div
                ref={loaderRef}
                className="h-12 flex justify-center items-center"
              >
                {visibleItems < filteredVideos.length && (
                  <span className="text-gray-500">Loading more...</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-12">
          <AdUnit placement="square" />
          <div>
              <ThemedHeading>
                Top 10 Videos
              </ThemedHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              {trendingVideos.map((video, idx) => (
                <TopVideoCard
                  key={video.id}
                  position={idx + 1}
                  id={video.id}
                  title={video.title}
                  curator={video.artist ?? ""}
                  href={`/videos/${video.id}`}
                  thumbnail={video.image}
                  videoUrl={video.videoUrl ?? ""}
                  genre={video.genre}
                  views={video.stats.totalViews}
                />
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
