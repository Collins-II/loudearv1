import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import { Campaign } from "@/lib/database/models/campaign";
import Transaction from "@/lib/database/models/transactions";
import User from "@/lib/database/models/user";

const CPM_MINOR = Number(process.env.CAMPAIGN_CPM_MINOR ?? 2500);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "artist") return NextResponse.json({ error: "Artist account required" }, { status: 403 });
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  const campaign = await Campaign.findOne({ _id: id, artistId: user._id }).lean();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "artist") return NextResponse.json({ error: "Artist account required" }, { status: 403 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  const { action } = await req.json();
  if (!["start", "pause", "stop"].includes(action)) {
    return NextResponse.json({ error: "Action must be start, pause, or stop" }, { status: 400 });
  }
  if (!Number.isSafeInteger(CPM_MINOR) || CPM_MINOR <= 0) {
    return NextResponse.json({ error: "Invalid campaign CPM configuration" }, { status: 503 });
  }

  const session = await mongoose.startSession();
  let result: { status: string; lockedMinor: number } | undefined;
  try {
    await session.withTransaction(async () => {
      const campaign = await Campaign.findOne({ _id: id, artistId: user._id }).session(session);
      if (!campaign) throw Object.assign(new Error("Campaign not found"), { statusCode: 404 });

      const billing = campaign.billing ?? {};
      const lockedMinor = Number(billing.lockedMinor ?? 0);

      if (action === "start") {
        if (!(campaign.targeting?.platforms ?? []).includes("app")) {
          throw Object.assign(new Error("Only LoudEar in-app delivery is available. External campaign channels are not connected."), { statusCode: 409 });
        }
        if (campaign.status === "running") {
          result = { status: campaign.status, lockedMinor };
          return;
        }
        if (!["draft", "paused"].includes(campaign.status)) {
          throw Object.assign(new Error("This campaign cannot be restarted"), { statusCode: 409 });
        }

        if (campaign.status === "draft") {
          const reserveMinor = Math.round(campaign.budget * 100);
          if (!Number.isSafeInteger(reserveMinor) || reserveMinor <= 0 || (user.wallet?.currency ?? "ZMW") !== "ZMW") {
            throw Object.assign(new Error("Campaigns require a positive budget and a ZMW wallet"), { statusCode: 400 });
          }

          await User.updateOne({ _id: user._id }, [{
            $set: { "wallet.locked": { $cond: [{ $isNumber: "$wallet.locked" }, "$wallet.locked", 0] } },
          }], { session });
          const debit = await User.updateOne(
            { _id: user._id, "wallet.balance": { $gte: reserveMinor } },
            { $inc: { "wallet.balance": -reserveMinor, "wallet.locked": reserveMinor } },
            { session }
          );
          if (debit.modifiedCount !== 1) {
            throw Object.assign(new Error("Insufficient available wallet balance"), { statusCode: 402 });
          }

          const [transaction] = await Transaction.create([{
            user: user._id,
            type: "campaign_payment",
            amount: reserveMinor,
            currency: "ZMW",
            status: "processing",
            paymentMethod: "manual",
            description: `Reserved campaign budget: ${campaign.campaignName}`,
            product: { id: campaign._id, type: "campaign" },
            metadata: { campaignId: String(campaign._id), billingModel: "CPM", cpmMinor: CPM_MINOR },
          }], { session });

          campaign.billing = {
            ...billing,
            walletId: new mongoose.Types.ObjectId(String(user._id)),
            reservedMinor: reserveMinor,
            lockedMinor: reserveMinor,
            spentMinor: 0,
            impressionCount: 0,
            transactionId: transaction._id as mongoose.Types.ObjectId,
          };
        } else if (lockedMinor <= 0) {
          throw Object.assign(new Error("No reserved budget remains; stop this campaign and create a new draft to fund it"), { statusCode: 409 });
        }

        campaign.status = "running";
        await campaign.save({ session });
        result = { status: campaign.status, lockedMinor: Number(campaign.billing?.lockedMinor ?? 0) };
        return;
      }

      if (action === "pause") {
        if (campaign.status !== "running") throw Object.assign(new Error("Only running campaigns can be paused"), { statusCode: 409 });
        campaign.status = "paused";
        await campaign.save({ session });
        result = { status: campaign.status, lockedMinor };
        return;
      }

      if (["stopped", "completed"].includes(campaign.status)) {
        throw Object.assign(new Error("Campaign is already finalized"), { statusCode: 409 });
      }
      if (lockedMinor > 0) {
        await User.updateOne(
          { _id: user._id },
          { $inc: { "wallet.balance": lockedMinor, "wallet.locked": -lockedMinor } },
          { session }
        );
      }
      campaign.status = "stopped";
      campaign.billing = { ...billing, lockedMinor: 0 };
      await campaign.save({ session });
      if (billing.transactionId) {
        await Transaction.updateOne({ _id: billing.transactionId }, {
          $set: { amount: Number(billing.spentMinor ?? 0), status: "settled" },
        }, { session });
      }
      result = { status: campaign.status, lockedMinor: 0 };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Campaign update failed" }, { status: error.statusCode || 500 });
  } finally {
    await session.endSession();
  }
}