import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Hero from "@/lib/database/models/hero";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/actions/getCurrentUser";

async function bufferFromFile(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "artist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const formData = await req.formData();
    const cover = formData.get("cover");
    const rawSections = formData.get("sections");

    if (!(cover instanceof File) || typeof rawSections !== "string") {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }
    if (!cover.type.startsWith("image/") || cover.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Cover must be an image under 10MB" },
        { status: 400 }
      );
    }

    let sections: unknown;
    try {
      sections = JSON.parse(rawSections);
    } catch {
      return NextResponse.json({ error: "Invalid sections" }, { status: 400 });
    }

    // Upload cover to Cloudinary
    const coverBuffer = await bufferFromFile(cover);
    const coverResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "hero", resource_type: "image" },
          (err, result) => (err ? reject(err) : resolve(result))
        )
        .end(coverBuffer);
    });

    const uploadedCover = coverResult as any;

    // Save to MongoDB
    const hero = await Hero.create({
      sections,
      coverUrl: uploadedCover.secure_url,
      publicId: uploadedCover.public_id,
    });

    return NextResponse.json({ success: true, hero });
  } catch (error) {
    console.error("[HERO_UPLOAD_ERR]", error);
    return NextResponse.json(
      { error: "Failed to upload hero section" },
      { status: 500 }
    );
  }
}
