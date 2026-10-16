"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socketClient";
import { SongSerialized } from "@/actions/getItemsWithStats";
import CustomPlayer from "@/components/music/CustomPlayer";
import ShareModal from "@/components/modals/ShareModal";
import { PageHeader } from "@/components/PageHeader";
import DetailsHero from "@/components/details/DetailsHero";
import HorizontalSlider from "@/components/sliders/HorizontalSlider";
import { SliderCard } from "@/components/sliders/SliderCard";
import Comments from "@/components/comments/Comments";
import ChartStatsCard from "@/components/charts/ChartStatsCard";
import SharePanel from "@/components/SharePanel";
import InteractiveButtons from "@/components/interactive-buttons";
import ViewStats from "@/components/stats/ViewStats";
import { handleInteractionUtil } from "@/lib/interactions";
import type { User as UserType } from "next-auth";
import MonetizedDownloadSheet from "@/components/modals/DownloadModal";
import AdUnit from "@/components/ads/AdUnit";
import AddToPlaylistButton from "@/components/playlist/AddToPlaylistButton";

/**
 * Design goals:
 * - Hero section with big cover, title, artist, badges
 * - Action row (like / share / download) with counts
 * - Sticky right column with social share tools and chart/trending info
 * - Player + description + related + comments
 */

interface ClientPageProps {
  data: SongSerialized;
  relatedSongs: SongSerialized[];
}


export default function ClientPage({ data, relatedSongs }: ClientPageProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userId = session?.user?.id;

  // local UI state
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(data.likeCount ?? 0);
  const [shareCount, setShareCount] = useState<number>(data.shareCount ?? 0);
  const [downloadCount, setDownloadCount] = useState<number>(
    data.downloadCount ?? 0
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [monetizedDownloadOpen, setMonetizedDownloadOpen] = useState(false); // NEW
  const [downloading, setDownloading ] = useState(false);
  

  // socket: synchronize live counts and userLiked state
  useEffect(() => {
    if (!data?._id) return;
    const socket = getSocket();
    socket.emit("join", data._id);

    const onInteraction = (payload: any) => {
      // payload may vary; we check for itemId or id
      const itemId = payload.itemId ?? payload.id;
      if (!itemId || itemId !== data._id) return;

      if (payload.counts) {
        setLikeCount(payload.counts.likes ?? ((c) => c));
        setShareCount(payload.counts.shares ?? ((c) => c));
        setDownloadCount(payload.counts.downloads ?? ((c) => c));
      }

      if (typeof payload.userLiked !== "undefined") {
        setLiked(Boolean(payload.userLiked));
      }
    };

    socket.on("interaction:update", onInteraction);

    return () => {
      socket.off("interaction:update", onInteraction);
    };
  }, [data?._id]);

// ✅ use reusable utility
  const handleInteraction = useCallback(
    (type: "like" | "unlike" | "share" | "download" | "views") => {
      handleInteractionUtil({
        type,
        model: "Song",
        itemId: data._id,
        userId,
        setLiked,
        setLikeCount,
        setDownloadCount,
        onUnauthorized: () => alert("Please sign in to interact."),
      });
    },
    [data?._id, userId]
  );

    // ✅ Download logic
 const handleDownload = async () => {
    if (!data.fileUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(data.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.artist} - ${data.title}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      await handleInteraction("download");
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // share helpers
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""}/music/song/${data._id}`;

  /*const handleNativeShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: data.title,
          text: data.description ?? `${data.title} — ${data.artist}`,
          url: pageUrl,
        });
        await handleInteraction("share");
      } catch (err) {
        // sharing canceled or failed
        console.debug("Native share canceled/failed", err);
      }
    } else {
      setShareOpen(true);
    }
  };*/

  return (
    <>
    <PageHeader
      eyebrow="Music • Song"
      title="Song Details"
      description={`Listen to ${data.title} by ${data.artist}, download it and join the conversation.`}
    />
    <main className="bg-white dark:bg-black text-gray-900 dark:text-gray-100 pt-8 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
       
        {/* HERO + MAIN: cols 1-8 */}
        <section className="lg:col-span-8 space-y-8">
           {/* {loading ? (
                  <div className="w-full max-w-[728px] h-[90px] bg-slate-100 animate-pulse rounded mx-auto" />
                ) : topAd ? (
                  <AdUnit placement="leaderboard" />
                ) : (
                  <p className="text-xs text-gray-400">No campaign inventory running for this slot sizing.</p>
                )}
          Hero */}
          <DetailsHero
            kind="Song"
            title={data.title}
            artist={data.artist}
            coverUrl={data.coverUrl}
            features={data.features}
            genre={data.genre}
            createdAt={data.createdAt}
            tags={data.tags}
            trendingPosition={data.trendingPosition}
            chartPosition={data.chartPosition}
            stats={{ views: data.totalViews, likes: likeCount, downloads: downloadCount }}
            stan={{ artistId: data.author._id, initialStanCount: data.author.stan }}
          />
          {/* Player */}
            <CustomPlayer
              src={data.fileUrl}
              title={data.title}
              artist={data.artist}
              coverUrl={data.coverUrl}
              onDownload={() => {
                setMonetizedDownloadOpen(true);
                //handleInteraction("download");
              }}
            />
         <div className="flex items-center justify-between flex-wrap">
          <InteractiveButtons
            liked={liked}
            downloading={downloading}
            price={16.49}
            handleDownload={() => setMonetizedDownloadOpen(true)}
            handleInteraction={() => handleInteraction("like")}
          />
          <AddToPlaylistButton songId={data._id} />
          <ViewStats current={data.viewCount} previous={data.previousViewCount as number} />
        </div> 

        {/* Description / Article */}
          {data.description && (
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h3 className="mt-6 text-2xl md:text-3xl font-extrabold">About the track</h3>
            <p className="italic">
              {data.description ??
                "No description available. This page displays metadata, stats and community comments for the release."}
            </p>
          </article>
        )}
               <AdUnit placement="leaderboard" />

          {/* Related songs */}
          {relatedSongs?.length > 0 && (
            <div className="mt-6">
              <HorizontalSlider title="You might also like" className="">
                {relatedSongs.map((song) => (
                  <SliderCard
                    key={song._id}
                    id={song._id}
                    title={song.title}
                    artist={song.artist}
                    cover={song.coverUrl}
                    downloads={song.downloadCount}
                    publishedAt={song.releaseDate as string}
                    genre={song.genre}
                    views={song.viewCount}
                    href={`/music/song/${song._id}`}
                  />
                ))}
              </HorizontalSlider>
            </div>
          )}

          {/* Comments */}
          <div className="mt-8">
            <Comments model="Song" id={data._id} initialComments={data.latestComments} user={user as UserType} />
          </div>
        </section>

        {/* STICKY SIDEBAR: cols 9-12 */}
        <aside className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            {/* Share panel */}
            <SharePanel
              userId={userId as string}
              title={data.title}
              artist={data.artist}
              shareCount={shareCount}
              onShare={() => handleInteraction("share")}
            />

            <ChartStatsCard
              data={{
                trendingPosition: data.trendingPosition,
                chartPosition: data.chartPosition,
                peak: data.chartHistory?.[0]?.peak,
                plays: data.viewCount,
                likes: likeCount,
                shares: shareCount,
                downloads: downloadCount,
              }}
            />
            <AdUnit placement="square" />
                     <AdUnit placement="leaderboard" />
            {/* CTA / Ads placeholder */}
            <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white text-center">
              <h5 className="font-bold">Promote your release</h5>
              <p className="text-sm mt-1">Reach thousands of listeners with our featured campaigns.</p>
              <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md">Learn more</button>
            </div>
          </div>
        </aside>

      </div>

      {/* Modals */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={pageUrl}
        title={data.title}
      />
{/* NEW: Monetized Apple-Style Download Bottom Sheet */}
<MonetizedDownloadSheet
  open={monetizedDownloadOpen}
  onClose={() => setMonetizedDownloadOpen(false)}
  price={200}
  coverUrl={data.coverUrl}
  title={data.title}
  artist={data.artist}
  artistId={data.author._id}
  mediaId={data._id}
  mediaType="song"
  onDownload={handleDownload}
  onPaidDownload={() => handleInteraction("download")}
/>

    </main>
    </>
  );
}
