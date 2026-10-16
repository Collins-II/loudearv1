import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Campaign } from "@/lib/database/models/campaign";
import CampaignEvent from "@/lib/database/models/campaign-event";
import Transaction from "@/lib/database/models/transactions";
import User from "@/lib/database/models/user";
import crypto from "crypto";

const CPM_MINOR = Number(process.env.CAMPAIGN_CPM_MINOR ?? 2500);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const viewer = await getCurrentUser();
    if (!viewer?._id) return NextResponse.json({ error: "Sign in to measure campaign engagement" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
    const { eventId, eventExpiresAt, eventToken, type } = await req.json();
    if (typeof eventId !== "string" || eventId.length < 8 || eventId.length > 100 || !Number.isFinite(eventExpiresAt) || !["impression", "click"].includes(type)) {
      return NextResponse.json({ error: "Invalid campaign event" }, { status: 400 });
    }
    const eventSecret = process.env.CAMPAIGN_EVENT_SECRET || process.env.NEXT_AUTH_SECRET;
    if (!eventSecret || typeof eventToken !== "string" || eventExpiresAt < Date.now() || eventExpiresAt > Date.now() + 5 * 60 * 1000) {
      return NextResponse.json({ error: "Campaign event ticket expired or invalid" }, { status: 403 });
    }
    const signedPayload = `${id}:${viewer._id}:${eventId}:${eventExpiresAt}`;
    const expectedToken = crypto.createHmac("sha256", eventSecret).update(signedPayload).digest();
    let providedToken: Buffer;
    try { providedToken = Buffer.from(eventToken, "hex"); } catch { return NextResponse.json({ error: "Invalid campaign event ticket" }, { status: 403 }); }
    if (providedToken.length !== expectedToken.length || !crypto.timingSafeEqual(providedToken, expectedToken)) {
      return NextResponse.json({ error: "Invalid campaign event ticket" }, { status: 403 });
    }
    if (!Number.isSafeInteger(CPM_MINOR) || CPM_MINOR <= 0) return NextResponse.json({ error: "Invalid CPM configuration" }, { status: 503 });

    const countryHeader = (process.env.GEOIP_COUNTRY_HEADER || "x-vercel-ip-country").toLowerCase();
    const rawCountry = req.headers.get(countryHeader)?.toUpperCase();
    const country = rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
    const day = new Date().toISOString().slice(0, 10);
    const session = await mongoose.startSession();
    let output: { counted: boolean; status?: string; impressions?: number; clicks?: number } = { counted: false };

    try {
      await session.withTransaction(async () => {
        const campaign = await Campaign.findOne({ _id: id, status: "running", "targeting.platforms": "app" }).session(session);
        if (!campaign) throw Object.assign(new Error("Campaign is not active"), { statusCode: 409 });
        if (String(campaign.artistId) === String(viewer._id)) {
          throw Object.assign(new Error("Campaign owners cannot generate billable events for their own campaign"), { statusCode: 403 });
        }
        const countryHeader = (process.env.GEOIP_COUNTRY_HEADER || "x-vercel-ip-country").toLowerCase();
        const rawCountry = req.headers.get(countryHeader)?.toUpperCase();
        if (rawCountry && campaign.targeting?.countries?.length && !campaign.targeting.countries.includes(rawCountry)) {
          throw Object.assign(new Error("Campaign is not targeted to this region"), { statusCode: 403 });
        }

        if (type === "click") {
          await CampaignEvent.create([{
            campaignId: campaign._id,
            eventId,
            type,
            viewerId: viewer._id,
            day,
            country,
          }], { session });
          campaign.performance.clicks += 1;
          await campaign.save({ session });
          output = { counted: true, clicks: campaign.performance.clicks };
          return;
        }

        const billing = campaign.billing ?? {};
        const reservedMinor = Number(billing.reservedMinor ?? 0);
        const spentMinor = Number(billing.spentMinor ?? 0);
        const lockedMinor = Number(billing.lockedMinor ?? 0);
        if (lockedMinor <= 0) throw Object.assign(new Error("Campaign budget is exhausted"), { statusCode: 409 });

        const dailyCapMinor = campaign.dailyCap ? Math.round(campaign.dailyCap * 100) : 0;
        const impressionsToday = await CampaignEvent.countDocuments({ campaignId: campaign._id, day, type: "impression" }).session(session);
        const spentTodayMinor = Math.floor((impressionsToday * CPM_MINOR) / 1000);
        if (dailyCapMinor > 0 && spentTodayMinor >= dailyCapMinor) {
          throw Object.assign(new Error("Campaign daily cap reached"), { statusCode: 429 });
        }

        const impressionCount = Number(billing.impressionCount ?? 0) + 1;
        const cappedSpend = Math.min(reservedMinor, Math.floor((impressionCount * CPM_MINOR) / 1000));
        const chargeMinor = Math.max(0, Math.min(cappedSpend - spentMinor, lockedMinor, dailyCapMinor > 0 ? dailyCapMinor - spentTodayMinor : lockedMinor));
        const remainingMinor = lockedMinor - chargeMinor;
        await CampaignEvent.create([{
          campaignId: campaign._id,
          eventId,
          type,
          viewerId: viewer._id,
          day,
          country,
        }], { session });
        if (chargeMinor > 0) {
          await User.updateOne({ _id: campaign.artistId }, [{
            $set: { "wallet.locked": { $cond: [{ $isNumber: "$wallet.locked" }, "$wallet.locked", 0] } },
          }], { session });
          const debit = await User.updateOne({ _id: campaign.artistId, "wallet.locked": { $gte: chargeMinor } }, {
            $inc: { "wallet.locked": -chargeMinor },
          }, { session });
          if (debit.modifiedCount !== 1) throw new Error("Unable to settle campaign spend");
        }

        campaign.performance.impressions += 1;
        campaign.performance.cost += chargeMinor / 100;
        const totalSpentMinor = spentMinor + chargeMinor;
        campaign.billing = { ...billing, impressionCount, spentMinor: totalSpentMinor, lockedMinor: remainingMinor };
        if (billing.transactionId) {
          await Transaction.updateOne({ _id: billing.transactionId }, {
            $set: { amount: totalSpentMinor, status: remainingMinor === 0 ? "settled" : "processing" },
          }, { session });
        }
        if (remainingMinor === 0) {
          campaign.status = "completed";
        }
        await campaign.save({ session });
        output = { counted: true, status: campaign.status, impressions: campaign.performance.impressions };
      });
    } finally {
      await session.endSession();
    }

    const io = (globalThis as any).io;
    io?.to(`artist:${id}`).emit("campaign:update", output);
    return NextResponse.json(output);
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ counted: false, reason: "already_counted" });
    console.error("[CAMPAIGN_EVENT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Campaign event failed" }, { status: error.statusCode || 500 });
  }
}