"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

type SponsoredCampaign = {
  id: string;
  eventId: string;
  eventExpiresAt: number;
  eventToken: string;
  mediaId: string;
  mediaType: "song" | "album" | "video";
  title: string;
  artist: string;
  image?: string;
};

const mediaHref = (campaign: SponsoredCampaign) => {
  if (campaign.mediaType === "album") return `/music/album/${campaign.mediaId}`;
  if (campaign.mediaType === "video") return `/videos/${campaign.mediaId}`;
  return `/music/song/${campaign.mediaId}`;
};

function SponsoredCard({ campaign }: { campaign: SponsoredCampaign }) {
  const cardRef = useRef<HTMLElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || counted.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || counted.current) {
        clearTimeout(viewableTimer);
        return;
      }
      viewableTimer = window.setTimeout(() => {
        if (counted.current) return;
        counted.current = true;
        void fetch(`/api/campaign/${campaign.id}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: campaign.eventId, eventExpiresAt: campaign.eventExpiresAt, eventToken: campaign.eventToken, type: "impression" }),
          keepalive: true,
        });
        observer.disconnect();
      }, 1000);
    }, { threshold: 0.5 });
    let viewableTimer: number | undefined;
    observer.observe(card);
    return () => {
      clearTimeout(viewableTimer);
      observer.disconnect();
    };
  }, [campaign.id, campaign.eventExpiresAt, campaign.eventId, campaign.eventToken]);

  return (
    <article ref={cardRef} className="overflow-hidden border-b-2 border-emerald-500 bg-background">
      <Link
        href={mediaHref(campaign)}
        onClick={() => {
          void fetch(`/api/campaign/${campaign.id}/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: campaign.eventId, eventExpiresAt: campaign.eventExpiresAt, eventToken: campaign.eventToken, type: "click" }),
            keepalive: true,
          });
        }}
        aria-label={`Sponsored release: ${campaign.title} by ${campaign.artist}`}
        className="block"
      >
        {campaign.image && (
          <div className="relative aspect-[16/10] bg-muted">
            <Image src={campaign.image} alt="" fill sizes="(max-width: 1024px) 100vw, 280px" className="object-cover" />
          </div>
        )}
        <div className="space-y-1 p-3">
          <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">Sponsored</div>
          <div className="font-semibold leading-tight">{campaign.title}</div>
          <div className="text-sm text-muted-foreground">{campaign.artist}</div>
        </div>
      </Link>
    </article>
  );
}

export default function SponsoredReleases() {
  const { data: session, status } = useSession();
  const [campaigns, setCampaigns] = useState<SponsoredCampaign[]>([]);
  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    const controller = new AbortController();
    fetch("/api/campaign/delivery", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Delivery unavailable")))
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") console.error("Sponsored campaign load failed", error);
      });
    return () => controller.abort();
  }, [status, userId]);

  if (!userId || campaigns.length === 0) return null;
  return (
    <section aria-label="Sponsored releases" className="space-y-3">
      <h2 className="text-lg font-semibold">Sponsored releases</h2>
      <div className="space-y-3">
        {campaigns.map((campaign) => <SponsoredCard key={campaign.id} campaign={campaign} />)}
      </div>
    </section>
  );
}