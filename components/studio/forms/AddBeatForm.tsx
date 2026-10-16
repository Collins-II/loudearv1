"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import {
  AudioLines,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/helpers";
import AudioSnippet from "@/components/soundhub/AudioSnippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface LicenseTier {
  id: string;
  title: string;
  price: number;
  description: string;
  usageRights: string[];
}

type Visibility = "public" | "private" | "unlisted";

const newLicenseTier = (): LicenseTier => ({
  id: "",
  title: "",
  price: 0,
  description: "",
  usageRights: [],
});

export default function AddBeatForm() {
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState<number | "">("");
  const [key, setKey] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [hostedAudioUrl, setHostedAudioUrl] = useState<string | null>(null);
  const [snippetUrl, setSnippetUrl] = useState<string | null>(null);
  const [licenseTiers, setLicenseTiers] = useState<LicenseTier[]>([newLicenseTier()]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingLabel, setUploadingLabel] = useState("");
  const startingPrice = licenseTiers.length
    ? Math.min(...licenseTiers.map((tier) => tier.price))
    : 0;

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const { getRootProps: getCoverRoot, getInputProps: getCoverInput } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
    onDrop: ([file]) => {
      if (!file) return;
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    },
    onDropRejected: () => toast.error("Choose a JPG, PNG, or WebP cover under 10 MB."),
  });

  const { getRootProps: getAudioRoot, getInputProps: getAudioInput } = useDropzone({
    accept: { "audio/*": [] },
    multiple: false,
    disabled: uploading,
    onDrop: ([file]) => {
      if (!file) return;
      setAudioFile(file);
      setAudioPreviewUrl(URL.createObjectURL(file));
      setHostedAudioUrl(null);
      setSnippetUrl(null);
    },
    onDropRejected: () => toast.error("Choose a supported audio file."),
  });

  const updateLicense = (index: number, changes: Partial<LicenseTier>) => {
    setLicenseTiers((current) =>
      current.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...changes } : tier
      )
    );
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Add a title for your beat.");
      return;
    }
    if (!audioFile) {
      toast.error("Choose the full beat audio file.");
      return;
    }
    if (!hostedAudioUrl || !snippetUrl) {
      toast.error("Create and assign an audio snippet before publishing.");
      return;
    }
    if (
      licenseTiers.length === 0 ||
      licenseTiers.some((tier) => !tier.id.trim() || !tier.title.trim() || !Number.isFinite(tier.price) || tier.price < 0)
    ) {
      toast.error("Give every license a unique ID, title, and valid price.");
      return;
    }
    if (new Set(licenseTiers.map((tier) => tier.id.trim().toLowerCase())).size !== licenseTiers.length) {
      toast.error("Each license must have a unique ID.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      let imageUrl: string | undefined;
      if (coverFile) {
        setUploadingLabel("Uploading cover artwork");
        setProgress(0);
        const coverUpload = await uploadToCloudinary(
          coverFile,
          "beats/thumbnails",
          "image",
          setProgress
        );
        if (typeof coverUpload.secure_url !== "string") {
          throw new Error("The cover upload did not return a valid image URL.");
        }
        imageUrl = coverUpload.secure_url;
      }

      setUploadingLabel("Saving beat release");
      setProgress(100);
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("bpm", String(bpm));
      formData.set("key", key.trim());
      formData.set("genre", genre.trim());
      formData.set("description", description.trim());
      formData.set("tags", JSON.stringify(tags.split(",").map((tag) => tag.trim()).filter(Boolean)));
      formData.set("price", String(startingPrice));
      formData.set("visibility", visibility);
      formData.set("audioUrl", hostedAudioUrl);
      formData.set("audioSnippet", snippetUrl);
      formData.set("licenseTiers", JSON.stringify(
        licenseTiers.map((tier) => ({
          ...tier,
          id: tier.id.trim(),
          title: tier.title.trim(),
          usageRights: tier.usageRights.map((right) => right.trim()).filter(Boolean),
        }))
      ));
      if (imageUrl) formData.set("image", imageUrl);

      const response = await fetch("/api/beat", { method: "POST", body: formData });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Beat upload failed. Please try again.";
        throw new Error(message);
      }

      toast.success(visibility === "public" ? "Beat published to SoundHub." : "Beat saved to your catalog.");
      setTitle("");
      setBpm("");
      setKey("");
      setGenre("");
      setDescription("");
      setTags("");
      setVisibility("private");
      setCoverFile(null);
      setCoverPreview(null);
      setAudioFile(null);
      setAudioPreviewUrl(null);
      setHostedAudioUrl(null);
      setSnippetUrl(null);
      setLicenseTiers([newLicenseTier()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Beat upload failed.");
    } finally {
      setUploading(false);
      setUploadingLabel("");
    }
  };

  return (
    <Card className="mx-auto max-w-5xl overflow-hidden rounded-2xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="border-b border-border/70 px-6 py-5">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <AudioLines className="size-5" aria-hidden="true" />
          </span>
          Beat release details
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Prepare your instrumental, set its preview and license terms, then publish it to SoundHub.
        </p>
      </CardHeader>

      <CardContent className="space-y-8 p-6">
        <section className="space-y-4" aria-labelledby="beat-metadata-heading">
          <div>
            <h2 id="beat-metadata-heading" className="font-semibold">Beat information</h2>
            <p className="mt-1 text-sm text-muted-foreground">Help artists find the right sound for their next project.</p>
          </div>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <Label htmlFor="beat-title" className="mb-2 block">Beat title <span className="text-emerald-600">*</span></Label>
              <Input id="beat-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Give your beat a name" className="bg-background" />
            </div>
            <div>
              <Label htmlFor="beat-genre" className="mb-2 block">Genre</Label>
              <Input id="beat-genre" value={genre} onChange={(event) => setGenre(event.target.value)} maxLength={80} placeholder="e.g. Afrobeat, Trap, R&B" className="bg-background" />
            </div>
            <div>
              <Label htmlFor="beat-bpm" className="mb-2 block">Tempo (BPM)</Label>
              <Input id="beat-bpm" type="number" min={20} max={300} step={1} value={bpm} onChange={(event) => setBpm(event.target.value === "" ? "" : Number(event.target.value))} placeholder="e.g. 95" className="bg-background" />
            </div>
            <div>
              <Label htmlFor="beat-key" className="mb-2 block">Musical key</Label>
              <Input id="beat-key" value={key} onChange={(event) => setKey(event.target.value)} maxLength={20} placeholder="e.g. C minor" className="bg-background" />
            </div>
            <div>
              <Label htmlFor="beat-price" className="mb-2 block">Starting price (ZMW)</Label>
              <Input id="beat-price" type="number" value={startingPrice} readOnly className="bg-muted" />
              <p className="mt-1.5 text-xs text-muted-foreground">Automatically uses the lowest license price.</p>
            </div>
            <div>
              <Label htmlFor="beat-visibility" className="mb-2 block">Release visibility</Label>
              <select
                id="beat-visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Visibility)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="private">Private draft</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public on SoundHub</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="beat-description" className="mb-2 block">Description</Label>
              <Textarea id="beat-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Describe the sound, mood, or creative direction." className="min-h-24 resize-y bg-background" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="beat-tags" className="mb-2 block">Search tags</Label>
              <Input id="beat-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Separate tags with commas, e.g. late night, melodic, 808" className="bg-background" />
              <p className="mt-1.5 text-xs text-muted-foreground">Use a few descriptive tags to improve catalog discovery.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-6" aria-labelledby="beat-files-heading">
          <div>
            <h2 id="beat-files-heading" className="font-semibold">Audio and artwork</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the full instrumental, then create the short preview artists will hear on SoundHub.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div
              {...getAudioRoot()}
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <input {...getAudioInput()} aria-label="Choose full beat audio file" />
              {audioFile ? (
                <>
                  <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><AudioLines className="size-5" aria-hidden="true" /></span>
                  <p className="max-w-full truncate font-medium">{audioFile.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB · Select to replace</p>
                </>
              ) : (
                <>
                  <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border"><UploadCloud className="size-5" aria-hidden="true" /></span>
                  <p className="font-medium">Add full beat audio <span className="text-emerald-600">*</span></p>
                  <p className="mt-1 text-sm text-muted-foreground">Drag your audio file here or browse files</p>
                  <p className="mt-3 text-xs text-muted-foreground">This full file is for licensed delivery.</p>
                </>
              )}
            </div>

            <div
              {...getCoverRoot()}
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <input {...getCoverInput()} aria-label="Choose beat cover artwork" />
              {coverPreview ? (
                <div className="space-y-2">
                  <Image src={coverPreview} alt="Beat cover preview" width={144} height={144} unoptimized className="mx-auto size-32 rounded-lg object-cover shadow-sm" />
                  <p className="max-w-48 truncate text-xs text-muted-foreground">{coverFile?.name}</p>
                </div>
              ) : (
                <>
                  <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border"><ImagePlus className="size-5" aria-hidden="true" /></span>
                  <p className="font-medium">Add cover art</p>
                  <p className="mt-1 text-xs text-muted-foreground">Optional · JPG, PNG, or WebP</p>
                </>
              )}
            </div>
          </div>

          {audioPreviewUrl && (
            <AudioSnippet
              key={audioPreviewUrl}
              audioUrl={audioPreviewUrl}
              onSnippetGenerated={({ audioUrl, snippetUrl }) => {
                setHostedAudioUrl(audioUrl);
                setSnippetUrl(snippetUrl);
              }}
            />
          )}
          <p aria-live="polite" className="text-sm">
            {snippetUrl
              ? <span className="font-medium text-emerald-600 dark:text-emerald-400">Preview snippet is ready and will be attached to this beat.</span>
              : <span className="text-muted-foreground">A generated preview snippet is required before upload.</span>}
          </p>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-6" aria-labelledby="beat-licenses-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="beat-licenses-heading" className="font-semibold">Licensing options</h2>
              <p className="mt-1 text-sm text-muted-foreground">Set what each license includes and what buyers are allowed to do.</p>
            </div>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setLicenseTiers((current) => [...current, newLicenseTier()])}>
              <Plus className="size-4" aria-hidden="true" /> Add license
            </Button>
          </div>
          <div className="space-y-4">
            {licenseTiers.map((tier, index) => (
              <div key={index} className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">License {index + 1}</h3>
                  {licenseTiers.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove license ${index + 1}`} onClick={() => setLicenseTiers((current) => current.filter((_, tierIndex) => tierIndex !== index))}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`license-id-${index}`} className="mb-2 block">License ID</Label>
                    <Input id={`license-id-${index}`} value={tier.id} onChange={(event) => updateLicense(index, { id: event.target.value })} placeholder="e.g. basic" className="bg-background" />
                  </div>
                  <div>
                    <Label htmlFor={`license-title-${index}`} className="mb-2 block">Display name</Label>
                    <Input id={`license-title-${index}`} value={tier.title} onChange={(event) => updateLicense(index, { title: event.target.value })} placeholder="e.g. Basic lease" className="bg-background" />
                  </div>
                  <div>
                    <Label htmlFor={`license-price-${index}`} className="mb-2 block">Price (ZMW)</Label>
                    <Input id={`license-price-${index}`} type="number" min={0} step="0.01" value={tier.price} onChange={(event) => updateLicense(index, { price: Number(event.target.value) })} className="bg-background" />
                  </div>
                  <div>
                    <Label htmlFor={`license-description-${index}`} className="mb-2 block">What’s included</Label>
                    <Textarea id={`license-description-${index}`} value={tier.description} onChange={(event) => updateLicense(index, { description: event.target.value })} placeholder="Describe the files and usage covered." className="min-h-20 resize-y bg-background" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor={`license-rights-${index}`} className="mb-2 block">Usage rights</Label>
                    <Textarea id={`license-rights-${index}`} value={tier.usageRights.join("\n")} onChange={(event) => updateLicense(index, { usageRights: event.target.value.split("\n") })} placeholder={"One right per line\nFor example: Non-exclusive commercial use"} className="min-h-20 resize-y bg-background" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {uploading && (
          <div role="status" className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{uploadingLabel}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Private drafts are only visible to you. Public beats appear in SoundHub.
          </p>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400 sm:w-auto"
          >
            {uploading ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Saving beat…</> : "Save beat release"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
