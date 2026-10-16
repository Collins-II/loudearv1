"use client";

import { useState } from "react";
import { LoaderCircle, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadToCloudinary } from "@/lib/helpers";

interface AudioSnippetProps {
  audioUrl: string;
  onSnippetGenerated: (result: { audioUrl: string; snippetUrl: string }) => void;
}

const MAX_SNIPPET_SECONDS = 60;

export default function AudioSnippet({
  audioUrl,
  onSnippetGenerated,
}: AudioSnippetProps) {
  const [start, setStart] = useState(0);
  const [duration, setDuration] = useState(30);
  const [audioDuration, setAudioDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const durationLimit = Math.max(
    1,
    Math.min(MAX_SNIPPET_SECONDS, audioDuration || MAX_SNIPPET_SECONDS)
  );
  const startLimit = Math.max(0, audioDuration - duration);

  const generateSnippet = async () => {
    setGenerating(true);
    setUploadProgress(0);

    try {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) throw new Error("Could not read the selected audio.");

      const audioBlob = await audioResponse.blob();
      const extension = audioBlob.type.split("/")[1]?.split(";")[0] || "audio";
      const audioFile = new File([audioBlob], `beat-source.${extension}`, {
        type: audioBlob.type || "audio/mpeg",
      });
      const source = await uploadToCloudinary(
        audioFile,
        "beats/files",
        "video",
        setUploadProgress
      );

      if (typeof source.secure_url !== "string") {
        throw new Error("The audio upload did not return a secure URL.");
      }

      const response = await fetch("/api/beat/snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: source.secure_url,
          start,
          duration,
        }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("secure_url" in result) ||
        typeof result.secure_url !== "string"
      ) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Could not generate the audio preview.";
        throw new Error(message);
      }

      setPreviewUrl(result.secure_url);
      onSnippetGenerated({
        audioUrl: source.secure_url,
        snippetUrl: result.secure_url,
      });
      toast.success("Preview snippet generated.");
    } catch (error) {
      console.error("Failed to generate beat preview:", error);
      toast.error(error instanceof Error ? error.message : "Could not generate the audio preview.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div>
        <h3 className="font-medium">Create preview snippet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a start point and a preview length (up to one minute).
        </p>
      </div>

      <audio
        controls
        src={previewUrl ?? audioUrl}
        className="w-full"
        onLoadedMetadata={(event) => {
          const length = event.currentTarget.duration;
          if (!Number.isFinite(length)) return;
          setAudioDuration(length);
          setDuration((current) => Math.min(current, length, MAX_SNIPPET_SECONDS));
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="flex justify-between">
            <span>Start time</span>
            <span className="text-muted-foreground">{start}s</span>
          </span>
          <input
            type="range"
            min={0}
            max={startLimit}
            step={1}
            value={Math.min(start, startLimit)}
            onChange={(event) => setStart(Number(event.target.value))}
            className="w-full accent-emerald-600"
            aria-label="Snippet start time in seconds"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="flex justify-between">
            <span>Preview length</span>
            <span className="text-muted-foreground">{duration}s</span>
          </span>
          <input
            type="range"
            min={1}
            max={durationLimit}
            step={1}
            value={Math.min(duration, durationLimit)}
            onChange={(event) => {
              const nextDuration = Number(event.target.value);
              setDuration(nextDuration);
              setStart((current) => Math.min(current, Math.max(0, audioDuration - nextDuration)));
            }}
            className="w-full accent-emerald-600"
            aria-label="Snippet length in seconds"
          />
        </label>
      </div>

      {generating && <Progress value={uploadProgress} aria-label="Audio upload progress" />}

      <Button
        type="button"
        onClick={generateSnippet}
        disabled={generating}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {generating ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Scissors className="size-4" aria-hidden="true" />
        )}
        {generating ? `Generating preview (${uploadProgress}%)` : "Generate preview"}
      </Button>
    </div>
  );
}
