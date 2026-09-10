"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface YearPickerProps {
  value?: number
  onChange: (year: number) => void
  startYear?: number
  endYear?: number
}

export function YearPicker({ 
  value, 
  onChange, 
  startYear = 1950, 
  endYear = new Date().getFullYear() + 10 
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Generate array of years from endYear down to startYear
  const years = React.useMemo(() => {
    return Array.from(
      { length: endYear - startYear + 1 }, 
      (_, i) => endYear - i
    )
  }, [startYear, endYear])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value : <span>Pick a year</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <ScrollArea className="h-64">
          <div className="flex flex-col p-1">
            {years.map((year) => (
              <Button
                key={year}
                variant={value === year ? "default" : "ghost"}
                className="justify-start font-normal w-full"
                onClick={() => {
                  onChange(year)
                  setOpen(false)
                }}
              >
                {year}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}