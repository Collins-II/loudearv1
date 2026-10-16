"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socketClient";
import { VideoSerialized } from "@/actions/getItemsWithStats";
import { PageHeader } from "@/components/PageHeader";
import DetailsHero from "@/components/details/DetailsHero";
import ShareModal from "@/components/modals/ShareModal";
import VideoPlayer from "@/components/video/VideoPlayer";
import HorizontalSlider from "@/components/sliders/HorizontalSlider";
import Comments from "@/components/comments/Comments";
import ChartStatsCard from "@/components/charts/ChartStatsCard";
import SharePanel from "@/components/SharePanel";
import { VideoCard } from "@/components/video/VideoCard";
import InteractiveButtons from "@/components/interactive-buttons";
import ViewStats from "@/components/stats/ViewStats";
import { handleInteractionUtil } from "@/lib/interactions";
import type { User as UserType } from "next-auth";
import MonetizedDownloadSheet from "@/components/modals/DownloadModal";
import AdUnit from "@/components/ads/AdUnit";

interface VideoPageProps {
  data: VideoSerialized;
  relatedVideos: VideoSerialized[];
}

export default function VideoPage({ data, relatedVideos }: VideoPageProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userId = user?.id;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data.likeCount ?? 0);
  const [shareCount, setShareCount] = useState(data.shareCount ?? 0);
  const [downloadCount, setDownloadCount] = useState(data.downloadCount ?? 0);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [monetizedDownloadOpen, setMonetizedDownloadOpen] = useState(false); // NEW

  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? ""}/videos/${data._id}`;

  // ✅ Socket updates
  useEffect(() => {
    if (!data?._id) return;
    const socket = getSocket();
    const room = `Video:${data._id}`;
    socket.emit("join", room);

    const onInteraction = (payload: any) => {
      if (payload.itemId !== data._id || payload.model !== "Video") return;
      if (payload.counts) {
        setLikeCount(payload.counts.likes ?? likeCount);
        setShareCount(payload.counts.shares ?? shareCount);
        setDownloadCount(payload.counts.downloads ?? downloadCount);
      }
      if (typeof payload.userLiked !== "undefined") setLiked(Boolean(payload.userLiked));
    };

    socket.on("interaction:update", onInteraction);
    return () => {
      socket.emit("leave", room);
      socket.off("interaction:update", onInteraction);
    };
  }, [data?._id, likeCount, shareCount, downloadCount]);

  // ✅ Interactions
// ✅ use reusable utility
  const handleInteraction = useCallback(
    (type: "like" | "unlike" | "share" | "download" | "views") => {
      handleInteractionUtil({
        type,
        model: "Video",
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
      a.download = `${data.artist} - ${data.title}.mp4`;
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

  return (
    <>
    <PageHeader
      eyebrow="Videos"
      title="Video Details"
      description={`Watch ${data.title} by ${data.artist} and join the conversation.`}
    />
    <main className="bg-white dark:bg-black text-gray-900 dark:text-gray-100 pt-8 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">

        {/* MAIN CONTENT */}
        <section className="lg:col-span-8 space-y-8">
           {/* {loading ? (
                            <div className="w-full max-w-[728px] h-[90px] bg-slate-100 animate-pulse rounded mx-auto" />
                          ) : topAd ? (
                            <AdUnit placement="leaderboard" />
                          ) : (
                            <p className="text-xs text-gray-400">No campaign inventory running for this slot sizing.</p>
                          )}
         Hero Section */}
          <DetailsHero
            kind="Video"
            title={data.title}
            artist={data.artist}
            coverUrl={data.coverUrl}
            features={data.features}
            genre={data.genre}
            createdAt={data.createdAt}
            tags={data.tags}
            trendingPosition={data.trendingPosition}
            stats={{ views: data.totalViews, likes: likeCount, downloads: downloadCount }}
            stan={{ artistId: data._id }}
          />

          {/* Video Player */}
{/* Video Player */}
<VideoPlayer
  id={data._id}
  userId={userId}
  title={data.title}
  thumbnail={data.coverUrl}
  // Provide multiple quality sources (auto-resolution will pick the best)
  sources={[
    { label: "1080p", src: data.fileUrl },
    { label: "720p", src: data.fileUrl },
    { label: "360p", src: data.fileUrl },
  ]}
  // Optional: hover thumbnails for preview on progress hover
  //hoverThumbnails={data.hoverThumbnails || []}
  // Optional: subtitles
  subtitles={ []}
/>

         <div className="flex items-center justify-between flex-wrap">
          <InteractiveButtons
            liked={liked}
            downloading={downloading}
            price={149}
            handleDownload={() => setMonetizedDownloadOpen(true)}
            handleInteraction={() => handleInteraction("like")}
          />

          <ViewStats current={data.viewCount} previous={data.previousViewCount as number} />
        </div> 

                  {/* Description */}
          {data.description && (
            <article className="prose prose-lg dark:prose-invert max-w-none">
              <h3 className="mt-6 text-2xl md:text-3xl font-extrabold">About the video</h3>
              <p className="italic">{data.description}</p>
            </article>
          )}
          
           <AdUnit placement="leaderboard" />
          {/* Related videos */}
          {relatedVideos.length > 0 && (
            <HorizontalSlider title="You May Also Like">
              {relatedVideos.map((video) => (
                <VideoCard
                  key={video._id}
                  id={video._id}
                  title={video.title}
                  artist={video.artist as string}
                  cover={video.coverUrl}
                  downloads={video.downloadCount}
                  category={video.genre}
                  views={video.viewCount}
                  videoUrl={video.fileUrl as string}
                />
              ))}
            </HorizontalSlider>
          )}

          {/* Comments */}
          <Comments model="Video" id={data._id} initialComments={data.latestComments} user={user as UserType } />
        </section>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <SharePanel userId={userId as string} title={data.title} artist={data.artist} shareCount={shareCount} onShare={() => handleInteraction("share")} />

            <ChartStatsCard
              data={{
                trendingPosition: data.trendingPosition,
                chartPosition: data.chartPosition,
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
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} shareUrl={pageUrl} title={data.title} />
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
        mediaType="video"
        onDownload={handleDownload}
        onPaidDownload={() => handleInteraction("download")}
      />
    </main>
    </>
  );
}
