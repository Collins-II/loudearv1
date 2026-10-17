"use client"

import * as React from "react"
import { Globe } from "lucide-react"

import { CiSettings } from "react-icons/ci"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover"

import CurrencyDropdown from "./currency-popover"

export function NavActions() {
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const { theme, setTheme } = useTheme()

  const formattedDate = React.useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
  }, [])

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="hidden md:inline-block text-white italic font-medium">
        {formattedDate}
      </div>

      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open settings"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <CiSettings />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-72 max-h-[80vh] bg-white dark:bg-black/90 rounded-lg p-0 overflow-y-auto"
        >
          <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="flex items-center gap-2 text-sm">
                  <Globe size={16} /> Theme
                </span>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                />
              </div>

              <CurrencyDropdown />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
