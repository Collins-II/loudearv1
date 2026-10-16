import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/database";
import { Album } from "@/lib/database/models/album";
import { getCurrentUser } from "@/actions/getCurrentUser";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "tmp_uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function corsResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS() {
  return corsResponse({}, 200);
}

/**
 * PATCH handler for resumable upload
 * Receives file chunks + metadata and assembles them when all chunks arrive
 */
export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) return corsResponse({ error: "Unauthorized" }, 401);
    if (currentUser.role !== "artist") return corsResponse({ error: "Artist account required" }, 403);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const albumId = formData.get("albumId")?.toString();
    const uploadId = formData.get("uploadId")?.toString();
    const chunkIndex = Number.parseInt(formData.get("chunkIndex")?.toString() || "0", 10);
    const totalChunks = Number.parseInt(formData.get("totalChunks")?.toString() || "1", 10);
    const fileName = formData.get("fileName")?.toString() || "song.mp3";

    if (!file || !albumId || !uploadId) {
      return corsResponse({ error: "Missing fields" }, 400);
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(uploadId) || path.basename(fileName) !== fileName) {
      return corsResponse({ error: "Invalid upload identifiers" }, 400);
    }
    if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 1000 || chunkIndex < 0 || chunkIndex >= totalChunks) {
      return corsResponse({ error: "Invalid chunk coordinates" }, 400);
    }

    const album = await Album.findById(albumId).select("author");
    if (!album) return corsResponse({ error: "Album not found" }, 404);
    if (album.author.toString() !== currentUser._id.toString()) {
      return corsResponse({ error: "Forbidden" }, 403);
    }
    if (file.size > 10 * 1024 * 1024) {
      return corsResponse({ error: "Chunk exceeds the 10 MB limit" }, 413);
    }

    const userUploadDir = path.join(UPLOAD_DIR, currentUser._id.toString());
    const uploadFolder = path.join(userUploadDir, uploadId);
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }

    const chunkPath = path.join(uploadFolder, `${chunkIndex}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(chunkPath, buffer);

    // When all chunks have arrived
    const uploadedChunks = fs.readdirSync(uploadFolder);
    if (uploadedChunks.length === totalChunks) {
      const finalFilePath = path.join(uploadFolder, fileName);
      const writeStream = fs.createWriteStream(finalFilePath);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = fs.readFileSync(path.join(uploadFolder, `${i}`));
        writeStream.write(chunk);
      }
      writeStream.end();

     await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
     });


      // Upload to Cloudinary (stream)
      const uploadStream = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `albums/${albumId}/songs`,
            resource_type: "video", // works for audio too
          },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        fs.createReadStream(finalFilePath).pipe(stream);
      });

      const result = uploadStream as any;

      // Clean up temporary files
      fs.rmSync(uploadFolder, { recursive: true, force: true });

      // Update album model with song URL (optional)
      await Album.findByIdAndUpdate(albumId, {
        $push: {
          songs: {
            title: fileName.replace(/\.[^/.]+$/, ""),
            fileUrl: result.secure_url,
            duration: null,
          },
        },
      });

      globalThis.io?.emit("album:songUploaded", {
        albumId,
        title: fileName,
        url: result.secure_url,
      });

      return corsResponse({
        message: "Upload completed",
        fileUrl: result.secure_url,
      });
    }

    return corsResponse({
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
    });
  } catch (err: any) {
    console.error("Resumable upload error:", err);
    return corsResponse({ error: err.message || "Upload failed" }, 500);
  }
}
