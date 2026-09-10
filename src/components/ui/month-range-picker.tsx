"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Field, FieldLabel } from "@/components/ui/field";

export type TExcludeDates =
  | Array<{
      date: Date;
      message?: string;
    }>
  | Array<Date>;

type MonthRangePickerProps = {
  endDate?: Date | null;
  excludeDates?: TExcludeDates;
  maxDate?: Date;
  minDate?: Date;
  startMaxDate?: Date;
  onEndDateChange?: (date: Date | null) => void;
  onStartDateChange?: (date: Date | null) => void;
  startDate?: Date | null;
};

// 1. Generate years list from 1901 to 2099
const startYear = 1901;
const endYear = 2110;
const YEARS = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);



export function MonthRangePicker({
  endDate,
  excludeDates = [],
  maxDate,
  minDate,
  startMaxDate,
  onEndDateChange,
  onStartDateChange,
  startDate,
}: MonthRangePickerProps) {
  const [internalStartDate, setInternalStartDate] = useState<Date | null>(startDate ?? null);
  const [internalEndDate, setInternalEndDate] = useState<Date | null>(endDate ?? null);

  const selectedStartDate = startDate ?? internalStartDate;
  const selectedEndDate = endDate ?? internalEndDate;

  useEffect(() => {
    if (selectedEndDate && maxDate && selectedEndDate > maxDate) {
      onEndDateChange?.(null);
    }
  }, [maxDate, onEndDateChange, selectedEndDate]);

  function handleStartChange(date: Date | null) {
    setInternalStartDate(date);
    onStartDateChange?.(date);

    if (!date || (selectedEndDate && selectedEndDate < date)) {
      setInternalEndDate(null);
      onEndDateChange?.(null);
    }
  }

  function handleEndChange(date: Date | null) {
    setInternalEndDate(date);
    onEndDateChange?.(date);
  }

  // Custom header with a year dropdown constrained by this picker's dates.
  const renderYearDropdownHeader = (pickerMinDate?: Date, pickerMaxDate?: Date) => {
    const minYear = Math.max(startYear, pickerMinDate?.getFullYear() ?? startYear);
    const maxYear = Math.min(endYear, pickerMaxDate?.getFullYear() ?? endYear);
    const availableYears = YEARS.filter((year) => year >= minYear && year <= maxYear);

    return function YearDropdownHeader({
      date,
      changeYear,
      decreaseYear,
      increaseYear,
      prevYearButtonDisabled,
      nextYearButtonDisabled,
    }: ReactDatePickerCustomHeaderProps) {
      return (
        <div className="flex items-center justify-between px-2 py-1">
        <button
          type="button"
          onClick={decreaseYear}
          disabled={prevYearButtonDisabled}
          className="px-2 py-1 text-sm font-bold text-slate-600 disabled:opacity-30"
        >
          {"<"}
        </button>

        <select
          value={date.getFullYear()}
          onChange={({ target: { value } }) => changeYear(Number(value))}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={increaseYear}
          disabled={nextYearButtonDisabled}
          className="px-2 py-1 text-sm font-bold text-slate-600 disabled:opacity-30"
        >
          {">"}
        </button>
        </div>
      );
    };
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Start month</FieldLabel>
          <DatePicker
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            dateFormat="MM/yyyy"
            excludeDates={excludeDates}
            maxDate={startMaxDate ?? maxDate}
            minDate={minDate}
            onChange={handleStartChange}
            placeholderText="MM/YYYY"
            selected={selectedStartDate}
            showMonthYearPicker
            renderCustomHeader={renderYearDropdownHeader(minDate, startMaxDate ?? maxDate)}
          />
        </Field>

        <Field>
          <FieldLabel>End month</FieldLabel>
          <DatePicker
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            dateFormat="MM/yyyy"
            disabled={!selectedStartDate}
            excludeDates={excludeDates}
            maxDate={maxDate}
            minDate={selectedStartDate ?? undefined}
            onChange={handleEndChange}
            placeholderText={selectedStartDate ? "MM/YYYY" : "Pick start first"}
            selected={selectedEndDate}
            showMonthYearPicker
            renderCustomHeader={renderYearDropdownHeader(selectedStartDate ?? minDate, maxDate)}
          />
        </Field>
      </div>
    </div>
  );
}
