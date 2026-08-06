import { connectToDatabase } from "@/lib/database";
import { IPlaylist, Playlist } from "@/lib/database/models/playlist";

/**
 * Fetch songs and format them for the DataTable
 */
export const getPlaylists = async () => {
  try {
    await connectToDatabase();
    
    const songs = await Playlist.find().lean<IPlaylist[]>();

    if (!songs?.length) return [];

    // ✅ Sanitize and normalize fields
    console.log("DATA_OBJECT", songs);
  } catch (error) {
    console.error("[GET_SONGS_ERR]", error);
    throw new Error("Failed to fetch songs");
  }
};
