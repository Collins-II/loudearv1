"use client"

import { useEffect, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getSocket } from "@/lib/socketClient"
import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"

interface StanButtonProps {
  artistId: string
  initialStanCount?: number
}

export function StanButton({ artistId, initialStanCount = 0 }: StanButtonProps) {
  const socket = getSocket()
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isStan, setIsStan] = useState(false)
  const [stanCount, setStanCount] = useState(initialStanCount)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)


  // Fetch the viewer's follow state and the live count
  useEffect(() => {
    if (!artistId) return
    const controller = new AbortController()
    setIsLoading(true)
    fetch(`/api/stan?artistId=${artistId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        setIsStan(!!data.userHasStanned)
        setStanCount(data.stanCount)
      })
      .catch((e) => {
        if (e?.name !== "AbortError") console.error("Failed to fetch stan status:", e)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [artistId, session?.user?.id])
  // Join artist-specific room
  useEffect(() => {
    if (!socket || !artistId) return
    socket.emit("join", `artist:${artistId}`)

    const handleUpdate = (payload: any) => {
      if (payload.artistId === artistId) {
        setStanCount(payload.stanCount)
      }
    }

    socket.on("stan:update", handleUpdate)

    return () => {
      socket.emit("leave", `artist:${artistId}`)
      socket.off("stan:update", handleUpdate)
    }
  }, [artistId, socket])

  // Handle follow/unfollow
  const handleToggle = async () => {
    if (!session?.user) {
      router.push(`/auth?callbackUrl=${encodeURIComponent(pathname)}`)
      return
    }
    if (!artistId || session.user.id === artistId) return

    const previous = { isStan, stanCount }
    startTransition(async () => {
      const nextState = !isStan
      setIsStan(nextState)
      setStanCount(Math.max(0, stanCount + (nextState ? 1 : -1))) // optimistic update

      try {
        const res = await fetch(`/api/stan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistId,
            action: nextState ? "stan" : "unstan",
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to update")

        setIsStan(!!data.userHasStanned)
        setStanCount(data.stanCount)
        toast.success(data.message || "Success ✅")
      } catch (err: unknown) {
        console.error(err)
        setIsStan(previous.isStan)
        setStanCount(previous.stanCount)
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={isStan}
        aria-label={isStan ? "Unstan artist" : "Stan artist"}
        onClick={handleToggle}
        disabled={isPending || isLoading || !artistId || session?.user?.id === artistId}
        className={cn(
          "transition-all duration-300 focus:outline-none",
          isPending && "opacity-70 cursor-not-allowed"
        )}
      >
        <Badge
          className={cn(
            "capitalize rounded-full px-3 py-1 text-xs font-medium select-none cursor-pointer",
            isStan
              ? "from-gray-700 to-gray-900 bg-gradient-to-r text-gray-100"
              : "from-pink-600 to-orange-400 bg-gradient-to-r text-white shadow-sm hover:shadow-md"
          )}
        >
          {isPending ? "Processing..." : isStan ? "Stanned 👋" : "Stan 🔥"}
        </Badge>
      </button>

      <span className="text-xs text-muted-foreground">
        {stanCount} {stanCount === 1 ? "stan" : "stans"}
      </span>
    </div>
  )
}
