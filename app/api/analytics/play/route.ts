import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Interaction } from "@/lib/database/models/interactions";
import { Song } from "@/lib/database/models/song";
import { Video } from "@/lib/database/models/video";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) return NextResponse.json({ error: "Sign in to record a play" }, { status: 401 });

    const body = await req.json();
    const { targetId, targetModel, eventKey, listenedSeconds } = body;
    if (!Types.ObjectId.isValid(targetId) || !["Song", "Video"].includes(targetModel)) {
      return NextResponse.json({ error: "Invalid media target" }, { status: 400 });
    }
    if (typeof eventKey !== "string" || eventKey.length < 8 || eventKey.length > 100) {
      return NextResponse.json({ error: "Invalid play event key" }, { status: 400 });
    }
    if (!Number.isFinite(listenedSeconds) || listenedSeconds < 30) {
      return NextResponse.json({ counted: false, reason: "minimum_listen_not_met" });
    }

    const media: { _id: Types.ObjectId; author: Types.ObjectId; title: string; visibility: string } | null = targetModel === "Song"
      ? await Song.findById(targetId).select("author title visibility").lean() as any
      : await Video.findById(targetId).select("author title visibility").lean() as any;
    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    if (media.visibility !== "public" && String(media.author) !== String(user._id)) {
      return NextResponse.json({ error: "Media is not available" }, { status: 404 });
    }

    const countryHeader = (process.env.GEOIP_COUNTRY_HEADER || "x-vercel-ip-country").toLowerCase();
    const countryHeaderValue = countryHeader ? req.headers.get(countryHeader)?.toUpperCase() : undefined;
    const country = countryHeaderValue && /^[A-Z]{2}$/.test(countryHeaderValue) ? countryHeaderValue : undefined;
    const event = await Interaction.create({
      user: user._id,
      targetModel,
      targetId: media._id,
      type: "play",
      metadata: {
        eventKey,
        listenedSeconds: Math.floor(listenedSeconds),
        country,
      },
    });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await Interaction.countDocuments({
      targetModel,
      targetId: media._id,
      type: "play",
      createdAt: { $gte: since },
    });
    const artistId = String(media.author);
    (globalThis as any).io?.to(`artist:${artistId}`).emit("analytics:play", {
      targetId: String(media._id),
      title: media.title,
      count,
      occurredAt: event.createdAt,
    });

    return NextResponse.json({ counted: true });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ counted: false, reason: "duplicate_event" });
    console.error("[PLAY_ANALYTICS_ERROR]", error);
    return NextResponse.json({ error: "Unable to record play" }, { status: 500 });
  }
}