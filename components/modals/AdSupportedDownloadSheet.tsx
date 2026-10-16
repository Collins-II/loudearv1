"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DownloadCloud, X } from "lucide-react";
import Image from "next/image";
import AdUnit from "@/components/ads/AdUnit";
import { ADSENSE_CLIENT_ID, getAdSlot } from "@/lib/ads";

const AD_WAIT_SECONDS = 5;

interface AdSupportedDownloadSheetProps {
  open: boolean;
  onClose: () => void;
  coverUrl?: string;
  title?: string;
  artist?: string;
  onDownload: () => void | Promise<void>;
  onDownloaded?: () => void;
}

export default function AdSupportedDownloadSheet({
  open,
  onClose,
  coverUrl,
  title,
  artist,
  onDownload,
  onDownloaded,
}: AdSupportedDownloadSheetProps) {
  const adsEnabled = Boolean(ADSENSE_CLIENT_ID && getAdSlot("square"));
  const [remaining, setRemaining] = useState(adsEnabled ? AD_WAIT_SECONDS : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRemaining(adsEnabled ? AD_WAIT_SECONDS : 0);
    setError(null);
  }, [open, adsEnabled]);

  useEffect(() => {
    if (!open || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [open, remaining]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      await onDownload();
      onDownloaded?.();
      onClose();
    } catch {
      setError("The download could not be started. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Free download"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="relative mx-4 w-full max-w-2xl rounded-t-2xl border border-white/10 bg-white/95 p-4 text-black shadow-2xl backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 dark:text-white md:mx-auto md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-neutral-800">
                  {coverUrl && <Image src={coverUrl} alt={title ?? "Cover"} fill className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold md:text-base">{title}</div>
                  <div className="truncate text-xs text-gray-500 md:text-sm">{artist}</div>
                </div>
              </div>
              <button aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Downloads are free on LoudEar and supported by ads. Thanks for supporting the artist.
            </p>

            <AdUnit placement="square" className="mx-auto mt-4 max-w-sm" />

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleDownload}
              disabled={busy || remaining > 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              <DownloadCloud className="h-4 w-4" />
              {busy ? "Starting download..." : remaining > 0 ? `Download available in ${remaining}s` : "Download"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
