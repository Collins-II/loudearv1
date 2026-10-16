import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/user";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "artist") return NextResponse.json({ error: "Artist account required" }, { status: 403 });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const country = (process.env.STRIPE_CONNECT_COUNTRY ?? "ZA").toUpperCase();
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe Connect requires STRIPE_SECRET_KEY" }, { status: 503 });
    }

    const stripe = new Stripe(secretKey);
    let accountId = user.payment?.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email,
        capabilities: { transfers: { requested: true } },
      }, { idempotencyKey: `connect-account-${user._id}` });
      accountId = account.id;
      await User.updateOne({ _id: user._id }, { $set: { "payment.stripeAccountId": accountId } });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.split(",")[0] ||
      process.env.NEXT_PUBLIC_BASE_URL?.split(",")[0] ||
      new URL(req.url).origin;
    const returnUrl = new URL("/studio/dashboard/admin/monetization?stripe=return", origin).toString();
    const refreshUrl = new URL("/studio/dashboard/admin/monetization?stripe=refresh", origin).toString();
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("[STRIPE_CONNECT_ERROR]", error);
    return NextResponse.json({ error: "Unable to start Stripe onboarding" }, { status: 502 });
  }
}