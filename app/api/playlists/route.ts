import { NextResponse } from "next/server";
import { fetchPlaylists } from "@/lib/playlists";

export async function GET(req: Request) {
  const { searchParams } =
    new URL(req.url);

  const mood =
    searchParams.get("mood") || undefined;

  const region =
    searchParams.get("region") || undefined;

  const sort =
    searchParams.get("sort") || undefined;

  const playlists =
    await fetchPlaylists({
      mood,
      region,
      sort,
      limit: 50,
    });

  return NextResponse.json(playlists);
}