"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import AdUnit from "@/components/ads/AdUnit";
import { ChartRow } from "@/components/music/ChartRow";
import { DropdownRadio } from "@/components/DropdownRadio";
import { getCharts, ChartItem, getTrending } from "@/actions/getCharts";
import { ChartCard } from "@/components/music/ChartCard";
import { getSocket } from "@/lib/socketClient";
import { TopVideoCard } from "@/components/video/TopVideoCard";
import SkeletonList from "@/components/skeletons/skeleton-list";
import ChartCardSkeleton from "@/components/skeletons/chart-card-skeleton";
import { TrendingItem } from "@/app/search/components/IndexSearch";
import TopCardSkeleton from "@/components/skeletons/top-card-skeleton";
import { TopRecordsBoard } from "@/components/analytics/TopRecords";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Disc3,
  Music2,
  RefreshCw,
  Video,
} from "lucide-react";

/* ---------------------------------- Filters ---------------------------------- */
const genres = ["All", "Hip Hop", "Afro Pop", "Gospel", "RnB", "Dancehall"];
const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] as const;

type ViewMode = "grid" | "chart";
type Category = "songs" | "albums" | "videos";
type Sort = "this-week" | "last-week" | "all-time";
type FilterType = "latest" | "trending" | "a-z" | "genre";

export default function ChartsPageWrapper() {
  const [initialData, setInitialData] = useState<ChartItem[]>([]);
  const [top10Videos, setTop10Videos] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topVideosLoading, setTopVideosLoading] = useState(true);
  const [topVideosError, setTopVideosError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCharts() {
      try {
        if (!cancelled) setLoading(true);
        const charts = await getCharts({
          category: "songs",
          region: "global",
          sort: "this-week",
          limit: 50,
        });
        if (!cancelled) {
          setInitialData(charts);
        }
      } catch (error) {
        console.error("Error loading charts:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadTopVideos() {
      try {
        if (!cancelled) {
          setTopVideosLoading(true);
          setTopVideosError(null);
        }
        const trendingVideos = await getTrending({
          model: "Video",
          limit: 10,
          sinceDays: 30,
        });
        const videos: ChartItem[] = trendingVideos.map((v: any, index: number) => ({
          id: String(v._id),
          title: v.title,
          artist: v.artist ?? "",
          image: v.coverUrl ?? "",
          videoUrl: v.videoUrl,
          position: index + 1,
          lastWeek: null,
          peak: v.peak ?? index + 1,
          weeksOn: v.weeksOn ?? 0,
          region: "global",
          genre: v.genre ?? "Unknown",
          releaseDate: v.releaseDate,
          stats: {
            weeklyViews: v.stats?.weeklyViews ?? 0,
            totalViews: v.stats?.totalViews ?? 0,
            plays: v.viewCount ?? 0,
            downloads: v.downloadCount ?? 0,
            likes: v.likeCount ?? 0,
            views: v.viewCount ?? 0,
            shares: v.shareCount ?? 0,
            comments: v.commentCount ?? 0,
          },
        }));
        if (!cancelled) setTop10Videos(videos);
      } catch (error) {
        console.error("Error loading top videos:", error);
        if (!cancelled) {
          setTopVideosError("Top videos are temporarily unavailable.");
          setTop10Videos([]);
        }
      } finally {
        if (!cancelled) setTopVideosLoading(false);
      }
    }

    void loadCharts();
    void loadTopVideos();
    return () => {
      cancelled = true;
    };
  }, [refreshSeed]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader
          eyebrow="Charts"
          title="Music Charts"
          description="Explore the songs, albums, and videos leading the charts this week."
        />
        <section
          aria-label="Loading music charts"
          className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <SkeletonList count={6} />
          </div>
          <aside className="space-y-4">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
            {Array.from({ length: 3 }).map((_, index) => (
              <TopCardSkeleton key={index} />
            ))}
          </aside>
        </section>
      </main>
    );
  }

  return (
    <ChartsPage
      initialData={initialData}
      topVideos={top10Videos}
      topVideosLoading={topVideosLoading}
      topVideosError={topVideosError}
      refreshTopVideos={() => setRefreshSeed((seed) => seed + 1)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                             Main Charts Page                               */
/* -------------------------------------------------------------------------- */

function ChartsPage({
  initialData,
  topVideos,
  topVideosLoading,
  topVideosError,
  refreshTopVideos,
}: {
  initialData: ChartItem[];
  topVideos: ChartItem[];
  topVideosLoading: boolean;
  topVideosError: string | null;
  refreshTopVideos: () => void;
}) {
  const [filters, setFilters] = useState({
    filter: "latest" as FilterType,
    genre: "All",
    letter: "All",
    category: "songs" as Category,
    region: "global",
    sort: "this-week" as Sort,
    view: "grid" as ViewMode,
  });

  const [charts, setCharts] = useState<ChartItem[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [chartError, setChartError] = useState<string | null>(null);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  const itemsPerPage = 9;
  const [visibleItems, setVisibleItems] = useState(itemsPerPage);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const skipInitialChartFetch = useRef(initialData.length > 0);
  const [chartRefreshSeed, setChartRefreshSeed] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTrending() {
      setTrendingLoading(true);
      setTrendingError(null);
      try {
        const response = await fetch("/api/trending/global?limit=6", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Trending request failed (${response.status})`);
        }
        const data: { items?: TrendingItem[] } = await response.json();
        setTrending(data.items ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch global trending records:", error);
        setTrendingError("Trending records are temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setTrendingLoading(false);
      }
    }

    void fetchTrending();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (skipInitialChartFetch.current) {
      skipInitialChartFetch.current = false;
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
        if (!cancelled) {
          setCharts(data);
          setLastUpdatedAt(new Date());
        }
      } catch (err) {
        console.error("Failed to fetch charts:", err);
        if (!cancelled) {
          setChartError("Charts could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchCharts();
    return () => {
      cancelled = true;
    };
  }, [filters.category, filters.region, filters.sort, chartRefreshSeed]);

  useEffect(() => {
    const socket = getSocket();
    const handleCategoryUpdate = (payload: {
      category: Category;
      items: ChartItem[];
    }) => {
      if (payload.category === filters.category) {
        setCharts(payload.items);
        setChartError(null);
      }
    };
    const handleItemUpdate = (update: { id: string; newPos: number }) => {
      setCharts((current) =>
        current.map((item) =>
          item.id === update.id ? { ...item, position: update.newPos } : item
        )
      );
    };

    socket.on("charts:update:category", handleCategoryUpdate);
    socket.on("charts:update:item", handleItemUpdate);

    return () => {
      socket.off("charts:update:category", handleCategoryUpdate);
      socket.off("charts:update:item", handleItemUpdate);
    };
  }, [filters.category]);

  const filteredCharts = useMemo(() => {
    let list = [...charts];

    if (filters.filter === "genre" && filters.genre !== "All") {
      list = list.filter(
        (item) => item.genre?.toLowerCase() === filters.genre.toLowerCase()
      );
    }

    if (filters.filter === "a-z" && filters.letter !== "All") {
      list = list
        .filter((item) => {
          const firstCharTitle = item.title?.[0]?.toUpperCase() ?? "";
          const firstCharArtist = item.artist?.[0]?.toUpperCase() ?? "";
          return (
            firstCharTitle === filters.letter || firstCharArtist === filters.letter
          );
        })
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    if (filters.filter === "latest") {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      list = list
        .filter((item) => {
          const release = new Date(item.releaseDate);
          return !Number.isNaN(release.getTime()) && release >= twoWeeksAgo;
        })
        .sort(
          (a, b) =>
            new Date(b.releaseDate).getTime() -
            new Date(a.releaseDate).getTime()
        );
    }

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

  const itemHref = (id: string) =>
    filters.category === "videos"
      ? `/videos/${id}`
      : `/music/${filters.category === "songs" ? "song" : "album"}/${id}`;

  const clearFilters = () =>
    setFilters({
      filter: "latest",
      genre: "All",
      letter: "All",
      category: "songs",
      region: "global",
      sort: "this-week",
      view: "chart",
    });

  const weeklyViews = filteredCharts.reduce(
    (total, item) => total + (item.stats?.weeklyViews ?? 0),
    0
  );
  const genreCount = new Set(
    filteredCharts.map((item) => item.genre).filter(Boolean)
  ).size;
  const numberFormat = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <main className="bg-background min-h-screen">
      <PageHeader
        eyebrow="Charts"
        title="The charts, in motion."
        description="See what listeners are playing, discovering, and sharing across Loudear."
        actions={
          <div
            className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1"
            role="group"
            aria-label="Chart layout"
          >
              <Button
                variant="ghost"
                aria-pressed={filters.view === "grid"}
                className={filters.view === "grid" ? "bg-white text-slate-950 hover:bg-white/90 hover:text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"}
                onClick={() => setFilters((f) => ({ ...f, view: "grid" }))}
              >
                <BarChart3 aria-hidden="true" />
                Explore
              </Button>
              <Button
                variant="ghost"
                aria-pressed={filters.view === "chart"}
                className={filters.view === "chart" ? "bg-white text-slate-950 hover:bg-white/90 hover:text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"}
                onClick={() => setFilters((f) => ({ ...f, view: "chart" }))}
              >
                <Activity aria-hidden="true" />
                Weekly ranking
              </Button>
          </div>
        }
      >
        <div className="flex w-full flex-col gap-5 lg:items-end">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chart category">
              {(["songs", "albums", "videos"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters((f) => ({ ...f, category: cat }))}
                  aria-pressed={filters.category === cat}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    filters.category === cat
                      ? "border-white bg-white text-slate-950"
                      : "border-white/15 bg-white/5 text-white/75 hover:border-white/30 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat === "songs" ? (
                    <Music2 aria-hidden="true" className="size-4" />
                  ) : cat === "albums" ? (
                    <Disc3 aria-hidden="true" className="size-4" />
                  ) : (
                    <Video aria-hidden="true" className="size-4" />
                  )}
                  {cat}
                </button>
              ))}
            </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:justify-end">
              <DropdownRadio
                actionLabel="A-Z"
                label="By Alphabet"
                data={[...alphabet]}
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

              <DropdownRadio
                actionLabel="Sort"
                label="Select"
                data={["latest", "trending"]}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, filter: val as FilterType }))
                }
              />

              <DropdownRadio
                actionLabel="By Weeks"
                label="Select"
                data={["all-time", "this-week", "last-week"]}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, sort: val as Sort }))
                }
              />

              <Button variant="secondary" size="sm" onClick={clearFilters}>
                <RefreshCw aria-hidden="true" />
                Clear Filters
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setChartRefreshSeed((seed) => seed + 1)}
              >
                <RefreshCw aria-hidden="true" />
                Refresh
              </Button>
          </div>
          {lastUpdatedAt && (
            <p className="mt-2 text-xs text-white/65">
              Updated {lastUpdatedAt.toLocaleTimeString()}
            </p>
          )}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
        <AdUnit placement="leaderboard" />
      </div>

      {/* Content */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:py-10">
        <div className="min-w-0 space-y-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "In this chart",
                value: filteredCharts.length.toLocaleString(),
                detail: `${filters.category} ranked`,
                icon: BarChart3,
              },
              {
                label: "Weekly activity",
                value: numberFormat.format(weeklyViews),
                detail: "plays and views",
                icon: Activity,
              },
              {
                label: "Genres represented",
                value: genreCount.toLocaleString(),
                detail: "across current results",
                icon: Music2,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <article
                key={label}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </article>
            ))}
          </div>

          {chartError && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-2 text-destructive">
                <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                {chartError}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setChartRefreshSeed((seed) => seed + 1);
                }}
              >
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}

          {loading ? (
            filters.view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ChartCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <SkeletonList count={10} />
            )
          ) : filters.view === "chart" ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card px-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Weekly ranking
                  </p>
                  <h2 className="mt-1 text-xl font-semibold capitalize tracking-tight">
                    Top {filters.category}
                  </h2>
                </div>
                <span className="text-sm capitalize text-muted-foreground">
                  {filters.sort.replace("-", " ")}
                </span>
              </div>
              {filteredCharts.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {filteredCharts.map((item, index) => (
                  <ChartRow
                    key={item.id}
                    idx={index + 1}
                    title={item.title}
                    artist={item.artist ?? ""}
                    href={itemHref(item.id)}
                    cover={item.image}
                    thisWeek={item.position}
                    lastWeek={item.lastWeek}
                  />
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No entries match the selected chart filters.
                </p>
              )}
            </div>
          ) : (
            <section aria-label={`${filters.category} chart results`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Discover
                  </p>
                  <h2 className="mt-1 text-xl font-semibold capitalize tracking-tight">
                    {filters.filter === "a-z"
                      ? "Browse A–Z"
                      : `${filters.filter} ${filters.category}`}
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredCharts.length} {filteredCharts.length === 1 ? "result" : "results"}
                </span>
              </div>
              {filteredCharts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <p className="font-medium">No chart entries match these filters.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another genre, letter, or release window.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredCharts.slice(0, visibleItems).map((item) => (
                  <ChartCard
                    key={item.id}
                    id={item.id}
                    href={itemHref(item.id)}
                    title={item.title}
                    artist={item.artist ?? ""}
                    cover={item.image}
                    isTrending={item.position <= 10}
                    rank={item.position}
                    peak={item.peak as number}
                    weeksOn={item.weeksOn}
                    //lastWeek={item.lastWeek}
                  />
                  ))}
                </div>
              )}
              <div
                ref={loaderRef}
                className="flex min-h-12 items-center justify-center"
                aria-live="polite"
              >
                {visibleItems < filteredCharts.length && (
                  <span className="text-sm text-muted-foreground">
                    Scroll to load more
                  </span>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
            <TopRecordsBoard list={trending} loading={trendingLoading} />
            {trendingError && (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                {trendingError}
              </p>
            )}
          </div>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Watch
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Top videos</h2>
              </div>
              <span className="text-sm text-muted-foreground">This month</span>
            </div>
            {topVideos.length > 0 ? (
              <div className="grid gap-3">
                {topVideos.map((track) => (
                  <TopVideoCard
                    key={track.id}
                    position={track.position}
                    id={track.id}
                    title={track.title}
                    curator={track.artist ?? ""}
                    href={`/videos/${track.id}`}
                    thumbnail={track.image}
                    videoUrl={track.videoUrl ?? ""}
                    genre={track.genre}
                    views={track.stats.totalViews}
                  />
                ))}
              </div>
            ) : topVideosLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <TopCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <p>
                  {topVideosError ??
                    "Top videos will appear here when chart data is available."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTopVideos}
                >
                  Retry top videos
                </Button>
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}