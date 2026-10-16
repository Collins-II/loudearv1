"use client";

import GoogleAd from "@/components/ads/AdSlot";
import { getAdSlot, ADSENSE_CLIENT_ID, type AdPlacement } from "@/lib/ads";

interface AdUnitProps {
  placement: AdPlacement;
  className?: string;
}

const FORMATS: Record<AdPlacement, string> = {
  leaderboard: "horizontal",
  square: "rectangle",
  fluid: "auto",
};

export default function AdUnit({ placement, className = "" }: AdUnitProps) {
  const slot = getAdSlot(placement);
  if (!ADSENSE_CLIENT_ID || !slot) return null;

  return (
    <aside aria-label="Advertisement" className={`w-full overflow-hidden ${className}`}>
      <span className="mb-1 block text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Advertisement
      </span>
      <GoogleAd slot={slot} format={FORMATS[placement]} />
    </aside>
  );
}
