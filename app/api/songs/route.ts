import { connectToDatabase } from "@/lib/database";
import { Song } from "@/lib/database/models/song";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const filter = { visibility: "public" };
    const [songs, total] = await Promise.all([
      Song.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Song.countDocuments(filter),
    ]);

    return NextResponse.json(
      { songs, page, limit, total, hasMore: page * limit < total },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("[SONGS_GET]", error);
    return NextResponse.json({ error: "Failed to load songs" }, { status: 500 });
  }
}
