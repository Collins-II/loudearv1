import { NextResponse } from "next/server";
import { ECOMMERCE_ENABLED } from "@/lib/features";

export function ecommerceDisabledResponse() {
  if (ECOMMERCE_ENABLED) return null;
  return NextResponse.json(
    { error: "Purchases are temporarily unavailable." },
    { status: 503 }
  );
}
