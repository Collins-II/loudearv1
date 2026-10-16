// app/api/interactions/comment-reaction/route.ts
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Comment, type ReactionType } from "@/lib/database/models/comment";

const REACTIONS: ReactionType[] = ["heart", "fire", "laugh", "up", "down"];

type LogEntry = { user: Types.ObjectId; type: ReactionType };

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    const type = body?.type as ReactionType;

    if (!Types.ObjectId.isValid(id) || !REACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    await connectToDatabase();

    const comment = await Comment.findById(id).select("+reactionLog");
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const log: LogEntry[] = comment.reactionLog ?? [];
    const existing = log.find((entry) => String(entry.user) === String(user._id));
    const counts: Record<ReactionType, number> = {
      heart: comment.reactions?.heart ?? 0,
      fire: comment.reactions?.fire ?? 0,
      laugh: comment.reactions?.laugh ?? 0,
      up: comment.reactions?.up ?? 0,
      down: comment.reactions?.down ?? 0,
    };

    // One reaction per user: same type toggles off, a different type switches
    let nextLog = log;
    if (existing) {
      counts[existing.type] = Math.max(0, counts[existing.type] - 1);
      nextLog = log.filter((entry) => String(entry.user) !== String(user._id));
    }
    if (!existing || existing.type !== type) {
      counts[type] += 1;
      nextLog = [...nextLog, { user: new Types.ObjectId(user._id), type }];
    }

    comment.reactionLog = nextLog;
    comment.reactions = counts;
    await comment.save();

    globalThis.io
      ?.to(`${comment.targetModel}:${comment.targetId}`)
      .emit("comment:reaction", { commentId: id, reactions: counts });

    return NextResponse.json({ success: true, reactions: counts });
  } catch (err) {
    console.error("Error updating comment reaction:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
