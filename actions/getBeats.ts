import { connectToDatabase } from "@/lib/database";
import Beat from "@/lib/database/models/beat";



export type BeatItem = {
_id: string;
title: string;
producerName?: string;
image?: string;
previewUrl?: string;
bpm?: number;
key?: string;
genre?: string;
mood?: string;
price?: number;
licenseTiers?: BeatLicenseOption[];
stats?: { plays?: number };
releaseDate?: string;
};

export interface BeatLicenseOption {
	id: string;
	title: string;
	price: number;
	description?: string;
	usageRights: string[];
}

export async function getBeats(opts: { limit?: number; genre?: string } = {}) {
await connectToDatabase();
const q: any = { visibility: "public" };
if (opts.genre && opts.genre !== "All") q.genre = opts.genre;
const beats = await Beat.find(q).sort({ createdAt: -1 }).limit(opts.limit || 200).lean();
return beats.map((beat) => ({
	_id: String(beat._id),
	title: String(beat.title ?? "Untitled"),
	producerName: beat.producerName ? String(beat.producerName) : undefined,
	image: beat.image ? String(beat.image) : undefined,
	previewUrl: beat.previewUrl ? String(beat.previewUrl) : undefined,
	bpm: typeof beat.bpm === "number" ? beat.bpm : undefined,
	key: beat.key ? String(beat.key) : undefined,
	genre: beat.genre ? String(beat.genre) : undefined,
	mood: beat.mood ? String(beat.mood) : undefined,
	price: typeof beat.price === "number" ? beat.price : undefined,
	licenseTiers: Array.isArray(beat.licenseTiers)
		? beat.licenseTiers.map((tier) => ({
			id: tier.id,
			title: tier.title,
			price: tier.price,
			description: tier.description,
			usageRights: tier.usageRights ?? [],
		}))
		: undefined,
	stats: { plays: beat.views?.length ?? 0 },
	releaseDate: beat.releaseDate ? new Date(beat.releaseDate).toISOString() : undefined,
}));
}