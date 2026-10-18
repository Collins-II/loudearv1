import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { Song } from "@/lib/database/models/song";
import { Video } from "@/lib/database/models/video";
import { Album } from "@/lib/database/models/album";
import { Interaction } from "@/lib/database/models/interactions";

export const dynamic = "force-dynamic";

const RANGES = {
  "24h": { ms: 24 * 3600_000, bucket: 3600_000, format: "%Y-%m-%dT%H", len: 13 },
  "7d": { ms: 7 * 24 * 3600_000, bucket: 24 * 3600_000, format: "%Y-%m-%d", len: 10 },
  "30d": { ms: 30 * 24 * 3600_000, bucket: 24 * 3600_000, format: "%Y-%m-%d", len: 10 },
} as const;

const CATEGORIES = [
  { key: "Song", label: "Songs", model: Song, image: "coverUrl" },
  { key: "Video", label: "Videos", model: Video, image: "thumbnailUrl" },
  { key: "Album", label: "Albums", model: Album, image: "coverUrl" },
] as const;

const METRICS = ["play", "like", "download", "share", "view", "comment"] as const;

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rangeParam = new URL(req.url).searchParams.get("range") ?? "7d";
    const rangeKey = (rangeParam in RANGES ? rangeParam : "7d") as keyof typeof RANGES;
    const range = RANGES[rangeKey];
    const now = Date.now();
    const since = new Date(now - range.ms);
    const prevSince = new Date(now - range.ms * 2);

    const categories = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const items: any[] = await (cat.model as any)
          .find({ author: user._id })
          .select(`title ${cat.image}`)
          .lean();
        const ids = items.map((i) => i._id);
        const base = { targetModel: cat.key, targetId: { $in: ids } };

        const [series, totals, prevTotals, top, recent] = ids.length
          ? await Promise.all([
              Interaction.aggregate([
                { $match: { ...base, createdAt: { $gte: since } } },
                {
                  $group: {
                    _id: { t: { $dateToString: { format: range.format, date: "$createdAt" } }, type: "$type" },
                    n: { $sum: 1 },
                  },
                },
              ]),
              Interaction.aggregate([
                { $match: { ...base, createdAt: { $gte: since } } },
                { $group: { _id: "$type", n: { $sum: 1 } } },
              ]),
              Interaction.aggregate([
                { $match: { ...base, createdAt: { $gte: prevSince, $lt: since } } },
                { $group: { _id: "$type", n: { $sum: 1 } } },
              ]),
              Interaction.aggregate([
                { $match: { ...base, type: "play", createdAt: { $gte: since } } },
                { $group: { _id: "$targetId", plays: { $sum: 1 }, listeners: { $addToSet: "$user" } } },
                { $sort: { plays: -1 } },
                { $limit: 5 },
              ]),
              Interaction.countDocuments({ ...base, type: "play", createdAt: { $gte: new Date(now - 5 * 60_000) } }),
            ])
          : [[], [], [], [], 0];

        // Zero-filled buckets keep the chart axis continuous
        const buckets = new Map<string, Record<string, number>>();
        const start = Math.floor(since.getTime() / range.bucket) * range.bucket;
        for (let t = start; t <= now; t += range.bucket) {
          buckets.set(new Date(t).toISOString().slice(0, range.len), {});
        }
        for (const row of series as any[]) {
          const b = buckets.get(row._id.t);
          if (b) b[row._id.type] = row.n;
        }

        const toMap = (rows: any[]) => Object.fromEntries(rows.map((r) => [r._id, r.n as number]));
        const itemMap = new Map(items.map((i) => [String(i._id), i]));

        return {
          key: cat.key,
          label: cat.label,
          itemCount: items.length,
          totals: toMap(totals as any[]),
          previous: toMap(prevTotals as any[]),
          livePlays: recent as number,
          series: Array.from(buckets.entries()).map(([t, v]) => ({
            t,
            ...Object.fromEntries(METRICS.map((m) => [m, v[m] ?? 0])),
          })),
          top: (top as any[]).map((r) => {
            const item = itemMap.get(String(r._id));
            return {
              id: String(r._id),
              title: item?.title ?? "Untitled",
              image: item?.[cat.image] || "/assets/images/placeholder_cover.jpg",
              plays: r.plays as number,
              listeners: (r.listeners as unknown[]).length,
            };
          }),
        };
      })
    );

    return NextResponse.json({ range: rangeKey, generatedAt: now, categories });
  } catch (err) {
    console.error("[STUDIO_CHARTS_ERROR]", err);
    return NextResponse.json({ error: "Failed to load charts" }, { status: 500 });
  }
}
