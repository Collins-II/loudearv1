// app/api/payments/webhook/route.ts
import { connectToDatabase } from "@/lib/database";
import { Payment } from "@/lib/database/models/payment";
import { verifyAirtelWebhook } from "@/lib/provider/airtelClient";
import { verifyMtnWebhook } from "@/lib/provider/mtnClient";
import Transaction from "@/lib/database/models/transactions";
import Topup from "@/lib/database/models/topup";
import User from "@/lib/database/models/user";
import mongoose from "mongoose";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const headers = Object.fromEntries(req.headers.entries());
    const body = await req.json();

    // Determine provider (you can use a header or webhook path to separate providers)
    const provider = headers["x-provider"] === "mtn" || headers["x-mtn-webhook-token"]
      ? "mtn"
      : headers["x-provider"] === "airtel" || headers["x-airtel-webhook-token"]
        ? "airtel"
        : "unknown";

    // Basic verification
    let verified = false;
    if (provider === "mtn") verified = verifyMtnWebhook(body, headers);
    else if (provider === "airtel") verified = verifyAirtelWebhook(body, headers);
    else {
      // If you can't determine provider, optionally check both or reject
      verified = false;
    }

    if (!verified) return NextResponse.json({ error: "Webhook verification failed" }, { status: 401 });

    // Example MTN webhook payload might contain externalId or reference and status
    // Normalize to find matching Payment
    const externalId = body.externalId || body.reference || body.transactionId || body.x_reference_id || body.id;
    if (!externalId) {
      console.warn("Webhook missing transaction id", body);
      return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
    }

    let newStatus: "pending" | "success" | "failed" = "pending";
    const statusValue = body.status ?? body.transactionStatus;
    if (statusValue) {
      const value = String(statusValue).toLowerCase();
      if (value.includes("success") || value === "completed") newStatus = "success";
      else if (value.includes("fail") || value.includes("cancel")) newStatus = "failed";
    }

    const payment = await Payment.findOne({ reference: externalId }) || await Payment.findOne({ providerTxnId: externalId });
    if (!payment) {
      const transaction = await Transaction.findOne({
        "mobileMoney.externalTransactionId": externalId,
        type: { $in: ["wallet_topup", "payout"] },
      });
      if (!transaction) {
        console.warn("Payment not found for external id", externalId);
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      if (newStatus === "pending") return NextResponse.json({ success: true, status: "processing" });

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const nextStatus = newStatus === "success" ? "completed" : "failed";
          const claimed = await Transaction.findOneAndUpdate(
            { _id: transaction._id, status: { $in: ["pending", "processing"] } },
            { $set: { status: nextStatus, "mobileMoney.verified": newStatus === "success" } },
            { new: true, session }
          );
          if (!claimed) return;

          if (claimed.type === "wallet_topup") {
            await Topup.findOneAndUpdate(
              { transactionId: String(claimed._id) },
              { $set: { status: newStatus === "success" ? "success" : "failed" } },
              { session }
            );
            if (newStatus === "success" && claimed.user) {
              await User.updateOne({ _id: claimed.user }, { $inc: { "wallet.balance": claimed.amount } }, { session });
            }
          } else if (claimed.type === "payout" && claimed.user) {
            const adjustment: Record<string, number> = { "wallet.pendingPayout": -claimed.amount };
            if (newStatus === "failed") adjustment["wallet.balance"] = claimed.amount;
            await User.updateOne({ _id: claimed.user }, { $inc: adjustment }, { session });
          }
        });
      } finally {
        await session.endSession();
      }

      return NextResponse.json({ success: true, status: newStatus });
    }

    // update payment
    if (payment.status === "success" && newStatus !== "success") {
      return NextResponse.json({ error: "Cannot downgrade a successful payment" }, { status: 409 });
    }
    payment.status = newStatus;
    payment.webhookReceived = true;
    payment.verificationStatus = "verified";
    payment.metadata = {
      ...payment.metadata,
      webhookReceivedAt: new Date(),
    };

    // If provider gives providerTxnId or external reference
    if (body.transactionId || body.providerTxnId) payment.providerTxnId = body.transactionId || body.providerTxnId;

    await payment.save();

    // Optionally emit via Socket.IO to front-end (global io)
    try {
      const io = (globalThis as any).io;
      io?.emit("paymentUpdate", { reference: payment.reference, status: payment.status, providerTxnId: payment.providerTxnId });
    } catch (e) {
      console.warn("Socket emit failed", e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: err.message || "Webhook handler error" }, { status: 500 });
  }
}
