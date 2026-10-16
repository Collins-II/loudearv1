"use client";

import SingleVideoUploadForm from "@/components/forms/video-upload-form";
import { UploadPageShell } from "@/components/studio/UploadPageShell";

export default function UploadVideosPage() {
  return (
    <UploadPageShell
      title="Upload a video"
      description="Share a music video or visual release with your audience."
      icon="video"
    >
      <SingleVideoUploadForm />
    </UploadPageShell>
  );
}
