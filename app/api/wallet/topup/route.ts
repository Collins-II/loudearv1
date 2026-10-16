// app/api/wallet/topup/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import Transaction from "@/lib/database/models/transactions";
import Topup from "@/lib/database/models/topup";
import crypto from "crypto";

type Provider = "MTN" | "AIRTEL";

interface MobileMoneyResult {
  ok: boolean;
  status: number;
  providerReference: string;
  data: any;
}

const PROVIDER_CONFIG = {
  MTN: {
    endpoint: process.env.MTN_COLLECTION_URL,
    subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY,
  },
  AIRTEL: {
    endpoint: process.env.AIRTEL_COLLECTION_URL,
    apiKey: process.env.AIRTEL_API_KEY,
  },
};

async function mobileMoneyInitiate(
  provider: Provider,
  phone: string,
  amount: number,
  currency: string,
  idempotencyKey?: string
): Promise<MobileMoneyResult> {
  const reference = crypto.randomUUID();

  try {
    if (provider === "MTN") {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": PROVIDER_CONFIG.MTN.subscriptionKey ?? "",
        "X-Reference-Id": reference,
      };

      if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

      const res = await fetch(PROVIDER_CONFIG.MTN.endpoint ?? "", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: String(amount),
          currency,
          externalId: reference,
          payer: { partyIdType: "MSISDN", partyId: phone },
          payerMessage: "Wallet Topup",
          payeeNote: "LoudEar Wallet",
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      return {
        ok: res.ok || res.status === 202,
        status: res.status,
        providerReference: reference,
        data,
      };
    }

    if (provider === "AIRTEL") {
      const res = await fetch(PROVIDER_CONFIG.AIRTEL.endpoint ?? "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PROVIDER_CONFIG.AIRTEL.apiKey ?? ""}`,
        },
        body: JSON.stringify({
          amount: String(amount),
          currency,
          mobile: phone,
          externalId: reference,
          reason: "Wallet Topup",
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      return {
        ok: res.ok || res.status === 202,
        status: res.status,
        providerReference: reference,
        data,
      };
    }

    throw new Error("Unsupported provider");
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      providerReference: reference,
      data: { error: err?.message ?? "Unknown mobile money error" },
    };
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user?._id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: {
      method: "mobile_money";
      provider?: Provider;
      phone?: string;
      amount: number;
      currency?: string;
      idempotencyKey?: string;
    } = await req.json();

    const {
      method,
      provider,
      phone,
      amount,
      currency = "ZMW",
      idempotencyKey,
    } = body;

    if (method !== "mobile_money" || !Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Mobile money method and a positive amount in minor units are required" },
        { status: 400 }
      );
    }
    if (!provider || !phone || !["MTN", "AIRTEL"].includes(provider)) {
      return NextResponse.json({ error: "A supported provider and phone number are required" }, { status: 400 });
    }

    // IDEMPOTENCY CHECK
    if (idempotencyKey) {
      const existing = await Transaction.findOne({
        "metadata.idempotencyKey": idempotencyKey,
        user: user._id,
      })
        .lean()
        .exec();

      if (existing) {
        const topup = await Topup.findOne({
          transactionId: existing._id,
        })
          .lean()
          .exec();

        return NextResponse.json({
          status: "duplicate",
          transaction: existing,
          topup,
        });
      }
    }

    // CREATE INITIAL TRANSACTION
    const tx: any = await Transaction.create({
      user: user._id,
      type: "wallet_topup",
      amount,
      currency,
      status: "pending",
      paymentMethod: "mobile_money",
      description: `Wallet topup via ${method}`,
      mobileMoney: {
        provider,
        phoneNumber: phone,
        verified: false,
        rawResponse: null,
      },
      metadata: { idempotencyKey },
    });

    const topup: any = await Topup.create({
      user: user._id,
      amount,
      currency,
      provider,
      phoneNumber: phone,
      status: "pending",
      transactionId: tx._id,
    });

    const resp = await mobileMoneyInitiate(
        provider,
        phone,
        amount / 100,
        currency,
        idempotencyKey
    );

    const newStatus = resp.ok ? "processing" : "failed";


    await Transaction.findByIdAndUpdate(tx._id, {
      $set: {
        status: newStatus,
        "mobileMoney.rawResponse": resp.data,
        "mobileMoney.externalTransactionId": resp.providerReference,
      },
    });

    await Topup.findByIdAndUpdate(topup._id, {
      $set: { status: newStatus, rawResponse: resp.data },
    });

    return NextResponse.json({
      success: resp.ok,
      status: newStatus,
      transactionId: tx._id,
      topupId: topup._id,
      providerReference: resp.providerReference,
      providerData: resp.data,
    }, { status: resp.ok ? 202 : 502 });
  } catch (err: any) {
    console.error("[TOPUP_ERROR]", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
