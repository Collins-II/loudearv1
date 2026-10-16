"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  Music,
  ImageIcon,
  Upload,
  Loader2,
  Calendar,
  PenLine,
  Globe,
  Users2,
  Building2,
  Copyright,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { getSocket } from "@/lib/socketClient";
import { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface AlbumUploadFormProps {
  onSuccess?: () => void;
}

interface SongMetadata {
  file: File;
  title: string;
  artist: string;
  genre: string;
  explicit: boolean;
  features: string;
  tags: string;
}

interface UploadProgress {
  [filename: string]: number;
}

const albumSteps = [
  "Release details",
  "Cover art",
  "Add tracks",
  "Track details",
  "Release settings",
  "Upload",
];

export default function AlbumUploadForm({ onSuccess }: AlbumUploadFormProps) {
  const [step, setStep] = useState(1);
  const socket = getSocket() as Socket | null;

  // ── Album Metadata ──────────────────────────────────────────────
  const [albumTitle, setAlbumTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [producers, setProducers] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [mood, setMood] = useState("");
  const [label, setLabel] = useState("");
  const [copyright, setCopyright] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("private");

  // ── Files ───────────────────────────────────────────────────────
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongMetadata[]>([]);

  // ── Upload State ────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // ── Socket Listeners for Real-Time Feedback ─────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.on("uploadProgress", ({ fileName, progress }) =>
      setUploadProgress((p) => ({ ...p, [fileName]: progress }))
    );
    socket.on("uploadComplete", ({ fileName }) =>
      toast.success(`${fileName} uploaded successfully`)
    );
    return () => {
      socket.off("uploadProgress");
      socket.off("uploadComplete");
    };
  }, [socket]);

  // ── Upload Logic with XHR Progress Tracking ─────────────────────
  const handleUpload = async () => {
    if (!albumTitle || !artist || !cover || songs.length === 0) {
      toast.error("Please complete all required fields before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("title", albumTitle);
    formData.append("artist", artist);
    formData.append("genre", genre);
    formData.append("releaseDate", releaseDate);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("producers", producers);
    formData.append("collaborators", collaborators);
    formData.append("mood", mood);
    formData.append("label", label);
    formData.append("copyright", copyright);
    formData.append("visibility", visibility);
    formData.append("cover", cover);

    songs.forEach((song, i) => {
      formData.append(`songs[${i}][file]`, song.file, song.file.name);
      formData.append(`songs[${i}][title]`, song.title);
      formData.append(`songs[${i}][artist]`, song.artist);
      formData.append(`songs[${i}][genre]`, song.genre);
      formData.append(`songs[${i}][explicit]`, String(song.explicit));
      formData.append(`songs[${i}][features]`, song.features);
      formData.append(`songs[${i}][tags]`, song.tags);
    });

    const xhr = new XMLHttpRequest();
    setUploading(true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        setUploadProgress((p) => ({ ...p, total: progress }));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status <= 300) {
        toast.success("Album uploaded successfully!");
        onSuccess?.();
        resetForm();
      } else toast.error("Upload failed.");
    };

    xhr.onerror = () => {
      setUploading(false);
      toast.error("Network error during upload.");
    };

    xhr.open("POST", "/api/albums/upload", true);
    xhr.send(formData);
  };

  const resetForm = () => {
    setStep(1);
    setAlbumTitle("");
    setArtist("");
    setGenre("");
    setReleaseDate("");
    setDescription("");
    setTags("");
    setProducers("");
    setCollaborators("");
    setMood("");
    setLabel("");
    setCopyright("");
    setVisibility("private");
    setCover(null);
    setCoverPreview(null);
    setSongs([]);
    setUploadProgress({});
    setUploading(false);
  };

  // ── Dropzones ───────────────────────────────────────────────────
  const { getRootProps: getCoverRoot, getInputProps: getCoverInput } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: (accepted) => {
      const file = accepted[0];
      setCover(file);
      setCoverPreview(URL.createObjectURL(file));
    },
  });

  const { getRootProps: getSongsRoot, getInputProps: getSongsInput } = useDropzone({
    accept: { "audio/*": [] },
    multiple: true,
    onDrop: (accepted) => {
      const newSongs = accepted.map((f) => ({
        file: f,
        title: f.name.replace(/\.[^/.]+$/, ""),
        artist,
        genre: "",
        explicit: false,
        features: "",
        tags: "",
      }));
      setSongs((s) => [...s, ...newSongs]);
    },
  });

  // ── UI Helpers ─────────────────────────────────────────────────
  const renderProgress = (fileName: string) => {
    const progress = uploadProgress[fileName] ?? uploadProgress.total ?? 0;
    return (
      <div className="mt-2">
        <Progress value={progress} className="h-2" />
        <p         className="mt-1 text-xs text-muted-foreground">{progress.toFixed(1)}%</p>
      </div>
    );
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ── Main UI ─────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="mx-auto max-w-5xl overflow-hidden rounded-2xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b border-border/70 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Music className="size-5" aria-hidden="true" />
            </span>
            Create an album release
          </CardTitle>
          <p className="text-sm text-muted-foreground">Complete each step to prepare your release for listeners.</p>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* ── Step Indicator ────────────────────────────────────── */}
          <div role="group" aria-label={`Step ${step} of ${albumSteps.length}: ${albumSteps[step - 1]}`} className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Release setup</span>
              <span>{step} of {albumSteps.length}</span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {albumSteps.map((label, index) => (
                <div
                  key={label}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index < step ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-sm font-semibold">{albumSteps[step - 1]}</p>
          </div>

          {/* Step 1: Album Info */}
          {step === 1 && (
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div>
                <Label htmlFor="album-title" className="mb-2 block">Album title <span className="text-emerald-600">*</span></Label>
                <Input id="album-title" className="bg-background" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} placeholder="Give your album a name" />
              </div>
              <div>
                <Label htmlFor="album-artist" className="mb-2 block">Artist <span className="text-emerald-600">*</span></Label>
                <Input id="album-artist" className="bg-background" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Primary artist" />
              </div>
              <div>
                <Label htmlFor="album-genre" className="mb-2 block">Genre</Label>
                <Input id="album-genre" className="bg-background" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Hip-hop, Pop, Jazz" />
              </div>
              <div>
                <Label htmlFor="album-release-date" className="mb-2 flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" /> Release date
                </Label>
                <Input id="album-release-date" type="date" className="bg-background" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="album-description" className="mb-2 block">Description</Label>
                <Textarea id="album-description" className="min-h-24 resize-y bg-background" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell listeners about this release" />
              </div>
              <div className="col-span-2 flex justify-end pt-4">
                <Button onClick={nextStep} className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 2: Cover Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <Label>Album Cover *</Label>
              <div {...getCoverRoot()} className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500">
                <input {...getCoverInput()} aria-label="Choose album cover artwork" />
                {coverPreview ? (
                  <div className="space-y-3">
                    <Image src={coverPreview} alt="Album cover preview" width={200} height={200} unoptimized className="mx-auto rounded-xl shadow-md" />
                    <p className="text-sm text-muted-foreground">{cover?.name} · Choose another image</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <ImageIcon className="mx-auto mb-3 size-8" aria-hidden="true" />
                    <p className="font-medium text-foreground">Drop or select your album cover</p>
                    <p className="mt-1 text-sm">Square JPG or PNG recommended</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep} className="rounded-full">Back</Button>
                <Button onClick={nextStep} className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 3: Upload Songs */}
          {step === 3 && (
            <div className="space-y-4">
              <Label>Songs *</Label>
              <div {...getSongsRoot()} className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500">
                <input {...getSongsInput()} aria-label="Choose album audio tracks" />
                <div className="text-muted-foreground">
                  <Upload className="mx-auto mb-3 size-8" aria-hidden="true" />
                  <p className="font-medium text-foreground">Add your audio tracks</p>
                  <p className="mt-1 text-sm">Drop multiple files here or browse files</p>
                </div>
              </div>
              {songs.map((s, i) => (
                <div key={`${s.file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <span className="min-w-0 truncate text-sm font-medium">{s.title || s.file.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                    <PenLine className="size-4" />
                    <span className="sr-only">Edit track {i + 1}</span>
                  </Button>
                </div>
              ))}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep} className="rounded-full">Back</Button>
                <Button onClick={nextStep} className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 4: Song Metadata */}
          {step === 4 && (
            <div className="space-y-4">
              {songs.map((song, i) => (
                <Card key={i} className="space-y-3 rounded-xl border-border bg-background p-4 shadow-none">
                  <Label htmlFor={`album-track-${i}`} className="text-sm font-semibold">Track {i + 1}</Label>
                  <Input id={`album-track-${i}`} className="bg-card" placeholder="Track title" value={song.title} onChange={(e) => {
                    const s = [...songs]; s[i].title = e.target.value; setSongs(s);
                  }} />
                  <Input aria-label={`Featured artists for track ${i + 1}`} placeholder="Featured artists" className="bg-card" value={song.features} onChange={(e) => {
                    const s = [...songs]; s[i].features = e.target.value; setSongs(s);
                  }} />
                  <Input aria-label={`Genre for track ${i + 1}`} placeholder="Genre" className="bg-card" value={song.genre} onChange={(e) => {
                    const s = [...songs]; s[i].genre = e.target.value; setSongs(s);
                  }} />
                  <div className="flex items-center gap-2">
                    <Switch checked={song.explicit} onCheckedChange={(v) => {
                      const s = [...songs]; s[i].explicit = v; setSongs(s);
                    }} />
                    <Label>Explicit content</Label>
                  </div>
                </Card>
              ))}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep} className="rounded-full">Back</Button>
                <Button onClick={nextStep} className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 5: Extra Album Details */}
          {step === 5 && (
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div>
              <Label htmlFor="album-producers" className="mb-2 flex items-center gap-2"><Users2 className="size-4 text-muted-foreground" /> Producers</Label>
              <Input id="album-producers" className="bg-background" value={producers} onChange={(e) => setProducers(e.target.value)} placeholder="Separate names with commas" />
              </div>
              <div>
              <Label htmlFor="album-collaborators" className="mb-2 flex items-center gap-2"><Users2 className="size-4 text-muted-foreground" /> Collaborators</Label>
              <Input id="album-collaborators" className="bg-background" value={collaborators} onChange={(e) => setCollaborators(e.target.value)} placeholder="Separate names with commas" />
              </div>
              <div>
              <Label htmlFor="album-mood" className="mb-2 flex items-center gap-2"><Globe className="size-4 text-muted-foreground" /> Mood</Label>
              <Input id="album-mood" className="bg-background" value={mood} onChange={(e) => setMood(e.target.value)} />
              </div>
              <div>
              <Label htmlFor="album-label" className="mb-2 flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" /> Label</Label>
              <Input id="album-label" className="bg-background" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
              <Label htmlFor="album-copyright" className="mb-2 flex items-center gap-2"><Copyright className="size-4 text-muted-foreground" /> Copyright</Label>
              <Input id="album-copyright" className="bg-background" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
              </div>
              <div>
              <Label htmlFor="album-visibility" className="mb-2 block">Visibility</Label>
                <select
                id="album-visibility"
                  value={visibility}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "public" || value === "private" || value === "unlisted") {
                      setVisibility(value);
                    }
                  }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="col-span-2 flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep} className="rounded-full">Back</Button>
                <Button onClick={nextStep} className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400">Continue</Button>
              </div>
            </div>
          )}

          {/* Step 6: Upload */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={prevStep} disabled={uploading} className="rounded-full">Back</Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400"
                >
                  {uploading && <Loader2 className="size-4 animate-spin" />}
                  {uploading ? "Uploading album…" : "Submit album"}
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {uploading && uploadProgress.total !== undefined && (
                  <div>
                    <p className="text-sm font-medium">Release upload</p>
                    {renderProgress("total")}
                  </div>
                )}
                {cover && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cover</p>
                    {renderProgress(cover.name)}
                  </div>
                )}
                {songs.map((song) => (
                  <div key={song.file.name}>
                    <p className="text-sm text-muted-foreground">{song.title}</p>
                    {renderProgress(song.file.name)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
