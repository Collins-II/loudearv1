import { connectToDatabase } from "@/lib/database";
import Transaction from "@/lib/database/models/transactions";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";

interface StatusInput {
  providerReference: string; // provider’s reference ID
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = (await req.json()) as StatusInput;

    const tx = await Transaction.findOne({
      "mobileMoney.externalTransactionId": body.providerReference,
      user: user._id,
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const provider = tx.mobileMoney?.provider;

    return NextResponse.json({
      success: true,
      transactionId: tx._id,
      providerReference: tx.mobileMoney?.externalTransactionId,
      provider,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status, // pending | processing | completed | failed
    });
  } catch (err) {
    console.error("MOBILE-MONEY-STATUS ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Status check failed" },
      { status: 500 }
    );
  }
}
