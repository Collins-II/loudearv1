import { Types } from "mongoose";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";
import Beat from "@/lib/database/models/beat";

const MODELS = { Song, Album, Video, Beat } as const;
export type MediaModelName = keyof typeof MODELS;

export function isMediaModel(value: unknown): value is MediaModelName {
  return typeof value === "string" && Object.hasOwn(MODELS, value);
}

// Listeners may only interact with public media; authors keep access to their own uploads.
export function canAccessMedia(
  media: { visibility?: string; author?: unknown } | null | undefined,
  userId?: string | null
) {
  if (!media) return false;
  if (media.visibility === "public") return true;
  return Boolean(userId && media.author && String(media.author) === String(userId));
}

export async function loadAccessibleMedia(model: MediaModelName, id: string, userId?: string | null) {
  if (!Types.ObjectId.isValid(id)) return null;
  const media = await (MODELS[model] as any).findById(id).select("visibility author").lean();
  return canAccessMedia(media, userId) ? media : null;
}
