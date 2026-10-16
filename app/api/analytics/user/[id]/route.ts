// app/api/artist/[id]/analytics/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { Song } from "@/lib/database/models/song";
import { Video } from "@/lib/database/models/video";
import Transaction from "@/lib/database/models/transactions";
import { Interaction } from "@/lib/database/models/interactions";
import type { ArtistAnalyticsResponse } from "@/types/analytics";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: routeId } = await params;
    if (routeId !== "me" && routeId !== String(user._id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [songs, videos] = await Promise.all([
      Song.find({ author: user._id }).select("title coverUrl duration").lean(),
      Video.find({ author: user._id }).select("title thumbnailUrl duration").lean(),
    ]);
    const media: Array<{ _id: unknown; title: string; duration?: number; model: "Song" | "Video"; image?: string }> = [
      ...songs.map((song) => ({ ...song, model: "Song" as const, image: song.coverUrl })),
      ...videos.map((video) => ({ ...video, model: "Video" as const, image: video.thumbnailUrl })),
    ] as any;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const playQuery = {
      targetModel: { $in: ["Song", "Video"] },
      targetId: { $in: media.map((item) => item._id) },
      type: "play",
      createdAt: { $gte: since },
    };
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const [dailyPlays, trackPlays, geoPlays, listenersToday, revenue, trackRevenue] = await Promise.all([
      Interaction.aggregate([
        { $match: playQuery },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, plays: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Interaction.aggregate([
        { $match: playQuery },
        { $group: { _id: "$targetId", plays: { $sum: 1 }, listeners: { $addToSet: "$user" } } },
      ]),
      Interaction.aggregate([
        { $match: { ...playQuery, "metadata.country": { $type: "string" } } },
        { $group: { _id: "$metadata.country", plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
      ]),
      Interaction.distinct("user", {
        ...playQuery,
        createdAt: { $gte: todayStart },
      }),
      Transaction.aggregate([
        { $match: { user: user._id, type: "royalty", status: { $in: ["completed", "settled"] }, createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: user._id,
            type: "royalty",
            status: { $in: ["completed", "settled"] },
            createdAt: { $gte: since },
            "product.id": { $in: media.map((item) => item._id) },
          },
        },
        { $group: { _id: "$product.id", total: { $sum: "$amount" } } },
      ]),
    ]);
    const trackPlayMap = new Map(trackPlays.map((entry) => [String(entry._id), entry]));
    const trackRevenueMap = new Map(
      trackRevenue.map((entry) => [String(entry._id), entry.total])
    );
    const todayKey = todayStart.toISOString().slice(0, 10);

    const payload: ArtistAnalyticsResponse = {
      artistId: String(user._id),
      overview: {
        playsToday: dailyPlays
          .filter((entry) => entry._id === todayKey)
          .reduce((total, entry) => total + entry.plays, 0),
        listenersToday: listenersToday.length,
        revenueCents: Math.round((revenue[0]?.total ?? 0) * 100),
        plays30d: dailyPlays.reduce((total, entry) => total + entry.plays, 0),
      },
      timeseries: dailyPlays.map((entry) => ({ date: entry._id, plays: entry.plays })),
      topTracks: media
        .map((item) => {
          const stats = trackPlayMap.get(String(item._id));
          return {
            id: String(item._id),
            title: item.title,
            plays: stats?.plays ?? 0,
            listeners: stats?.listeners?.length ?? 0,
            revenueCents: Math.round((trackRevenueMap.get(String(item._id)) ?? 0) * 100),
            duration: item.duration ?? 0,
            image: item.image || "/assets/images/placeholder_cover.jpg",
          };
        })
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 10),
      geo: geoPlays.map((entry) => ({
        code: entry._id,
        country: new Intl.DisplayNames(["en"], { type: "region" }).of(entry._id) ?? entry._id,
        plays: entry.plays,
      })),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("[ARTIST_ANALYTICS_ERROR]", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
