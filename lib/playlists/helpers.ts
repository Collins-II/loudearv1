// lib/playlists/helpers.ts

import { Playlist } from "@/lib/database/models/playlist";

export async function upsertPlaylist(
  title: string,
  payload: any
) {
  return Playlist.findOneAndUpdate(
    { title },
    payload,
    {
      new: true,
      upsert: true,
    }
  );
}