"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const months = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

function parseMonth(value: string) {
  const month = Number(value);

  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined;
}

function formatMonth(value: string) {
  return months.find((month) => month.value === value)?.label;
}

function MonthPicker({
  disabled,
  id,
  label,
  minMonth,
  onSelect,
  placeholder,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  minMonth?: number;
  onSelect: (month: string) => void;
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selectableMonths = React.useMemo(
    () => months.filter((month) => !minMonth || Number(month.value) >= minMonth),
    [minMonth]
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
            {formatMonth(value) || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[220px] overflow-hidden border-slate-200 bg-white p-0 text-slate-950 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-1 p-1">
            {selectableMonths.map((month) => (
              <Button
                className="justify-start font-normal"
                key={month.value}
                onClick={() => {
                  onSelect(month.value);
                  setOpen(false);
                }}
                type="button"
                variant={value === month.value ? "default" : "ghost"}
              >
                {month.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function MonthRangeSelector({
  endMonth,
  onEndMonthChange,
  onStartMonthChange,
  startMonth,
}: {
  endMonth: string;
  onEndMonthChange: (value: string) => void;
  onStartMonthChange: (value: string) => void;
  startMonth: string;
}) {
  const selectedStartMonth = parseMonth(startMonth);
  const selectedEndMonth = parseMonth(endMonth);

  function handleStartSelect(month: string) {
    const parsedMonth = parseMonth(month);

    onStartMonthChange(month);

    if (!parsedMonth || (selectedEndMonth && selectedEndMonth < parsedMonth)) {
      onEndMonthChange("");
    }
  }

  function handleEndSelect(month: string) {
    onEndMonthChange(month);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-6">
        <MonthPicker
          id="start-month"
          label="Start month"
          onSelect={handleStartSelect}
          placeholder="Select start month"
          value={startMonth}
        />
        <MonthPicker
          disabled={!selectedStartMonth}
          id="end-month"
          label="End month"
          minMonth={selectedStartMonth}
          onSelect={handleEndSelect}
          placeholder={selectedStartMonth ? "Select end month" : "Select start month first"}
          value={endMonth}
        />
      </div>
    </div>
  );
}
