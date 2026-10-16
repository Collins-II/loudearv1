"use client";

import Link from "next/link";
import { ArrowLeft, AudioLines, Clapperboard, Disc3, Music2 } from "lucide-react";
import { motion } from "framer-motion";

type UploadIcon = "song" | "album" | "video" | "beat";

interface UploadPageShellProps {
  title: string;
  description: string;
  icon: UploadIcon;
  children: React.ReactNode;
}

export function UploadPageShell({
  title,
  description,
  icon,
  children,
}: UploadPageShellProps) {
  const Icon = {
    song: Music2,
    album: Disc3,
    video: Clapperboard,
    beat: AudioLines,
  }[icon];

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl space-y-8 py-2 text-foreground">
      <Link
        href="/studio/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-center"
      >
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
          <Icon className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Artist studio <span aria-hidden="true">/</span> Release
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </motion.header>

      <section aria-label={`${title} form`} className="pb-8">
        {children}
      </section>
    </div>
  );
}
