"use client";

import Image from "next/image";
import Link from "next/link";
import { AudioLines, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProducerBeat {
  id: string;
  title: string;
  bpm: number | null;
  key: string;
  genre: string;
  price: number;
  image: string;
  visibility: "public" | "private" | "unlisted";
  createdAt: string;
}

export default function ClientIndex({ data }: { data: ProducerBeat[] }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Producer studio</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your beats</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your SoundHub catalog and release visibility.</p>
        </div>
        <Button asChild className="rounded-full bg-emerald-500 px-5 font-semibold text-black hover:bg-emerald-400">
          <Link href="/studio/dashboard/upload/beat"><Plus className="size-4" /> Upload a beat</Link>
        </Button>
      </header>

      {data.length === 0 ? (
        <Card className="rounded-2xl border-dashed shadow-none">
          <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <AudioLines className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Start your beat catalog</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload an instrumental, create its preview, and set license terms to make it available to artists.</p>
            <Button asChild className="mt-5 rounded-full bg-emerald-500 px-5 font-semibold text-black hover:bg-emerald-400">
              <Link href="/studio/dashboard/upload/beat"><Plus className="size-4" /> Create your first beat</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((beat) => (
            <Card key={beat.id} className="overflow-hidden rounded-2xl border-border shadow-sm">
              <div className="relative aspect-[16/10] bg-muted">
                {beat.image ? (
                  <Image src={beat.image} alt={`${beat.title} cover`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground"><AudioLines className="size-10" aria-hidden="true" /></div>
                )}
                <span className="absolute right-3 top-3 rounded-full border border-background/60 bg-background/90 px-2.5 py-1 text-xs font-medium capitalize text-foreground backdrop-blur">
                  {beat.visibility}
                </span>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{beat.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{[beat.genre, beat.bpm ? `${beat.bpm} BPM` : null, beat.key].filter(Boolean).join(" · ") || "Instrumental"}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-4 text-sm">
                  <span className="text-muted-foreground">Starting price</span>
                  <span className="font-semibold">K{beat.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {beat.createdAt ? `Added ${new Date(beat.createdAt).toLocaleDateString()}` : "Recently added"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
