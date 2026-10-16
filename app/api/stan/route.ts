import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectToDatabase } from "@/lib/database"
import User from "@/lib/database/models/user"
import { StanEvent } from "@/lib/database/models/stanEvent"
import { getCurrentUser } from "@/actions/getCurrentUser"

const jsonResponse = (data: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(data, { status, headers })

const NO_STORE = { "Cache-Control": "private, no-store" }

// POST /api/stan → follow (stan) / unfollow (unstan)
export async function POST(req: NextRequest) {
  try {
    const fan = await getCurrentUser()
    if (!fan?._id) return jsonResponse({ error: "Unauthorized" }, 401)

    const body = await req.json().catch(() => null)
    const artistId = body?.artistId
    const action = body?.action

    if (!artistId || !["stan", "unstan"].includes(action))
      return jsonResponse({ error: "Invalid request" }, 400)

    if (!mongoose.Types.ObjectId.isValid(artistId))
      return jsonResponse({ error: "Invalid artist ID" }, 400)

    if (String(fan._id) === String(artistId))
      return jsonResponse({ error: "You cannot follow yourself" }, 400)

    await connectToDatabase()

    const creator = await User.findById(artistId).select("_id role").lean()
    if (!creator || (creator.role !== "artist" && creator.role !== "producer"))
      return jsonResponse({ error: "Creator not found" }, 404)

    const artistObjectId = new mongoose.Types.ObjectId(artistId)
    const fanObjectId = new mongoose.Types.ObjectId(String(fan._id))

    // Idempotent atomic update; the log only changes when the follow state does
    const result = await User.updateOne(
      { _id: fanObjectId },
      action === "stan"
        ? { $addToSet: { stan: artistObjectId } }
        : { $pull: { stan: artistObjectId } }
    )

    if (result.modifiedCount > 0) {
      if (action === "stan") {
        await StanEvent.updateOne(
          { fan: fanObjectId, artist: artistObjectId },
          { $setOnInsert: { fan: fanObjectId, artist: artistObjectId } },
          { upsert: true }
        )
      } else {
        await StanEvent.deleteOne({ fan: fanObjectId, artist: artistObjectId })
      }
    }

    const stanCount = await User.countDocuments({ stan: artistObjectId })
    const userHasStanned = action === "stan"

    // Room-wide payload carries no per-user state
    ;(globalThis as { io?: { to: (room: string) => { emit: (e: string, p: unknown) => void } } }).io
      ?.to(`artist:${artistId}`)
      .emit("stan:update", { artistId, stanCount })

    return jsonResponse(
      {
        success: true,
        message:
          action === "stan"
            ? "You are now following this artist 🔥"
            : "You unfollowed this artist 👋",
        stanCount,
        userHasStanned,
      },
      200,
      NO_STORE
    )
  } catch (error) {
    console.error("Stan API error:", error)
    if (error instanceof Error && error.name === "MongoNetworkError")
      return jsonResponse({ error: "Database connection failed" }, 503)

    return jsonResponse({ error: "Internal Server Error" }, 500)
  }
}

// GET /api/stan?artistId=xxx → stan stats for an artist (+ whether the viewer follows)
export async function GET(req: NextRequest) {
  try {
    const artistId = new URL(req.url).searchParams.get("artistId")

    if (!artistId) return jsonResponse({ error: "Missing artistId" }, 400)
    if (!mongoose.Types.ObjectId.isValid(artistId))
      return jsonResponse({ error: "Invalid artist ID" }, 400)

    const artistObjectId = new mongoose.Types.ObjectId(artistId)
    const [viewer, stanCount] = await Promise.all([
      getCurrentUser(),
      User.countDocuments({ stan: artistObjectId }),
    ])

    const userHasStanned = !!viewer?.stan?.some(
      (id: mongoose.Types.ObjectId) => String(id) === artistId
    )

    return jsonResponse(
      { success: true, artistId, stanCount, userHasStanned },
      200,
      NO_STORE
    )
  } catch (error) {
    console.error("Stan GET API error:", error)
    return jsonResponse({ error: "Internal Server Error" }, 500)
  }
}
