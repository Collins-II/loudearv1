"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Music2,
  Disc3,
  Video,
  //Mic2,
  //Headphones,
  //BarChart3,
  //Wallet,
  Megaphone,
  BadgeCheck,
  UploadCloud,
  ChevronRight,
} from "lucide-react";

import { SiYoutubestudio } from "react-icons/si";
import Image from "next/image";

interface UploadDropdownProps {
  animate?: boolean;
  scrolled?: boolean;
}

export default function UploadDropdown({
  animate = false,
  scrolled = false,
}: UploadDropdownProps) {
  const router = useRouter();

  const navigate = (url: string) => {
    router.push(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          animate={animate ? { x: [-5, 5, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Button
            className={`rounded-full gap-2 uppercase font-semibold shadow-md hover:text-white ${
              scrolled
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground"
            }`}
          >
            Studio
            <SiYoutubestudio size={18} />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="
          w-[340px]
          rounded-2xl
          border
          border-border
          bg-background
          text-foreground
          shadow-2xl
          p-2
          backdrop-blur-none
        "
      >
        {/* Header */}
        <div className="px-3 py-3">
          <h3 className="flex items-center gap-3 font-bold text-lg">
            <Image
              src="/assets/logo/logo-pi.jpg"
              alt="Loudear-Logo"
              width={50}
              height={50}
              className="rounded-full object-cover shadow-2xl"
              /> Creator Studio
          </h3>

          <p className="text-xs text-muted-foreground mt-1">
            Upload content,{/*  manage revenue, analytics,*/}
            promotions and creator verification.
          </p>
        </div>

        <DropdownMenuSeparator />

        {/* Uploads */}
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Upload Content
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => navigate("/upload/song")}
          className="cursor-pointer py-3"
        >
          <Music2 className="mr-3 h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="font-medium">Upload Song</p>
            <p className="text-xs text-muted-foreground">
              Release a new single.
            </p>
          </div>
          <ChevronRight size={16} />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/upload/album")}
          className="cursor-pointer py-3"
        >
          <Disc3 className="mr-3 h-5 w-5 text-purple-500" />
          <div className="flex-1">
            <p className="font-medium">Upload Album</p>
            <p className="text-xs text-muted-foreground">
              Publish EPs and albums.
            </p>
          </div>
          <ChevronRight size={16} />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/upload/video")}
          className="cursor-pointer py-3"
        >
          <Video className="mr-3 h-5 w-5 text-red-500" />
          <div className="flex-1">
            <p className="font-medium">Upload Video</p>
            <p className="text-xs text-muted-foreground">
              Music videos and visualizers.
            </p>
          </div>
          <ChevronRight size={16} />
        </DropdownMenuItem>

        {/* <DropdownMenuItem
          onClick={() => navigate("/upload/podcast")}
          className="cursor-pointer py-3"
        >
          <Mic2 className="mr-3 h-5 w-5 text-orange-500" />
          <div className="flex-1">
            <p className="font-medium">Upload Podcast</p>
            <p className="text-xs text-muted-foreground">
              Publish podcast episodes.
            </p>
          </div>
          <ChevronRight size={16} />
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/upload/audiobook")}
          className="cursor-pointer py-3"
        >
          <Headphones className="mr-3 h-5 w-5 text-cyan-500" />
          <div className="flex-1">
            <p className="font-medium">Upload Audiobook</p>
            <p className="text-xs text-muted-foreground">
              Sell and distribute audiobooks.
            </p>
          </div>
          <ChevronRight size={16} />
        </DropdownMenuItem>*/}

        <DropdownMenuSeparator />

        {/* Creator Tools */}
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Creator Tools
        </DropdownMenuLabel>

       {/* <DropdownMenuItem
          onClick={() => navigate("/creator/analytics")}
          className="cursor-pointer py-3"
        >
          <BarChart3 className="mr-3 h-5 w-5 text-blue-500" />
          Creator Analytics
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/creator/earnings")}
          className="cursor-pointer py-3"
        >
          <Wallet className="mr-3 h-5 w-5 text-emerald-500" />
          Earnings Dashboard
        </DropdownMenuItem>*/}

        <DropdownMenuItem
          onClick={() => navigate("/creator/promotions")}
          className="cursor-pointer py-3"
        >
          <Megaphone className="mr-3 h-5 w-5 text-pink-500" />
          Promote Content
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/creator/verification")}
          className="cursor-pointer py-3"
        >
          <BadgeCheck className="mr-3 h-5 w-5 text-sky-500" />
          Verification Request
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Footer */}
        <div className="p-2">
          <Button
            onClick={() => navigate("/creator/uploads")}
            className="w-full rounded-xl gap-2"
          >
            <UploadCloud size={16} />
            Manage Uploads
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}