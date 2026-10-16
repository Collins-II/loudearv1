// app/api/wallet/payout/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import Transaction from "@/lib/database/models/transactions";
import User from "@/lib/database/models/user";
import mongoose from "mongoose";
import { mobileMoneyDisburse } from "@/lib/services/mobileMoneyDisburse";


export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const provider = String(body.provider ?? "").toUpperCase();
    const phone = String(body.phone ?? body.destination ?? "").trim();
    const amount = Number(body.amount);
    const currency = String(body.currency ?? "ZMW").toUpperCase();
    const { idempotencyKey } = body;

    if (!["MTN", "AIRTEL"].includes(provider) || !phone || !Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "provider, phone, amount required" }, { status: 400 });
    }

    // reload user fresh
    const UserModel = User;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const freshUser = await UserModel.findById(user._id).session(session);

if (!freshUser) {
  await session.abortTransaction();
  session.endSession();
  return NextResponse.json(
    { error: "User not found" },
    { status: 404 }
  );
}

// ensure wallet object
if (!freshUser.wallet) {
  freshUser.wallet = { balance: 0 };
}

const balance = Number(freshUser.wallet.balance);

// check balance
if (balance < amount) {
  await session.abortTransaction();
  session.endSession();
  return NextResponse.json(
    { error: "Insufficient wallet balance" },
    { status: 400 }
  );
}

// idempotency
if (idempotencyKey) {
  const existing = await Transaction.findOne({
    "metadata.idempotencyKey": idempotencyKey,
    user: user._id
  }).session(session);

  if (existing) {
    await session.commitTransaction();
    session.endSession();
    return NextResponse.json({
        success: existing.status !== "failed",
        error: existing.status === "failed" ? "This payout attempt failed." : undefined,
        status: existing.status,
        duplicate: true,
      transaction: existing
    });
  }
}

// create payout tx
const [tx] = await Transaction.create([
  {
    user: user._id,
    type: "payout",
    amount,
    currency,
    status: "pending",
    paymentMethod: "mobile_money",
    description: `Payout to ${phone}`,
    mobileMoney: {
      provider,
      phoneNumber: phone,
      verified: false,
      internalReference: null,
      externalTransactionId: null,
      rawResponse: null
    },
    metadata: { idempotencyKey }
  }
], { session });

// deduct balance
freshUser.wallet.balance = balance - amount;
  freshUser.wallet.pendingPayout = Number(freshUser.wallet.pendingPayout ?? 0) + amount;
await freshUser.save({ session });

      // commit DB pre-disburse (we will update tx after external API)
      await session.commitTransaction();
      session.endSession();

      // call provider to disburse funds (outside DB session)
      let resp;
      try {
        resp = await mobileMoneyDisburse(provider as "MTN" | "AIRTEL", phone, amount / 100, currency);
      } catch (providerError) {
        await UserModel.updateOne({ _id: user._id }, {
          $inc: { "wallet.balance": amount, "wallet.pendingPayout": -amount },
        });
        await Transaction.findByIdAndUpdate(tx._id, { $set: { status: "failed" } });
        throw providerError;
      }
      const success = resp.success;

      const status = success ? "processing" : "failed";
      if (!success) {
        await UserModel.updateOne({ _id: user._id }, {
          $inc: { "wallet.balance": amount, "wallet.pendingPayout": -amount },
        });
      }

      await Transaction.findByIdAndUpdate(tx._id, {
        $set: {
          status,
          "mobileMoney.externalTransactionId": resp.providerRef,
          "mobileMoney.verified": success,
          "mobileMoney.rawResponse": resp.raw,
        },
      });

      return NextResponse.json({
        success,
        status,
        error: success ? undefined : "The provider rejected the payout. Your wallet balance was restored.",
        transactionId: String(tx._id),
        provider,
        providerReference: resp.providerRef,
      }, { status: success ? 200 : 502 });
    } catch (errInner) {
      if (session.inTransaction()) await session.abortTransaction();
      session.endSession();
      console.error("[PAYOUT_TX_ERROR]", errInner);
      return NextResponse.json({ error: "Payout failed" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[PAYOUT_ERROR]", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
