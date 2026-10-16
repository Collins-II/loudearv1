import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin, Music2, ShieldCheck } from "lucide-react";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/user";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";
import Beat from "@/lib/database/models/beat";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { StanButton } from "@/components/auth/StanButton";
import ShareProfileButton from "@/components/profiles/ShareProfileButton";

export const dynamic = "force-dynamic";

type PublicRelease = {
  id: string;
  title: string;
  type: "Song" | "Album" | "Video" | "Beat";
  image: string;
  genre: string;
  createdAt: string;
  href: string;
};

const socialNames = [
  ["instagram", "Instagram"],
  ["twitter", "X / Twitter"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["website", "Website"],
] as const;

function publicSocialUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function releaseCard(release: PublicRelease) {
  return (
    <Link
      key={`${release.type}-${release.id}`}
      href={release.href}
      className="group overflow-hidden rounded-xl border border-border/70 bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
    >
      <div className="relative aspect-square bg-muted">
        <Image
          src={release.image || "/assets/images/placeholder_cover.jpg"}
          alt={`${release.title} cover`}
          fill
          unoptimized
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{release.type}</p>
        <h3 className="mt-1 truncate font-semibold">{release.title}</h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">{release.genre || "LoudEar release"}</p>
      </div>
    </Link>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const [user, viewer] = await Promise.all([
    User.findById(id)
      .select("_id name role stageName bio location genres image bannerImage socialLinks isVerified createdAt")
      .lean(),
    getCurrentUser(),
  ]);

  if (!user) notFound();

  const creator = user.role === "artist" || user.role === "producer";
  const [followers, songs, albums, videos, beats] = await Promise.all([
    User.countDocuments({ stan: user._id }),
    Song.find({ author: user._id, visibility: "public" })
      .select("_id title genre coverUrl createdAt")
      .sort({ createdAt: -1 }).limit(24).lean(),
    Album.find({ author: user._id, visibility: "public" })
      .select("_id title genre coverUrl createdAt")
      .sort({ createdAt: -1 }).limit(24).lean(),
    Video.find({ author: user._id, visibility: "public" })
      .select("_id title genre thumbnailUrl createdAt")
      .sort({ createdAt: -1 }).limit(24).lean(),
    Beat.find({ author: user._id, visibility: "public" })
      .select("_id title genre image createdAt")
      .sort({ createdAt: -1 }).limit(24).lean(),
  ]);

  const releases: PublicRelease[] = [
    ...songs.map((item) => ({
      id: String(item._id), title: item.title, type: "Song" as const,
      image: item.coverUrl, genre: item.genre ?? "", createdAt: item.createdAt.toISOString(),
      href: `/music/song/${item._id}`,
    })),
    ...albums.map((item) => ({
      id: String(item._id), title: item.title, type: "Album" as const,
      image: item.coverUrl ?? "", genre: item.genre ?? "", createdAt: item.createdAt.toISOString(),
      href: `/music/album/${item._id}`,
    })),
    ...videos.map((item) => ({
      id: String(item._id), title: item.title, type: "Video" as const,
      image: item.thumbnailUrl, genre: item.genre ?? "", createdAt: item.createdAt.toISOString(),
      href: `/videos/${item._id}`,
    })),
    ...beats.map((item) => ({
      id: String(item._id), title: item.title, type: "Beat" as const,
      image: item.image ?? "", genre: item.genre ?? "", createdAt: item.createdAt.toISOString(),
      href: `/sound-hub/${item._id}`,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const displayName = creator ? user.stageName || user.name : user.name;
  const genres = user.genres ?? [];
  const isOwnProfile = viewer?._id === String(user._id);
  const socials = socialNames.flatMap(([key, label]) => {
    const href = publicSocialUrl(user.socialLinks?.[key]);
    return href ? [{ key, label, href }] : [];
  });

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <section className="relative isolate min-h-[22rem] overflow-hidden bg-neutral-950">
        {user.bannerImage && (
          <Image src={user.bannerImage} alt="" fill unoptimized priority className="object-cover opacity-35" />
        )}
        <div className="absolute inset-0 -z-0 bg-gradient-to-t from-background via-neutral-950/50 to-black/30" />
        <div className="relative z-10 mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-end gap-6 px-5 pb-8 pt-20 sm:flex-row sm:items-end sm:px-8 sm:pb-10">
          <div className="relative size-36 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-2xl sm:size-44">
            {user.image ? (
              <Image src={user.image} alt={displayName} fill unoptimized className="object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-5xl font-bold text-muted-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {creator ? `${user.role} profile` : "LoudEar listener"}
            </p>
            <h1 className="mt-2 flex flex-wrap items-center gap-2 text-4xl font-black tracking-tight sm:text-6xl">
              {displayName}
              {user.isVerified && <ShieldCheck className="size-7 fill-primary text-primary-foreground" aria-label="Verified creator" />}
            </h1>
            {creator && user.name !== displayName && (
              <p className="mt-1 text-muted-foreground">{user.name}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>{followers.toLocaleString()} {creator ? "stans" : "followers"}</span>
              <span>{releases.length} recent public releases shown</span>
              {user.location && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{user.location}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {isOwnProfile ? (
              <Link href="/profile/edit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Edit profile
              </Link>
            ) : creator ? (
              <StanButton artistId={String(user._id)} initialStanCount={followers} />
            ) : null}
            <ShareProfileButton title={`${displayName} on LoudEar`} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Discover</p>
              <h2 className="mt-1 text-2xl font-bold">Public releases</h2>
            </div>
            {isOwnProfile && (
              <Link href="/studio/dashboard" className="text-sm font-semibold text-primary hover:underline">
                Open creator studio
              </Link>
            )}
          </div>
          {releases.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {releases.map(releaseCard)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Music2 className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No public releases yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isOwnProfile ? "Your published music and beats will appear here." : "Check back when there is something new to discover."}
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {user.bio && (
            <section className="rounded-2xl border border-border/70 bg-card p-5">
              <h2 className="font-bold">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{user.bio}</p>
            </section>
          )}
          {genres.length > 0 && (
            <section className="rounded-2xl border border-border/70 bg-card p-5">
              <h2 className="font-bold">{creator ? "Genres" : "Interests"}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span key={genre} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{genre}</span>
                ))}
              </div>
            </section>
          )}
          {socials.length > 0 && (
            <section className="rounded-2xl border border-border/70 bg-card p-5">
              <h2 className="font-bold">Find me elsewhere</h2>
              <div className="mt-3 flex flex-col gap-3">
                {socials.map(({ key, label, href }) => (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between text-sm text-muted-foreground transition hover:text-foreground">
                    {label}<ExternalLink className="size-4" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
