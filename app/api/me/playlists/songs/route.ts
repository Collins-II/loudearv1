import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Song } from "@/lib/database/models/song";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to add songs." }, { status: 401 });

    await connectToDatabase();
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const access = [{ visibility: "public" }, { author: user._id }];
    const filter = query
      ? {
          $and: [
            { $or: access },
            { $or: [{ title: new RegExp(escapeRegExp(query), "i") }, { artist: new RegExp(escapeRegExp(query), "i") }] },
          ],
        }
      : { $or: access };

    const songs = await Song.find(filter)
      .select("title artist coverUrl fileUrl duration author visibility")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    return NextResponse.json({
      songs: songs.map((song) => ({
        id: String(song._id),
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        audioUrl: song.fileUrl,
        duration: song.duration ?? null,
      })),
    });
  } catch (error) {
    console.error("[PLAYLIST_SONG_SEARCH]", error);
    return NextResponse.json({ error: "Could not search songs." }, { status: 500 });
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}