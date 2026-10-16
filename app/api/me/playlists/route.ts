import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Playlist } from "@/lib/database/models/playlist";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to view your playlists." }, { status: 401 });

    await connectToDatabase();
    const playlists = await Playlist.find({ owner: user._id })
      .sort({ updatedAt: -1 })
      .populate({ path: "tracks.song", select: "title artist coverUrl" })
      .lean();
    const publicPlaylists = await Playlist.find({ visibility: "public", owner: { $ne: user._id } })
      .sort({ updatedAt: -1 })
      .limit(24)
      .populate("owner", "name stageName")
      .populate({ path: "tracks.song", select: "title artist coverUrl", match: { visibility: "public" } })
      .lean();

    return NextResponse.json({
      playlists: playlists.map((playlist) => ({
        id: String(playlist._id),
        name: playlist.name,
        description: playlist.description,
        visibility: playlist.visibility,
        updatedAt: playlist.updatedAt,
        tracks: playlist.tracks.flatMap((entry: { song: unknown }) => {
          if (!entry.song || typeof entry.song !== "object") return [];
          const song = entry.song as unknown as { _id: unknown; title: string; artist: string; coverUrl: string };
          return [{ id: String(song._id), title: song.title, artist: song.artist, coverUrl: song.coverUrl }];
        }),
      })),
      publicPlaylists: publicPlaylists.map((playlist: any) => ({
        id: String(playlist._id),
        name: playlist.name,
        description: playlist.description,
        visibility: playlist.visibility,
        ownerName: playlist.owner?.stageName || playlist.owner?.name || "LoudEar user",
        updatedAt: playlist.updatedAt,
        tracks: playlist.tracks.flatMap((entry: { song: unknown }) => {
          if (!entry.song || typeof entry.song !== "object") return [];
          const song = entry.song as { _id: unknown; title: string; artist: string; coverUrl: string };
          return [{ id: String(song._id), title: song.title, artist: song.artist, coverUrl: song.coverUrl }];
        }),
      })),
    });
  } catch (error) {
    console.error("[PLAYLIST_LIST]", error);
    return NextResponse.json({ error: "Could not load playlists." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to create a playlist." }, { status: 401 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Playlist names must be 1 to 100 characters." }, { status: 400 });
    }

    await connectToDatabase();
    const playlist = await Playlist.create({
      owner: user._id,
      name,
      description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
      visibility: "private",
      tracks: [],
    });

    return NextResponse.json({ playlist: { id: String(playlist._id), name: playlist.name } }, { status: 201 });
  } catch (error) {
    console.error("[PLAYLIST_CREATE]", error);
    return NextResponse.json({ error: "Could not create playlist." }, { status: 500 });
  }
}