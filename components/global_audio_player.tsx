"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/lib/store/index";
import {
  clearPlayer,
  cycleRepeat,
  hydrate,
  jumpTo,
  moveInQueue,
  next,
  pause,
  play,
  previous,
  removeFromQueue,
  setPlaybackRate,
  setVolume,
  toggleMute,
  togglePlay,
  toggleShuffle,
} from "@/lib/store/audioSlice";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { publishTiming, registerAudio } from "@/lib/player-engine";

const STORAGE_KEY = "loudear:player:v1";
const MINIMIZED_KEY = "loudear:player:minimized";
const RATES = [0.75, 1, 1.25, 1.5, 2];
const PLAY_THRESHOLD_SECONDS = 30;

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function GlobalAudioPlayer() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentTrack, isPlaying, volume, muted, playbackRate, shuffle, repeat, queue, queueIndex } = useSelector(
    (s: RootState) => s.audio
  );
  const track = queue[queueIndex];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const listened = useRef(0);
  const lastTime = useRef(0);
  const counted = useRef(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Restore the previous session (paused) so the player survives reloads
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) dispatch(hydrate(saved));
    } catch {}
    setMinimized(localStorage.getItem(MINIMIZED_KEY) === "1");
    setHydrated(true);
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ queue, queueIndex, volume, muted, playbackRate, shuffle, repeat })
    );
  }, [hydrated, queue, queueIndex, volume, muted, playbackRate, shuffle, repeat]);

  // Redux -> audio element
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
    a.playbackRate = playbackRate;
  }, [volume, muted, playbackRate, currentTrack]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!currentTrack) {
      // Dropping the src prop doesn't stop a playing element; reset it explicitly
      a.pause();
      a.removeAttribute("src");
      a.load();
      publishTiming(0, 0);
      return;
    }
    if (isPlaying) a.play().catch(() => dispatch(pause()));
    else a.pause();
  }, [isPlaying, currentTrack, dispatch]);

  // Only one media source may be audible at a time: the global player vs any <video>/<audio> on the page.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLMediaElement)) return;
      const ours = audioRef.current;
      // Muted media (e.g. hover previews) is not "playing over" anything
      if (target !== ours && (target.muted || target.volume === 0)) return;
      if (target !== ours) dispatch(pause());
      document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((m) => {
        if (m !== target && !m.paused && !m.muted) m.pause();
      });
    };
    // "play" doesn't bubble, so listen in the capture phase. Unmuting a playing video counts too.
    const onVolume = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLMediaElement && t !== audioRef.current && !t.paused) onPlay(e);
    };
    document.addEventListener("play", onPlay, true);
    document.addEventListener("volumechange", onVolume, true);
    return () => {
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("volumechange", onVolume, true);
    };
  }, [dispatch]);

  // Reset per-track counters
  useEffect(() => {
    listened.current = 0;
    lastTime.current = 0;
    counted.current = false;
    setProgress(0);
    setDuration(0);
    publishTiming(0, 0);
  }, [currentTrack, track?.id]);

  const recordPlay = useCallback(() => {
    const userId = (window as any).__USER_ID__;
    if (!track || !userId) return;
    void fetch("/api/analytics/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: track.id,
        targetModel: track.model ?? "Song",
        eventKey: `${userId}-${track.id}-${Date.now()}`,
        listenedSeconds: listened.current,
      }),
    }).catch(() => {});
  }, [track]);

  const restart = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, []);

  const skipNext = useCallback(
    (auto = false) => {
      if (queue.length <= 1 || (auto && repeat === "one")) {
        if (auto && queue.length <= 1 && repeat === "off") return dispatch(pause());
        return restart();
      }
      dispatch(next({ auto }));
    },
    [dispatch, queue.length, repeat, restart]
  );

  const skipPrevious = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) return restart();
    if (queue.length <= 1) return restart();
    dispatch(previous());
  }, [dispatch, queue.length, restart]);

  const seekBy = useCallback((delta: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = Math.min(Math.max(a.currentTime + delta, 0), a.duration || 0);
  }, []);

  // Only count audibly played time (ignores seeking) toward a qualified play
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    const delta = a.currentTime - lastTime.current;
    if (delta > 0 && delta < 1.5) listened.current += delta;
    lastTime.current = a.currentTime;
    setProgress(a.currentTime);
    publishTiming(a.currentTime, a.duration);
    if (!counted.current && listened.current >= PLAY_THRESHOLD_SECONDS) {
      counted.current = true;
      recordPlay();
    }
  };

  // OS / lock-screen / headset controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (track) {
      ms.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: "512x512" }] : [],
      });
    }
    ms.playbackState = isPlaying ? "playing" : "paused";
    ms.setActionHandler("play", () => dispatch(play()));
    ms.setActionHandler("pause", () => dispatch(pause()));
    ms.setActionHandler("previoustrack", skipPrevious);
    ms.setActionHandler("nexttrack", () => skipNext());
    ms.setActionHandler("seekto", (d) => {
      if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime;
    });
    return () => {
      (["play", "pause", "previoustrack", "nexttrack", "seekto"] as const).forEach((k) =>
        ms.setActionHandler(k, null)
      );
    };
  }, [track, isPlaying, dispatch, skipNext, skipPrevious]);

  // Keyboard shortcuts (ignored while typing)
  useEffect(() => {
    if (!currentTrack) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        dispatch(togglePlay());
      } else if (e.shiftKey && e.key === "ArrowRight") skipNext();
      else if (e.shiftKey && e.key === "ArrowLeft") skipPrevious();
      else if (e.key === "ArrowRight") seekBy(5);
      else if (e.key === "ArrowLeft") seekBy(-5);
      else if (e.key.toLowerCase() === "m") dispatch(toggleMute());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, dispatch, skipNext, skipPrevious, seekBy]);

  // Keep page content clear of the fixed bar
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !currentTrack) {
      document.body.style.paddingBottom = "";
      return;
    }
    const apply = () => (document.body.style.paddingBottom = `${bar.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [currentTrack, minimized]);

  const updateMinimized = useCallback((value: boolean) => {
    setMinimized(value);
    localStorage.setItem(MINIMIZED_KEY, value ? "1" : "0");
  }, []);

  // Stops playback and hides the player; the toast lets a mis-click be undone
  const closePlayer = useCallback(() => {
    const snapshot = { queue, queueIndex };
    dispatch(clearPlayer());
    setMinimized(false);
    toast("Player closed", {
      action: { label: "Undo", onClick: () => dispatch(hydrate(snapshot)) },
    });
  }, [dispatch, queue, queueIndex]);

  const shown = seeking ?? progress;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  const seekBar = (
    <div className="flex w-full items-center gap-2">
      <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{formatTime(shown)}</span>
      <Slider
        aria-label="Seek"
        value={[shown]}
        min={0}
        max={duration || 1}
        step={0.1}
        disabled={!duration}
        onValueChange={([v]) => setSeeking(v)}
        onValueCommit={([v]) => {
          if (audioRef.current) audioRef.current.currentTime = v;
          lastTime.current = v;
          setProgress(v);
          setSeeking(null);
        }}
        className="flex-1"
      />
      <span className="w-9 text-[11px] tabular-nums text-muted-foreground">{formatTime(duration)}</span>
    </div>
  );

  const queueSheet = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open queue" className="relative">
          <ListMusic className="h-4 w-4" />
          {queue.length > 1 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {queue.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Queue</SheetTitle>
          <SheetDescription>
            {queue.length} track{queue.length === 1 ? "" : "s"} · drag to reorder
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <ul className="p-2">
            {queue.map((t, i) => (
              <li
                key={`${t.id}-${i}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) dispatch(moveInQueue({ from: dragIndex, to: i }));
                  setDragIndex(null);
                }}
                className={cn(
                  "group flex items-center gap-2 rounded-md p-2 hover:bg-muted",
                  i === queueIndex && "bg-muted"
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                <button type="button" onClick={() => dispatch(jumpTo(i))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-muted">
                      <Music2 className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm font-medium", i === queueIndex && "text-primary")}>
                      {t.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                  </span>
                </button>
                {i === queueIndex && isPlaying && (
                  <span className="flex h-4 items-end gap-0.5" aria-label="Playing">
                    {[0, 1, 2].map((b) => (
                      <span
                        key={b}
                        className="w-0.5 animate-pulse rounded bg-primary"
                        style={{ height: `${60 + b * 20}%`, animationDelay: `${b * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove ${t.title}`}
                  onClick={() => dispatch(removeFromQueue(i))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="border-t p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={() => dispatch(clearPlayer())}>
            Clear queue
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <audio
        ref={(el) => {
          audioRef.current = el;
          registerAudio(el);
        }}
        src={currentTrack ?? undefined}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          publishTiming(e.currentTarget.currentTime, e.currentTarget.duration);
        }}
        onDurationChange={(e) => {
          setDuration(e.currentTarget.duration);
          publishTiming(e.currentTarget.currentTime, e.currentTarget.duration);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onEnded={() => skipNext(true)}
        onError={() => dispatch(pause())}
      />

      {currentTrack && minimized && (
        <div
          role="region"
          aria-label="Mini player"
          className="fixed bottom-4 right-4 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/90 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 p-2">
            <button
              type="button"
              aria-label="Expand player"
              onClick={() => updateMinimized(false)}
              className={cn(
                "relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted",
                isPlaying && "ring-2 ring-primary/40"
              )}
            >
              {track?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music2 className="m-auto h-5 w-5 text-muted-foreground" />
              )}
              {buffering && isPlaying && (
                <span className="absolute inset-0 grid place-items-center bg-black/40">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              )}
            </button>
            <button type="button" onClick={() => updateMinimized(false)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold">{track?.title ?? "Now playing"}</p>
              <p className="truncate text-xs text-muted-foreground">{track?.artist ?? ""}</p>
            </button>
            <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label={isPlaying ? "Pause" : "Play"} onClick={() => dispatch(togglePlay())}>
              {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Expand player" onClick={() => updateMinimized(false)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close player" onClick={closePlayer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-0.5 w-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${duration ? (shown / duration) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {currentTrack && !minimized && (
        <div
          ref={barRef}
          role="region"
          aria-label="Audio player"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
        >

          <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
            {/* Track info */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted",
                  isPlaying && "ring-2 ring-primary/40"
                )}
              >
                {track?.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Music2 className="m-auto mt-3.5 h-5 w-5 text-muted-foreground" />
                )}
                {buffering && isPlaying && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{track?.title ?? "Now playing"}</p>
                <p className="truncate text-xs text-muted-foreground">{track?.artist ?? ""}</p>
              </div>
            </div>

            {/* Mobile: play + collapse */}
            <div className="flex items-center gap-1 md:hidden">
              <Button size="icon" className="h-10 w-10 rounded-full" aria-label={isPlaying ? "Pause" : "Play"} onClick={() => dispatch(togglePlay())}>
                {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Next track" onClick={() => skipNext()}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Center controls (desktop) */}
            <div className="hidden flex-col items-center gap-1.5 md:flex">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  className={cn(shuffle && "text-primary")}
                  onClick={() => dispatch(toggleShuffle())}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Previous track" onClick={skipPrevious}>
                  <SkipBack className="h-4 w-4" fill="currentColor" />
                </Button>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={() => dispatch(togglePlay())}
                >
                  {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Next track" onClick={() => skipNext()}>
                  <SkipForward className="h-4 w-4" fill="currentColor" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Repeat ${repeat}`}
                  className={cn(repeat !== "off" && "text-primary")}
                  onClick={() => dispatch(cycleRepeat())}
                >
                  <RepeatIcon className="h-4 w-4" />
                </Button>
              </div>
              {seekBar}
            </div>

            {/* Right controls */}
            <div className="hidden items-center justify-end gap-1 md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-12 px-0 tabular-nums" aria-label="Playback speed">
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                  <DropdownMenuRadioGroup value={String(playbackRate)} onValueChange={(v) => dispatch(setPlaybackRate(Number(v)))}>
                    {RATES.map((r) => (
                      <DropdownMenuRadioItem key={r} value={String(r)}>
                        {r}x
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {queueSheet}
              <Button variant="ghost" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => dispatch(toggleMute())}>
                <VolumeIcon className="h-4 w-4" />
              </Button>
              <Slider
                aria-label="Volume"
                value={[muted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => dispatch(setVolume(v))}
                className="w-24"
              />
              <Button variant="ghost" size="icon" aria-label="Minimize player" onClick={() => updateMinimized(true)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close player" onClick={closePlayer}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile seek + extras */}
            <div className="col-span-2 flex items-center gap-2 md:hidden">
              <div className="flex-1">{seekBar}</div>
              {queueSheet}
              <Button variant="ghost" size="icon" aria-label="Minimize player" onClick={() => updateMinimized(true)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close player" onClick={closePlayer}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
