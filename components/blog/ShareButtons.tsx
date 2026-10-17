"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {
        /* dismissed */
      }
      return;
    }
    await copy();
  };

  const btn =
    "inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:border-black/40 dark:border-white/15 dark:text-white dark:hover:border-white/40";

  return (
    <div className="flex gap-2">
      <button type="button" onClick={share} className={btn}>
        <Share2 className="h-4 w-4" /> Share
      </button>
      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
