import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { Campaign } from "@/lib/database/models/campaign";
import { getCurrentUser } from "@/actions/getCurrentUser";
import mongoose from "mongoose";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";

export async function GET(req: Request) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "artist") return NextResponse.json({ error: "Artist account required" }, { status: 403 });
  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId");
  const requestedArtist = artistId && String(artistId) === String(user._id) ? artistId : String(user._id);
  const campaigns = await Campaign.find({ artistId: requestedArtist }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ campaigns, pricing: { model: "CPM", cpm: Number(process.env.CAMPAIGN_CPM_MINOR ?? 2500) / 100, currency: "ZMW" } });
}

export async function POST(req: Request) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user?._id) {
    return NextResponse.json({ error: "Unauthorized: user not logged in" }, { status: 401 });
  }
  if (user.role !== "artist") return NextResponse.json({ error: "Artist account required" }, { status: 403 });

  const body = await req.json();

  // Validate required fields
  const errors: string[] = [];
  if (typeof body.campaignName !== "string" || !body.campaignName.trim()) errors.push("campaignName is required");
  if (!mongoose.Types.ObjectId.isValid(body.mediaId)) errors.push("valid mediaId is required");
  if (!Number.isFinite(body.budget) || body.budget <= 0) errors.push("budget must be positive");
  if (body.dailyCap !== undefined && (!Number.isFinite(body.dailyCap) || body.dailyCap <= 0 || body.dailyCap > body.budget)) errors.push("dailyCap must be positive and no greater than budget");
  if (!["song", "album", "video"].includes(body.mediaType)) errors.push("valid mediaType is required");

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  try {
    const Media = body.mediaType === "song" ? Song : body.mediaType === "album" ? Album : Video;
    const media = await Media.findOne({ _id: body.mediaId, author: user._id }).select("_id").lean();
    if (!media) return NextResponse.json({ error: "Media not found for this artist" }, { status: 404 });

    const platforms = Array.isArray(body.targeting?.platforms)
      ? body.targeting.platforms.filter((platform: unknown) => platform === "app")
      : ["app"];
    if (!platforms.length) return NextResponse.json({ error: "Only LoudEar in-app campaigns can be created until external ad accounts are connected" }, { status: 400 });

    const created = await Campaign.create({
      mediaType: body.mediaType,
      mediaId: new mongoose.Types.ObjectId(body.mediaId),
      campaignName: body.campaignName.trim(),
      budget: body.budget,
      dailyCap: Number.isFinite(body.dailyCap) && body.dailyCap > 0 ? body.dailyCap : undefined,
      targeting: { countries: body.targeting?.countries ?? [], genres: body.targeting?.genres ?? [], platforms },
      ai: typeof body.ai?.adCopy === "string" ? { adCopy: body.ai.adCopy.slice(0, 500) } : undefined,
      schedule: {
        startDate: body.schedule?.startDate ? new Date(body.schedule.startDate) : new Date(),
        endDate: body.schedule?.endDate ? new Date(body.schedule.endDate) : undefined,
        timezone: typeof body.schedule?.timezone === "string" ? body.schedule.timezone : "UTC",
        autoStop: body.schedule?.autoStop === true,
      },
      status: "draft",
      artistId: user._id,
    });

    return NextResponse.json({ campaign: created });
  } catch (err: any) {
    console.error("Campaign creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
