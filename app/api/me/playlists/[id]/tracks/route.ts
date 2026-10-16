import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Playlist } from "@/lib/database/models/playlist";
import { Song } from "@/lib/database/models/song";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to edit playlists." }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const songId = body?.songId;
    if (!Types.ObjectId.isValid(id) || typeof songId !== "string" || !Types.ObjectId.isValid(songId)) {
      return NextResponse.json({ error: "Invalid playlist or song." }, { status: 400 });
    }

    await connectToDatabase();
    const playlist = await Playlist.findOne({ _id: id, owner: user._id });
    if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    if (playlist.tracks.length >= 500) {
      return NextResponse.json({ error: "Playlists can hold up to 500 songs." }, { status: 400 });
    }

    const song = await Song.findOne({
      _id: songId,
      $or: [{ visibility: "public" }, { author: user._id }],
    }).select("_id visibility").lean<{ _id: unknown; visibility?: string }>();
    if (!song) return NextResponse.json({ error: "This song cannot be added." }, { status: 403 });
    if (playlist.visibility === "public" && song.visibility !== "public") {
      return NextResponse.json({ error: "Private songs cannot be added to a public playlist." }, { status: 400 });
    }

    const alreadyAdded = playlist.tracks.some((track: { song: Types.ObjectId }) => String(track.song) === songId);
    if (alreadyAdded) return NextResponse.json({ success: true, alreadyAdded: true });

    playlist.tracks.push({ song: new Types.ObjectId(songId), addedAt: new Date() } as (typeof playlist.tracks)[number]);
    await playlist.save();
    return NextResponse.json({ success: true, alreadyAdded: false });
  } catch (error) {
    console.error("[PLAYLIST_ADD_TRACK]", error);
    return NextResponse.json({ error: "Could not add this song." }, { status: 500 });
  }
}
