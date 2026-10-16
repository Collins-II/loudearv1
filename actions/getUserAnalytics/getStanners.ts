// lib/actions/getUserFollowersAnalytics.ts

import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/user";
import { StanEvent } from "@/lib/database/models/stanEvent";
import mongoose from "mongoose";

export interface FollowerAnalytics {
  totalFollowers: number;
  newFollowers: number;
  growthRate: number;
  followerTrend: { date: string; count: number }[];
}

const TREND_MONTHS = 6;

/**
 * Follower analytics for an artist. A "stan" is stored on the fan's `stan` array,
 * so followers are the users whose array contains this id. Growth is derived from
 * the timestamped StanEvent log; follows made before the log existed count as
 * baseline followers.
 */
export async function getUserFollowersAnalytics(userId: string): Promise<FollowerAnalytics> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }
  await connectToDatabase();

  const artistId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const monthStarts = Array.from({ length: TREND_MONTHS }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1)
  );
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trendStart = monthStarts[0];

  const [totalFollowers, newFollowers, recentEvents] = await Promise.all([
    User.countDocuments({ stan: artistId }),
    StanEvent.countDocuments({ artist: artistId, createdAt: { $gte: thirtyDaysAgo } }),
    StanEvent.find({ artist: artistId, createdAt: { $gte: trendStart } })
      .select("createdAt")
      .lean<{ createdAt: Date }[]>(),
  ]);

  const previousFollowers = Math.max(totalFollowers - newFollowers, 0);
  const growthRate =
    previousFollowers === 0
      ? newFollowers > 0
        ? 100
        : 0
      : (newFollowers / previousFollowers) * 100;

  // Followers at the end of each month = total minus follows gained after it
  const followerTrend = monthStarts.map((start, i) => {
    const end = i === TREND_MONTHS - 1 ? now : monthStarts[i + 1];
    const gainedAfter = recentEvents.filter((e) => e.createdAt >= end).length;
    return {
      date: start.toISOString().slice(0, 10),
      count: Math.max(totalFollowers - gainedAfter, 0),
    };
  });

  return {
    totalFollowers,
    newFollowers,
    growthRate: Number(growthRate.toFixed(2)),
    followerTrend,
  };
}
