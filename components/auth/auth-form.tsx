"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, AudioLines, Camera, Check, LoaderCircle, MapPin, Mic2, Music2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const GENRES = ["Afrobeat", "Hip-Hop", "Pop", "R&B", "Gospel", "Dancehall", "House", "Rock", "Jazz", "Classical", "Reggae", "Electronic"];
const NETWORKS = [
  { id: "MTN", label: "MTN Mobile Money" },
  { id: "Airtel", label: "Airtel Money" },
  { id: "Zamtel", label: "Zamtel Kwacha" },
  { id: "Other", label: "Other" },
];
const SOCIALS = [
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "website", label: "Website" },
];

type Role = "fan" | "artist" | "producer";
type Step = "role" | "profile" | "music" | "creator";

interface RegistrationUser {
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role?: Role;
  stageName?: string;
  bio?: string;
  location?: string;
  isNewUser?: boolean;
  genres?: string[];
  socialLinks?: Record<string, string | undefined>;
  payment?: {
    mobileMoney?: {
      provider?: string;
      phoneNumber?: string;
    };
  };
}

const FAN_STEPS: Step[] = ["role", "profile", "music"];
const ARTIST_STEPS: Step[] = ["role", "profile", "music", "creator"];
const STEP_COPY: Record<Step, { title: string; description: string }> = {
  role: { title: "How will you use LoudEar?", description: "Pick the experience that feels like you. You can explore music either way." },
  profile: { title: "Make yourself at home", description: "Add a few details so your profile feels like yours." },
  music: { title: "What are you listening to?", description: "Choose the sounds you want to see more of. You can change these anytime." },
  creator: { title: "Set up your creator presence", description: "Add links for your listeners. Payout details can be added later in your studio." },
};

function getPostRegistrationPath(role: Role, callbackUrl: string) {
  if (callbackUrl === "/") {
    return role === "fan" ? "/" : "/studio/dashboard";
  }

  const pathname = callbackUrl.split(/[?#]/, 1)[0];
  const isBeatRoute = pathname === "/studio/dashboard/admin/beats" ||
    pathname.startsWith("/studio/dashboard/admin/beats/") ||
    pathname === "/studio/dashboard/upload/beat" ||
    pathname.startsWith("/studio/dashboard/upload/beat/");
  const isArtistRoute = pathname === "/artist" || pathname.startsWith("/artist/");
  const isStudioRoute = pathname === "/studio/dashboard" || pathname.startsWith("/studio/dashboard/");

  if (isBeatRoute && role !== "producer") return "/studio/dashboard";
  if (isArtistRoute && role !== "artist") return role === "fan" ? "/" : "/studio/dashboard";
  if (isStudioRoute && role === "fan") return "/";
  return callbackUrl;
}

export function RegisterForm({
  user,
  callbackUrl = "/",
  className,
}: {
  user: RegistrationUser;
  callbackUrl?: string;
  className?: string;
}) {
  const router = useRouter();
  const { update, data: session } = useSession();
  const [role, setRole] = useState<Role>(user.role || "fan");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState(user.name || "");
  const [stageName, setStageName] = useState(user.stageName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [genres, setGenres] = useState<string[]>(user.genres || []);
  const [socials, setSocials] = useState<Record<string, string>>({
    instagram: user.socialLinks?.instagram ?? "",
    twitter: user.socialLinks?.twitter ?? "",
    facebook: user.socialLinks?.facebook ?? "",
    tiktok: user.socialLinks?.tiktok ?? "",
    youtube: user.socialLinks?.youtube ?? "",
    website: user.socialLinks?.website ?? "",
  });
  const [payoutNetwork, setPayoutNetwork] = useState(user.payment?.mobileMoney?.provider || "");
  const [payoutPhone, setPayoutPhone] = useState(user.payment?.mobileMoney?.phoneNumber || "");
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.image || null);

  const steps = role === "fan" ? FAN_STEPS : ARTIST_STEPS;
  const currentStep = steps[step] ?? "role";
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const firstName = name.trim().split(/\s+/)[0] || "there";

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    noClick: true,
    onDrop: (files) => {
      const file = files[0];
      if (!file) return;
      setLocalImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormError(null);
    },
    onDropRejected: () => setFormError("Choose a JPG, PNG, or WebP image under 5 MB."),
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Location detection is not available in this browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const query = new URLSearchParams({ format: "jsonv2", lat: String(coords.latitude), lon: String(coords.longitude) });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
        if (!response.ok) throw new Error("Location lookup failed");
        const data = await response.json();
        const foundLocation = data.address?.city || data.address?.town || data.address?.village || data.address?.state || data.address?.country;
        if (foundLocation) setLocation(foundLocation);
        else setFormError("We couldn't find a place name for your location.");
      } catch {
        setFormError("We couldn't detect your location. You can enter it instead.");
      } finally {
        setDetectingLocation(false);
      }
    }, () => {
      setFormError("Location access was unavailable. You can enter your location instead.");
      setDetectingLocation(false);
    }, { timeout: 10000, maximumAge: 60000 });
  };

  const moveNext = () => {
    setFormError(null);
    if (currentStep === "profile") {
      if (!name.trim()) {
        setFormError("Add your name to continue.");
        return;
      }
      if (role !== "fan" && !stageName.trim()) {
        setFormError(`Add your ${role === "producer" ? "producer" : "artist"} name to continue.`);
        return;
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const uploadImage = async (file: File) => {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("folder", "loudear/avatars");
    const response = await fetch("/api/upload/cloudinary", { method: "POST", body: payload });
    const result = await response.json();
    if (!response.ok || typeof result.secure_url !== "string") {
      throw new Error(result.error || "Profile photo upload failed.");
    }
    return result.secure_url as string;
  };

  const finishRegistration = async () => {
    if (!name.trim() || (role !== "fan" && !stageName.trim())) {
      setStep(1);
      setFormError(role !== "fan" ? `Add your name and ${role === "producer" ? "producer" : "artist"} name before finishing.` : "Add your name before finishing.");
      return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const finalImage = localImageFile ? await uploadImage(localImageFile) : null;
      const payload = new FormData();
      payload.append("name", name.trim());
      payload.append("bio", bio);
      payload.append("location", location);
      payload.append("phone", user.phone || "");
      payload.append("role", role);
      payload.append("stageName", role !== "fan" ? stageName.trim() : "");
      payload.append("genres", JSON.stringify(genres));
      payload.append("socials", JSON.stringify(role !== "fan" ? socials : {}));
      payload.append("payout", JSON.stringify({ network: payoutNetwork, phone: payoutPhone }));
      if (finalImage) payload.append("imageUrl", finalImage);

      const response = await fetch("/api/users/update", { method: "PATCH", body: payload });
      const result = await response.json();
      if (!response.ok || !result.user) throw new Error(result.error || "We couldn't save your profile. Please try again.");

      await update({ user: {
        ...session?.user,
        name: result.user.name,
        stageName: result.user.stageName,
        image: result.user.image,
        location: result.user.location,
        role: result.user.role,
        isNewUser: false,
      } });
      toast.success("Your LoudEar profile is ready.");
      router.replace(getPostRegistrationPath(role, callbackUrl));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (currentStep === "role") {
      return (
        <RadioGroup value={role} onValueChange={(value) => { setRole(value as Role); setStep(0); setFormError(null); }} className="grid gap-3 sm:grid-cols-2">
          <Label className={cn("flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors", role === "fan" ? "border-[#335c3b] bg-[#f2f7ed]" : "border-border hover:bg-muted/50")}>
            <RadioGroupItem value="fan" className="mt-1" />
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#335c3b]"><UserRound className="size-5" /></span>
            <span><span className="block font-semibold">I’m here to listen</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">Find new artists and follow the sounds you love.</span></span>
          </Label>
          <Label className={cn("flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors", role === "artist" ? "border-[#335c3b] bg-[#f2f7ed]" : "border-border hover:bg-muted/50")}>
            <RadioGroupItem value="artist" className="mt-1" />
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#335c3b]"><Mic2 className="size-5" /></span>
            <span><span className="block font-semibold">I make music</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">Build your artist presence and meet your listeners.</span></span>
          </Label>
          <Label className={cn("flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors sm:col-span-2", role === "producer" ? "border-[#335c3b] bg-[#f2f7ed]" : "border-border hover:bg-muted/50")}>
            <RadioGroupItem value="producer" className="mt-1" />
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#335c3b]"><AudioLines className="size-5" /></span>
            <span><span className="block font-semibold">I produce beats</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">Sell instrumentals, set license terms, and grow your producer catalog.</span></span>
          </Label>
        </RadioGroup>
      );
    }

    if (currentStep === "profile") {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
              {imagePreview ? <Image src={imagePreview} alt="Profile photo preview" fill unoptimized sizes="80px" className="object-cover" /> : <UserRound className="size-8" />}
            </div>
            <div>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <Button type="button" variant="outline" className="gap-2" onClick={(event) => { event.stopPropagation(); open(); }}><Camera className="size-4" />{isDragActive ? "Drop photo" : "Add a photo"}</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Optional. JPG, PNG, or WebP, up to 5 MB.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Your name</Label>
              <Input id="profile-name" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            {role !== "fan" && <div className="space-y-2"><Label htmlFor="stage-name">{role === "producer" ? "Producer name" : "Artist name"}</Label><Input id="stage-name" maxLength={100} value={stageName} onChange={(event) => setStageName(event.target.value)} placeholder="The name listeners know" /></div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-location">Location <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="flex gap-2"><div className="relative min-w-0 flex-1"><MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-location" autoComplete="address-level2" maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or region" className="pl-9" /></div><Button type="button" variant="outline" onClick={detectLocation} disabled={detectingLocation}>{detectingLocation ? <LoaderCircle className="size-4 animate-spin" /> : "Detect"}</Button></div>
          </div>
          <div className="space-y-2"><Label htmlFor="profile-bio">A little about you <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="profile-bio" maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={role === "artist" ? "Tell listeners about your sound..." : role === "producer" ? "Tell artists about your production style..." : "What brings you to LoudEar?"} className="min-h-24 resize-y" /><p className="text-right text-xs text-muted-foreground">{bio.length}/500</p></div>
        </div>
      );
    }

    if (currentStep === "music") {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-[#f2f7ed] p-4 text-[#263d2a]"><Music2 className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">{role === "artist" ? "Tag the genres that best describe your sound." : role === "producer" ? "Choose the genres you produce so artists can discover your sound." : "Pick a few genres and we’ll tune your discovery around them."}</p></div>
          <MultiSelect options={GENRES.map((genre) => ({ label: genre, value: genre }))} value={genres} onChange={setGenres} placeholder="Choose genres" className="w-full" />
          <p className="text-xs text-muted-foreground">Optional. Pick as many as you like.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label>Artist links <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIALS.map((social) => <div key={social.id} className="space-y-1.5"><Label htmlFor={`social-${social.id}`} className="text-xs text-muted-foreground">{social.label}</Label><Input id={`social-${social.id}`} type="url" inputMode="url" value={socials[social.id] || ""} onChange={(event) => setSocials((current) => ({ ...current, [social.id]: event.target.value }))} placeholder="https://" /></div>)}
          </div>
        </div>
        <details className="rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Add payout contact (optional)</summary>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">You can also add or update this later from your studio settings.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="payout-network">Mobile money network</Label><select id="payout-network" value={payoutNetwork} onChange={(event) => setPayoutNetwork(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose network</option>{NETWORKS.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="payout-phone">Mobile money number</Label><Input id="payout-phone" type="tel" autoComplete="tel" maxLength={40} value={payoutPhone} onChange={(event) => setPayoutPhone(event.target.value)} placeholder="Your payout number" /></div>
          </div>
        </details>
      </div>
    );
  };

  const isLastStep = step === steps.length - 1;

  return (
    <main className={cn("min-h-svh bg-[#101a16] px-4 py-6 text-foreground sm:px-8 sm:py-8", className)}>
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between text-white">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="LoudEar home"><span className="grid size-9 place-items-center rounded-full bg-[#b8f36b] text-[#142116]"><Music2 className="size-4" /></span><span className="text-lg font-semibold tracking-wide">loudear</span></Link>
          <span className="text-xs text-white/60">Profile setup</span>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)] lg:gap-16 lg:py-12">
          <section className="mx-auto w-full max-w-2xl">
            <div className="mb-5 flex items-center gap-3 text-sm text-white/65"><span className="grid size-8 place-items-center rounded-full bg-white/10 text-[#b8f36b]"><Check className="size-4" /></span><span>Signed in as <strong className="font-medium text-white">{user.email}</strong></span></div>
            <div className="overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/20">
              <div className="px-5 pt-6 sm:px-8 sm:pt-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#42663d]">Step {step + 1} of {steps.length}</span>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Profile setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-[#42663d] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{STEP_COPY[currentStep].title}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{STEP_COPY[currentStep].description}</p>
              </div>

              <div className="px-5 pb-6 pt-6 sm:px-8 sm:pb-8">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
                <div aria-live="polite" className="min-h-7 pt-3">{formError && <p role="alert" className="text-sm leading-5 text-destructive">{formError}</p>}</div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t pt-5">
                  {step > 0 ? <Button type="button" variant="outline" onClick={() => { setStep((current) => current - 1); setFormError(null); }} disabled={loading} className="gap-2"><ArrowLeft className="size-4" />Back</Button> : <span className="text-xs text-muted-foreground">You can update your profile anytime.</span>}
                  <Button type="button" onClick={isLastStep ? finishRegistration : moveNext} disabled={loading} className="min-w-32 gap-2 bg-[#315638] text-white hover:bg-[#25462c]">
                    {loading ? <><LoaderCircle className="size-4 animate-spin" />Saving...</> : isLastStep ? <>Finish setup<Check className="size-4" /></> : <>Continue<ArrowRight className="size-4" /></>}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="relative hidden min-h-[520px] overflow-hidden rounded-lg lg:block">
            <Image src="/assets/images/yomaps-03.jpg" alt="LoudEar artist performing for a live audience" fill sizes="40vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101a16]/90 via-[#101a16]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white xl:p-10"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#b8f36b]">Welcome to the community</p><h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight">Good music finds its people.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/70">Hi {firstName}. Let’s shape your LoudEar experience around what you love.</p></div>
          </aside>
        </div>
        <footer className="flex justify-center gap-5 pb-2 text-xs text-white/45"><Link href="/legal/terms" className="hover:text-white/75">Terms</Link><Link href="/legal/privacy-policy" className="hover:text-white/75">Privacy</Link></footer>
      </div>
    </main>
  );
}