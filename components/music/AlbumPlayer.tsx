"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  DownloadCloud,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Heart as HeartIcon,
} from "lucide-react";
import Image from "next/image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { SongSerialized } from "@/actions/getItemsWithStats";
import { Separator } from "../ui/separator";
import type { AppDispatch, RootState } from "@/lib/store/index";
import {
  cycleRepeat,
  jumpTo,
  next,
  pause,
  play,
  playQueue,
  previous,
  setVolume,
  toggleMute,
  toggleShuffle,
  type QueueTrack,
} from "@/lib/store/audioSlice";
import { seekTo, usePlayerTiming } from "@/lib/player-engine";

interface AlbumPlayerProps {
  albumTitle: string;
  albumArtist: string;
  coverUrl?: string;
  tracks: SongSerialized[];
  userId?: string | null;
  className?: string;
}

// UI-only surface: audio is always produced by the single global player.
export default function AlbumPlayer({
  albumTitle,
  albumArtist,
  coverUrl,
  tracks,
  userId,
  className = "",
}: AlbumPlayerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { queue, queueIndex, isPlaying: globalPlaying, volume, muted, shuffle, repeat } = useSelector(
    (s: RootState) => s.audio
  );
  const timing = usePlayerTiming();

  const queueTracks = useMemo<QueueTrack[]>(
    () =>
      tracks.map((t) => ({
        id: t._id,
        url: t.fileUrl,
        title: t.title,
        artist: t.artist,
        coverUrl: t.coverUrl ?? coverUrl ?? "",
        model: "Song" as const,
      })),
    [tracks, coverUrl]
  );

  // The album "owns" the player while the global queue is this album's tracklist
  const ownsQueue =
    queue.length === queueTracks.length && queueTracks.length > 0 && queueTracks.every((t, i) => queue[i]?.id === t.id);
  const currentId = ownsQueue ? queue[queueIndex]?.id : undefined;
  const isPlaying = ownsQueue && globalPlaying;
  const position = ownsQueue ? timing.position : 0;
  const duration = ownsQueue ? timing.duration : 0;
  const progress = duration ? (position / duration) * 100 : 0;

  const [userLiked, setUserLiked] = useState<Record<string, boolean>>(() =>
    tracks.reduce((acc, t) => {
      acc[t._id] = !!(t as any).userLiked;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const start = (index = 0) => dispatch(playQueue({ tracks: queueTracks, startIndex: index }));

  const togglePlay = () => {
    if (!ownsQueue) return start(0);
    dispatch(globalPlaying ? pause() : play());
  };
  const prevTrack = () => (ownsQueue ? dispatch(previous()) : start(Math.max(queueTracks.length - 1, 0)));
  const nextTrack = () => (ownsQueue ? dispatch(next()) : start(0));
  const playIndex = (idx: number) => (ownsQueue ? dispatch(jumpTo(idx)) : start(idx));

  const downloadAlbum = async () => {
    const zip = new JSZip();
    for (const track of tracks) {
      const res = await fetch(track.fileUrl);
      zip.file(`${track.artist} - ${track.title}.mp3`, await res.blob());
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${albumArtist} - ${albumTitle}.zip`);
  };

  const downloadTrack = async (track: SongSerialized) => {
    const res = await fetch(track.fileUrl);
    saveAs(await res.blob(), `${track.artist} - ${track.title}.mp3`);
  };

  const toggleLike = async (track: SongSerialized) => {
    if (!userId) return alert("Sign in to like songs.");
    setUserLiked((p) => ({ ...p, [track._id]: !p[track._id] }));
  };

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
  };

  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white border-y-[3px] md:border-[3px] border-black text-black md:rounded-3xl py-6 md:p-6 flex flex-col gap-6 ${className}`}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="relative rounded-2xl overflow-hidden border-2 border-black w-36 h-36 sm:w-44 sm:h-44">
          <Image src={coverUrl ?? "/assets/images/placeholder_cover.jpg"} alt={albumTitle} fill className="object-cover" />
        </div>

        <div className="flex-1">
          <h3 className="capitalize text-2xl font-extrabold tracking-tight">{albumTitle}</h3>
          <p className="text-sm text-gray-700">{albumArtist}</p>

          <div className="flex items-start md:items-center gap-3 mt-4 flex-col md:flex-row w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={prevTrack}
                className="border border-black rounded-full hover:bg-black hover:text-white"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                onClick={togglePlay}
                size="icon"
                aria-label={isPlaying ? "Pause" : "Play album"}
                className="bg-black text-white hover:bg-gray-800 rounded-full p-3"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next track"
                onClick={nextTrack}
                className="border border-black rounded-full hover:bg-black hover:text-white"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs">{formatTime(position)}</span>
              <input
                aria-label="Seek track"
                type="range"
                min={0}
                max={100}
                value={Math.max(0, Math.min(100, progress))}
                disabled={!ownsQueue || !duration}
                onChange={(e) => seekTo((Number(e.target.value) / 100) * duration)}
                className="flex-1 h-1 accent-black cursor-pointer w-full"
              />
              <span className="text-xs">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
      <Separator className="flex md:hidden" />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Shuffle"
          aria-pressed={shuffle}
          onClick={() => dispatch(toggleShuffle())}
          className={`border border-black rounded-full hover:bg-black hover:text-white ${shuffle ? "bg-black text-white" : ""}`}
        >
          <Shuffle className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Repeat ${repeat}`}
          onClick={() => dispatch(cycleRepeat())}
          className={`border border-black rounded-full hover:bg-black hover:text-white ${repeat !== "off" ? "bg-black text-white" : ""}`}
        >
          <RepeatIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => dispatch(toggleMute())}
          className="border border-black hover:bg-black hover:text-white rounded-full"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => dispatch(setVolume(Number(e.target.value)))}
          className="w-32 accent-black"
        />
        <Button onClick={downloadAlbum} className="bg-black text-white rounded-full px-3 hover:bg-gray-800">
          <DownloadCloud className="w-4 h-4 mr-2" /> Download Album
        </Button>
      </div>

      <div className="bg-neutral-100 rounded-2xl border border-black/20 p-3 divide-y divide-black/10 max-h-64 overflow-auto">
        {tracks.map((track, idx) => {
          const active = currentId === track._id;
          return (
            <div
              key={track._id}
              className={`flex items-center gap-3 p-2 rounded-md transition ${active ? "bg-black text-white" : "hover:bg-black/5"}`}
            >
              <div className="w-10 h-10 rounded-md overflow-hidden border border-black/20 flex-shrink-0">
                <Image
                  src={track.coverUrl ?? "/assets/images/placeholder_cover.jpg"}
                  alt={track.title}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <button onClick={() => (active ? togglePlay() : playIndex(idx))} className="flex-1 text-left">
                <div className="text-sm font-semibold truncate">{track.title}</div>
                <div className="text-xs text-gray-500 truncate">{track.artist}</div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Like track"
                  onClick={() => toggleLike(track)}
                  className={`${userLiked[track._id] ? "text-red-500" : "text-gray-700"} hover:text-red-500`}
                >
                  <HeartIcon className="w-4 h-4" />
                </button>
                <button aria-label="Download track" onClick={() => downloadTrack(track)} className="text-gray-700 hover:text-black">
                  <DownloadCloud className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
