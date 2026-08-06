import {
  regenerateAutoPlaylists
}
from "@/lib/playlists/generator";

export async function GET() {
  await regenerateAutoPlaylists();

  return Response.json({
    success: true,
  });
}