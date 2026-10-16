"use client";

import AlbumUploadForm from "@/components/forms/album-upload-form";
import { UploadPageShell } from "@/components/studio/UploadPageShell";

export default function UploadMusicPage() {
  return (
    <UploadPageShell
      title="Upload an album"
      description="Build your release with cover art, track files, and the details listeners need."
      icon="album"
    >
      <AlbumUploadForm />
    </UploadPageShell>
  );
}
