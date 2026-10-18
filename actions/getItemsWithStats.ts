import { Types, Document, FlattenMaps } from "mongoose";
import { connectToDatabase } from "@/lib/database";
import { Comment } from "@/lib/database/models/comment";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";
import { ChartHistory, IChartHistory } from "@/lib/database/models/chartHistory";
import { IViewAnalytics, ViewAnalytics } from "@/lib/database/models/viewsAnalytics";
import { getViewCounts } from "@/lib/get-views-analytics";
import { updateChartHistory } from "@/lib/update-chart-history";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import User from "@/lib/database/models/user";
import Beat from "@/lib/database/models/beat";
import { Interaction } from "@/lib/database/models/interactions";
import { getCurrentUser } from "@/actions/getCurrentUser";
dayjs.extend(isoWeek);

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */
export type ItemType = "Song" | "Album" | "Video" | "Beat";
type InteractionType = "view" | "like" | "download" | "share" | "unlike";
export type ReactionType = "heart" | "fire" | "laugh" | "up" | "down";

export type ChartHistoryLean = FlattenMaps<IChartHistory> & {
  _id: Types.ObjectId;
  __v?: number;
};

export interface IInteractionDoc extends Document {
  _id: Types.ObjectId;
  likes: Types.ObjectId[];
  views: Types.ObjectId[];
  downloads: Types.ObjectId[];
  shares: Types.ObjectId[];
}

interface Author {
  _id: string;
  name: string;
  image: string;
  role: string;
  stan: number;
}

/* ------------------------------------------------------------------ */
/* COMMENT SERIALIZATION */
/* ------------------------------------------------------------------ */
export interface CommentSerialized {
  _id: string;
  user: { _id: string; name: string; image?: string };
  content: string;
  targetModel: ItemType | "Post";
  targetId: string;
  parent?: string | null;
  likes: string[];
  likeCount: number;
  replyCount: number;
  reactions: Record<ReactionType, number>;
  replies?: CommentSerialized[];
  createdAt: string;
  updatedAt: string;
}

function serializeComments(comments: unknown[] = []): CommentSerialized[] {
  return (comments as any[]).map((c) => ({
    _id: String(c._id ?? ""),
    user: {
      _id: String(c.user?._id ?? ""),
      name: c.user?.name ?? "Unknown",
      image: c.user?.image ?? undefined,
    },
    content: c.content ?? "",
    targetModel: c.targetModel ?? "Song",
    targetId: String(c.targetId ?? ""),
    parent: c.parent ? String(c.parent) : null,
    likes: (c.likes ?? []).map((id: any) => String(id)),
    likeCount: Array.isArray(c.likes) ? c.likes.length : 0,
    replyCount: Array.isArray(c.replies) ? c.replies.length : 0,
    reactions: c.reactions ?? {
      heart: 0,
      fire: 0,
      laugh: 0,
      up: 0,
      down: 0,
    },
    replies: c.replies ? serializeComments(c.replies) : [],
    createdAt: c.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: c.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* BASE + ITEM SERIALIZATION */
/* ------------------------------------------------------------------ */
export interface BaseSerialized {
  _id: string;
  author: Author;
  artist: string;
  features: string[];
  title: string;
  genre: string;
  description?: string;
  tags: string[];
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  totalViews: number;
  viewCount: number;
  totalPlays: number;
  weeklyPlays: number;
  likeCount: number;
  downloadCount: number;
  shareCount: number;
  commentCount: number;
  latestComments: CommentSerialized[];
}

export interface ChartHistoryEntry {
  week: string;
  position: number;
  peak?: number;
  weeksOn?: number;
}

export interface SongSerialized extends BaseSerialized {
  album?: string | null;
  language?: string | null;
  releaseDate?: string | null;
  fileUrl: string;
  trendingPosition?: number | null;
  chartPosition?: number | null;
  chartHistory?: ChartHistoryEntry[];
  trendingScore?: number | null;
  previousViewCount?: number;
}

export interface AlbumSerialized extends BaseSerialized {
  curator?: string;
  songs?: SongSerialized[];
  trendingPosition?: number | null;
  chartPosition?: number | null;
  chartHistory?: ChartHistoryEntry[];
  trendingScore?: number | null;
  previousViewCount?: number;
}

export interface VideoSerialized extends BaseSerialized {
  fileUrl: string;
  videographer: string;
  previousViewCount?: number;
  trendingPosition?: number | null;
  chartPosition?: number | null;
  chartHistory?: ChartHistoryEntry[];
  trendingScore?: number | null;
  releaseDate?: string | null;
}

export interface LicenseTier {
  id: string;
  title: string;
  price: number;
  description?: string;
  usageRights: string[];
}

export interface BeatSerialized extends BaseSerialized {
  bpm: number | null;
  key: string | null;
  producerName: string;
  visibility: "public" | "private" | "unlisted";
  audioSnippet: string;
  previewUrl: string | null;
  licenses: LicenseTier[];
  releaseDate?: string | null;
  trendingPosition?: number | null;
  chartPosition?: number | null;
  trendingScore?: number | null;
  chartHistory?: ChartHistoryEntry[];
  previousViewCount?: number;
}


/* ------------------------------------------------------------------ */
/* SERIALIZE ITEM */
/* ------------------------------------------------------------------ */
export async function serializeItem<T extends ItemType>(
  doc: Record<string, any>,
  type: T,
  includeAnalytics = true
): Promise<
  T extends "Song"
    ? SongSerialized
    : T extends "Album"
    ? AlbumSerialized
    : T extends "Video"
    ? VideoSerialized :
    BeatSerialized | null
> {
  if (!doc) return null as any;

  const base: BaseSerialized = {
    _id: String(doc._id),
    author: {
    _id: String(doc.author?._id ?? ""),
    name: doc.author?.name ?? "Unknown",
    image: doc.author?.image ?? "",
    role: doc.author?.role ?? "artist",
    stan: typeof doc.author?.stanCount === "number"
      ? doc.author.stanCount
      : Array.isArray(doc.author?.stan)
      ? doc.author.stan.length
      : 0,
    },
    artist: doc.artist ?? "Unknown Artist",
    title: doc.title ?? "Untitled",
    features: Array.isArray(doc.features) ? doc.features : [],
    genre: doc.genre ?? "Unknown",
    description: doc.description ?? "",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    coverUrl: doc.coverUrl ?? doc.thumbnailUrl ?? doc.image ?? "",
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    totalViews: 0,
    viewCount: 0,
    totalPlays: 0,
    weeklyPlays: 0,
    likeCount: doc.likes?.length ?? doc.likeCount ?? 0,
    downloadCount: doc.downloads?.length ?? doc.downloadCount ?? 0,
    shareCount: doc.shares?.length ?? doc.shareCount ?? 0,
    commentCount: doc.commentCount ?? 0,
    latestComments: serializeComments(doc.latestComments ?? []),
  };

  if (includeAnalytics && doc._id) {
    try {
      const { totalViews, previousViewCount } = await getViewCounts(doc._id, type);
      base.viewCount = totalViews;
      (base as any).previousViewCount = previousViewCount;
    } catch (err) {
      console.error(`Failed to load view analytics for ${type} ${doc._id}`, err);
    }
  } else {
    base.viewCount = doc.views?.length ?? doc.viewCount ?? 0;
  }

  if (type === "Song")
    return {
      ...base,
      album: doc.album ?? null,
      language: doc.language ?? null,
      releaseDate: doc.releaseDate ?? null,
      fileUrl: doc.fileUrl ?? "",
    } as any;

  if (type === "Album") {
    const songs =
      Array.isArray(doc.songs) && doc.songs.length > 0
        ? await Promise.all(doc.songs.map((s: any) => serializeItem(s, "Song", false)))
        : [];
    return { ...base, songs } as any;
  }

  if (type === "Beat") {
    const licenseTiers = Array.isArray(doc.licenseTiers) ? doc.licenseTiers : [];
    return {
      ...base,
      producerName: doc.producerName ?? doc.author?.stageName ?? doc.author?.name ?? "Unknown producer",
      visibility: doc.visibility ?? (doc.published ? "public" : "private"),
      bpm: doc.bpm ?? null,
      key: doc.key ?? null,
      producer: doc.author ?? null,
      audioSnippet: doc.previewUrl ?? "",
      previewUrl: doc.previewUrl ?? null,
      licenses: licenseTiers.map((tier: Record<string, unknown>) => ({
        id: String(tier.id ?? ""),
        title: String(tier.title ?? tier.id ?? "Beat license"),
        price: tier.price ?? 0,
        description: typeof tier.description === "string" ? tier.description : "",
        usageRights: Array.isArray(tier.usageRights) ? tier.usageRights : [],
      })),
      releaseDate: doc.createdAt?.toISOString?.() ?? null,
    } as any;
  }


  return {
    ...base,
    fileUrl: doc.videoUrl ?? doc.fileUrl ?? "",
    videographer: doc.videographer ?? "Unknown",
    releaseDate: doc.releaseDate ?? null,
  } as any;
}


export const serializeSong = async (doc: unknown): Promise<SongSerialized> => {
  return serializeItem(doc as Record<string, any>, "Song") as Promise<SongSerialized>;
};

export const serializeAlbum = async (doc: unknown): Promise<AlbumSerialized> => {
  return serializeItem(doc as Record<string, any>, "Album") as Promise<AlbumSerialized>;
};

export const serializeVideo = async (doc: unknown): Promise<VideoSerialized | null> => {
  return serializeItem(doc as Record<string, any>, "Video") as Promise<VideoSerialized | null>;
};

export const serializeBeat = async (doc: unknown): Promise<BeatSerialized> => {
  return serializeItem(doc as Record<string, any>, "Beat") as Promise<BeatSerialized>;
};


/* ------------------------------------------------------------------ */
/* INTERACTIONS + ANALYTICS */
/* ------------------------------------------------------------------ */
export async function incrementInteraction(
  id: string,
  model: ItemType,
  type: InteractionType,
  userId?: string
) {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid ObjectId");
  await connectToDatabase();

  const Model =
  model === "Song"
    ? Song
    : model === "Album"
    ? Album
    : model === "Video"
    ? Video
    : Beat; // NEW

  const fieldMap: Record<Exclude<InteractionType, "unlike">, keyof IInteractionDoc> = {
    view: "views",
    like: "likes",
    download: "downloads",
    share: "shares",
  };

  // Mirror each action into the Interaction collection that feeds the studio charts.
  // Beats are not a valid Interaction target, and events need a user.
  let actorId = userId;
  if (!actorId && type === "view") {
    const viewer = await getCurrentUser().catch(() => null);
    if (viewer?._id) actorId = String(viewer._id);
  }
  const trackable = model !== "Beat" && !!actorId && Types.ObjectId.isValid(actorId);
  const logInteraction = async (interactionType: "view" | "like" | "download" | "share") => {
    if (!trackable) return;
    try {
      await Interaction.create({
        user: new Types.ObjectId(actorId),
        targetModel: model,
        targetId: new Types.ObjectId(id),
        type: interactionType,
      });
    } catch (err) {
      console.error("[INTERACTION_LOG_ERROR]", err);
    }
  };

  if (type === "unlike") {
    await Model.updateOne({ _id: id }, { $pull: { likes: new Types.ObjectId(userId) } });
    if (trackable) {
      await Interaction.deleteMany({
        user: new Types.ObjectId(userId),
        targetModel: model,
        targetId: new Types.ObjectId(id),
        type: "like",
      });
    }
    return { success: true, action: "unliked" as const };
  }

  if (type === "view") {
    const nowWeek = `${dayjs().year()}-W${String(dayjs().isoWeek()).padStart(2, "0")}`;
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ObjectId");
      await Model.updateOne(
        { _id: id },
        { $addToSet: { views: new Types.ObjectId(userId) } }
      );
    }
    await logInteraction("view");
    await ViewAnalytics.updateOne(
      { itemId: id, contentModel: model, week: nowWeek },
      { $inc: { views: 1 } },
      { upsert: true }
    );
    await updateChartHistory(model.toLowerCase() + "s" as "songs" | "albums" | "videos");
    return { success: true, action: "view" as const };
  }

  const field = fieldMap[type];
  if (!field) throw new Error(`Unsupported interaction type: ${type}`);

  const updated = await Model.updateOne({ _id: id }, { $addToSet: { [field]: new Types.ObjectId(userId) } });
  // addToSet is idempotent per user, so only log when the set actually changed
  if (updated.modifiedCount > 0) await logInteraction(type as "like" | "download" | "share");

  if (["like", "share", "download"].includes(type)) {
    if (Math.random() < 0.1) {
      await updateChartHistory(model.toLowerCase() + "s" as "songs" | "albums" | "videos");
    }
  }

  return { success: true, action: type as Exclude<InteractionType, "unlike"> };
}

/* ------------------------------------------------------------------ */
/* DYNAMIC STATS FETCHER */
/* ------------------------------------------------------------------ */
export async function getItemWithStats(model: ItemType, id: string) {
  try {
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid ObjectId");
    await connectToDatabase();

    const Model =
  model === "Song"
    ? Song
    : model === "Album"
    ? Album
    : model === "Video"
    ? Video
    : Beat;


    let query = Model.findById(id).populate({
      path: "author",
      select: "_id name image stageName role stan",
    });
    if (model === "Album") {
      query = query.populate({
        path: "songs",
        select: "_id title artist coverUrl fileUrl views likes downloads shares genre releaseDate",
      });
    }


    const doc = await query.lean<Record<string, any>>();
    if (!doc) return null;

    const [commentCountRes, latestCommentsRes] = await Promise.allSettled([
      Comment.countDocuments({ targetId: id, targetModel: model }),
      Comment.find({ targetId: id, targetModel: model, parent: null })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate([
          { path: "user", select: "_id name image" },
          {
            path: "replies",
            populate: { path: "user", select: "_id name image" },
            options: { sort: { createdAt: 1 }, limit: 5 },
          },
        ])
        .lean(),
    ]);

    const commentCount =
      commentCountRes.status === "fulfilled" ? commentCountRes.value : 0;
    const latestComments =
      latestCommentsRes.status === "fulfilled"
        ? serializeComments(latestCommentsRes.value)
        : [];

    const sinceDate = dayjs().subtract(365, "day").toDate();
    const scored = await Model.aggregate<{
      _id: Types.ObjectId;
      trendingScore: number;
    }>([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $project: {
          _id: 1,
          trendingScore: {
            $add: [
              { $size: { $ifNull: ["$views", []] } },
              { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 2] },
              { $multiply: [{ $size: { $ifNull: ["$shares", []] } }, 3] },
              { $multiply: [{ $size: { $ifNull: ["$downloads", []] } }, 1.5] },
            ],
          },
        },
      },
      { $sort: { trendingScore: -1, _id: 1 } },
    ]);

    const trendingIndex = scored.findIndex((s) => String(s._id) === id);
    const trendingPosition = trendingIndex >= 0 ? trendingIndex + 1 : null;
    const trendingScore =
      trendingIndex >= 0 ? scored[trendingIndex].trendingScore : null;

    const currentWeek = `${dayjs().year()}-W${String(dayjs().isoWeek()).padStart(2, "0")}`;
    const chartSnapshot = await ChartHistory.findOne({
      category: model.toLowerCase() + "s",
      week: currentWeek,
    })
      .select("items week category")
      .lean<ChartHistoryLean | null>();

    const chartPosition =
      chartSnapshot?.items?.find((i) => String(i.itemId) === id)?.rank ?? null;

    const chartHistoryDocs = await ChartHistory.find({
      "items.itemId": new Types.ObjectId(id),
    })
      .sort({ week: -1 })
      .limit(12)
      .lean<ChartHistoryLean[]>();

    const chartHistory = chartHistoryDocs
      .map((snap) => {
        const item = snap.items.find((it) => String(it.itemId) === id);
        if (!item) return undefined;
        return {
          week: snap.week,
          position: item.rank,
          peak: item.peak ?? item.rank,
          weeksOn: item.weeksOn ?? 1,
        } as ChartHistoryEntry;
      })
      .filter((entry): entry is ChartHistoryEntry => Boolean(entry));

    const thisWeek = `${dayjs().year()}-W${String(dayjs().isoWeek()).padStart(2, "0")}`;
    const prevWeek = `${dayjs().subtract(1, "week").year()}-W${String(
      dayjs().subtract(1, "week").isoWeek()
    ).padStart(2, "0")}`;

    const { totalViews } = await getViewCounts(id, model)

    const albumTrackIds =
      model === "Album" && Array.isArray(doc.songs)
        ? doc.songs
            .map((song: Types.ObjectId | { _id: Types.ObjectId }) =>
              String("_id" in song ? song._id : song)
            )
            .filter(Types.ObjectId.isValid)
            .map((songId: string) => new Types.ObjectId(songId))
        : [];
    const playMatch =
      model === "Album" && albumTrackIds.length > 0
        ? {
            $or: [
              { targetModel: "Album", targetId: new Types.ObjectId(id) },
              { targetModel: "Song", targetId: { $in: albumTrackIds } },
            ],
          }
        : { targetModel: model, targetId: new Types.ObjectId(id) };

    const [currentWeekData, prevWeekData, totalPlays, weeklyPlays] = await Promise.all([
      ViewAnalytics.findOne<IViewAnalytics>({
        itemId: id,
        contentModel: model,
        week: thisWeek,
      }).lean(),
      ViewAnalytics.findOne<IViewAnalytics>({
        itemId: id,
        contentModel: model,
        week: prevWeek,
      }).lean(),
      Interaction.countDocuments({ ...playMatch, type: "play" }),
      Interaction.countDocuments({
        ...playMatch,
        type: "play",
        createdAt: { $gte: dayjs().startOf("isoWeek").toDate() },
      }),
    ]);

    const currentViewCount = currentWeekData?.views ?? 0;
    const previousViewCount = prevWeekData?.views ?? 0;

// ✅ Compute artist's total stans (followers)
let stanCount = 0;
if (doc.author?._id) {
  stanCount = await User.countDocuments({ stan: doc.author._id });
}

const serialized = (await serializeItem(
  { ...doc, commentCount, latestComments, author: { ...doc.author, stanCount } },
  model,
  false
)) as SongSerialized | AlbumSerialized | VideoSerialized | BeatSerialized;


    return {
      ...serialized,
      trendingPosition,
      chartPosition,
      chartHistory,
      trendingScore,
      totalViews,
      viewCount: currentViewCount,
      previousViewCount,
      totalPlays,
      weeklyPlays,
    };
  } catch (error: unknown) {
    console.error("GET_ITEMS_ERROR", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* SHORTCUTS */
/* ------------------------------------------------------------------ */
export const getBeatWithStats = (id: string) => getItemWithStats("Beat", id);
export const getSongWithStats = (id: string) => getItemWithStats("Song", id);
export const getAlbumWithStats = (id: string) => getItemWithStats("Album", id);
export const getVideoWithStats = (id: string) => getItemWithStats("Video", id);
