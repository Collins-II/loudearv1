// app/api/interactions/comment/[commentId]/route.ts
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Comment } from "@/lib/database/models/comment";

const MAX_LENGTH = 1000;

type Params = { params: Promise<{ commentId: string }> };

async function loadOwnedComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!Types.ObjectId.isValid(commentId)) {
    return { error: NextResponse.json({ error: "Invalid comment" }, { status: 400 }) };
  }

  await connectToDatabase();
  const comment = await Comment.findById(commentId);
  if (!comment) {
    return { error: NextResponse.json({ error: "Comment not found" }, { status: 404 }) };
  }
  if (String(comment.user) !== String(user._id)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { comment };
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { commentId } = await params;
    const { comment, error } = await loadOwnedComment(commentId);
    if (error) return error;

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be 1-${MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    comment.content = content;
    await comment.save();

    globalThis.io
      ?.to(`${comment.targetModel}:${comment.targetId}`)
      .emit("comment:update", { id: commentId, content });

    return NextResponse.json({ success: true, content });
  } catch (err) {
    console.error("Error editing comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { commentId } = await params;
    const { comment, error } = await loadOwnedComment(commentId);
    if (error) return error;

    // Remove the comment together with its direct replies
    const replyIds = comment.replies ?? [];
    await Comment.deleteMany({ _id: { $in: [comment._id, ...replyIds] } });
    if (comment.parent) {
      await Comment.findByIdAndUpdate(comment.parent, {
        $pull: { replies: comment._id },
      });
    }

    const room = `${comment.targetModel}:${comment.targetId}`;
    globalThis.io?.to(room).emit("comment:delete", { id: commentId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
