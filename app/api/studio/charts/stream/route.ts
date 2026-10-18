import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { Song } from "@/lib/database/models/song";
import { Video } from "@/lib/database/models/video";
import { Album } from "@/lib/database/models/album";
import { Interaction } from "@/lib/database/models/interactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 2000;
const MODELS = [
  { key: "Song", model: Song },
  { key: "Video", model: Video },
  { key: "Album", model: Album },
] as const;

export async function GET(req: Request) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user?._id) return new Response("Unauthorized", { status: 401 });

  const titles = new Map<string, { category: string; title: string }>();
  const idsByCategory: Record<string, unknown[]> = {};
  const loadMedia = async () => {
    for (const { key, model } of MODELS) {
      const items: any[] = await (model as any).find({ author: user._id }).select("title").lean();
      idsByCategory[key] = items.map((i) => i._id);
      for (const i of items) titles.set(String(i._id), { category: key, title: i.title });
    }
  };
  await loadMedia();

  const encoder = new TextEncoder();
  let cursor = new Date();
  let timer: ReturnType<typeof setInterval> | undefined;
  let tickCount = 0;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const close = () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", close);
      send("ready", { at: cursor.toISOString() });

      let busy = false;
      timer = setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          // Refresh media list occasionally so newly uploaded items are included
          if (++tickCount % 30 === 0) await loadMedia();
          const from = cursor;
          const to = new Date();
          const or = MODELS.filter((m) => idsByCategory[m.key]?.length).map((m) => ({
            targetModel: m.key,
            targetId: { $in: idsByCategory[m.key] },
          }));
          if (or.length) {
            const rows: any[] = await Interaction.find({ $or: or, createdAt: { $gt: from, $lte: to } })
              .select("targetModel targetId type createdAt")
              .sort({ createdAt: 1 })
              .limit(200)
              .lean();
            if (rows.length) {
              send(
                "interactions",
                rows.map((r) => ({
                  id: String(r._id),
                  category: r.targetModel,
                  type: r.type,
                  title: titles.get(String(r.targetId))?.title ?? "Untitled",
                  at: new Date(r.createdAt).toISOString(),
                }))
              );
            }
          }
          cursor = to;
          if (tickCount % 7 === 0) send("ping", {});
        } catch (err) {
          console.error("[STUDIO_CHARTS_STREAM_ERROR]", err);
        } finally {
          busy = false;
        }
      }, POLL_MS);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
