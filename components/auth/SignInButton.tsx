// components/auth/SignInButton.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { RiLoginCircleFill } from "react-icons/ri";
import { motion } from "framer-motion";
import { LogOut, Users, User } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function SignInButton() {
  const { data: session, status } = useSession();
  const [accountOpen, setAccountOpen] = useState(false)

  if (status === "loading") {
    return <Button className="rounded-full" disabled>Loading…</Button>;
  }

  if (!session) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button asChild className="rounded-full bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900">
          <Link href="/auth">
            <RiLoginCircleFill className="text-black" />
            <span>Sign in</span>
          </Link>
        </Button>
      </motion.div>
    );
  }

   

  return (
        <Popover open={accountOpen} onOpenChange={setAccountOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Open account menu" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "Account"} />
                <AvatarFallback>CM</AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
  
          <PopoverContent className="bg-white dark:bg-black/90 text-black/90 dark:text-white w-56 p-0">
            <div className="p-3 border-b">
              <div className="font-medium">{session.user.stageName || session.user.name}</div>
              <div className="text-xs text-muted-foreground">User Account</div>
            </div>
  
            <div className="flex flex-col p-1">
              <Button asChild variant="ghost" className="w-full justify-start gap-2">
                <Link href={`/profile/${session.user.id}`} onClick={() => setAccountOpen(false)}>
                  <User size={16} /> Profile
                </Link>
              </Button>
              {(session.user.role === "artist" || session.user.role === "producer") && (
                <Button asChild variant="ghost" className="w-full justify-start gap-2">
                  <Link href="/studio/dashboard" onClick={() => setAccountOpen(false)}>
                    <Users size={16} /> Creator Dashboard
                  </Link>
                </Button>
              )}
              <Button onClick={() => signOut()} variant="ghost" className="w-full justify-start gap-2 text-red-500">
                <LogOut size={16} /> Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
  );
}
