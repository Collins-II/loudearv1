"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socketClient";
import { AlbumSerialized, SongSerialized } from "@/actions/getItemsWithStats";
import AlbumPlayer from "@/components/music/AlbumPlayer";
import ShareModal from "@/components/modals/ShareModal";
import DetailsHero from "@/components/details/DetailsHero";
import HorizontalSlider from "@/components/sliders/HorizontalSlider";
import { SliderCard } from "@/components/sliders/SliderCard";
import Comments from "@/components/comments/Comments";
import ChartStatsCard from "@/components/charts/ChartStatsCard";
import SharePanel from "@/components/SharePanel";
import InteractiveButtons from "@/components/interactive-buttons";
import ViewStats from "@/components/stats/ViewStats";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { handleInteractionUtil } from "@/lib/interactions";
import type { User as UserType } from "next-auth";
import MonetizedDownloadSheet from "@/components/modals/DownloadModal";
import AdUnit from "@/components/ads/AdUnit";

interface AlbumClientPageProps {
  data: AlbumSerialized;
  relatedSongs: AlbumSerialized[];
}

export default function AlbumClientPage({ data, relatedSongs }: AlbumClientPageProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userId = session?.user?.id;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data.likeCount ?? 0);
  const [shareCount, setShareCount] = useState(data.shareCount ?? 0);
  const [downloadCount, setDownloadCount] = useState(data.downloadCount ?? 0);
  const [shareOpen, setShareOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [ queue ] = useState<SongSerialized[]>(data.songs as SongSerialized[]);
   const [monetizedDownloadOpen, setMonetizedDownloadOpen] = useState(false); // NEW

    // ✅ Download logic
  const downloadAlbum = async () => {
    setDownloading(true)
      const zip = new JSZip();
      for (const track of queue) {
        const res = await fetch(track.fileUrl);
        const blob = await res.blob();
        zip.file(`${track.artist} - ${track.title}.mp3`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${data.artist} - ${data.title}.zip`);
      setDownloading(false)
    };

  // ✅ Fixed: proper cleanup & types
useEffect(() => {
  if (!data?._id) return;

  const socket = getSocket();
  socket.emit("join", data._id);

  const onInteraction = (payload: any) => {
    const itemId = payload.itemId ?? payload.id;
    if (!itemId || itemId !== data._id) return;

    if (payload.counts) {
      setLikeCount(payload.counts.likes ?? likeCount);
      setShareCount(payload.counts.shares ?? shareCount);
      setDownloadCount(payload.counts.downloads ?? downloadCount);
    }

    if (typeof payload.userLiked !== "undefined") {
      setLiked(Boolean(payload.userLiked));
    }
  };

  socket.on("interaction:update", onInteraction);

  // ✅ Proper cleanup (no socket returned, just cleanly off the listener)
  return () => {
    socket.off("interaction:update", onInteraction);
  };
}, [data?._id, likeCount, shareCount, downloadCount]);


// ✅ use reusable utility
  const handleInteraction = useCallback(
    (type: "like" | "unlike" | "share" | "download" | "views") => {
      handleInteractionUtil({
        type,
        model: "Album",
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

  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""}/music/album/${data._id}`;

  return (
    <>
    <main className="bg-white dark:bg-black text-gray-900 dark:text-gray-100 pt-8 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* MAIN CONTENT */}
        <section className="lg:col-span-8 space-y-8">
          {/* Hero Section */}
          <AdUnit placement="leaderboard" />
          {/* Hero */}
          <DetailsHero
            kind="Album"
            title={data.title}
            artist={data.artist}
            coverUrl={data.coverUrl}
            genre={data.genre}
            createdAt={data.createdAt}
            tags={data.tags}
            trendingPosition={data.trendingPosition}
            chartPosition={data.chartPosition}
            stats={{ views: data.totalViews, likes: likeCount, downloads: downloadCount }}
            stan={{ artistId: data._id }}
          />

          {/* Player */}
            <AlbumPlayer
              userId={userId}
              tracks={(data.songs ?? []) as SongSerialized[]}
              albumTitle={data.title}
              albumArtist={data.artist}
              coverUrl={data.coverUrl}
            />
            <div className="flex items-center justify-between flex-wrap">
              <InteractiveButtons
                liked={liked}
                downloading={downloading}
                price={25}
                handleDownload={()=> setMonetizedDownloadOpen(true)}
                handleInteraction={() => handleInteraction("like")}
              />
            
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
          {/* Related Songs */}
          {relatedSongs?.length > 0 && (
            <HorizontalSlider title="You might also like">
              {relatedSongs.map((song) => (
                <SliderCard
                  key={song._id}
                  id={song._id}
                  title={song.title}
                  artist={song.artist}
                  cover={song.coverUrl}
                  downloads={song.downloadCount}
                  publishedAt={(song.createdAt) as string}
                  genre={song.genre}
                  views={song.viewCount}
                  href={`/music/song/${song._id}`}
                />
              ))}
            </HorizontalSlider>
          )}

          {/* Comments */}
          <Comments
            model="Album"
            id={data._id}
            initialComments={data.latestComments}
            user={user as UserType}
          />
        </section>

        {/* SIDEBAR */}
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
   onDownload={downloadAlbum}
   price={400}
   coverUrl={data.coverUrl}
   title={data.title}
   artist={data.artist}
   artistId={data.author._id}
   mediaId={data._id}
   mediaType="album"
   onPaidDownload={() => handleInteraction("download")}
 />
 
    </main>
    </>
  );
}
