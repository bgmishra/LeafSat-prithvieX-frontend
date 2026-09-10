import Feature from "ol/Feature";
import MultiPolygon from "ol/geom/MultiPolygon";
import { getArea } from "ol/sphere";

export type SourceConstraints = {
  minimum_start_date?: string | null;
  maximum_end_date?: string | null;
  max_range_to_select?: number | string | null;
  min_area_allowed_ha_per_ploy?: number | string | null;
  max_area_allowed_ha_per_ploy?: number | string | null;
  max_total_area_all_poly_aoi_ha?: number | string | null;
};

function optionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function maximumSelectableEndDate(
  startDate: string | Date | null | undefined,
  temporalLabel: string,
  rules?: SourceConstraints,
) {

  const configuredMaximum = rules?.maximum_end_date
    ? new Date(`${rules.maximum_end_date}T00:00:00`)
    : new Date();

  console.log(rules?.maximum_end_date);
  console.log(configuredMaximum);
  console.log("----******")

  const limit = optionalNumber(rules?.max_range_to_select);
  if (!startDate || limit === null) return configuredMaximum;

  const start = startDate instanceof Date ? new Date(startDate) : new Date(`${startDate}T00:00:00`);
  const rangeMaximum = new Date(start);
  const label = temporalLabel.toLowerCase();

  if (label.includes("annual") || label.includes("year")) {
    rangeMaximum.setFullYear(rangeMaximum.getFullYear() + limit);
  } else if (label.includes("month")) {
    rangeMaximum.setMonth(rangeMaximum.getMonth() + limit);
  } else {
    rangeMaximum.setDate(rangeMaximum.getDate() + limit * (label.includes("week") ? 7 : 1));
  }

  console.log(rangeMaximum < configuredMaximum ? rangeMaximum : configuredMaximum)
  console.log("helre ...");

  return rangeMaximum < configuredMaximum ? rangeMaximum : configuredMaximum;
}

export function maximumSelectableEndDateValue(
  startDate: string | Date | null | undefined,
  temporalLabel: string,
  rules?: SourceConstraints,
) {
  return inputDate(maximumSelectableEndDate(startDate, temporalLabel, rules));
}

export function dateConstraintError(
  startDate: string,
  endDate: string,
  temporalLabel: string,
  rules?: SourceConstraints,
) {
  // console.log(rules);
  // console.log(!rules);
  if (!rules) return null;
  const today = new Date();
  const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const maximumEndDate = rules.maximum_end_date || currentDate;
  if (rules.minimum_start_date && startDate < rules.minimum_start_date) {
    return `Start date cannot be before ${rules.minimum_start_date}.`;
  }
  const label = temporalLabel.toLowerCase();
  const year_today = today.getFullYear();
  const year_endDate = new Date(endDate).getFullYear();
  if (endDate > maximumEndDate && year_today == year_endDate && rules.maximum_end_date==null && (label.includes("annual") || label.includes("year") || label.includes("month"))){
    endDate=maximumEndDate
  }else{
  const maxDataConstYear = rules.maximum_end_date
  ? new Date(rules.maximum_end_date).getFullYear()
  : null;

if (
  rules.maximum_end_date !== null &&
  maxDataConstYear !== null &&
  endDate > maximumEndDate &&
  maxDataConstYear === year_endDate &&
  (
    label.includes("annual") ||
    label.includes("year") ||
    label.includes("month")
  )
) {
  endDate = maximumEndDate;
}

  }

  if (endDate > maximumEndDate) {
    return `End date cannot be after ${maximumEndDate}.`;
  }

  const limit = optionalNumber(rules.max_range_to_select);
  if (limit === null) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let amount: number;
  let unit: string;
  if (label.includes("annual") || label.includes("year")) {
    amount = end.getFullYear() - start.getFullYear();
    unit = "year";
  } else if (label.includes("month")) {
    amount = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    unit = "month";
  } else {
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    const weekly = label.includes("week");
    amount = weekly ? days / 7 : days;
    unit = weekly ? "week" : "day";
  }
  return amount > limit ? `The selected range cannot exceed ${limit} ${unit}(s).` : null;
}

export function areaConstraintError(features: Feature[], rules?: SourceConstraints) {
  if (!rules) return null;
  const areas = features.flatMap((feature) => {
    const geometry = feature.getGeometry();
    if (!geometry) return [];
    const polygons = geometry instanceof MultiPolygon ? geometry.getPolygons() : [geometry];
    return polygons.map((polygon) => getArea(polygon, { projection: "EPSG:3857" }) / 10_000);
  });
  const minimum = optionalNumber(rules.min_area_allowed_ha_per_ploy);
  const maximum = optionalNumber(rules.max_area_allowed_ha_per_ploy);
  const totalMaximum = optionalNumber(rules.max_total_area_all_poly_aoi_ha);
  if (minimum !== null && areas.some((area) => area < minimum)) {
    return `Each polygon must cover at least ${minimum} ha.`;
  }
  if (maximum !== null && areas.some((area) => area > maximum)) {
    return `Each polygon cannot exceed ${maximum} ha.`;
  }
  if (totalMaximum !== null && areas.reduce((total, area) => total + area, 0) > totalMaximum) {
    return `The total AOI cannot exceed ${totalMaximum} ha.`;
  }
  return null;
}
