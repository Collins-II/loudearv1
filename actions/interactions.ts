"use server";

import { incrementInteraction } from "@/actions/getItemsWithStats";

export async function handleInteraction(
  id: string,
  model: "Song" | "Album" | "Video",
  type: "view" | "like" | "download" | "share",
  userId?: string
) {
  try {
    await incrementInteraction(id, model, type, userId);
    return { success: true };
  } catch (err: any) {
    console.error("[Interaction Error]", err);
    return { success: false, error: err.message };
  }
}
