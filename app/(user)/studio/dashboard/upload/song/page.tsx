"use client";

import SingleUploadForm from "@/components/forms/single-upload-form";
import { UploadPageShell } from "@/components/studio/UploadPageShell";

export default function UploadMusicPage() {
  return (
    <UploadPageShell
      title="Upload a single"
      description="Add your track details and artwork, then share your music with listeners."
      icon="song"
    >
      <SingleUploadForm />
    </UploadPageShell>
  );
}
