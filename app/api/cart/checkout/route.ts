// /app/api/cart/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database";
import Beat, { type ILicenseTier } from "@/lib/database/models/beat";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { ecommerceDisabledResponse } from "@/lib/ecommerce-guard";

export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_BASE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  const disabled = ecommerceDisabledResponse();
  if (disabled) return disabled;
  const user = await getCurrentUser();
  if (!user?._id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is missing." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });

  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
      return NextResponse.json(
        { error: "No items received." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const line_items = await Promise.all(items.map(async (item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Invalid cart item");
      const { beatId, licenseId } = item as { beatId?: unknown; licenseId?: unknown };
      if (
        typeof beatId !== "string" ||
        !mongoose.isValidObjectId(beatId) ||
        typeof licenseId !== "string"
      ) {
        throw new Error("Invalid cart item");
      }

      const beat: any = await Beat.findById(beatId).select("title image licenseTiers visibility").lean();
      if (!beat || beat.visibility !== "public") throw new Error("A selected beat is no longer available");
      const license = (beat.licenseTiers as ILicenseTier[]).find((tier) => tier.id === licenseId);
      if (!license || !Number.isFinite(license.price) || license.price <= 0) {
        throw new Error("A selected license is unavailable");
      }

      const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
      return {
        price_data: {
          currency,
          product_data: {
            name: `${beat.title} - ${license.title}`,
            images: beat.image ? [beat.image] : [],
            metadata: { beatId, licenseId },
          },
          unit_amount: Math.round(license.price * 100),
        },
        quantity: 1,
      };
    }));

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${BASE_URL}/purchase-done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/purchase-cancelled`,
    });

    // ⭐ IMPORTANT FOR YOUR FRONTEND — RETURN THE REDIRECT URL
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: error.message === "Invalid cart item" || error.message?.includes("license") || error.message?.includes("beat") ? 400 : 500 }
    );
  }
}
