import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/user";

// Top stanned creators; bounded so the aggregation never scans every follow
export async function GET() {
  try {
    await connectToDatabase();

    const stans = await User.aggregate([
      { $unwind: "$stan" },
      { $group: { _id: "$stan", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return NextResponse.json(
      { stans },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("[ANALYTICS_VISITORS]", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
