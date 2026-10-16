"use client";

import { useState } from "react";
import Link from "next/link";
import { ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";

interface PlaylistSummary {
  id: string;
  name: string;
  tracks: { id: string }[];
}

export default function AddToPlaylistButton({ songId }: { songId: string }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    try {
      const response = await fetch("/api/me/playlists", { cache: "no-store" });
      if (response.status === 401) {
        setSignedOut(true);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSignedOut(false);
      setPlaylists(data.playlists ?? []);
    } catch {
      toast.error("Could not load your playlists.");
    } finally {
      setLoading(false);
    }
  }

  async function addTo(playlist: PlaylistSummary) {
    setBusy(true);
    try {
      const response = await fetch(`/api/me/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.alreadyAdded ? `Already in ${playlist.name}` : `Added to ${playlist.name}`);
      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id && !item.tracks.some((track) => track.id === songId)
            ? { ...item, tracks: [...item.tracks, { id: songId }] }
            : item
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add this song.");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const response = await fetch("/api/me/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const created: PlaylistSummary = { id: data.playlist.id, name: data.playlist.name, tracks: [] };
      setNewName("");
      setPlaylists((current) => [created, ...current]);
      await addTo(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create playlist.");
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white dark:bg-neutral-900 dark:text-gray-200"
      >
        <ListPlus className="h-4 w-4" /> Add to playlist
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-xl border border-black/10 bg-white p-3 text-sm text-black shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          {signedOut ? (
            <p>
              <Link href="/auth" className="font-semibold underline">Sign in</Link> to save songs to playlists.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && createAndAdd()}
                  maxLength={100}
                  placeholder="New playlist name"
                  aria-label="New playlist name"
                  className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-2 py-1.5 outline-none focus:border-emerald-500 dark:border-white/15"
                />
                <button
                  type="button"
                  onClick={createAndAdd}
                  disabled={busy || !newName.trim()}
                  aria-label="Create playlist and add song"
                  className="rounded-md bg-emerald-500 px-2.5 text-black disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                {loading && <li className="px-2 py-1.5 text-gray-500">Loading...</li>}
                {!loading && playlists.length === 0 && (
                  <li className="px-2 py-1.5 text-gray-500">No playlists yet. Create your first above.</li>
                )}
                {playlists.map((playlist) => {
                  const included = playlist.tracks.some((track) => track.id === songId);
                  return (
                    <li key={playlist.id}>
                      <button
                        type="button"
                        disabled={busy || included}
                        onClick={() => addTo(playlist)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10"
                      >
                        <span className="truncate">{playlist.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-gray-500">{included ? "Added" : `${playlist.tracks.length} songs`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link href="/playlist" className="mt-3 block text-xs text-gray-500 underline">Manage playlists</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
