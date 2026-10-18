// app/api/interactions/comment/route.ts
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Comment } from "@/lib/database/models/comment";
import { Interaction } from "@/lib/database/models/interactions";
import { loadAccessibleMedia } from "@/lib/media-access";

const MODELS = ["Song", "Album", "Video", "Post"] as const;
const MAX_LENGTH = 1000;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    const model = body?.model;
    const parent = body?.parent ?? null;
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!MODELS.includes(model) || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }
    if (!content || content.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be 1-${MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    if (model !== "Post" && !(await loadAccessibleMedia(model, id, String(user._id)))) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (parent) {
      const parentComment = Types.ObjectId.isValid(parent)
        ? await Comment.findOne({ _id: parent, targetModel: model, targetId: id })
            .select("_id")
            .lean()
        : null;
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const newComment = await Comment.create({
      user: user._id,
      targetModel: model,
      targetId: id,
      parent: parent || null,
      content,
    });

    if (parent) {
      await Comment.findByIdAndUpdate(parent, {
        $push: { replies: newComment._id },
      });
    }

    // Feed the studio charts (Post comments aren't chartable media)
    if (model !== "Post") {
      await Interaction.create({
        user: user._id,
        targetModel: model,
        targetId: id,
        type: "comment",
        metadata: { commentId: String(newComment._id) },
      }).catch((err: unknown) => console.error("[INTERACTION_LOG_ERROR]", err));
    }

    const populated = await Comment.findById(newComment._id)
      .populate("user", "name image")
      .lean();

    const room = `${model}:${id}`;
    globalThis.io?.to(room).emit("comment:new", {
      room,
      comment: populated,
      parent: parent || null,
    });

    return NextResponse.json({ success: true, comment: populated });
  } catch (err) {
    console.error("Error adding comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
