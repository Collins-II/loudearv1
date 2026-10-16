import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/database";
import RoyaltySplit from "@/lib/database/models/royalty-splits";
import { Song } from "@/lib/database/models/song";


export async function GET(req: Request, { params }: { params: Promise<{ songId: string }> }) {
try {
await connectToDatabase();
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { songId } = await params;
if (!Types.ObjectId.isValid(songId)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
const song = await Song.findOne({ _id: songId, author: user._id }).select("_id").lean();
if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });
const splits = await RoyaltySplit.find({ songId: new Types.ObjectId(songId), ownerId: user._id }).lean();
return NextResponse.json({ splits });
} catch (err: any) {
console.error(err);
return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
}
}


export async function POST(req: Request, { params }: { params: Promise<{ songId: string }> }) {
try {
await connectToDatabase();
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const body = await req.json();
const { collaboratorName, collaboratorEmail, percent, role, destination } = body;
if (typeof collaboratorName !== "string" || !collaboratorName.trim() || !Number.isFinite(percent) || percent <= 0 || percent > 100) return NextResponse.json({ error: "Enter a collaborator name and a percent from 0 to 100" }, { status: 400 });


const { songId } = await params;
if (!Types.ObjectId.isValid(songId)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
const song = await Song.findOne({ _id: songId, author: user._id }).select("_id").lean();
if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });


// ensure percent sum <= 100
const existing = await RoyaltySplit.aggregate([{ $match: { songId: new Types.ObjectId(songId), ownerId: user._id } }, { $group: { _id: null, total: { $sum: "$percent" } } }]);
const existingTotal = existing?.[0]?.total ?? 0;
if (existingTotal + percent > 100) return NextResponse.json({ error: "Total exceeds 100%" }, { status: 400 });


const doc = await RoyaltySplit.create({
mediaId: new Types.ObjectId(songId),
mediaType: "song",
songId: new Types.ObjectId(songId),
ownerId: user._id,
collaboratorName: collaboratorName.trim(),
collaboratorEmail: typeof collaboratorEmail === "string" ? collaboratorEmail.trim().toLowerCase() : undefined,
percent,
role,
destination,
verified: false,
});


return NextResponse.json({ success: true, split: doc });
} catch (err: any) {
console.error(err);
return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
}
}


export async function PATCH(req: Request, { params }: { params: Promise<{ songId: string }> }) {
try {
await connectToDatabase();
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { songId } = await params;
if (!Types.ObjectId.isValid(songId)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
const body = await req.json();
const { splitId, percent, collaboratorName, destination } = body;
if (!splitId) return NextResponse.json({ error: "splitId required" }, { status: 400 });


const song = await Song.findOne({ _id: songId, author: user._id }).select("_id").lean();
if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });
const split = await RoyaltySplit.findOne({ _id: splitId, songId: new Types.ObjectId(songId), ownerId: user._id });
if (!split) return NextResponse.json({ error: "Split not found" }, { status: 404 });


// If updating percent, ensure total not exceeding 100
if (typeof percent === "number") {
if (!Number.isFinite(percent) || percent < 0 || percent > 100) return NextResponse.json({ error: "Percent must be between 0 and 100" }, { status: 400 });
const others = await RoyaltySplit.aggregate([
{ $match: { songId: new Types.ObjectId(songId), ownerId: user._id, _id: { $ne: split._id } } },
{ $group: { _id: null, total: { $sum: "$percent" } } },
]);
const othersTotal = others?.[0]?.total ?? 0;
if (othersTotal + percent > 100) return NextResponse.json({ error: "Total exceeds 100%" }, { status: 400 });
split.percent = percent;
}


if (collaboratorName) split.collaboratorName = collaboratorName;
if (destination) split.destination = destination;


await split.save();
return NextResponse.json({ success: true, split });
} catch (err: any) {
console.error(err);
return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
}
}


export async function DELETE(req: Request, { params }: { params: Promise<{ songId: string }> }) {
try {
await connectToDatabase();
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { songId } = await params;
if (!Types.ObjectId.isValid(songId)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
const body = await req.json();
const { splitId } = body;
if (!splitId) return NextResponse.json({ error: "splitId required" }, { status: 400 });
const song = await Song.findOne({ _id: songId, author: user._id }).select("_id").lean();
if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });
const split = await RoyaltySplit.findOne({ _id: splitId, songId: new Types.ObjectId(songId), ownerId: user._id });
if (!split) return NextResponse.json({ error: "Split not found" }, { status: 404 });
await split.remove();
return NextResponse.json({ success: true });
} catch (err: any) {
console.error(err);
return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
}
}