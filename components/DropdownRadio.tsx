"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

interface DropdownProps {
  actionLabel: string
  label: string
  data: string[]
  onChange: (value: string) => void // pass the selected value
  value?: string
}

export function DropdownRadio({
  actionLabel,
  label,
  data,
  onChange,
  value,
}: DropdownProps) {
  const [position, setPosition] = React.useState(data[0] ?? "")
  const selectedValue = value ?? position

  const formatValue = (selected: string) =>
    selected.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase())

  const onChangeCall = (nextValue: string) => {
    if (value === undefined) setPosition(nextValue)
    onChange(nextValue)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 min-w-36 justify-between gap-4 border-white/15 bg-white/5 text-white hover:bg-white/10">
          <span>{actionLabel}</span>
          <span className="flex items-center gap-2 text-white/65">
            {formatValue(selectedValue)}
            <ChevronDown className="size-4" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-background text-foreground">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedValue} onValueChange={onChangeCall}>
          {data.map((d, i) => (
            <DropdownMenuRadioItem key={i} value={d}>
              {d}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
