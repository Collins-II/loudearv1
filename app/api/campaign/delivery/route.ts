import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Campaign } from "@/lib/database/models/campaign";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";
import { getCurrentUser } from "@/actions/getCurrentUser";
import crypto from "crypto";
import CampaignEvent from "@/lib/database/models/campaign-event";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const viewer = await getCurrentUser();
    if (!viewer?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const campaigns = await Campaign.find({
      artistId: { $ne: viewer._id },
      status: "running",
      "targeting.platforms": "app",
      "billing.lockedMinor": { $gt: 0 },
    }).sort({ createdAt: 1 }).limit(30).lean();

    const countryHeader = (process.env.GEOIP_COUNTRY_HEADER || "x-vercel-ip-country").toLowerCase();
    const rawCountry = req.headers.get(countryHeader)?.toUpperCase();
    const country = rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
    const day = new Date().toISOString().slice(0, 10);
    const cpmMinor = Number(process.env.CAMPAIGN_CPM_MINOR ?? 2500);
    const feed = [];

    for (const campaign of campaigns) {
      const schedule = campaign.schedule ?? {};
      const now = Date.now();
      const dailyCapMinor = campaign.dailyCap ? Math.round(campaign.dailyCap * 100) : 0;
      if (dailyCapMinor > 0) {
        const impressionsToday = await CampaignEvent.countDocuments({ campaignId: campaign._id, day, type: "impression" });
        if (Math.floor((impressionsToday * cpmMinor) / 1000) >= dailyCapMinor) continue;
      }
      if (schedule.startDate && new Date(schedule.startDate).getTime() > now) continue;
      if (schedule.endDate && new Date(schedule.endDate).getTime() < now) continue;
      if (country && campaign.targeting?.countries?.length && !campaign.targeting.countries.includes(country)) continue;

      const Media = campaign.mediaType === "song" ? Song : campaign.mediaType === "album" ? Album : Video;
      const media: any = await Media.findOne({ _id: campaign.mediaId, author: campaign.artistId, visibility: "public" })
        .select("title artist genre coverUrl thumbnailUrl")
        .lean();
      if (!media) continue;
      if (campaign.targeting?.genres?.length && media.genre && !campaign.targeting.genres.includes(media.genre)) continue;

      const id = String(campaign._id);
      const eventId = crypto.randomUUID();
      const eventExpiresAt = Date.now() + 5 * 60 * 1000;
      const eventSecret = process.env.CAMPAIGN_EVENT_SECRET || process.env.NEXT_AUTH_SECRET;
      if (!eventSecret) return NextResponse.json({ error: "Campaign event signing is not configured" }, { status: 503 });
      const payload = `${id}:${viewer._id}:${eventId}:${eventExpiresAt}`;
      const eventToken = crypto.createHmac("sha256", eventSecret).update(payload).digest("hex");
      feed.push({
        id,
        eventId,
        eventExpiresAt,
        eventToken,
        name: campaign.campaignName,
        mediaId: String(campaign.mediaId),
        mediaType: campaign.mediaType,
        title: media.title,
        artist: media.artist,
        genre: media.genre,
        image: (media as any).coverUrl || (media as any).thumbnailUrl,
      });
      if (feed.length === 3) break;
    }

    return NextResponse.json({ campaigns: feed });
  } catch (error) {
    console.error("[CAMPAIGN_DELIVERY_ERROR]", error);
    return NextResponse.json({ error: "Campaign delivery unavailable" }, { status: 500 });
  }
}