// app/api/beat/snippet/route.ts

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/getCurrentUser";
import cloudinary from "@/lib/cloudinary";
import fetch from "node-fetch";
import fs from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";

interface RequestBody {
  audioUrl: string;
  start: number;
  duration: number;
}

/** Download input file */
async function downloadToFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download file");
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buffer);
}

const MAX_SNIPPET_SECONDS = 60;

function isAllowedAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let tempDir: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { audioUrl, start, duration } = (await req.json()) as RequestBody;

    if (!audioUrl || !isAllowedAudioUrl(audioUrl)) {
      return NextResponse.json({ message: "A valid hosted audioUrl is required" }, { status: 400 });
    }

    const startOffset = Number(start);
    const length = Number(duration);
    if (
      !Number.isFinite(startOffset) ||
      !Number.isFinite(length) ||
      startOffset < 0 ||
      length <= 0 ||
      length > MAX_SNIPPET_SECONDS
    ) {
      return NextResponse.json(
        { message: `Snippet must be between 0 and ${MAX_SNIPPET_SECONDS} seconds` },
        { status: 400 }
      );
    }

    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "snippet-"));
    const inputPath = path.join(tempDir, "input");
    await downloadToFile(audioUrl, inputPath);

    const result = await cloudinary.uploader.upload(inputPath, {
      resource_type: "video", // audio is uploaded as "video"
      folder: "snippets",
      transformation: [{
        start_offset: startOffset,
        duration: length,
        audio_codec: "mp3"
      }]
    });

    return NextResponse.json({ secure_url: result.secure_url }, { status: 200 });
  } catch (err) {
    console.error("SNIPPET ERROR:", err);
    return NextResponse.json({ message: "Could not generate the snippet" }, { status: 500 });
  } finally {
    if (tempDir) await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}