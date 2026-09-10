"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

function parseYear(value: string) {
  if (!value) {
    return undefined;
  }

  const year = Number(value);

  return Number.isInteger(year) ? year : undefined;
}

function YearPicker({
  disabled,
  id,
  label,
  maxYear,
  minYear,
  onSelect,
  placeholder,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  maxYear: number;
  minYear: number;
  onSelect: (year: number | undefined) => void;
  placeholder: string;
  value: number | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const years = React.useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index),
    [maxYear, minYear]
  );

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-start border-slate-300 bg-white text-left font-normal text-slate-900 shadow-sm hover:bg-slate-50 hover:text-slate-950 focus-visible:border-teal-600 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          >
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[180px] overflow-hidden border-slate-200 bg-white p-0 text-slate-950 shadow-lg"
        >
          <ScrollArea className="h-64">
            <div className="flex flex-col p-1">
              {years.map((year) => (
                <Button
                  className="w-full justify-start font-normal"
                  key={year}
                  onClick={() => {
                    onSelect(year);
                    setOpen(false);
                  }}
                  type="button"
                  variant={value === year ? "default" : "ghost"}
                >
                  {year}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function YearRangeSelector({
  endYear,
  maxYear = new Date().getFullYear() + 10,
  minYear = 1950,
  maxStartYear,
  onEndYearChange,
  onStartYearChange,
  startYear,
}: {
  endYear: string;
  maxYear?: number;
  minYear?: number;
  maxStartYear?: number;
  onEndYearChange: (value: string) => void;
  onStartYearChange: (value: string) => void;
  startYear: string;
}) {
  const selectedStartYear = parseYear(startYear);
  const selectedEndYear = parseYear(endYear);

  React.useEffect(() => {
    if (selectedEndYear && selectedEndYear > maxYear) {
      onEndYearChange("");
    }
  }, [maxYear, onEndYearChange, selectedEndYear]);

  function handleStartSelect(year: number | undefined) {
    onStartYearChange(year ? String(year) : "");

    if (!year || (selectedEndYear && selectedEndYear < year)) {
      onEndYearChange("");
    }
  }

  function handleEndSelect(year: number | undefined) {
    onEndYearChange(year ? String(year) : "");
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-6">
        <YearPicker
          id="start-year"
          label="Start year"
          maxYear={maxStartYear ?? maxYear}
          minYear={minYear}
          onSelect={handleStartSelect}
          placeholder="Select start year"
          value={selectedStartYear}
        />
        <YearPicker
          disabled={!selectedStartYear}
          id="end-year"
          label="End year"
          maxYear={maxYear}
          minYear={selectedStartYear || minYear}
          onSelect={handleEndSelect}
          placeholder={selectedStartYear ? "Select end year" : "Select start year first"}
          value={selectedEndYear}
        />
      </div>
    </div>
  );
}
