"use client";

import { useState } from "react";
import Image, { ImageLoaderProps } from "next/image";
import { useRouter } from "next/navigation";
import { DownloadCloud, Eye, Flame, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StanButton } from "@/components/auth/StanButton";
import { timeAgo } from "@/lib/utils";

export interface DetailsHeroProps {
  /** Label shown in the type badge, e.g. "Song", "Album", "Video" */
  kind: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  features?: string[];
  genre?: string;
  createdAt?: string | Date;
  tags?: string[];
  trendingPosition?: number | null;
  chartPosition?: number | null;
  stats: {
    views?: number;
    likes?: number;
    downloads?: number;
  };
  stan?: {
    artistId: string;
    initialStanCount?: number;
  };
  /** Extra content rendered at the end of the metadata column */
  children?: React.ReactNode;
}

const PLACEHOLDER = "/assets/images/placeholder_cover.jpg";

const cloudinaryLoader = ({ src, width, quality }: ImageLoaderProps) => {
  try {
    const url = new URL(src);
    if (url.hostname.includes("res.cloudinary.com")) {
      return `${src}?w=${width}&q=${quality || 80}&f=auto`;
    }
    return src;
  } catch {
    return src;
  }
};

export default function DetailsHero({
  kind,
  title,
  artist,
  coverUrl,
  features,
  genre,
  createdAt,
  tags,
  trendingPosition,
  chartPosition,
  stats,
  stan,
  children,
}: DetailsHeroProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const visibleFeatures = (features ?? []).filter((f) => f.trim() !== "");

  return (
    <div className="italic bg-white dark:bg-neutral-900 dark:border-white/5 overflow-hidden">
      <div className="md:flex items-center gap-6 py-6">
        {/* Cover */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="relative w-full h-80 rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800">
            <Image
              src={!imgError && coverUrl ? coverUrl : PLACEHOLDER}
              alt={title}
              fill
              loader={cloudinaryLoader}
              className="object-cover"
              onError={() => setImgError(true)}
              priority
            />

            {!!trendingPosition && trendingPosition <= 10 && (
              <div className="absolute left-3 top-3 flex items-center gap-2 bg-gradient-to-r from-pink-600 to-orange-400 px-3 py-1 rounded-full text-xs font-semibold text-white shadow">
                <Flame size={14} /> HOT
              </div>
            )}

            {typeof chartPosition === "number" && (
              <div className="absolute right-3 top-3 px-3 py-1 rounded-full bg-black/80 text-white text-sm font-bold">
                #{chartPosition}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 md:mt-0 flex-1">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight capitalize">
            {title}
          </h2>

          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                By <span className="font-semibold text-black dark:text-white">{artist}</span>
              </p>

              {visibleFeatures.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-600">Features • </span>
                  {visibleFeatures.map((f, i) => (
                    <span key={i} className="text-xs text-gray-500">
                      {f}
                      {i < visibleFeatures.length - 1 && <span className="text-gray-400">, </span>}
                    </span>
                  ))}
                </p>
              )}

              {(genre || createdAt) && (
                <p className="text-sm text-gray-500 mt-1">
                  {genre && <span className="font-medium text-gray-600">{genre}</span>}
                  {genre && createdAt && " • "}
                  {createdAt && <span className="text-xs text-gray-500">{timeAgo(createdAt)}</span>}
                </p>
              )}
            </div>

            <div className="mt-3 sm:mt-0 flex items-center gap-2">
              <Badge className="uppercase px-3 py-1 text-xs">{kind}</Badge>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-start gap-4 flex-wrap">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <Stat icon={<Eye className="w-4 h-4 text-gray-500" />} value={stats.views ?? 0} label="views" />
              <Stat icon={<Heart className="w-4 h-4 text-gray-500" />} value={stats.likes ?? 0} label="likes" />
              <Stat
                icon={<DownloadCloud className="w-4 h-4 text-gray-500" />}
                value={stats.downloads ?? 0}
                label="downloads"
              />
            </div>

            {!!tags?.length && (
              <div className="flex flex-wrap items-center gap-3">
                {tags.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    onClick={() => router.push(`/search?q=${t.toLocaleLowerCase()}`)}
                    className="cursor-pointer rounded-full uppercase px-3 py-1 text-xs"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {stan && <StanButton artistId={stan.artistId} initialStanCount={stan.initialStanCount} />}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-semibold">{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
