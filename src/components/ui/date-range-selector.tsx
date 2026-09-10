"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function formatDate(date: Date | undefined) {
  return date ? date.toLocaleDateString() : "Select date";
}

function SingleDatePicker({
  disabled,
  id,
  label,
  maxDate,
  minDate,
  onSelect,
  placeholder,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  maxDate?: Date;
  minDate?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
  value: Date | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

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
            {value ? formatDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto overflow-hidden border-slate-200 bg-white p-0 text-slate-950 shadow-lg"
        >
          <Calendar
            captionLayout="dropdown"
            className="bg-white text-slate-950"
            defaultMonth={value || minDate}
            disabled={disabledDays}
            endMonth={maxDate}
            mode="single"
            onSelect={(date) => {
              onSelect(date);
              setOpen(false);
            }}
            selected={value}
            startMonth={minDate}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function DateRangeSelector({
  endDate,
  maximumDate,
  maximumStartDate,
  minimumDate,
  onEndDateChange,
  onStartDateChange,
  startDate,
}: {
  endDate: string;
  maximumDate?: string | null;
  maximumStartDate?: string | null;
  minimumDate?: string | null;
  onEndDateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  startDate: string;
}) {
  const selectedStartDate = React.useMemo(
    () => parseInputDate(startDate),
    [startDate]
  );
  const selectedEndDate = React.useMemo(
    () => parseInputDate(endDate),
    [endDate]
  );
  const allowedMinimumDate = React.useMemo(
    () => parseInputDate(minimumDate || ""),
    [minimumDate]
  );
  const allowedMaximumDate = React.useMemo(
    () => parseInputDate(maximumDate || ""),
    [maximumDate]
  );
  const allowedMaximumStartDate = React.useMemo(
    () => parseInputDate(maximumStartDate || ""),
    [maximumStartDate]
  );
  const startDateMaximum = allowedMaximumStartDate || allowedMaximumDate;

  React.useEffect(() => {
    if (!selectedStartDate) {
      return;
    }

    if (
      (allowedMinimumDate && selectedStartDate < allowedMinimumDate) ||
      (startDateMaximum && selectedStartDate > startDateMaximum)
    ) {
      onStartDateChange("");
    }
  }, [
    allowedMinimumDate,
    onStartDateChange,
    selectedStartDate,
    startDateMaximum,
  ]);

  React.useEffect(() => {
    if (!selectedEndDate) {
      return;
    }

    if (
      (selectedStartDate && selectedEndDate < selectedStartDate) ||
      (allowedMaximumDate && selectedEndDate > allowedMaximumDate)
    ) {
      onEndDateChange("");
    }
  }, [allowedMaximumDate, onEndDateChange, selectedEndDate, selectedStartDate]);

  function handleStartSelect(date: Date | undefined) {
    onStartDateChange(date ? toInputDate(date) : "");

    if (!date || (selectedEndDate && selectedEndDate < date)) {
      onEndDateChange("");
    }
  }

  function handleEndSelect(date: Date | undefined) {
    onEndDateChange(date ? toInputDate(date) : "");
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-6">
        <SingleDatePicker
          id="start-date"
          label="Start date"
          maxDate={startDateMaximum}
          minDate={allowedMinimumDate}
          onSelect={handleStartSelect}
          placeholder="Select start date"
          value={selectedStartDate}
        />
        <SingleDatePicker
          disabled={!selectedStartDate}
          id="end-date"
          label="End date"
          maxDate={allowedMaximumDate}
          minDate={selectedStartDate}
          onSelect={handleEndSelect}
          placeholder={
            selectedStartDate ? "Select end date" : "Select start date first"
          }
          value={selectedEndDate}
        />
      </div>
    </div>
  );
}
