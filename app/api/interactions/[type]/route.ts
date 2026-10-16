import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Song } from "@/lib/database/models/song";
import { Album } from "@/lib/database/models/album";
import { Video } from "@/lib/database/models/video";
import Beat from "@/lib/database/models/beat";

// ✅ Model map
const modelMap = { Song, Album, Video, Beat } as const;
type InteractionModel = keyof typeof modelMap;

function isInteractionModel(value: unknown): value is InteractionModel {
  return (
    typeof value === "string" &&
    Object.hasOwn(modelMap, value)
  );
}

// ✅ Use Next.js inferred context type — do NOT manually define RouteContext
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const { type } = await context.params;

  try {
    if (!["like", "share", "download", "view"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid interaction type" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user?._id) {
      return NextResponse.json(
        { success: false, error: "Sign in to interact" },
        { status: 401 }
      );
    }

    const body: { id?: unknown; model?: unknown } = await req.json();
    const { id, model } = body;
    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid media ID" },
        { status: 400 }
      );
    }
    if (!isInteractionModel(model)) {
      return NextResponse.json(
        { success: false, error: "Invalid media model" },
        { status: 400 }
      );
    }

    const Model = modelMap[model];
    await connectToDatabase();
    const doc = await Model.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: `${model} not found` }, { status: 404 });
    }

    const userId = new Types.ObjectId(String(user._id));
    const field = `${type}s`;

    if (!Array.isArray(doc[field])) {
      doc[field] = [];
    }

    const already = doc[field].some(
      (value: Types.ObjectId) => value.toString() === String(userId)
    );
    let updated = false;

    if (type === "like") {
      // ✅ Toggle like
      if (already) {
        doc[field] = doc[field].filter(
          (value: Types.ObjectId) => value.toString() !== String(userId)
        );
      } else {
        doc[field].push(userId);
      }
      updated = true;
    } else if (!already) {
      // ✅ Add once for other types
      doc[field].push(userId);
      updated = true;
    }

    if (updated) await doc.save();

    const counts = {
      likes: doc.likes?.length ?? 0,
      shares: doc.shares?.length ?? 0,
      downloads: doc.downloads?.length ?? 0,
      views: doc.views?.length ?? 0,
    };

    const userLiked = doc.likes?.some((u: any) => u.toString() === userId) ?? false;

    globalThis.io?.to(id).emit("interaction:update", {
      itemId: id,
      id,
      model,
      type,
      counts,
    });

    return NextResponse.json({ success: true, counts, userLiked });
  } catch (err) {
    console.error("Interaction error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
