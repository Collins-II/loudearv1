"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, DownloadCloud, VolumeX } from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import type { AppDispatch, RootState } from "@/lib/store/index";
import { setVolume, toggleMute } from "@/lib/store/audioSlice";
import { seekTo, usePlayerTiming } from "@/lib/player-engine";
import { useGlobalPlayer } from "@/hooks/useGlobalPlayer";

interface CustomPlayerProps {
  id: string;
  src: string;
  title: string;
  artist: string;
  coverUrl?: string;
  onDownload?: () => void;
}

// UI-only surface: audio is always produced by the single global player.
export default function CustomPlayer({ id, src, title, artist, coverUrl, onDownload }: CustomPlayerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { volume, muted } = useSelector((s: RootState) => s.audio);
  const { toggleTrack, isCurrent, isPlaying: globalPlaying } = useGlobalPlayer();
  const timing = usePlayerTiming();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const active = isCurrent(id);
  const isPlaying = active && globalPlaying;
  const position = active ? timing.position : 0;
  const duration = active ? timing.duration : 0;
  const progress = duration ? (position / duration) * 100 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    const offset = progress / 5;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      ctx.lineTo(x, height / 2 + Math.sin((x + offset * 20) * 0.04) * 4);
    }
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, (progress / 100) * width, height);
    ctx.globalAlpha = 1;
  }, [progress]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, "0")}`;
  };

  const safeFilename = (name: string) => name.replace(/[<>:"/\\|?*]+/g, "").trim();

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Failed to fetch audio file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFilename(artist)} - ${safeFilename(title)}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      onDownload?.();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-3xl bg-white border-[3px] border-black text-black p-5 flex flex-col sm:flex-row gap-5 items-center"
    >
      {coverUrl && (
        <div className="relative w-28 h-28 sm:w-24 sm:h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
          <Image src={coverUrl} alt={`${title} cover`} fill className="object-cover" />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between w-full">
        <div className="flex flex-col text-center sm:text-left mb-2">
          <span className="text-base font-semibold tracking-wide capitalize">{title}</span>
          <span className="text-sm text-gray-600">{artist}</span>
        </div>

        <div className="relative w-full h-8 mt-1">
          <canvas ref={canvasRef} width={600} height={30} className="w-full h-full rounded-md bg-neutral-900" />
          <input
            aria-label="Seek track"
            type="range"
            min={0}
            max={100}
            value={progress}
            disabled={!active || !duration}
            onChange={(e) => seekTo((Number(e.target.value) / 100) * duration)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => toggleTrack({ id, url: src, title, artist, coverUrl: coverUrl ?? "", model: "Song" })}
              size="icon"
              className="bg-black/20 text-black hover:bg-gray-500 rounded-full p-2 transition"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
              <span>{formatTime(position)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
            <Button
              size="icon"
              onClick={handleDownload}
              className="bg-black/10 hover:bg-black/20 rounded-full p-2 border border-black/10"
              aria-label="Download"
            >
              <DownloadCloud className="w-4 h-4 text-black" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
