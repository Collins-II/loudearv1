"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Info, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Textarea } from "../ui/textarea";

interface UploadProps {
  onSuccess?: () => void;
}

//const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function SingleUploadForm({ onSuccess }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  // Metadata fields
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [features, setFeatures] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [tags, setTags] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // Dropzones
  const { getRootProps: getAudioRoot, getInputProps: getAudioInput } = useDropzone({
    accept: { "audio/*": [] },
    multiple: false,
    onDrop: (files) => setFile(files[0]),
  });

  const { getRootProps: getCoverRoot, getInputProps: getCoverInput } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: (files) => {
      const cover = files[0];
      setCoverFile(cover);
      setCoverPreview(URL.createObjectURL(cover));
    },
  });

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!artist.trim()) newErrors.artist = "Artist is required.";
    if (!file) newErrors.file = "Audio file is required.";
    if (!coverFile) newErrors.cover = "Cover image is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("song", file!);
    formData.append("cover", coverFile!);
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("features", features);
    formData.append("album", album);
    formData.append("description", description);
    formData.append("genre", genre);
    formData.append("language", language);
    formData.append("releaseDate", releaseDate);
    formData.append("explicit", explicit.toString());
    formData.append("tags", tags);

    try {
      const res = await fetch(`/api/songs/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      toast.success("Single uploaded successfully!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Error uploading single");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden rounded-2xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b border-border/70 px-6 py-5">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Release details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add the information listeners will see on your track.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {/* Metadata */}
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <Label htmlFor="song-title" className="mb-2 block">Song title <span className="text-emerald-600">*</span></Label>
              <Input
                id="song-title"
                className="bg-background"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your track a name"
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && <p role="alert" className="mt-1.5 text-sm text-destructive">{errors.title}</p>}
            </div>
            <div>
              <Label htmlFor="song-artist" className="mb-2 block">Artist <span className="text-emerald-600">*</span></Label>
              <Input
                id="song-artist"
                className="bg-background"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Primary artist"
                aria-invalid={Boolean(errors.artist)}
              />
              {errors.artist && <p role="alert" className="mt-1.5 text-sm text-destructive">{errors.artist}</p>}
            </div>
            <div>
              <Label htmlFor="song-features" className="mb-2 block">Featured artists</Label>
              <Input
                id="song-features"
                className="bg-background"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="Add collaborators"
              />
            </div>
            <div>
              <Label htmlFor="song-album" className="mb-2 block">Album</Label>
              <Input
                id="song-album"
                className="bg-background"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Album title (optional)"
              />
            </div>
            <div>
              <Label htmlFor="song-genre" className="mb-2 block">Genre</Label>
              <Input
                id="song-genre"
                className="bg-background"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Hip-hop, Pop, Jazz"
              />
            </div>
            <div>
              <Label htmlFor="song-language" className="mb-2 block">Language</Label>
              <Input
                id="song-language"
                className="bg-background"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English"
              />
            </div>
            <div>
              <Label htmlFor="song-release-date" className="mb-2 block">Release date</Label>
              <Input
                id="song-release-date"
                type="date"
                className="bg-background"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
             <div className="md:col-span-2">
              <Label htmlFor="song-description" className="mb-2 flex items-center gap-2">
                <Info className="size-4 text-muted-foreground" /> Description
              </Label>
              <Textarea
                id="song-description"
                className="min-h-24 resize-y bg-background"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell listeners a little about this release"
              />
            </div>
            <div>
              <Label htmlFor="song-tags" className="mb-2 block">Tags</Label>
              <Input
                id="song-tags"
                className="bg-background"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Separate tags with commas"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
              <input
                id="song-explicit"
                type="checkbox"
                checked={explicit}
                onChange={(e) => setExplicit(e.target.checked)}
                className="size-4 accent-emerald-500"
              />
              <Label htmlFor="song-explicit" className="cursor-pointer">Explicit content</Label>
            </div>
          </div>

          <div className="space-y-4 border-t border-border/70 pt-6">
            <div>
              <h3 className="text-base font-semibold">Files and artwork</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your audio master and square cover art.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div
                {...getCoverRoot()}
                className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <input {...getCoverInput()} aria-label="Choose cover artwork" />
                {coverPreview ? (
                  <div className="flex items-center gap-4 text-left">
                    <Image src={coverPreview} width={96} height={96} alt="Cover preview" unoptimized className="size-24 rounded-lg object-cover shadow-sm" />
                    <div className="min-w-0">
                      <p className="font-medium">Artwork selected</p>
                      <p className="mt-1 max-w-44 truncate text-sm text-muted-foreground">{coverFile?.name}</p>
                      <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Choose another image</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                      <UploadCloud className="size-5" aria-hidden="true" />
                    </span>
                    <p className="font-medium">Add cover artwork <span className="text-emerald-600">*</span></p>
                    <p className="mt-1 text-sm text-muted-foreground">Drag an image here or browse files</p>
                    <p className="mt-3 text-xs text-muted-foreground">JPG or PNG recommended</p>
                  </>
                )}
                {errors.cover && <p role="alert" className="mt-2 text-sm text-destructive">{errors.cover}</p>}
              </div>

              <div
                {...getAudioRoot()}
                className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <input {...getAudioInput()} aria-label="Choose audio file" />
                {file ? (
                  <>
                    <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <UploadCloud className="size-5" aria-hidden="true" />
                    </span>
                    <p className="max-w-full truncate font-medium">{file.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">Choose another audio file</p>
                  </>
                ) : (
                  <>
                    <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                      <UploadCloud className="size-5" aria-hidden="true" />
                    </span>
                    <p className="font-medium">Add audio master <span className="text-emerald-600">*</span></p>
                    <p className="mt-1 text-sm text-muted-foreground">Drag an audio file here or browse files</p>
                    <p className="mt-3 text-xs text-muted-foreground">High-quality audio recommended</p>
                  </>
                )}
                {errors.file && <p role="alert" className="mt-2 text-sm text-destructive">{errors.file}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Required fields are marked with an asterisk.</p>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400 sm:w-auto"
            >
              {uploading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {uploading ? "Uploading track…" : "Submit release"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}