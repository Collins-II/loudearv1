import Link from "next/link";
import { ArrowUpRight, Clapperboard, Disc3, Music2, Plus, Sparkles } from "lucide-react";
import { getUserAlbums } from "@/actions/getUserAlbums";
import { getUserSongs } from "@/actions/getUserSongs";
import { getUserVideos } from "@/actions/getUserVideos";

const uploadActions = [
  { label: "Upload a song", href: "/studio/dashboard/upload/song", icon: Music2 },
  { label: "Create an album", href: "/studio/dashboard/upload/album", icon: Disc3 },
  { label: "Submit a video", href: "/studio/dashboard/upload/video", icon: Clapperboard },
];

export default async function StudioDashboard() {
  const [songsResult, albumsResult, videosResult] = await Promise.allSettled([
    getUserSongs(),
    getUserAlbums(),
    getUserVideos(),
  ]);

  const songs = songsResult.status === "fulfilled" ? songsResult.value : [];
  const albums = albumsResult.status === "fulfilled" ? albumsResult.value : [];
  const videos = videosResult.status === "fulfilled" ? videosResult.value : [];
  const failedSections = [songsResult, albumsResult, videosResult].filter(
    (result) => result.status === "rejected"
  ).length;
  const recentContent = [
    ...songs.map((item) => ({ ...item, kind: "Song" })),
    ...albums.map((item) => ({ ...item, kind: "Album" })),
    ...videos.map((item) => ({ ...item, kind: "Video" })),
  ]
    .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate))
    .slice(0, 6);

  const totals = [
    { label: "Songs", count: songs.length, href: "/studio/dashboard/admin/songs" },
    { label: "Albums", count: albums.length, href: "/studio/dashboard/admin/albums" },
    { label: "Videos", count: videos.length, href: "/studio/dashboard/admin/videos" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Artist studio / Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Make your next move.</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your catalog, releases, and creative tools in one place.
          </p>
        </div>
        <Link
          href="/studio/dashboard/upload/song"
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:self-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Upload a release
        </Link>
      </header>

      <section aria-label="Create content" className="grid gap-3 sm:grid-cols-3">
        {uploadActions.map(({ label, href, icon: Icon }, index) => (
          <Link
            key={href}
            href={href}
            className={`group flex min-h-28 items-center gap-4 rounded-md border p-5 transition-colors hover:border-emerald-600/50 hover:bg-emerald-600/[0.04] ${index === 0 ? "border-emerald-700/25 bg-emerald-700/[0.06]" : "border-border bg-card"}`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Add to your catalog</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </section>

      {failedSections > 0 && (
        <p role="status" className="border-l-2 border-amber-500 pl-3 text-sm text-muted-foreground">
          Some catalog data could not be loaded. Refresh the page to try again.
        </p>
      )}

      <section aria-label="Catalog totals" className="grid gap-3 sm:grid-cols-3">
        {totals.map((total) => (
          <Link key={total.label} href={total.href} className="group flex items-center justify-between rounded-md border border-border bg-card px-5 py-4 transition-colors hover:border-emerald-600/40">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{total.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{total.count}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-emerald-600/10 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="recent-content-heading">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Catalog</p>
              <h2 id="recent-content-heading" className="mt-1 text-lg font-semibold">Recently added</h2>
            </div>
            <span className="text-xs text-muted-foreground">Latest 6</span>
          </div>
          {recentContent.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentContent.map((item) => (
                <li key={`${item.kind}-${item.itemId}`} className="flex items-center gap-3 border-b border-border py-4 last:border-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {item.kind === "Song" ? <Music2 className="size-4" aria-hidden="true" /> : item.kind === "Album" ? <Disc3 className="size-4" aria-hidden="true" /> : <Clapperboard className="size-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title || "Untitled release"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.kind}{item.genre ? ` · ${item.genre}` : ""}
                    </p>
                  </div>
                  <time dateTime={item.releaseDate} className="shrink-0 text-xs text-muted-foreground">
                    {item.releaseDate || "Date unavailable"}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8">
              <div className="flex size-10 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-medium">Your catalog starts here.</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a release, create an album, or submit a video to build your artist page.</p>
            </div>
          )}
        </section>

        <aside aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="border-b border-border pb-3 text-lg font-semibold">Create</h2>
          <nav aria-label="Studio quick actions" className="divide-y divide-border">
            {uploadActions.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 py-4 text-sm font-medium transition-colors hover:text-primary">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {label}
                <ArrowUpRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
