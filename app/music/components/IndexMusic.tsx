"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

import { ChartRow } from "@/components/music/ChartRow";
import { DropdownRadio } from "@/components/DropdownRadio";
import { getCharts, ChartItem, getTrending } from "@/actions/getCharts";
import { getSocket } from "@/lib/socketClient";
import { useMemo } from "react";
import { MusicCard } from "@/components/music/MusicCard";
import Link from "next/link";
import { TopSongCard } from "@/components/music/TopSongsCard";
import SkeletonList from "@/components/skeletons/skeleton-list";
import MusicCardSkeleton from "@/components/skeletons/music-card-skeleton";
import TopCardSkeleton from "@/components/skeletons/top-card-skeleton";
import ThemedHeading from "@/components/themed-heading";
import SponsoredReleases from "@/components/campaign/SponsoredReleases";
import AdUnit from "@/components/ads/AdUnit";

// --- Filters ---
const genres = ["All", "Hip Hop", "Afro Pop", "Gospel", "RnB", "Dancehall"];
const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] as const;

type ViewMode = "grid" | "chart";
type Category = "songs" | "albums" | "videos";
type Sort = "this-week" | "last-week" | "all-time";
type FilterType = "latest" | "trending" | "a-z" | "genre";

export default function IndexMusicWrapper({
  initialCategory = "songs",
}: {
  initialCategory?: "songs" | "albums";
}) {
  const [initialData, setInitialData] = useState<ChartItem[]>([]);
  const [top10Videos, setTop10Videos] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topSongsLoading, setTopSongsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCharts() {
      try {
        const charts = await getCharts({
          category: initialCategory,
          region: "global",
          sort: "this-week",
          limit: 50,
        });
        if (!cancelled) setInitialData(charts);
      } catch (err) {
        console.error(`Error loading initial ${initialCategory} chart:`, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadTopSongs() {
      try {
        const trendingSongs = await getTrending({
          model: "Song",
          limit: 10,
          sinceDays: 30,
        });
        const songs: ChartItem[] = trendingSongs.map((song: any, index: number) => ({
          id: String(song._id),
          title: song.title,
          artist: song.artist ?? "",
          image: song.coverUrl ?? "",
          videoUrl: song.fileUrl,
          position: index + 1,
          lastWeek: null,
          peak: index + 1,
          weeksOn: 1,
          region: "global",
          genre: song.genre ?? "Unknown",
          releaseDate: song.releaseDate,
          stats: {
            weeklyViews: song.stats?.weeklyViews ?? 0,
            totalViews: song.stats?.totalViews ?? song.viewCount ?? 0,
            plays: song.viewCount ?? 0,
            downloads: song.downloadCount ?? 0,
            likes: song.likeCount ?? 0,
            views: song.viewCount ?? 0,
            shares: song.shareCount ?? 0,
            comments: song.commentCount ?? 0,
          },
        }));
        if (!cancelled) setTop10Videos(songs);
      } catch (err) {
        console.error("Error loading top songs:", err);
      } finally {
        if (!cancelled) setTopSongsLoading(false);
      }
    }

    void loadInitialCharts();
    void loadTopSongs();
    return () => {
      cancelled = true;
    };
  }, [initialCategory]);

  if (loading) {
      return (
        <main className="bg-background min-h-screen px-6 md:px-12 py-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Skeleton Main Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <MusicCardSkeleton key={i} />
              ))}
            </div>
  
            {/* Chart Skeleton */}
            <SkeletonList count={5} />
          </div>
  
          {/* Sidebar Skeleton */}
          <aside className="space-y-12">
            
  
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <TopCardSkeleton key={i} />
              ))}
            </div>
  
            <div className="bg-gray-200 h-60 flex items-center justify-center rounded-lg">
              <span className="text-gray-500">Advertisement</span>
            </div>
          </aside>
        </main>
      );
    }

  return (
    <IndexMusic
      initialData={initialData}
      topVideos={top10Videos}
      topSongsLoading={topSongsLoading}
      initialCategory={initialCategory}
    />
  );
}

function IndexMusic({
  initialData,
  topVideos,
  topSongsLoading,
  initialCategory,
}: {
  initialData: ChartItem[];
  topVideos: ChartItem[];
  topSongsLoading: boolean;
  initialCategory: Category;
}) {
  const [filters, setFilters] = useState<{
    filter: FilterType;
    genre: string;
    letter: string;
    category: Category;
    region: string;
    sort: Sort;
    view: ViewMode;
  }>({
    filter: "latest",
    genre: "All",
    letter: "All",
    category: initialCategory,
    region: "global",
    sort: "this-week",
    view: "grid",
  });

  const [charts, setCharts] = useState<ChartItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const itemsPerPage = 15;
  const [visibleItems, setVisibleItems] = useState(itemsPerPage);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const skipInitialFetch = useRef(initialData.length > 0);

  // --- Fetch charts when category/sort/region changes ---
  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;
    async function fetchCharts() {
      setLoading(true);
      setChartError(null);
      try {
        const data = await getCharts({
          category: filters.category,
          region: filters.region,
          sort: filters.sort,
          limit: 100,
        });
        if (!cancelled) setCharts(data);
      } catch (err) {
        console.error("Failed to fetch charts:", err);
        if (!cancelled) {
          setChartError(
            `Could not load ${filters.category}. Please try again.`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchCharts();
    return () => {
      cancelled = true;
    };
  }, [filters.category, filters.region, filters.sort, retryCount]);

  useEffect(() => {
    const socket = getSocket();
    const onCategoryUpdate = (payload: {
      category: Category;
      items: ChartItem[];
    }) => {
      if (payload.category === filters.category) setCharts(payload.items);
    };

    socket.on("charts:update:category", onCategoryUpdate);
    return () => {
      socket.off("charts:update:category", onCategoryUpdate);
    };
  }, [filters.category]);



const filteredCharts = useMemo(() => {
  let list = [...charts]; // copy so we don't mutate state

  // --- Genre filter ---
  if (filters.filter === "genre" && filters.genre !== "All") {
    list = list.filter(
      (item) => item.genre?.toLowerCase() === filters.genre.toLowerCase()
    );
  }

  // --- Alphabet filter ---
  if (filters.filter === "a-z" && filters.letter !== "All") {
    list = list.filter((item) => {
      const firstCharTitle = item.title?.[0]?.toUpperCase() ?? "";
      const firstCharArtist = item.artist?.[0]?.toUpperCase() ?? "";
      return firstCharTitle === filters.letter || firstCharArtist === filters.letter;
    });
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  // --- Latest filter ---
  if (filters.filter === "latest") {
    list = list
      .filter((item) => {
        const release = new Date(item.releaseDate ?? "");
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return release >= twoWeeksAgo;
      })
      .sort(
        (a, b) =>
          new Date(b.releaseDate ?? "").getTime() -
          new Date(a.releaseDate ?? "").getTime()
      );
  }

  // --- Trending filter ---
  if (filters.filter === "trending") {
    list = list
      .filter((item) => item.position && item.position <= 10)
      .sort((a, b) => a.position - b.position);
  }

  return list;
}, [charts, filters]);


  useEffect(() => setVisibleItems(itemsPerPage), [filteredCharts]);

  useEffect(() => {
  if (filters.view !== "grid" || visibleItems >= filteredCharts.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleItems((prev) =>
          Math.min(prev + itemsPerPage, filteredCharts.length)
        );
      }
    },
    { threshold: 1 }
  );

  const current = loaderRef.current;
  if (current) observer.observe(current);

  return () => observer.disconnect();
}, [filteredCharts.length, filters.view, visibleItems]);


  const cardUrl = filters.category === "songs"? "song" : "album" 

  const clearFilters = () =>
    setFilters({
      filter: "latest",
      genre: "All",
      letter: "All",
      category: initialCategory,
      region: "global",
      sort: "this-week",
      view: "chart",
    });

  return (
    <main className="bg-background min-h-screen">
      <PageHeader
        eyebrow={initialCategory === "albums" ? "Albums" : "Listen"}
        title={initialCategory === "albums" ? "Explore albums" : "Explore music"}
        description={
          initialCategory === "albums"
            ? "Find complete releases, browse by genre, and follow the albums listeners are discovering."
            : "Find new songs and albums, browse by genre, or follow what is trending."
        }
        actions={
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1" role="group" aria-label="Music layout">
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
        <div className="flex w-full flex-col gap-5 lg:items-end">
          <div className="flex flex-wrap gap-5 text-sm font-semibold">
              {(["songs", "albums"] as const).map((cat) => (
                <Link
                  key={cat}
                  href={cat === "albums" ? "/music/album" : "/music"}
                  aria-current={filters.category === cat ? "page" : undefined}
                  className={`capitalize rounded-full border px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    filters.category === cat
                      ? "border-white bg-white text-slate-950"
                      : "border-white/15 bg-white/5 text-white/75 hover:border-white/30 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:justify-end">
              {/* A–Z filter */}
              <DropdownRadio
                actionLabel="A-Z"
                label="By Alphabet"
                data={[...alphabet]}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, letter: val, filter: "a-z" }))
                }
              />

              {/* Genre filter */}
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
        </div>
      </PageHeader>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 xl:px-0 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Main */}
        <div className="lg:col-span-3">
          {chartError && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
            >
              <span className="text-destructive">{chartError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Try again
              </Button>
            </div>
          )}
          {loading ? (
            filters.view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                <MusicCardSkeleton key={i} />
              ))}
            </div>
            ) : (
              <SkeletonList count={10} />
            )
            ) : filters.view === "chart" ? (
            <div className="space-y-4">
              <ThemedHeading>
                {`Top ${filters.category} (${filters.sort.replace("-", " ")})`}
              </ThemedHeading>

              {filteredCharts.length ? <div className="divide-y">
                {filteredCharts.map((item, index) => (
                  <ChartRow
                    key={item.id}
                    idx={index + 1}
                    title={item.title}
                    artist={item.artist ?? ""}
                    href={`/music/${cardUrl}/${item.id}`}
                    cover={item.image}
                    thisWeek={item.position}
                    lastWeek={item.lastWeek}
                  />
                ))}
              </div> : (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No chart entries match these filters.
                </p>
              )}
            </div>
          ) : (
            <>
              <ThemedHeading>
                {filters.filter === "a-z"
                    ? "Browse A–Z"
                    : `${filters.filter} ${filters.category}`}
              </ThemedHeading>

              {filteredCharts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No {filters.category} match these filters. Try adjusting the genre or release filter.
                </p>
              ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {filteredCharts.slice(0, visibleItems).map((item) => (
                  <MusicCard
                    key={item.id}
                    id={item.id}
                    href={`/music/${cardUrl}/${item.id}`}
                    title={item.title}
                    artist={item.artist ?? ""}
                    cover={item.image}
                    isTrending={item.position <= 10}
                    genre={item.genre}
                    downloads={item.stats.downloads}
                    views={item.stats.totalViews}
                    publishedAt={item.releaseDate}
                  />
                ))}
              </div>
              )}

              <div
                ref={loaderRef}
                className="flex h-12 items-center justify-center"
                aria-live="polite"
              >
                {visibleItems < filteredCharts.length && (
                  <span className="text-gray-500">Loading more...</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-12">
          <div>
            <SponsoredReleases />
          </div>
          <AdUnit placement="square" />

          <div>
              <ThemedHeading>
               Top 10 Songs
              </ThemedHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              {topVideos.map((track) => (
                <TopSongCard
                  key={track.id}
                  position={track.position}
                  id={track.id}
                  title={track.title}
                  curator={track.artist ?? ""}
                  href={`/music/song/${track.id}`}
                  thumbnail={track.image}
                  videoUrl={track.videoUrl as string}
                  genre={track.genre} // correctly using genre now
                  views={track.stats.totalViews}
                />
              ))}
              {topSongsLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TopCardSkeleton key={`top-song-skeleton-${index}`} />
                ))}
            </div>
          </div>

          <div className="bg-gray-200 h-60 flex items-center justify-center rounded-lg">
            <span className="text-gray-500">Advertisement</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
