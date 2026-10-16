"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ShareProfileButtonProps {
  title: string;
}

export default function ShareProfileButton({ title }: ShareProfileButtonProps) {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Could not share profile:", error);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } catch (error) {
      console.error("Could not copy profile link:", error);
      toast.error("Could not share this profile. Copy the page address to share it.");
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleShare}>
      <Share2 aria-hidden="true" />
      Share profile
    </Button>
  );
}
