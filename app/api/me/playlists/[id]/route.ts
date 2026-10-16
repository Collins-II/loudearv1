import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Playlist } from "@/lib/database/models/playlist";
import { Song } from "@/lib/database/models/song";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });

    const playlist = await Playlist.findById(id).populate("owner", "name stageName").lean();
    if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    const playlistRecord = playlist as unknown as {
      _id: unknown;
      owner: { _id: unknown; name?: string; stageName?: string };
      name: string;
      description: string;
      visibility: "public" | "unlisted" | "private";
      tracks: { song: unknown; addedAt: Date }[];
      updatedAt: Date;
    };

    const user = await getCurrentUser();
    const populatedOwner = playlistRecord.owner;
    const isOwner = Boolean(user && String(populatedOwner._id) === user._id);
    if (playlistRecord.visibility === "private" && !isOwner) {
      return NextResponse.json({ error: "This playlist is private." }, { status: 403 });
    }

    const songIds = playlistRecord.tracks.map((entry) => entry.song);
    const songs = await Song.find({
      _id: { $in: songIds },
      $or: [{ visibility: "public" }, ...(user ? [{ author: user._id }] : [])],
    })
      .select("title artist coverUrl fileUrl duration author")
      .lean();
    const songMap = new Map(songs.map((song) => [String(song._id), song]));
    const tracks = playlistRecord.tracks.flatMap((entry) => {
      const song = songMap.get(String(entry.song));
      if (!song) return [];
      return [{
        id: String(song._id),
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        audioUrl: song.fileUrl,
        duration: song.duration ?? null,
        addedAt: entry.addedAt,
      }];
    });
    const owner = playlistRecord.owner;

    return NextResponse.json({
      playlist: {
        id: String(playlistRecord._id),
        name: playlistRecord.name,
        description: playlistRecord.description,
        visibility: playlistRecord.visibility,
        ownerId: String(owner._id),
        ownerName: owner.stageName || owner.name || "LoudEar user",
        updatedAt: playlistRecord.updatedAt,
        isOwner,
      },
      tracks,
    });
  } catch (error) {
    console.error("[PLAYLIST_GET]", error);
    return NextResponse.json({ error: "Could not load this playlist." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to edit playlists." }, { status: 401 });
    await connectToDatabase();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    const playlist = await Playlist.findOne({ _id: id, owner: user._id });
    if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });

    const body = await request.json();
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
        return NextResponse.json({ error: "Playlist names must be 1 to 100 characters." }, { status: 400 });
      }
      playlist.name = body.name.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== "string") return NextResponse.json({ error: "Description must be text." }, { status: 400 });
      playlist.description = body.description.trim().slice(0, 500);
    }
    if (body.visibility !== undefined) {
      if (!["public", "unlisted", "private"].includes(body.visibility)) {
        return NextResponse.json({ error: "Choose a valid visibility setting." }, { status: 400 });
      }
      playlist.visibility = body.visibility;
    }
    if (body.trackIds !== undefined) {
      if (!Array.isArray(body.trackIds) || body.trackIds.length > 500 || body.trackIds.some((trackId: unknown) => typeof trackId !== "string" || !Types.ObjectId.isValid(trackId))) {
        return NextResponse.json({ error: "Playlist tracks are invalid." }, { status: 400 });
      }
      const trackIds = [...new Set(body.trackIds as string[])];
      const allowedSongs = await Song.find({
        _id: { $in: trackIds },
        $or: [{ visibility: "public" }, { author: user._id }],
      }).select("_id").lean();
      if (allowedSongs.length !== trackIds.length) {
        return NextResponse.json({ error: "One or more songs cannot be added to this playlist." }, { status: 403 });
      }
      const existingDates = new Map(playlist.tracks.map((track: { song: Types.ObjectId; addedAt: Date }) => [String(track.song), track.addedAt]));
      playlist.tracks = trackIds.map((song) => ({
        song: new Types.ObjectId(song),
        addedAt: existingDates.get(song) || new Date(),
      })) as typeof playlist.tracks;
    }

    if (playlist.visibility === "public") {
      const publicTrackCount = await Song.countDocuments({
        _id: { $in: playlist.tracks.map((track: { song: Types.ObjectId }) => track.song) },
        visibility: "public",
      });
      if (publicTrackCount !== playlist.tracks.length) {
        return NextResponse.json({ error: "Remove private tracks before publishing this playlist." }, { status: 400 });
      }
    }

    await playlist.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PLAYLIST_UPDATE]", error);
    return NextResponse.json({ error: "Could not update this playlist." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to delete playlists." }, { status: 401 });
    await connectToDatabase();
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });

    const deleted = await Playlist.findOneAndDelete({ _id: id, owner: user._id });
    if (!deleted) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PLAYLIST_DELETE]", error);
    return NextResponse.json({ error: "Could not delete this playlist." }, { status: 500 });
  }
}