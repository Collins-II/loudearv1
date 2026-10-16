import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Beat, { type ILicenseTier } from "@/lib/database/models/beat";
import { getCurrentUser } from "@/actions/getCurrentUser";

interface LicenseTierInput {
  id: string;
  title: string;
  price: number;
  description?: string;
  usageRights: string[];
  fileUrl?: string;
}

function isCloudinaryUrl(value: FormDataEntryValue | null): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

function parseLicenseTiers(value: FormDataEntryValue | null): LicenseTierInput[] | null {
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 10) return null;
    if (!parsed.every((tier): tier is LicenseTierInput =>
      typeof tier === "object" &&
      tier !== null &&
      typeof tier.id === "string" &&
      tier.id.trim().length > 0 &&
      typeof tier.title === "string" &&
      tier.title.trim().length > 0 &&
      typeof tier.price === "number" &&
      Number.isFinite(tier.price) &&
      tier.price >= 0 &&
      (tier.description === undefined || typeof tier.description === "string") &&
      Array.isArray(tier.usageRights) &&
      tier.usageRights.every((right: unknown) => typeof right === "string") &&
      (tier.fileUrl === undefined || isCloudinaryUrl(tier.fileUrl))
    )) return null;

    const tiers = parsed.map((tier) => ({
      ...tier,
      id: tier.id.trim().slice(0, 60),
      title: tier.title.trim().slice(0, 100),
      description: tier.description?.trim().slice(0, 1000),
      usageRights: tier.usageRights.map((right) => right.trim().slice(0, 240)).filter(Boolean).slice(0, 20),
    }));
    if (new Set(tiers.map((tier) => tier.id.toLowerCase())).size !== tiers.length) return null;
    return tiers;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const genre = url.searchParams.get("genre");
    const sort = url.searchParams.get("sort") || "latest";
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 100;

    const query: Record<string, unknown> = {
      visibility: "public",
    };
    if (genre && genre !== "All") query.genre = genre;

    const beats = await Beat.find(query)
      .populate({ path: "author", select: "_id name image stageName" })
      .limit(limit)
      .lean();

    if (sort === "popular") {
      beats.sort((a, b) => (b.views?.length || 0) - (a.views?.length || 0));
    } else if (sort === "price-low") {
      beats.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === "price-high") {
      beats.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      beats.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }

    const data = beats.map((beat) => {
      const author = beat.author as unknown as {
        _id?: { toString(): string };
        name?: string;
        stageName?: string;
        image?: string;
      } | null;

      return {
        _id: String(beat._id),
        title: beat.title,
        bpm: beat.bpm,
        key: beat.key,
        genre: beat.genre,
        description: beat.description,
        tags: beat.tags,
        price: beat.price,
        image: beat.image,
        previewUrl: beat.previewUrl,
        audioSnippet: beat.previewUrl,
        licenseTiers: beat.licenseTiers.map((tier: ILicenseTier) => ({
          id: tier.id,
          title: tier.title,
          price: tier.price,
          description: tier.description,
          usageRights: tier.usageRights,
        })),
        releaseDate: beat.createdAt,
        stats: { plays: beat.views?.length ?? 0 },
        producerId: author?._id?.toString() || "",
        producerName: author?.stageName || author?.name || "Unknown producer",
        producerImage: author?.image || null,
      };
    });

    return NextResponse.json({ beats: data });
  } catch (error) {
    console.error("GET /api/beat error:", error);
    return NextResponse.json({ message: "Failed to fetch beats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer") {
      return NextResponse.json({ message: "Producer account required" }, { status: 403 });
    }

    const form = await request.formData();
    const title = form.get("title");
    const audioUrl = form.get("audioUrl");
    const audioSnippet = form.get("audioSnippet");
    const image = form.get("image");
    const visibility = form.get("visibility");
    const bpmValue = form.get("bpm");
    const priceValue = form.get("price");
    const licenseTiers = parseLicenseTiers(form.get("licenseTiers"));

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 160 ||
      !isCloudinaryUrl(audioUrl) ||
      !isCloudinaryUrl(audioSnippet) ||
      (image !== null && !isCloudinaryUrl(image)) ||
      (visibility !== "public" && visibility !== "private" && visibility !== "unlisted") ||
      !licenseTiers
    ) {
      return NextResponse.json({ message: "Invalid beat release details" }, { status: 400 });
    }

    const bpm = bpmValue === null || bpmValue === "" ? undefined : Number(bpmValue);
    const price = priceValue === null || priceValue === "" ? NaN : Number(priceValue);
    if (
      (bpm !== undefined && (!Number.isInteger(bpm) || bpm < 20 || bpm > 300)) ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json({ message: "Invalid BPM or price" }, { status: 400 });
    }

    const genreValue = form.get("genre");
    const keyValue = form.get("key");
    const descriptionValue = form.get("description");
    const tagsValue = form.get("tags");
    let tags: string[] = [];
    if (typeof tagsValue === "string" && tagsValue) {
      try {
        const parsed: unknown = JSON.parse(tagsValue);
        if (!Array.isArray(parsed) || !parsed.every((tag) => typeof tag === "string")) {
          return NextResponse.json({ message: "Invalid beat tags" }, { status: 400 });
        }
        tags = parsed.map((tag: string) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
      } catch {
        return NextResponse.json({ message: "Invalid beat tags" }, { status: 400 });
      }
    }

    await connectToDatabase();
    const beat = await Beat.create({
      author: user._id,
      producerName: user.stageName || user.name,
      title: title.trim(),
      bpm,
      key: typeof keyValue === "string" ? keyValue.trim().slice(0, 20) : "",
      genre: typeof genreValue === "string" ? genreValue.trim().slice(0, 80) : "",
      description: typeof descriptionValue === "string" ? descriptionValue.trim().slice(0, 2000) : "",
      tags,
      price,
      fileUrl: audioUrl,
      previewUrl: audioSnippet,
      image: typeof image === "string" ? image : undefined,
      licenseTiers,
      visibility,
    });

    return NextResponse.json({ beat }, { status: 201 });
  } catch (error) {
    console.error("POST /api/beat error:", error);
    return NextResponse.json({ message: "Failed to create beat" }, { status: 500 });
  }
}
