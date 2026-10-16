// app/api/optimize/route.ts
import { connectToDatabase } from "@/lib/database";
import { Campaign } from "@/lib/database/models/campaign";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";

/**
 * Simple optimizer endpoint: you can call it from a CRON worker or the dashboard
 * It runs a set of heuristics and updates campaigns: auto-boost or pause.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const requestSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = await getCurrentUser();
  const isCron = Boolean(cronSecret && requestSecret === cronSecret);
  if (!isCron && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const body = await req.json(); // { campaignId? }
  const filter = body.campaignId ? { _id: body.campaignId } : { status: "running" };
  const campaigns = await Campaign.find(isCron ? filter : { ...filter, artistId: user?._id });
  for (const c of campaigns) {
    const ims = c.performance.impressions || 0;
    const clicks = c.performance.clicks || 0;
    const ctr = clicks / Math.max(1, ims);
    if (c.schedule?.autoStop && ims >= 1000 && ctr < 0.002) {
      c.status = "paused";
      await c.save();
    }
  }
  return NextResponse.json({ ok: true, checked: campaigns.length });
}
