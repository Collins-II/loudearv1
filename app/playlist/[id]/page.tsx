"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, Clock3, Globe2, ListMusic, LoaderCircle,
  LockKeyhole, Music2, Pause, Play, Plus, Search, Share2, Shuffle, Trash2, X,
} from "lucide-react";
import { playQueue, pause } from "@/lib/store/audioSlice";
import type { RootState } from "@/lib/store/index";

interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number | null;
}

interface PlaylistData {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "unlisted" | "private";
  ownerId: string;
  ownerName: string;
  updatedAt: string;
  isOwner: boolean;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const audio = useSelector((state: RootState) => state.audio);
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PlaylistData["visibility"]>("private");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaylistTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [copyState, setCopyState] = useState("");

  const loadPlaylist = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/me/playlists/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This playlist could not be loaded.");
      setPlaylist(data.playlist);
      setTracks(data.tracks || []);
      setName(data.playlist.name);
      setDescription(data.playlist.description || "");
      setVisibility(data.playlist.visibility);
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This playlist could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadPlaylist(); }, [loadPlaylist]);

  useEffect(() => {
    if (!addOpen) return;
    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/me/playlists/songs?${params}`);
        const data = await response.json();
        if (active && response.ok) setSearchResults(data.songs || []);
      } catch {
        if (active) setError("Could not search the music library.");
      } finally {
        if (active) setSearching(false);
      }
    }, 180);
    return () => { active = false; clearTimeout(timeout); };
  }, [addOpen, query]);

  const activeQueueId = audio.queue[audio.queueIndex]?.id;
  const totalDuration = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
    [tracks]
  );
  const playingThisPlaylist = audio.queue.length > 0 && tracks.some((track) => track.id === activeQueueId);

  function playTracks(list: PlaylistTrack[], startIndex = 0) {
    if (!list.length) return;
    dispatch(playQueue({
      tracks: list.map((track) => ({
        url: track.audioUrl,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
        id: track.id,
      })),
      startIndex,
    }));
  }

  function updateTracks(nextTracks: PlaylistTrack[]) {
    setTracks(nextTracks);
    setDirty(true);
  }

  async function savePlaylist() {
    if (!playlist) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/me/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          visibility,
          trackIds: tracks.map((track) => track.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Changes could not be saved.");
      setPlaylist({ ...playlist, name: name.trim(), description: description.trim(), visibility });
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!playlist || !window.confirm(`Delete “${playlist.name}”? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/me/playlists/${playlist.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Playlist could not be deleted.");
      }
      window.location.assign("/playlist");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playlist could not be deleted.");
    }
  }

  async function sharePlaylist() {
    if (!playlist) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("Link copied");
      setTimeout(() => setCopyState(""), 1800);
    } catch {
      setCopyState("Copy the URL from your browser");
      setTimeout(() => setCopyState(""), 2500);
    }
  }

  if (loading) return <main className="min-h-screen bg-background px-5 pb-28 pt-12 text-foreground"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-5 w-32 rounded bg-black/5 dark:bg-white/10" /><div className="mt-10 flex flex-col gap-8 sm:flex-row"><div className="aspect-square w-full max-w-64 rounded-md bg-black/5 dark:bg-white/10" /><div className="flex-1 space-y-5 py-8"><div className="h-4 w-24 rounded bg-black/5 dark:bg-white/10" /><div className="h-12 w-2/3 rounded bg-black/5 dark:bg-white/10" /><div className="h-4 w-1/2 rounded bg-black/5 dark:bg-white/10" /></div></div></div></main>;

  if (error && !playlist) return <main className="min-h-screen bg-background px-5 pb-28 pt-12 text-foreground"><div className="mx-auto max-w-4xl"><Link href="/playlist" className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white"><ArrowLeft size={16} /> Your playlists</Link><div className="mt-20 text-center"><h1 className="text-2xl font-semibold">Playlist unavailable</h1><p className="mt-3 text-sm text-neutral-600 dark:text-white/55">{error}</p><Link href="/playlist" className="mt-6 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white dark:bg-white dark:text-black">Back to your library</Link></div></div></main>;

  if (!playlist) return null;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background pb-32 text-foreground">
      <div className="mx-auto max-w-7xl px-5 pt-7 sm:px-8 lg:px-12">
        <Link href="/playlist" className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-white/55 transition hover:text-neutral-900 dark:hover:text-white"><ArrowLeft size={16} /> Your playlists</Link>

        <section className="relative mt-6 overflow-hidden rounded-md bg-[#222b26]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_100%,_rgba(35,121,79,.65),_transparent_55%),linear-gradient(110deg,_#29372f,_#18201b_65%,_#1a1d1b)]" />
          <div className="relative flex flex-col items-start gap-7 p-6 sm:flex-row sm:items-end sm:p-9 lg:gap-10 lg:p-12">
            <PlaylistCover tracks={tracks} />
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-white/70">{playlist.isOwner ? "Your playlist" : "LoudEar playlist"}</p>
              {playlist.isOwner ? (
                <input aria-label="Playlist name" value={name} maxLength={100} onChange={(event) => { setName(event.target.value); setDirty(true); }} className="mt-3 block w-full max-w-3xl border-b border-transparent bg-transparent text-3xl font-bold tracking-tight outline-none transition placeholder:text-white/40 focus:border-white/40 sm:text-5xl" />
              ) : <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-5xl">{playlist.name}</h1>}
              {playlist.isOwner ? (
                <textarea aria-label="Playlist description" value={description} maxLength={500} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} rows={2} placeholder="Add a description" className="mt-3 block w-full max-w-2xl resize-none border-b border-transparent bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 focus:border-white/40" />
              ) : playlist.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{playlist.description}</p>}
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70"><span className="font-semibold text-white">{playlist.ownerName}</span><span aria-hidden="true">·</span><span>{tracks.length} {tracks.length === 1 ? "song" : "songs"}</span>{totalDuration > 0 && <><span aria-hidden="true">·</span><span>{formatDuration(totalDuration)}</span></>}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-b border-black/15 dark:border-white/10 py-5">
          <button type="button" disabled={!tracks.length} onClick={() => playingThisPlaylist && audio.isPlaying ? dispatch(pause()) : playTracks(tracks)} className="grid h-12 w-12 place-items-center rounded-full bg-emerald-400 text-black transition hover:scale-105 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40" aria-label={playingThisPlaylist && audio.isPlaying ? "Pause playlist" : "Play playlist"}>
            {playingThisPlaylist && audio.isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
          </button>
          <button type="button" disabled={!tracks.length} onClick={() => playTracks([...tracks].sort(() => Math.random() - 0.5))} className="grid h-10 w-10 place-items-center rounded-full text-neutral-600 dark:text-white/65 transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white disabled:opacity-40" title="Shuffle playlist" aria-label="Shuffle playlist"><Shuffle size={19} /></button>
          {playlist.isOwner && <button type="button" onClick={() => setAddOpen((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/15 dark:border-white/15 px-4 text-sm font-medium text-neutral-600 dark:text-white/80 transition hover:border-black/40 dark:hover:border-white/35 hover:text-neutral-900 dark:hover:text-white"><Plus size={16} /> Add songs</button>}
          {playlist.isOwner && (
            <label className="ml-0 flex h-10 items-center gap-2 rounded-full border border-black/15 dark:border-white/15 px-3 text-sm text-neutral-600 dark:text-white/70 sm:ml-auto" title="Playlist visibility">
              {visibility === "private" ? <LockKeyhole size={15} /> : <Globe2 size={15} />}
              <select aria-label="Playlist visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value as PlaylistData["visibility"]); setDirty(true); }} className="max-w-28 bg-transparent outline-none">
                <option className="bg-white text-black dark:bg-neutral-900 dark:text-white" value="private">Private</option>
                <option className="bg-white text-black dark:bg-neutral-900 dark:text-white" value="unlisted">Unlisted</option>
                <option className="bg-white text-black dark:bg-neutral-900 dark:text-white" value="public">Public</option>
              </select>
            </label>
          )}
          {visibility !== "private" && <button type="button" onClick={sharePlaylist} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-neutral-600 dark:text-white/65 transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"><Share2 size={16} /> <span className="hidden sm:inline">{copyState || "Share"}</span></button>}
          {playlist.isOwner && <button type="button" onClick={deletePlaylist} className="grid h-10 w-10 place-items-center rounded-full text-neutral-600 dark:text-white/45 transition hover:bg-rose-400/10 hover:text-rose-600 dark:hover:text-rose-300" aria-label="Delete playlist" title="Delete playlist"><Trash2 size={17} /></button>}
          {playlist.isOwner && dirty && <button type="button" disabled={saving || !name.trim()} onClick={savePlaylist} className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-neutral-900 dark:text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-emerald-300 disabled:opacity-50 sm:ml-0">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}{saving ? "Saving" : "Save changes"}</button>}
        </div>

        {error && <p role="alert" className="mt-4 rounded-md border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</p>}

        {addOpen && playlist.isOwner && (
          <section className="my-6 rounded-md border border-black/15 dark:border-white/10 bg-black/5 dark:bg-white/[0.025] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold">Add to this playlist</h2><p className="mt-1 text-xs text-neutral-600 dark:text-white/45">Your songs and public LoudEar releases</p></div>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="Close song search" className="rounded-full p-2 text-neutral-600 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"><X size={18} /></button>
            </div>
            <label className="mt-5 flex h-11 max-w-lg items-center gap-3 rounded-full border border-black/15 dark:border-white/15 bg-black/20 px-4 text-neutral-600 dark:text-white/45 focus-within:border-emerald-400">
              <Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs or artists" className="w-full bg-transparent text-sm text-neutral-900 dark:text-white outline-none placeholder:text-white/35" />
            </label>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {searching ? <p className="py-7 text-center text-sm text-neutral-600 dark:text-white/45">Searching music...</p> : searchResults.length ? searchResults.map((track) => {
                const added = tracks.some((item) => item.id === track.id);
                return <div key={track.id} className="flex items-center gap-3 py-2.5">
                  <TrackArtwork track={track} className="h-10 w-10" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{track.title}</p><p className="truncate text-xs text-neutral-600 dark:text-white/45">{track.artist}</p></div>
                  <button type="button" disabled={added} onClick={() => updateTracks([...tracks, track])} className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 dark:text-white/60 transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:text-emerald-300" aria-label={added ? "Already added" : `Add ${track.title}`} title={added ? "Already added" : "Add song"}>{added ? <Check size={18} /> : <Plus size={18} />}</button>
                </div>;
              }) : <p className="py-7 text-center text-sm text-neutral-600 dark:text-white/45">{query ? "No matching songs found." : "No songs are available yet."}</p>}
            </div>
          </section>
        )}

        <section className="pt-5">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(5rem,auto)] items-center gap-3 border-b border-black/15 dark:border-white/10 px-3 pb-3 text-xs uppercase tracking-wider text-neutral-600 dark:text-white/40 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(9rem,auto)_3.5rem]">
            <span className="text-center">#</span><span>Title</span><span className="hidden sm:block">Artist</span><Clock3 className="ml-auto" size={16} />
          </div>
          {tracks.length ? tracks.map((track, index) => {
            const isCurrent = track.id === activeQueueId;
            return <div key={`${track.id}-${index}`} className={`group grid grid-cols-[2rem_minmax(0,1fr)_minmax(5rem,auto)] items-center gap-3 rounded-md px-3 py-2.5 transition sm:grid-cols-[2rem_minmax(0,1fr)_minmax(9rem,auto)_3.5rem] ${isCurrent ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`}>
              <button type="button" onClick={() => isCurrent && audio.isPlaying ? dispatch(pause()) : playTracks(tracks, index)} className="grid h-8 w-8 place-items-center text-sm text-neutral-600 dark:text-white/45 hover:text-emerald-700 dark:hover:text-emerald-300" aria-label={`Play ${track.title}`}>
                {isCurrent && audio.isPlaying ? <Pause size={15} fill="currentColor" /> : <><span className="group-hover:hidden">{index + 1}</span><Play className="hidden group-hover:block" size={15} fill="currentColor" /></>}
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <TrackArtwork track={track} className="h-10 w-10" />
                <div className="min-w-0"><p className={`truncate text-sm font-medium ${isCurrent ? "text-emerald-700 dark:text-emerald-300" : "text-neutral-900 dark:text-white"}`}>{track.title}</p><p className="truncate text-xs text-neutral-600 dark:text-white/45 sm:hidden">{track.artist}</p></div>
              </div>
              <p className="hidden truncate text-sm text-neutral-600 dark:text-white/55 sm:block">{track.artist}</p>
              <div className="flex items-center justify-end gap-0.5">
                <span className="mr-1 text-xs tabular-nums text-neutral-600 dark:text-white/45">{track.duration ? formatDuration(track.duration) : "--:--"}</span>
                {playlist.isOwner && <>
                  <button type="button" disabled={index === 0} onClick={() => { const next = [...tracks]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; updateTracks(next); }} className="hidden h-8 w-7 place-items-center text-neutral-600 dark:text-white/35 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20 group-hover:grid" aria-label={`Move ${track.title} up`} title="Move up"><ArrowUp size={15} /></button>
                  <button type="button" disabled={index === tracks.length - 1} onClick={() => { const next = [...tracks]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; updateTracks(next); }} className="hidden h-8 w-7 place-items-center text-neutral-600 dark:text-white/35 hover:text-neutral-900 dark:hover:text-white disabled:opacity-20 group-hover:grid" aria-label={`Move ${track.title} down`} title="Move down"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => updateTracks(tracks.filter((item) => item.id !== track.id))} className="grid h-8 w-7 place-items-center text-neutral-600 dark:text-white/35 hover:text-rose-600 dark:hover:text-rose-300 sm:hidden sm:group-hover:grid" aria-label={`Remove ${track.title}`} title="Remove song"><X size={15} /></button>
                  <button type="button" onClick={() => updateTracks(tracks.filter((item) => item.id !== track.id))} className="hidden h-8 w-7 place-items-center text-neutral-600 dark:text-white/35 hover:text-rose-600 dark:hover:text-rose-300 sm:group-hover:grid" aria-label={`Remove ${track.title}`} title="Remove song"><X size={15} /></button>
                </>}
              </div>
            </div>;
          }) : (
            <div className="flex flex-col items-center py-16 text-center"><div className="grid h-14 w-14 place-items-center rounded-full bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-white/45"><Music2 size={24} /></div><h2 className="mt-4 font-semibold">This playlist is waiting for its first song</h2><p className="mt-2 text-sm text-neutral-600 dark:text-white/45">Start with a track that sets the tone.</p>{playlist.isOwner && <button type="button" onClick={() => setAddOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/15 dark:border-white/20 px-4 py-2 text-sm hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-300"><Plus size={16} /> Find songs</button>}</div>
          )}
        </section>

        {playlist.visibility === "private" && playlist.isOwner && <p className="mt-7 flex items-center gap-2 text-xs text-neutral-600 dark:text-white/40"><LockKeyhole size={13} /> Only you can see this playlist.</p>}
      </div>
    </main>
  );
}

function PlaylistCover({ tracks }: { tracks: PlaylistTrack[] }) {
  const covers = tracks.slice(0, 4);
  return <div className="grid aspect-square w-full max-w-64 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-black/5 dark:bg-white/5 shadow-2xl ring-1 ring-white/10">
    {covers.length ? covers.map((track, index) => <TrackArtwork key={`${track.id}-${index}`} track={track} className="h-full w-full" />) : <div className="col-span-2 row-span-2 grid place-items-center bg-[radial-gradient(ellipse_at_bottom_right,_#28654b,_#202522_65%)] text-neutral-600 dark:text-white/65"><ListMusic size={54} strokeWidth={1.2} /></div>}
    {covers.length > 1 && covers.length < 4 && Array.from({ length: 4 - covers.length }).map((_, index) => <div key={`empty-${index}`} className="bg-black/20" />)}
  </div>;
}

function TrackArtwork({ track, className }: { track: Pick<PlaylistTrack, "coverUrl">; className: string }) {
  return track.coverUrl ? <Image src={track.coverUrl} alt="" width={256} height={256} unoptimized className={`${className} shrink-0 object-cover`} /> : <div className={`${className} grid shrink-0 place-items-center bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-white/35`}><Music2 size={16} /></div>;
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}