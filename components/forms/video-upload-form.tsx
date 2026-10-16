"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Video,
  ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { uploadToCloudinary } from "@/lib/helpers";
import { Progress } from "../ui/progress";

interface VideoUploadFormProps {
  onSuccess?: () => void;
}

const videoSteps = ["Video details", "Thumbnail", "Video file", "Review & upload"];

export default function VideoUploadForm({ onSuccess }: VideoUploadFormProps) {
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Metadata fields
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [videographer, setVideographer] = useState("");
  const [genre, setGenre] = useState("");
  const [features, setFeatures] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [tags, setTags] = useState("");
  const [label, setLabel] = useState("");
  const [mood, setMood] = useState("");
  const [copyright, setCopyright] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("private");

  // Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const { getRootProps: getVideoRoot, getInputProps: getVideoInput } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop: (files) => setVideoFile(files[0]),
  });

  const { getRootProps: getThumbRoot, getInputProps: getThumbInput } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        setThumbnail(files[0]);
        setThumbnailPreview(URL.createObjectURL(files[0]));
      }
    },
  });

  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  // ---- Upload Handler ----
  const handleUpload = async () => {
    if (!title || !artist || !videographer || !videoFile || !thumbnail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let thumbResult: string | undefined;
      let videoUrl: string | undefined;

      // Thumbnail upload
      if (thumbnail) {
        const thumbUpload = await uploadToCloudinary(
          thumbnail,
          "videos/thumbnails",
          "image",
          (p) => setUploadProgress(p)
        );
        thumbResult = thumbUpload.secure_url;
      }

      // Video upload
      if (videoFile) {
        const videoUpload = await uploadToCloudinary(
          videoFile,
          "videos/files",
          "video",
          (p) => setUploadProgress(p)
        );
        videoUrl = videoUpload.secure_url;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("videographer", videographer);
      formData.append("genre", genre);
      formData.append("description", description);
      formData.append("features", features);
      formData.append("releaseDate", releaseDate);
      formData.append("tags", tags);
      formData.append("label", label);
      formData.append("mood", mood);
      formData.append("copyright", copyright);
      formData.append("visibility", visibility);
      formData.append("video", videoUrl as string);
      formData.append("thumbnail", thumbResult as string);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/videos/upload");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          toast.success("Video uploaded successfully!");
          onSuccess?.();
          resetForm();
        } else {
          toast.error("Upload failed: " + xhr.statusText);
        }
      };

      xhr.onerror = () => {
        toast.error("Upload failed. Network error.");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err: any) {
      toast.error(err.message || "Upload error");
      setUploading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setArtist("");
    setVideographer("");
    setGenre("");
    setReleaseDate("");
    setDescription("");
    setTags("");
    setLabel("");
    setMood("");
    setCopyright("");
    setVisibility("private");
    setVideoFile(null);
    setThumbnail(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
  };

  // ---- Step Renderer ----
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video-title" className="mb-2 block">Title <span className="text-emerald-600">*</span></Label>
              <Input id="video-title" className="bg-background" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter video title" />
            </div>
            <div>
              <Label htmlFor="video-artist" className="mb-2 block">Artist <span className="text-emerald-600">*</span></Label>
              <Input id="video-artist" className="bg-background" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Primary artist" />
            </div>
            <div>
              <Label htmlFor="video-videographer" className="mb-2 block">Videographer <span className="text-emerald-600">*</span></Label>
              <Input id="video-videographer" className="bg-background" value={videographer} onChange={(e) => setVideographer(e.target.value)} placeholder="Who filmed this video?" />
            </div>
            <div>
              <Label htmlFor="video-genre" className="mb-2 block">Genre</Label>
              <Input id="video-genre" className="bg-background" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Hip-hop, Gospel" />
            </div>
            <div>
              <Label htmlFor="video-label" className="mb-2 block">Label</Label>
              <Input id="video-label" className="bg-background" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="video-copyright" className="mb-2 block">Copyright</Label>
              <Input id="video-copyright" className="bg-background" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="video-mood" className="mb-2 block">Mood</Label>
              <Input id="video-mood" className="bg-background" value={mood} onChange={(e) => setMood(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="video-visibility" className="mb-2 block">Visibility</Label>
              <select
                id="video-visibility"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={visibility}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "public" || value === "private" || value === "unlisted") {
                    setVisibility(value);
                  }
                }}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="video-description" className="mb-2 block">Description</Label>
              <Textarea
                id="video-description"
                className="min-h-24 resize-y bg-background"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell listeners about this video"
              />
            </div>
            <div>
              <Label htmlFor="video-tags" className="mb-2 block">Tags</Label>
              <Input id="video-tags" className="bg-background" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Separate tags with commas" />
            </div>
            <div>
              <Label htmlFor="video-features" className="mb-2 block">Featured artists</Label>
              <Input id="video-features" className="bg-background" value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Add collaborators" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center gap-4">
            <Label className="self-start">Thumbnail <span className="text-emerald-600">*</span></Label>
            <div
              {...getThumbRoot()}
              className="flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <input {...getThumbInput()} aria-label="Choose video thumbnail" />
              {thumbnailPreview ? (
                <div className="space-y-3">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={240} height={150} unoptimized className="mx-auto max-h-40 rounded-lg object-cover shadow-sm" />
                  <p className="text-sm text-muted-foreground">{thumbnail?.name} · Choose another image</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="mb-3 size-8" aria-hidden="true" />
                  <p className="font-medium text-foreground">Add a thumbnail</p>
                  <p className="mt-1 text-sm">Drag an image here or browse files</p>
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center gap-4">
            <Label className="self-start">Video file <span className="text-emerald-600">*</span></Label>
            <div
              {...getVideoRoot()}
              className="flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center outline-none transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <input {...getVideoInput()} aria-label="Choose video file" />
              {videoFile ? (
                <div className="space-y-2">
                  <Video className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <p className="max-w-full truncate font-medium">{videoFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Choose another video</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Upload className="mb-3 size-8" aria-hidden="true" />
                  <p className="font-medium text-foreground">Add your video</p>
                  <p className="mt-1 text-sm">Drag a video here or browse files</p>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review your release</h3>
            <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Title</span><br /><strong>{title || "Not set"}</strong></p>
              <p><span className="text-muted-foreground">Artist</span><br /><strong>{artist || "Not set"}</strong></p>
              <p><span className="text-muted-foreground">Videographer</span><br /><strong>{videographer || "Not set"}</strong></p>
              <p><span className="text-muted-foreground">Genre</span><br /><strong>{genre || "Not set"}</strong></p>
              <p><span className="text-muted-foreground">Visibility</span><br /><strong className="capitalize">{visibility}</strong></p>
            </div>

            {thumbnailPreview && (
              <Image
                src={thumbnailPreview}
                alt="Thumbnail"
                width={180}
                height={110}
                unoptimized
                className="rounded-lg object-cover"
              />
            )}

            {videoFile && <p className="text-sm"><strong>Video File:</strong> {videoFile.name}</p>}

            {uploading && (
  <div className="space-y-2 mt-4">
    <Progress
      value={uploadProgress}
      className="h-2 bg-muted transition-all duration-300"
    />
    <p className="text-center text-xs text-muted-foreground">
      Uploading... {uploadProgress}%
    </p>
  </div>
)}

          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mx-auto max-w-4xl overflow-hidden rounded-2xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b border-border/70 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Video className="size-5" aria-hidden="true" />
            </span>
            Video details
          </CardTitle>
          <p className="text-sm text-muted-foreground">Add your video information, assets, and visibility settings.</p>
        </CardHeader>
        <CardContent className="space-y-7 p-6">
          {/* Steps indicator */}
          <div role="group" aria-label={`Step ${step} of ${videoSteps.length}: ${videoSteps[step - 1]}`} className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Release setup</span>
              <span>{step} of {videoSteps.length}</span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {videoSteps.map((label, index) => (
                <div key={label} className={`h-1.5 flex-1 rounded-full transition-colors ${index < step ? "bg-emerald-500" : "bg-muted"}`} />
              ))}
            </div>
            <p className="text-sm font-semibold">{videoSteps[step - 1]}</p>
          </div>

          {renderStep()}

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="w-full rounded-full sm:w-auto"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                className="ml-auto w-full rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400 sm:w-auto"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  disabled={uploading}
                  onClick={handleUpload}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 font-semibold text-black hover:bg-emerald-400 sm:w-auto"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Upload Video"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
