"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdUnit from "@/components/ads/AdUnit";
import { Disc3, Globe2, Headphones, ListMusic, LockKeyhole, Plus, Search, X } from "lucide-react";

interface LibraryPlaylist {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "unlisted" | "private";
  updatedAt: string;
  tracks: { id: string; title: string; artist: string; coverUrl: string }[];
  ownerName?: string;
}

export default function PlaylistLibraryPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [communityPlaylists, setCommunityPlaylists] = useState<LibraryPlaylist[]>([]);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me/playlists")
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (response.status === 401) setSignedOut(true);
        else if (!response.ok) setError(data.error || "Your playlists could not be loaded.");
        else {
          setPlaylists(data.playlists || []);
          setCommunityPlaylists(data.publicPlaylists || []);
        }
      })
      .catch(() => active && setError("Your playlists could not be loaded. Check your connection and try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const visiblePlaylists = playlists.filter((playlist) =>
    `${playlist.name} ${playlist.description}`.toLowerCase().includes(filter.toLowerCase())
  );
  const visibleCommunityPlaylists = communityPlaylists.filter((playlist) =>
    `${playlist.name} ${playlist.description} ${playlist.ownerName || ""}`.toLowerCase().includes(filter.toLowerCase())
  );
  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/me/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Playlist could not be created.");
      router.push(`/playlist/${data.playlist.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playlist could not be created.");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#101311] pb-28 text-white">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              <Headphones size={14} /> LoudEar library
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your playlists</h1>
            <p className="mt-2 text-sm text-white/55">Keep the right tracks together.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!signedOut && (
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300">
                <Plus size={17} /> Create playlist
              </button>
            )}
          </div>
        </div>

        {error && <p role="alert" className="mt-5 rounded-md border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <AdUnit placement="leaderboard" className="mt-6" />

        {signedOut ? (
          <section className="mx-auto flex max-w-md flex-col items-center py-28 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-white/5 text-emerald-300"><LockKeyhole size={26} /></div>
            <h2 className="text-xl font-semibold">Your library starts with you</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Sign in to create playlists and keep your music in one place.</p>
            <Link href="/api/auth/signin?callbackUrl=%2Fplaylist" className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300">Sign in</Link>
          </section>
        ) : loading ? (
          <div className="grid gap-x-6 gap-y-9 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading playlists">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="animate-pulse"><div className="aspect-square rounded-md bg-white/5" /><div className="mt-4 h-4 w-2/3 rounded bg-white/5" /><div className="mt-2 h-3 w-1/3 rounded bg-white/5" /></div>)}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 py-6">
              <p className="text-sm text-white/50">{playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}</p>
              {playlists.length > 0 && (
                <label className="flex h-10 w-full max-w-xs items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-white/50 focus-within:border-white/30">
                  <Search size={16} />
                  <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find a playlist" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
                </label>
              )}
            </div>

            {visiblePlaylists.length ? (
              <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visiblePlaylists.map((playlist) => (
                  <Link href={`/playlist/${playlist.id}`} key={playlist.id} className="group min-w-0">
                    <PlaylistArtwork tracks={playlist.tracks} />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold transition group-hover:text-emerald-300">{playlist.name}</h2>
                        <p className="mt-1 text-sm text-white/50">{playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}</p>
                      </div>
                      <span className="mt-1 shrink-0 text-white/40" title={playlist.visibility}>
                        {playlist.visibility === "private" ? <LockKeyhole size={15} /> : <ListMusic size={15} />}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <section className="flex min-h-72 flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/5 text-emerald-300"><Disc3 size={28} /></div>
                <h2 className="text-xl font-semibold">{filter ? "No matching playlists" : "Make a playlist for this moment"}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">{filter ? "Try another title or description." : "Collect the songs you love, set the mood, and make it yours."}</p>
                {!filter && <button type="button" onClick={() => setCreateOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300"><Plus size={17} /> Create your first playlist</button>}
              </section>
            )}
            <section className="mt-16 border-t border-white/10 pt-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400"><Globe2 size={14} /> Made on LoudEar</p>
                  <h2 className="text-xl font-semibold">Public playlists</h2>
                </div>
                <span className="text-xs text-white/40">By LoudEar listeners</span>
              </div>
              {visibleCommunityPlaylists.length ? (
                <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleCommunityPlaylists.map((playlist) => (
                    <Link href={`/playlist/${playlist.id}`} key={playlist.id} className="group min-w-0">
                      <PlaylistArtwork tracks={playlist.tracks} />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold transition group-hover:text-emerald-300">{playlist.name}</h3>
                          <p className="mt-1 truncate text-sm text-white/50">{playlist.ownerName} · {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}</p>
                        </div>
                        <Globe2 size={15} className="mt-1 shrink-0 text-white/35" aria-label="Public playlist" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-sm text-white/45">{communityPlaylists.length ? "No public playlists match your search." : "Public playlists from LoudEar listeners will appear here."}</p>
              )}
            </section>
          </>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setCreateOpen(false)}>
          <form onSubmit={createPlaylist} className="w-full max-w-md rounded-lg border border-white/10 bg-[#1a1d1b] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">New collection</p><h2 className="mt-2 text-xl font-semibold">Create a playlist</h2></div>
              <button type="button" aria-label="Close" onClick={() => setCreateOpen(false)} className="rounded-full p-2 text-white/55 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <label className="block text-sm font-medium text-white/75" htmlFor="playlist-name">Name</label>
            <input id="playlist-name" autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Late night, long drive..." className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/20 px-3 text-sm outline-none focus:border-emerald-400" />
            <label className="mt-5 block text-sm font-medium text-white/75" htmlFor="playlist-description">Description <span className="font-normal text-white/40">(optional)</span></label>
            <textarea id="playlist-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What does this playlist sound like?" className="mt-2 w-full resize-none rounded-md border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-emerald-400" />
            <p className="mt-2 text-xs text-white/40">Only you can see this playlist until you change its visibility.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-full px-4 py-2 text-sm text-white/65 hover:text-white">Cancel</button><button disabled={creating || !name.trim()} className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creating..." : "Create"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function PlaylistArtwork({ tracks }: { tracks: LibraryPlaylist["tracks"] }) {
  const covers = tracks.slice(0, 4);
  return (
    <div className="relative aspect-square overflow-hidden rounded-md bg-[#202522] ring-1 ring-white/5">
      {covers.length ? (
        <div className="grid h-full grid-cols-2 grid-rows-2">
          {covers.map((track, index) => track.coverUrl ? <Image key={`${track.id}-${index}`} src={track.coverUrl} alt="" width={240} height={240} unoptimized className="h-full w-full object-cover" /> : <div key={`${track.id}-${index}`} className="grid place-items-center bg-[#26302b] text-white/15"><Disc3 /></div>)}
          {covers.length < 4 && <div className="absolute inset-0 grid place-items-center bg-black/10"><ListMusic className="h-10 w-10 text-white/75 drop-shadow" /></div>}
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_bottom_right,_#28654b,_#202522_65%)] text-white/75"><ListMusic size={42} strokeWidth={1.3} /></div>
      )}
    </div>
  );
}