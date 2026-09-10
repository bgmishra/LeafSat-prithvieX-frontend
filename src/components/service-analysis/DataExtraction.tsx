"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe, Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from "@stripe/stripe-js";
import { Calendar, CheckCircle2, Clock, Cpu, CreditCard, Database, Layers, LoaderCircle, Zap } from "lucide-react";
import Control from "ol/control/Control";
import Draw from "ol/interaction/Draw";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import Map from "ol/Map";
import View from "ol/View";
import GeometryType from "ol/geom/GeometryType";
import MultiPolygon from "ol/geom/MultiPolygon";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Circle as CircleStyle } from "ol/style";
import { fromLonLat } from "ol/proj";
import { getArea } from "ol/sphere";
import { apiRequest, getErrorMessage } from "@/api/client";
import type { PricingResult } from "@/lib/processing-pricing";

import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";
import XYZSource from "ol/source/XYZ";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthRangePicker } from "@/components/ui/month-range-picker";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectOption } from "@/components/ui/select";
import { YearRangeSelector } from "@/components/ui/year-range-selector";
import { areaConstraintError, dateConstraintError, maximumSelectableEndDate, maximumSelectableEndDateValue } from "./source-constraints";

type AoiMode = "draw" | "upload";
type TimeRangeMode = "annual" | "monthly" | "date";

type TemporalResolutionType = {
  id?: number | string;
  temporal_type_label?: string;
  temporal_type_value?: string;
  temporal_type?: string;
  name_label?: string;
  name_value?: string;
  name?: string;
};

type DataSourceOption = {
  id: number | string;
  source_name_label?: string;
  source_name_value?: string;
  source_name?: string;
  name_label?: string;
  name_value?: string;
  name?: string;
  temporal_resolution_type?: number | string;
  temporal_resolution_type_name?: string;
  temporal_resolution_type_value?: string;
  spatial_resolution_type?: number | string;
  spatial_resolution_meter?: number | string;
  minimum_start_date?: string | null;
  maximum_end_date?: string | null;
  max_range_to_select?: number | string | null;
  min_area_allowed_ha_per_ploy?: number | string | null;
  max_area_allowed_ha_per_ploy?: number | string | null;
  max_total_area_all_poly_aoi_ha?: number | string | null;
  is_free?: boolean;
};

type RelatedOption = {
  id?: number | string;
  name?: string;
  name_label?: string;
  name_value?: string;
  model_name?: string;
  model_name_label?: string;
  model_name_value?: string;
  scenario_name?: string;
  scenario_name_label?: string;
  scenario_name_value?: string;
  atmos_press_level?: string;
  atmos_press_level_label?: string;
  atmos_press_level_value?: string;
  temporal_type?: string;
  temporal_type_label?: string;
  temporal_type_value?: string;
  temporal_resolution_meter?: number | string;
};


export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ProcessingJobResponse = {
  currentBalanceCents: number;
  debitedAmountCents: number;
  jobId: `${string}-${string}-${string}-${string}-${string}`; // UUID format
  maxRetryAttempts: number;
  message: string;
  status: JobStatus;
};



type Cmip6ServiceSourceOption = {
  id: number | string;
  service?: number | string | RelatedOption;
  service_name?: string;
  atmospheric_pressure_level?: number | string | RelatedOption | null;
  atmospheric_pressure_level_name?: string | null;
  model_name?: number | string | RelatedOption;
  model_name_name?: string;
  scenario_name?: number | string | RelatedOption;
  scenario_name_name?: string;
  temporal_resolution_type?: number | string | RelatedOption;
  temporal_resolution_type_name?: string;
  spatial_resolution_type?: number | string | RelatedOption;
  spatial_resolution_meter?: number | string;
  minimum_start_date?: string | null;
  maximum_end_date?: string | null;
  max_range_to_select?: number | string | null;
  min_area_allowed_ha_per_ploy?: number | string | null;
  max_area_allowed_ha_per_ploy?: number | string | null;
  max_total_area_all_poly_aoi_ha?: number | string | null;
};

type SpatialResolutionType = {
  id?: number | string;
  temporal_resolution_meter?: number | string;
};

type ServiceOption = {
  id: number | string;
  name_label?: string;
  name_value?: string;
  name: string;
  service_name?: {
    service_type_name?: string;
  } | string | null;
  temporal_resolution_types?: TemporalResolutionType[];
  data_sources?: DataSourceOption[];
};

type ListResponse<T> = T[] | { results?: T[] };
type GeoJsonResponse = {
  geojson?: unknown;
  data?: unknown;
  result?: unknown;
};
type GeoJsonInput = string | object | ArrayBuffer;

type ProcessingJobPayload = {
  aoi_mode: AoiMode;
  area_ha: number | null;
  geojson: unknown;
  order_name: string;
  start_date: string;
  end_date: string;
  geometry_type: string;
  service: number | string;
  temporal_resolution_type: number | string;
  atmospheric_pressure_level?: number | string;
  cmip6_service_source?: number | string;
  data_source?: number | string;
  model_name?: number | string;
  scenario_name?: number | string;
  aoi_location_name?: string;
  selected_field_name?: string;
  spatial_resolution_type?: number | string;
};

type PricingRequestPayload = {
  totalAreaHa: number;
  spatialResolutionMeters: number;
  temporalResolution: string;
  startDate: string;
  endDate: string;
  numberOfPolygons: number;
  bytesPerReturnedValue?: number;
  dataSourceName?: string;
  modelName?: string;
  processDataName: string;
  scenarioName?: string;
  serviceType: string;
};

type WalletBalanceItem = {
  balance?: string | number | null;
  current_balance?: string | number | null;
  token?: string | number | null;
};

type WalletBalanceCollection = {
  results?: WalletBalanceItem[];
  items?: WalletBalanceItem[];
  data?: WalletBalanceItem[];
};

type WalletBalanceResponse =
  | WalletBalanceItem
  | WalletBalanceItem[]
  | WalletBalanceCollection;

function unwrapList<T>(data: ListResponse<T>) {
  return Array.isArray(data) ? data : data.results || [];
}

function unwrapGeoJson(data: unknown): GeoJsonInput {
  if (data && typeof data === "object") {
    const response = data as GeoJsonResponse;
    const geoJson = response.geojson || response.data || response.result || data;

    if (
      typeof geoJson === "string" ||
      geoJson instanceof ArrayBuffer ||
      (geoJson && typeof geoJson === "object")
    ) {
      return geoJson;
    }
  }

  if (typeof data === "string" || data instanceof ArrayBuffer) {
    return data;
  }

  throw new Error("Vector conversion did not return valid GeoJSON.");
}

function formatArea(area: number) {
  if (!area) {
    return "No area selected";
  }

  return `${(area / 10_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function geometrySummary(feature: Feature) {
  const geometry = feature.getGeometry();

  if (!geometry) {
    return "AOI selected";
  }

  if (geometry instanceof Point) {
    return "Point selected";
  }

  return formatArea(getArea(geometry, { projection: "EPSG:3857" }));
}

function polygonCount(feature: Feature) {
  const geometry = feature.getGeometry();

  if (!geometry) {
    return 0;
  }

  const geometryType = geometry.getType();

  if (geometryType === "Polygon") {
    return 1;
  }

  if (geometry instanceof MultiPolygon) {
    return geometry.getPolygons().length;
  }

  return 0;
}

function totalPolygonCount(features: Feature[]) {
  return features.reduce((total, feature) => total + polygonCount(feature), 0);
}

function featureAreaSqMeters(features: Feature[]) {
  return features.reduce((total, feature) => {
    const geometry = feature.getGeometry();

    if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.getType())) {
      return total;
    }

    return total + getArea(geometry, { projection: "EPSG:3857" });
  }, 0);
}

function featureAreaHa(features: Feature[]) {
  const areaSqMeters = featureAreaSqMeters(features);

  return areaSqMeters ? Number((areaSqMeters / 10_000).toFixed(2)) : null;
}

function featureGeometryType(features: Feature[]) {
  if (features.length > 1) {
    return "FeatureCollection";
  }

  return features[0]?.getGeometry()?.getType() || "Unknown";
}

function featurePropertyNames(features: Feature[]) {
  const names = new Set<string>();

  features.forEach((feature) => {
    const geometryName = feature.getGeometryName();

    Object.keys(feature.getProperties()).forEach((name) => {
      if (name !== geometryName && name !== "geometry") {
        names.add(name);
      }
    });
  });

  return Array.from(names);
}

function temporalTypeValue(temporalType: TemporalResolutionType, index: number) {
  return String(temporalType.id ?? temporalType.temporal_type_value ?? temporalType.temporal_type ?? temporalType.name_value ?? temporalType.name ?? index);
}

function temporalTypeLabel(temporalType: TemporalResolutionType | undefined, fallback = "") {
  return temporalType?.temporal_type_label ?? temporalType?.temporal_type ?? temporalType?.name_label ?? temporalType?.name ?? fallback;
}

function dataSourceValue(dataSource: DataSourceOption, index: number) {
  return String(dataSource.id ?? dataSource.source_name_value ?? dataSource.source_name ?? dataSource.name_value ?? dataSource.name ?? index);
}

function dataSourceLabel(dataSource: DataSourceOption | undefined, fallback = "") {
  return dataSource?.source_name_label ?? dataSource?.source_name ?? dataSource?.name_label ?? dataSource?.name ?? fallback;
}

function spatialTypeValue(spatialType: SpatialResolutionType, index: number) {
  return String(spatialType.id ?? spatialType.temporal_resolution_meter ?? index);
}

function spatialTypeLabel(spatialType: SpatialResolutionType | undefined, fallback = "") {
  if (spatialType?.temporal_resolution_meter == null || spatialType.temporal_resolution_meter === "") {
    return fallback;
  }

  return `${spatialType.temporal_resolution_meter} m`;
}

function numericValue(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatPricingNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function currencyAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function toNumber(value: unknown) {
  if (value == null || value === "") {
    return 0;
  }

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isWalletBalanceCollection(response: WalletBalanceResponse): response is WalletBalanceCollection {
  return !Array.isArray(response) && (
    "results" in response || "items" in response || "data" in response
  );
}

function extractWalletBalance(response: WalletBalanceResponse): WalletBalanceItem | null {
  if (Array.isArray(response)) {
    return response[0] || null;
  }

  if (isWalletBalanceCollection(response)) {
    return response.results?.[0] || response.items?.[0] || response.data?.[0] || null;
  }

  return response;
}

function relatedObject(value: unknown) {
  return value && typeof value === "object" ? value as RelatedOption : undefined;
}

function relatedValue(value: unknown, fallback: unknown) {
  const record = relatedObject(value);

  return String(record?.id ?? value ?? fallback);
}

function relatedLabel(value: unknown, fallback = "") {
  const record = relatedObject(value);

  if (!record) {
    return fallback || String(value ?? "");
  }

  return String(
    record.name_label ??
      record.name ??
      record.model_name_label ??
      record.model_name ??
      record.scenario_name_label ??
      record.scenario_name ??
      record.atmos_press_level_label ??
      record.atmos_press_level ??
      record.temporal_type_label ??
      record.temporal_type ??
      record.temporal_resolution_meter ??
      record.id ??
      fallback,
  );
}

function cmip6SourceBelongsToService(source: Cmip6ServiceSourceOption, serviceId: string, service?: ServiceOption) {
  const sourceService = source.service;

  if (sourceService && typeof sourceService === "object") {
    return String(sourceService.id) === serviceId;
  }

  return String(sourceService ?? "") === serviceId ||
    (!!source.service_name && source.service_name === (service?.name_label ?? service?.name));
}

function uniqueByValue<T>(items: T[], valueForItem: (item: T, index: number) => string) {
  const seen = new Set<string>();

  return items.filter((item, index) => {
    const value = valueForItem(item, index);

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function temporalTypesForLinks(links: DataSourceOption[]): TemporalResolutionType[] {
  const temporalTypes = links
    .filter((link) => link.temporal_resolution_type != null)
    .map((link) => ({
      id: link.temporal_resolution_type,
      temporal_type_label: link.temporal_resolution_type_name,
      temporal_type_value: link.temporal_resolution_type_value,
      temporal_type: link.temporal_resolution_type_name,
    }));

  return uniqueByValue(temporalTypes, (temporalType, index) => temporalTypeValue(temporalType, index));
}

function spatialTypesForLinks(links: DataSourceOption[]) {
  const spatialTypes = links
    .filter((link) => link.spatial_resolution_type != null)
    .map((link) => ({
      id: link.spatial_resolution_type,
      temporal_resolution_meter: link.spatial_resolution_meter,
    }));

  return uniqueByValue(spatialTypes, (spatialType, index) => spatialTypeValue(spatialType, index));
}

function cmip6ModelValue(source: Cmip6ServiceSourceOption, index: number) {
  return relatedValue(source.model_name, index);
}

function cmip6ModelLabel(source: Cmip6ServiceSourceOption, fallback = "") {
  return relatedLabel(source.model_name, source.model_name_name || fallback);
}

function cmip6ScenarioValue(source: Cmip6ServiceSourceOption, index: number) {
  return relatedValue(source.scenario_name, index);
}

function cmip6ScenarioLabel(source: Cmip6ServiceSourceOption, fallback = "") {
  return relatedLabel(source.scenario_name, source.scenario_name_name || fallback);
}

function cmip6PressureValue(source: Cmip6ServiceSourceOption, index: number) {
  return relatedValue(source.atmospheric_pressure_level, index);
}

function cmip6PressureLabel(source: Cmip6ServiceSourceOption, fallback = "") {
  return relatedLabel(source.atmospheric_pressure_level, source.atmospheric_pressure_level_name || fallback);
}

function cmip6TemporalValue(source: Cmip6ServiceSourceOption, index: number) {
  return relatedValue(source.temporal_resolution_type, index);
}

function cmip6TemporalLabel(source: Cmip6ServiceSourceOption, fallback = "") {
  return relatedLabel(source.temporal_resolution_type, source.temporal_resolution_type_name || fallback);
}

function cmip6SpatialValue(source: Cmip6ServiceSourceOption, index: number) {
  return relatedValue(source.spatial_resolution_type, index);
}

function cmip6TemporalTypesForSources(sources: Cmip6ServiceSourceOption[]): TemporalResolutionType[] {
  return uniqueByValue(
    sources
      .filter((source) => source.temporal_resolution_type != null)
      .map((source, index) => ({
        id: cmip6TemporalValue(source, index),
        temporal_type_label: cmip6TemporalLabel(source),
        temporal_type_value: cmip6TemporalValue(source, index),
        temporal_type: cmip6TemporalLabel(source),
      })),
    (temporalType, index) => temporalTypeValue(temporalType, index),
  );
}

function cmip6SpatialTypesForSources(sources: Cmip6ServiceSourceOption[]): SpatialResolutionType[] {
  return uniqueByValue(
    sources
      .filter((source) => source.spatial_resolution_type != null)
      .map((source, index) => ({
        id: cmip6SpatialValue(source, index),
        temporal_resolution_meter: relatedObject(source.spatial_resolution_type)?.temporal_resolution_meter ?? source.spatial_resolution_meter,
      })),
    (spatialType, index) => spatialTypeValue(spatialType, index),
  );
}

function timeRangeModeFromTemporalType(temporalType: TemporalResolutionType | undefined): TimeRangeMode | null {
  const label = temporalTypeLabel(temporalType).toLowerCase();

  if (label.includes("annual") || label.includes("year")) {
    return "annual";
  }

  if (label.includes("monthly") || label.includes("month")) {
    return "monthly";
  }

  if (
    label.includes("daily") ||
    label.includes("day") ||
    label.includes("weekly") ||
    label.includes("week") ||
    label.includes("bi-weekly") ||
    label.includes("bi weekly") ||
    label.includes("bi-wwkly")
  ) {
    return "date";
  }

  return null;
}

const aoiModes: Array<{ label: string; value: AoiMode; description: string }> = [
  { label: "Draw a polygon on map", value: "draw", description: "" },
  { label: "Upload file (zipped shapefile, KML, GeoJSON, gpkg)", value: "upload", description: "" },
];

const defaultAoiSummary = "Draw or upload an area of interest";
const maxPolygonCount = 500;
const maxAoiUploadSizeBytes = 10 * 1024 * 1024;
const maxAoiUploadSizeLabel = "10 MB";
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const walletTopUpIntentPath =
  process.env.NEXT_PUBLIC_STRIPE_WALLET_TOPUP_INTENT_PATH ||
  "/api/v1/payments/wallet-topup-intent/";
const walletTopUpConfirmPath =
  process.env.NEXT_PUBLIC_STRIPE_WALLET_TOPUP_CONFIRM_PATH ||
  "/api/v1/payments/wallet-topup-confirm/";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const countryOptions = [
  { code: "NP", name: "Nepal" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

export function DataExtraction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedServiceId = searchParams.get("service_id");
  const requestedDataSourceId = searchParams.get("data_source_id");
  const appliedQueryRef = useRef("");
  const isDataExtraction = true;
  const isCmip6DataExtraction = false;
  const isExtractionWorkflow = true;
  const serviceCategoryName = "Data Extraction";
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const [aoiMode, setAoiMode] = useState<AoiMode>("draw");
  const [aoiSummary, setAoiSummary] = useState(defaultAoiSummary);
  const [aoiDetails, setAoiDetails] = useState("");
  const [cmip6ServiceSources, setCmip6ServiceSources] = useState<Cmip6ServiceSourceOption[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploadingAoi, setIsUploadingAoi] = useState(false);
  const [locationPropertyNames, setLocationPropertyNames] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [monthPickerEnd, setMonthPickerEnd] = useState<Date | null>(null);
  const [monthPickerStart, setMonthPickerStart] = useState<Date | null>(null);
  const [orderName, setOrderName] = useState("");
  const [polygonLocationName, setPolygonLocationName] = useState("");
  const [pricingEstimate, setPricingEstimate] = useState<PricingResult | null>(null);
  const [pricingRequest, setPricingRequest] = useState<PricingRequestPayload | null>(null);
  const [pendingProcessingPayload, setPendingProcessingPayload] = useState<ProcessingJobPayload | null>(null);
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [selectedLocationPropertyName, setSelectedLocationPropertyName] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [selectedCmip6Model, setSelectedCmip6Model] = useState("");
  const [selectedCmip6PressureLevel, setSelectedCmip6PressureLevel] = useState("");
  const [selectedCmip6Scenario, setSelectedCmip6Scenario] = useState("");
  const [selectedTemporalResolution, setSelectedTemporalResolution] = useState("");
  const [selectedSpatialResolution, setSelectedSpatialResolution] = useState("");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [success, setSuccess] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const cardNumberMountRef = useRef<HTMLDivElement | null>(null);
  const cardExpiryMountRef = useRef<HTMLDivElement | null>(null);
  const cardCvcMountRef = useRef<HTMLDivElement | null>(null);
  const cardNumberElementRef = useRef<StripeCardNumberElement | null>(null);
  const cardExpiryElementRef = useRef<StripeCardExpiryElement | null>(null);
  const cardCvcElementRef = useRef<StripeCardCvcElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardCountry, setCardCountry] = useState("NP");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "wallet">("card");
  const [cardReadyFields, setCardReadyFields] = useState({ cvc: false, expiry: false, number: false });
  const [cardError, setCardError] = useState("");
  const [stripeError, setStripeError] = useState(stripePromise ? "" : "Stripe publishable key is missing.");

  const selectedMode = useMemo(
    () => aoiModes.find((mode) => mode.value === aoiMode),
    [aoiMode],
  );
  const aoiOverlayElement = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }

    const element = document.createElement("div");
    element.className = "absolute left-4 bottom-4 z-10 w-[min(22rem,calc(100%-2rem))]";

    return element;
  }, []);
  const selectedServiceOption = useMemo(
    () => services.find((service) => String(service.id) === selectedService),
    [selectedService, services],
  );
  const serviceDataSourceLinks = useMemo(
    () => selectedServiceOption?.data_sources || [],
    [selectedServiceOption],
  );
  const cmip6ServiceSourceLinks = useMemo(
    () =>
      selectedService
        ? cmip6ServiceSources.filter((source) => cmip6SourceBelongsToService(source, selectedService, selectedServiceOption))
        : [],
    [cmip6ServiceSources, selectedService, selectedServiceOption],
  );
  const cmip6ModelOptions = useMemo(
    () => uniqueByValue(cmip6ServiceSourceLinks, (source, index) => cmip6ModelValue(source, index)),
    [cmip6ServiceSourceLinks],
  );
  const cmip6ModelSourceLinks = useMemo(
    () =>
      selectedCmip6Model
        ? cmip6ServiceSourceLinks.filter((source, index) => cmip6ModelValue(source, index) === selectedCmip6Model)
        : cmip6ServiceSourceLinks,
    [cmip6ServiceSourceLinks, selectedCmip6Model],
  );
  const cmip6ScenarioOptions = useMemo(
    () => uniqueByValue(cmip6ModelSourceLinks, (source, index) => cmip6ScenarioValue(source, index)),
    [cmip6ModelSourceLinks],
  );
  const cmip6ScenarioSourceLinks = useMemo(
    () =>
      selectedCmip6Scenario
        ? cmip6ModelSourceLinks.filter((source, index) => cmip6ScenarioValue(source, index) === selectedCmip6Scenario)
        : cmip6ModelSourceLinks,
    [cmip6ModelSourceLinks, selectedCmip6Scenario],
  );
  const cmip6PressureOptions = useMemo(
    () =>
      uniqueByValue(
        cmip6ScenarioSourceLinks.filter((source) => source.atmospheric_pressure_level != null),
        (source, index) => cmip6PressureValue(source, index),
      ),
    [cmip6ScenarioSourceLinks],
  );
  const shouldShowCmip6PressureSelect = isCmip6DataExtraction && cmip6PressureOptions.length > 0;
  const cmip6FilteredSourceLinks = useMemo(
    () =>
      shouldShowCmip6PressureSelect && selectedCmip6PressureLevel
        ? cmip6ScenarioSourceLinks.filter(
            (source, index) => cmip6PressureValue(source, index) === selectedCmip6PressureLevel,
          )
        : cmip6ScenarioSourceLinks,
    [cmip6ScenarioSourceLinks, selectedCmip6PressureLevel, shouldShowCmip6PressureSelect],
  );
  const dataSources = useMemo(
    () => uniqueByValue(serviceDataSourceLinks, (dataSource, index) => dataSourceValue(dataSource, index)),
    [serviceDataSourceLinks],
  );
  const temporalResolutionTypes = useMemo(() => {
    if (isCmip6DataExtraction) {
      return cmip6TemporalTypesForSources(cmip6FilteredSourceLinks);
    }

    if (isDataExtraction && selectedDataSource) {
      return temporalTypesForLinks(
        serviceDataSourceLinks.filter((link, index) => dataSourceValue(link, index) === selectedDataSource),
      );
    }

    return selectedServiceOption?.temporal_resolution_types || [];
  }, [cmip6FilteredSourceLinks, isCmip6DataExtraction, isDataExtraction, selectedDataSource, selectedServiceOption, serviceDataSourceLinks]);
  const shouldShowTemporalResolutionSelect = isCmip6DataExtraction
    ? temporalResolutionTypes.length > 0
    : temporalResolutionTypes.length > 1;
  const selectedTemporalResolutionType = useMemo(
    () =>
      temporalResolutionTypes.find(
        (temporalType, index) => temporalTypeValue(temporalType, index) === selectedTemporalResolution,
      ),
    [selectedTemporalResolution, temporalResolutionTypes],
  );
  const spatialResolutionTypes = useMemo(() => {
    if (isCmip6DataExtraction) {
      if (!selectedTemporalResolution) {
        return [];
      }

      return cmip6SpatialTypesForSources(
        cmip6FilteredSourceLinks.filter(
          (source, index) => cmip6TemporalValue(source, index) === selectedTemporalResolution,
        ),
      );
    }

    if (!isDataExtraction || !selectedDataSource || !selectedTemporalResolution) {
      return [];
    }

    return spatialTypesForLinks(
      serviceDataSourceLinks.filter(
        (link, index) =>
          dataSourceValue(link, index) === selectedDataSource &&
          String(link.temporal_resolution_type) === selectedTemporalResolution,
      ),
    );
  }, [cmip6FilteredSourceLinks, isCmip6DataExtraction, isDataExtraction, selectedDataSource, selectedTemporalResolution, serviceDataSourceLinks]);
  const shouldShowSpatialResolutionSelect = spatialResolutionTypes.length > 1;
  const selectedSpatialResolutionType = useMemo(
    () =>
      spatialResolutionTypes.find(
        (spatialType, index) => spatialTypeValue(spatialType, index) === selectedSpatialResolution,
      ),
    [selectedSpatialResolution, spatialResolutionTypes],
  );
  const selectedDataSourceOption = useMemo(
    () =>
      dataSources.find(
        (dataSource, index) => dataSourceValue(dataSource, index) === selectedDataSource,
      ),
    [selectedDataSource, dataSources],
  );
  const selectedCmip6SourceOption = useMemo(
    () =>
      cmip6FilteredSourceLinks.find(
        (source, index) =>
          cmip6ModelValue(source, index) === selectedCmip6Model &&
          cmip6ScenarioValue(source, index) === selectedCmip6Scenario &&
          (!shouldShowCmip6PressureSelect || cmip6PressureValue(source, index) === selectedCmip6PressureLevel) &&
          cmip6TemporalValue(source, index) === selectedTemporalResolution &&
          (!selectedSpatialResolution || cmip6SpatialValue(source, index) === selectedSpatialResolution),
      ),
    [
      cmip6FilteredSourceLinks,
      selectedCmip6Model,
      selectedCmip6PressureLevel,
      selectedCmip6Scenario,
      selectedSpatialResolution,
      selectedTemporalResolution,
      shouldShowCmip6PressureSelect,
    ],
  );
  const selectedSourceConstraints = useMemo(
    () => selectedCmip6SourceOption ?? serviceDataSourceLinks.find((link, index) =>
      (!selectedDataSource || dataSourceValue(link, index) === selectedDataSource) &&
      String(link.temporal_resolution_type) === selectedTemporalResolution &&
      (!selectedSpatialResolution || String(link.spatial_resolution_type) === selectedSpatialResolution)),
    [selectedCmip6SourceOption, selectedDataSource, selectedSpatialResolution, selectedTemporalResolution, serviceDataSourceLinks],
  );
  const timeRangeMode = timeRangeModeFromTemporalType(selectedTemporalResolutionType);
  const isFreeDataSource = isDataExtraction && selectedDataSourceOption?.is_free === true;
  const processingCharge = isFreeDataSource ? 0 : pricingEstimate ? pricingEstimate.finalPrice : 0;
  const hasSufficientWalletBalance =
    walletBalance !== null && walletBalance >= processingCharge;
  const cardPaymentAmount = processingCharge;
  const cardReady = cardReadyFields.cvc && cardReadyFields.expiry && cardReadyFields.number;
  const canPayByCard = !processing && !!pendingProcessingPayload && !!pricingEstimate && cardPaymentAmount > 0 && cardReady;

  useEffect(() => {
    let active = true;

    const serviceQuery = new URLSearchParams({ service_name: serviceCategoryName }).toString();
    const servicesRequest = isCmip6DataExtraction
      ? apiRequest<ListResponse<ServiceOption>>("/api/v1/cmip6-services/", { auth: true })
      : apiRequest<ListResponse<ServiceOption>>(`/api/v1/services/?${serviceQuery}`, { auth: true });
    const cmip6SourcesRequest = isCmip6DataExtraction
      ? apiRequest<ListResponse<Cmip6ServiceSourceOption>>("/api/v1/cmip6-service-sources/", { auth: true })
      : Promise.resolve([] as Cmip6ServiceSourceOption[]);

    Promise.all([servicesRequest, cmip6SourcesRequest])
      .then(([serviceData, sourceData]) => {
        if (active) {
          setServices(unwrapList(serviceData));
          setCmip6ServiceSources(unwrapList(sourceData));
        }
      })
      .catch((caught) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingServices(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isCmip6DataExtraction, serviceCategoryName]);

  const handleServiceChange = useCallback((serviceId: string, preferredDataSource = "") => {
    const service = services.find((item) => String(item.id) === serviceId);
    const serviceDataSources = uniqueByValue(
      service?.data_sources || [],
      (dataSource, index) => dataSourceValue(dataSource, index),
    );
    const nextDataSource =
      isDataExtraction && preferredDataSource && serviceDataSources.some((dataSource, index) => dataSourceValue(dataSource, index) === preferredDataSource)
        ? preferredDataSource
        : isDataExtraction && serviceDataSources.length === 1
          ? dataSourceValue(serviceDataSources[0], 0)
          : "";
    const matchingLinks =
      isDataExtraction && nextDataSource
        ? (service?.data_sources || []).filter(
            (link, index) => dataSourceValue(link, index) === nextDataSource,
          )
        : [];
    const temporalTypes = isDataExtraction
      ? temporalTypesForLinks(matchingLinks)
      : service?.temporal_resolution_types || [];
    const nextTemporalResolution =
      temporalTypes.length === 1 ? temporalTypeValue(temporalTypes[0], 0) : "";
    const spatialTypes =
      isDataExtraction && nextDataSource && nextTemporalResolution
        ? spatialTypesForLinks(
            matchingLinks.filter(
              (link) => String(link.temporal_resolution_type) === nextTemporalResolution,
            ),
          )
        : [];

    setSelectedService(serviceId);
    setSelectedDataSource(nextDataSource);
    setSelectedCmip6Model("");
    setSelectedCmip6PressureLevel("");
    setSelectedCmip6Scenario("");
    setSelectedTemporalResolution(nextTemporalResolution);
    setSelectedSpatialResolution(
      spatialTypes.length === 1 ? spatialTypeValue(spatialTypes[0], 0) : "",
    );
    setDateFrom("");
    setDateTo("");
    setMonthPickerEnd(null);
    setMonthPickerStart(null);
    setYearFrom("");
    setYearTo("");
  }, [isDataExtraction, services]);

  useEffect(() => {
    const queryKey = `${requestedServiceId ?? ""}:${requestedDataSourceId ?? ""}`;
    if (!requestedServiceId || loadingServices || appliedQueryRef.current === queryKey) return;
    if (!services.some((service) => String(service.id) === requestedServiceId)) return;

    const timer = window.setTimeout(() => {
      handleServiceChange(requestedServiceId, requestedDataSourceId ?? "");
      appliedQueryRef.current = queryKey;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleServiceChange, loadingServices, requestedDataSourceId, requestedServiceId, services]);

  function handleDataSourceChange(value: string) {
    const matchingLinks = serviceDataSourceLinks.filter(
      (link, index) => dataSourceValue(link, index) === value,
    );
    const temporalTypes = temporalTypesForLinks(matchingLinks);
    const nextTemporalResolution =
      temporalTypes.length === 1 ? temporalTypeValue(temporalTypes[0], 0) : "";
    const spatialTypes =
      value && nextTemporalResolution
        ? spatialTypesForLinks(
            matchingLinks.filter(
              (link) => String(link.temporal_resolution_type) === nextTemporalResolution,
            ),
          )
        : [];

    setSelectedDataSource(value);
    setSelectedTemporalResolution(nextTemporalResolution);
    setSelectedSpatialResolution(
      spatialTypes.length === 1 ? spatialTypeValue(spatialTypes[0], 0) : "",
    );
    resetTimeRangeValues();
  }

  function handleCmip6ModelChange(value: string) {
    setSelectedCmip6Model(value);
    setSelectedCmip6Scenario("");
    setSelectedCmip6PressureLevel("");
    setSelectedTemporalResolution("");
    setSelectedSpatialResolution("");
    resetTimeRangeValues();
  }

  function handleCmip6ScenarioChange(value: string) {
    setSelectedCmip6Scenario(value);
    setSelectedCmip6PressureLevel("");
    setSelectedTemporalResolution("");
    setSelectedSpatialResolution("");
    resetTimeRangeValues();
  }

  function handleCmip6PressureLevelChange(value: string) {
    setSelectedCmip6PressureLevel(value);
    setSelectedTemporalResolution("");
    setSelectedSpatialResolution("");
    resetTimeRangeValues();
  }

  function handleTemporalResolutionChange(value: string) {
    const spatialTypes = isCmip6DataExtraction
      ? cmip6SpatialTypesForSources(
          cmip6FilteredSourceLinks.filter(
            (source, index) => cmip6TemporalValue(source, index) === value,
          ),
        )
      : spatialTypesForLinks(
          serviceDataSourceLinks.filter(
            (link, index) =>
              dataSourceValue(link, index) === selectedDataSource &&
              String(link.temporal_resolution_type) === value,
          ),
        );

    setSelectedTemporalResolution(value);
    setSelectedSpatialResolution(
      spatialTypes.length === 1 ? spatialTypeValue(spatialTypes[0], 0) : "",
    );
    resetTimeRangeValues();
  }

  function resetTimeRangeValues() {
    setDateFrom("");
    setDateTo("");
    setMonthPickerEnd(null);
    setMonthPickerStart(null);
    setYearFrom("");
    setYearTo("");
  }

  function handleAoiModeChange(value: string) {
    const nextMode = value as AoiMode;

    setAoiMode(nextMode);
    setError("");

    if (nextMode === "draw") {
      setSelectedLocationPropertyName("");
      return;
    }

    setPolygonLocationName("");
  }

  function selectedDateRange() {
    if (timeRangeMode === "annual") {
      return {
        endDate: `${yearTo}-12-31`,
        startDate: `${yearFrom}-01-01`,
      };
    }

    if (timeRangeMode === "monthly" && monthPickerStart && monthPickerEnd) {
      return {
        endDate: toInputDate(endOfMonth(monthPickerEnd)),
        startDate: toInputDate(new Date(monthPickerStart.getFullYear(), monthPickerStart.getMonth(), 1)),
      };
    }

    return {
      endDate: dateTo,
      startDate: dateFrom,
    };
  }

  function buildProcessingPayload(): ProcessingJobPayload {
    const features = vectorSourceRef.current.getFeatures();
    const { endDate, startDate } = selectedDateRange();
    return {
      aoi_mode: aoiMode,
      area_ha: featureAreaHa(features),
      geojson: new GeoJSON().writeFeaturesObject(features, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
      end_date: endDate,
      geometry_type: featureGeometryType(features),
      order_name: orderName.trim(),
      service: selectedServiceOption?.id || selectedService,
      start_date: startDate,
      temporal_resolution_type: selectedTemporalResolutionType?.id ?? selectedTemporalResolution,
      ...(aoiMode === "draw"
        ? { aoi_location_name: polygonLocationName.trim() }
        : { selected_field_name: selectedLocationPropertyName }),
      ...(isDataExtraction
        ? { data_source: selectedDataSourceOption?.id ?? selectedDataSource, spatial_resolution_type: selectedSpatialResolution }
        : {}),
      ...(isCmip6DataExtraction
        ? {
            cmip6_service_source: selectedCmip6SourceOption?.id,
            model_name: selectedCmip6Model,
            scenario_name: selectedCmip6Scenario,
            spatial_resolution_type: selectedSpatialResolution,
            ...(shouldShowCmip6PressureSelect ? { atmospheric_pressure_level: selectedCmip6PressureLevel } : {}),
          }
        : {}),
    };
  }

  function selectedSpatialResolutionMeters() {
    return numericValue(selectedSpatialResolutionType?.temporal_resolution_meter) ??
      numericValue(selectedSourceConstraints?.spatial_resolution_meter) ??
      numericValue(relatedObject(selectedCmip6SourceOption?.spatial_resolution_type)?.temporal_resolution_meter);
  }

  function buildPricingPayload(processingPayload: ProcessingJobPayload, features: Feature[]): PricingRequestPayload {
    const totalAreaHa = processingPayload.area_ha;
    const spatialResolutionMeters = selectedSpatialResolutionMeters();

    if (!totalAreaHa || totalAreaHa <= 0) {
      throw new Error("Select an AOI with a measurable polygon area before pricing.");
    }

    if (!spatialResolutionMeters || spatialResolutionMeters <= 0) {
      throw new Error("Select a spatial resolution before pricing.");
    }

    return {
      totalAreaHa,
      spatialResolutionMeters,
      temporalResolution: temporalTypeLabel(selectedTemporalResolutionType, selectedTemporalResolution),
      startDate: processingPayload.start_date,
      endDate: processingPayload.end_date,
      numberOfPolygons: totalPolygonCount(features),
      ...(isDataExtraction
        ? { dataSourceName: dataSourceLabel(selectedDataSourceOption, selectedDataSource) }
        : {}),
      ...(isCmip6DataExtraction
        ? {
            modelName: selectedCmip6SourceOption ? cmip6ModelLabel(selectedCmip6SourceOption, selectedCmip6Model) : selectedCmip6Model,
            scenarioName: selectedCmip6SourceOption ? cmip6ScenarioLabel(selectedCmip6SourceOption, selectedCmip6Scenario) : selectedCmip6Scenario,
          }
        : {}),
      processDataName: selectedServiceOption?.name_label ?? selectedServiceOption?.name ?? "Selected data",
      serviceType: isCmip6DataExtraction ? "CMIP6" : selectedServiceOption?.name_label ?? selectedServiceOption?.name ?? "Data Extraction",
    };
  }

  async function requestPricingEstimate(pricingPayload: PricingRequestPayload) {
    const response = await fetch("/api/pricing/processing", {
      body: JSON.stringify(pricingPayload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.detail || "Unable to calculate processing price.");
    }

    return data as PricingResult;
  }

  async function loadWalletBalance() {
    setWalletLoading(true);
    setWalletError("");

    try {
      const response = await apiRequest<WalletBalanceResponse>("/api/v1/balance/", {
        auth: true,
      });
      const balanceRecord = extractWalletBalance(response);
      const currentBalance = toNumber(
        balanceRecord?.token ?? balanceRecord?.current_balance ?? balanceRecord?.balance,
      );
      setWalletBalance(currentBalance);
      return currentBalance;
    } catch (caught) {
      setWalletBalance(null);
      setWalletError(getErrorMessage(caught));
      throw caught;
    } finally {
      setWalletLoading(false);
    }
  }

  async function createCardPaymentIntent(amount: number) {
    const data = await apiRequest<{
      clientSecret?: string;
      client_secret?: string;
      paymentIntentId?: string;
      payment_intent_id?: string;
    }>(walletTopUpIntentPath, {
      auth: true,
      body: JSON.stringify({
        amount,
        purpose: "wallet_topup",
      }),
      method: "POST",
    });

    const clientSecret = data.clientSecret || data.client_secret;

    if (!clientSecret) {
      throw new Error("Stripe payment did not return a client secret.");
    }

    return {
      clientSecret,
      paymentIntentId: data.paymentIntentId || data.payment_intent_id,
    };
  }


  async function submitProcessingJob(
  payload: ProcessingJobPayload,
  chargeAmount: number
  ): Promise<void> {
    try {
      const response = await apiRequest<ProcessingJobResponse>("/api/v1/processing/jobs/", {
        auth: true,
        body: JSON.stringify({
          ...payload,
          processing_amount: Number(chargeAmount.toFixed(2)),
        }),
        method: "POST",
      });

      const jobId = response?.jobId;

      console.log("Processing ++++ job submitted:", response);
      setSuccess(
        isExtractionWorkflow
          ? "Data extraction job submitted successfully."
          : "Processing job submitted successfully."
      );

      if (jobId) {
        router.push(`/orders/${jobId}`);
      }
    } catch (error) {
      console.error("Failed to submit processing job:", error);
    }
  }





  async function handleConfirmProcess() {
    if (!pendingProcessingPayload || !pricingEstimate) {
      return;
    }

    if (!hasSufficientWalletBalance) {
      setError("Insufficient wallet balance. Please top up and try again.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      await submitProcessingJob(pendingProcessingPayload, pricingEstimate.finalPrice);
      setPendingProcessingPayload(null);
      setPricingEstimate(null);
      setPricingRequest(null);
      setWalletBalance((previous) =>
        previous == null ? previous : Math.max(0, previous - pricingEstimate.finalPrice),
      );
    } catch (caught) {
      setPendingProcessingPayload(null);
      setPricingEstimate(null);
      setPricingRequest(null);
      setError(getErrorMessage(caught));
    } finally {
      setProcessing(false);
    }
  }

  async function handlePayByCardAndProcess() {
    const stripe = stripeRef.current;
    const cardNumber = cardNumberElementRef.current;

    if (!pendingProcessingPayload || !pricingEstimate) {
      return;
    }

    if (!stripe || !cardNumber) {
      setStripeError("Stripe card details are not ready yet.");
      return;
    }

    if (cardPaymentAmount <= 0) {
      setError("Invalid processing amount.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setCardError("");
    setStripeError("");

    try {
      const { clientSecret, paymentIntentId } = await createCardPaymentIntent(cardPaymentAmount);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          billing_details: {
            address: {
              country: cardCountry,
            },
            name: cardholderName.trim() || undefined,
          },
          card: cardNumber,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment could not be completed.");
      }

      if (result.paymentIntent?.status !== "succeeded") {
        throw new Error("Payment is not complete yet. Please try again.");
      }

      await apiRequest(walletTopUpConfirmPath, {
        auth: true,
        body: JSON.stringify({
          paymentIntentId: paymentIntentId || result.paymentIntent.id,
        }),
        method: "POST",
      });

      const latestBalance = await loadWalletBalance();
      if (latestBalance < pricingEstimate.finalPrice) {
        throw new Error("Payment succeeded but wallet balance is still insufficient. Please refresh and try again.");
      }

      await submitProcessingJob(pendingProcessingPayload, pricingEstimate.finalPrice);
      setPendingProcessingPayload(null);
      setPricingEstimate(null);
      setPricingRequest(null);
      setWalletBalance((previous) =>
        previous == null ? previous : Math.max(0, previous - pricingEstimate.finalPrice),
      );
    } catch (caught) {
      const message = getErrorMessage(caught);
      setStripeError(message);
      setError(message);
    } finally {
      setProcessing(false);
    }
  }

  function closePricingDialog() {
    if (processing) {
      return;
    }

    setPendingProcessingPayload(null);
    setPricingEstimate(null);
    setPricingRequest(null);
    setWalletError("");
    setCardError("");
    setSelectedPaymentMethod("card");
    setStripeError(stripePromise ? "" : "Stripe publishable key is missing.");
  }

  useEffect(() => {
    let active = true;

    if (!pricingEstimate || !stripePromise || selectedPaymentMethod !== "card") {
      return;
    }

    stripePromise
      .then((stripe) => {
        if (!active || !stripe || !cardNumberMountRef.current || !cardExpiryMountRef.current || !cardCvcMountRef.current) {
          return;
        }

        const elements = stripe.elements();
        const elementOptions = {
          style: {
            base: {
              color: "#0f172a",
              fontFamily: "inherit",
              fontSize: "16px",
              fontSmoothing: "antialiased",
              "::placeholder": {
                color: "#64748b",
              },
            },
            invalid: {
              color: "#dc2626",
            },
          },
        };
        const cardNumber = elements.create("cardNumber", {
          ...elementOptions,
          showIcon: true,
        });
        const cardExpiry = elements.create("cardExpiry", elementOptions);
        const cardCvc = elements.create("cardCvc", elementOptions);
        const handleChange = (event: { error?: { message?: string } }) => {
          setCardError(event.error?.message || "");
        };

        cardNumber.mount(cardNumberMountRef.current);
        cardExpiry.mount(cardExpiryMountRef.current);
        cardCvc.mount(cardCvcMountRef.current);
        cardNumber.on("change", handleChange);
        cardExpiry.on("change", handleChange);
        cardCvc.on("change", handleChange);
        cardNumber.on("ready", () => setCardReadyFields((fields) => ({ ...fields, number: true })));
        cardExpiry.on("ready", () => setCardReadyFields((fields) => ({ ...fields, expiry: true })));
        cardCvc.on("ready", () => setCardReadyFields((fields) => ({ ...fields, cvc: true })));

        stripeRef.current = stripe;
        cardNumberElementRef.current = cardNumber;
        cardExpiryElementRef.current = cardExpiry;
        cardCvcElementRef.current = cardCvc;
      })
      .catch(() => {
        if (active) {
          setStripeError("Unable to load Stripe.");
        }
      });

    return () => {
      active = false;
      cardNumberElementRef.current?.destroy();
      cardExpiryElementRef.current?.destroy();
      cardCvcElementRef.current?.destroy();
      cardNumberElementRef.current = null;
      cardExpiryElementRef.current = null;
      cardCvcElementRef.current = null;
      stripeRef.current = null;
      setCardReadyFields({ cvc: false, expiry: false, number: false });
      setCardError("");
    };
  }, [pricingEstimate, selectedPaymentMethod]);

  useEffect(() => {
    if (!mapElementRef.current || !aoiOverlayElement || mapRef.current) {
      return;
    }

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        fill: new Fill({ color: "rgba(20, 184, 166, 0.16)" }),
        image: new CircleStyle({
          fill: new Fill({ color: "#14b8a6" }),
          radius: 7,
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
        stroke: new Stroke({ color: "#0f766e", width: 3 }),
      }),
    });
    vectorLayer.setProperties({
      baseLayer: false,
      displayInLayerSwitcher: false,
    });


    // const satelliteLayer = new Geoportail({
    //   title: 'Satellite Imaginary',
    //   baseLayer: true,
    //   displayInLayerSwitcher: true,
    //   visible: false,
    //   layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    //   opacity: 1
    // })

    // const satelliteLayer2 =new TileLayer({
    //   title: 'Google Satellite Imaginary',
    //   baseLayer: true,
    //   displayInLayerSwitcher: true,
    //   visible: false,
    //   source: new XYZSource({
    //     // Google's satellite tile server URL
    //     url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    //     maxZoom: 20
    //   })
    // });

    const satelliteLayer3 =new TileLayer({
      visible: false,
      source: new XYZSource({
        // Pure satellite imagery url
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        // Crucial: You must attribute the data providers
        attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      })
    });

    satelliteLayer3.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "Satellite Imaginary",
    });

    const osm = new TileLayer({
      opacity: 1,
      source: new OSM(),
      visible: true
    });
    osm.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "OSM",
    });

    const openTopomap = new TileLayer({
      source: new XYZSource({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
      }),
      visible: false,
      opacity: 1,
    });
    openTopomap.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "Open Topo Map",
    });
    mapRef.current = new Map({
      target: mapElementRef.current,
      layers: [
      //  satelliteLayer,
      // satelliteLayer2,
      satelliteLayer3,
       osm,
       openTopomap,
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([84.124, 28.3949]),
        zoom: 6.6,
      }),
    });

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.updateSize();
    });
    resizeObserver.observe(mapElementRef.current);

    const ctrl = new LayerSwitcherImage({collapsed: false});
    ctrl.isOpen(true);
    mapRef.current.addControl(ctrl);

    const aoiOverlayControl = new Control({
      element: aoiOverlayElement,
    });
    mapRef.current.addControl(aoiOverlayControl);





    return () => {
      resizeObserver.disconnect();
      mapRef.current?.removeControl(aoiOverlayControl);
      mapRef.current?.removeControl(ctrl);
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
    };
  }, [aoiOverlayElement]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
      drawRef.current = null;
    }

    if (aoiMode === "upload") {
      return;
    }

    const draw = new Draw({
      source: vectorSourceRef.current,
      type: GeometryType.POLYGON,
    });

    draw.on("drawstart", () => {
      vectorSourceRef.current.clear();
      setAoiDetails("");
      setSuccess("");
    });

    draw.on("drawend", (event) => {
      setAoiSummary(geometrySummary(event.feature));
      setAoiDetails("");
    });

    map.addInteraction(draw);
    drawRef.current = draw;

    return () => {
      map.removeInteraction(draw);
    };
  }, [aoiMode]);

  function resetAoi() {
    vectorSourceRef.current.clear();
    setAoiSummary(defaultAoiSummary);
    setAoiDetails("");
    setFileName("");
    setLocationPropertyNames([]);
    setSelectedLocationPropertyName("");
    setSuccess("");
  }

  function clearUploadedAoi(input?: HTMLInputElement) {
    vectorSourceRef.current.clear();
    setAoiSummary(defaultAoiSummary);
    setAoiDetails("");
    setFileName("");
    setLocationPropertyNames([]);
    setSelectedLocationPropertyName("");

    if (input) {
      input.value = "";
    }
  }

  function polygonLimitError(features: Feature[]) {
    const count = totalPolygonCount(features);

    if (!count) {
      return "Select at least one polygon before processing.";
    }

    if (count > maxPolygonCount) {
      return `AOI allows a maximum of ${maxPolygonCount} polygons at a time.`;
    }

    return "";
  }

  function uploadedAoiDetails(features: Feature[]) {
    const geometryTypes = Array.from(
      new Set(features.map((feature) => feature.getGeometry()?.getType()).filter(Boolean)),
    ).join(", ");
    const polygonTotal = totalPolygonCount(features);
    const totalArea = featureAreaSqMeters(features);

    return [
      geometryTypes ? `GeoJSON type: ${geometryTypes}` : null,
      polygonTotal ? `Polygons: ${polygonTotal}` : null,
      totalArea ? `Area: ${formatArea(totalArea)}` : null,
    ].filter(Boolean).join(" • ");
  }

  function addFeaturesToAoiLayer(features: Feature[], formatName: string) {
    if (!features.length) {
      throw new Error(`${formatName} file does not contain any AOI features.`);
    }

    const limitError = polygonLimitError(features);
    if (limitError) {
      throw new Error(limitError);
    }

    const propertyNames = featurePropertyNames(features);
    if (!propertyNames.length) {
      throw new Error("Upload polygon with attribute/property with at least one column.");
    }

    vectorSourceRef.current.addFeatures(features);

    const extent = vectorSourceRef.current.getExtent();
    if (extent) {
      mapRef.current?.getView().fit(extent, {
        duration: 250,
        maxZoom: 16,
        padding: [48, 48, 48, 48],
      });
    }

    setAoiSummary(`${features.length} ${formatName} feature${features.length === 1 ? "" : "s"} loaded`);
    setAoiDetails(uploadedAoiDetails(features));
    setLocationPropertyNames(propertyNames);
    setSelectedLocationPropertyName("");
  }

  async function convertVectorFileToGeoJson(file: File, fieldName: "file" | "zippedShapefile") {
    const formData = new FormData();
    formData.append(fieldName, file);

    return apiRequest<unknown>("/api/v1/convert-vector-to-geojson/", {
      body: formData,
      method: "POST",
    });
  }

  function readGeoJsonFeatures(data: unknown) {
    return new GeoJSON().readFeatures(unwrapGeoJson(data), {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    const lowerName = file.name.toLowerCase();

    if (file.size > maxAoiUploadSizeBytes) {
      clearUploadedAoi(input);
      setError(`Maximum allowed size is ${maxAoiUploadSizeLabel}. Upload file less than ${maxAoiUploadSizeLabel}.`);
      return;
    }

    setFileName(file.name);
    setIsUploadingAoi(true);
    setAoiSummary("Uploading file...");
    vectorSourceRef.current.clear();
    setAoiDetails("");
    setLocationPropertyNames([]);
    setSelectedLocationPropertyName("");

    try {
      if (lowerName.endsWith(".geojson") || lowerName.endsWith(".json")) {
        const text = await file.text();
        const features = readGeoJsonFeatures(text);
        addFeaturesToAoiLayer(features, "GeoJSON");
        return;
      }

      if (lowerName.endsWith(".kml")) {
        const text = await file.text();
        const features = new KML().readFeatures(text, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });
        addFeaturesToAoiLayer(features, "KML");
        return;
      }

      if (lowerName.endsWith(".zip")) {
        setAoiSummary("Uploading file...");
        const convertedGeoJson = await convertVectorFileToGeoJson(file, "zippedShapefile");
        const features = readGeoJsonFeatures(convertedGeoJson);
        addFeaturesToAoiLayer(features, "Zipped shapefile");
        return;
      }

      if (lowerName.endsWith(".gpkg")) {
        setAoiSummary("Uploading file...");
        const convertedGeoJson = await convertVectorFileToGeoJson(file, "file");
        const features = readGeoJsonFeatures(convertedGeoJson);
        addFeaturesToAoiLayer(features, "GeoPackage");
        return;
      }
    } catch (caught) {
      clearUploadedAoi(input);
      setError(getErrorMessage(caught));
      return;
    } finally {
      setIsUploadingAoi(false);
    }

    setError("Please upload a zipped shapefile, KML, GeoJSON, or GPKG file.");
    clearUploadedAoi(input);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!orderName.trim()) {
      setError("Enter an order name before processing.");
      return;
    }

    if (!selectedService) {
      setError("Select a service before processing.");
      return;
    }

    if (isDataExtraction && !selectedDataSource) {
      setError("Select a data source before processing.");
      return;
    }

    if (isCmip6DataExtraction && !selectedCmip6Model) {
      setError("Select a CMIP6 model before processing.");
      return;
    }

    if (isCmip6DataExtraction && !selectedCmip6Scenario) {
      setError("Select a CMIP6 scenario before processing.");
      return;
    }

    if (shouldShowCmip6PressureSelect && !selectedCmip6PressureLevel) {
      setError("Select an atmospheric pressure level before processing.");
      return;
    }

    if (isExtractionWorkflow && shouldShowSpatialResolutionSelect && !selectedSpatialResolution) {
      setError("Select a spatial resolution type before processing.");
      return;
    }

    if (!timeRangeMode) {
      setError("Select a supported temporal resolution type before processing.");
      return;
    }

    if (timeRangeMode === "annual" && (!yearFrom || !yearTo)) {
      setError("Select a start year and end year before processing.");
      return;
    }

    if (timeRangeMode === "annual" && yearFrom > yearTo) {
      setError("Start year must be before end year.");
      return;
    }

    if (timeRangeMode === "monthly" && (!monthPickerStart || !monthPickerEnd)) {
      setError("Select a start month and end month before processing.");
      return;
    }

    if (timeRangeMode === "monthly" && monthPickerStart && monthPickerEnd && monthPickerStart > monthPickerEnd) {
      setError("Start month must be before end month.");
      return;
    }

    if (timeRangeMode === "date" && (!dateFrom || !dateTo)) {
      setError("Select a start date and end date before processing.");
      return;
    }

    if (timeRangeMode === "date" && dateFrom > dateTo) {
      setError("Start date must be before end date.");
      return;
    }

    const selectedRange = selectedDateRange();
    const dateLimitError = dateConstraintError(selectedRange.startDate, selectedRange.endDate, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints);
    if (dateLimitError) { setError(dateLimitError); return; }

    const aoiFeatures = vectorSourceRef.current.getFeatures();

    if (!aoiFeatures.length) {
      setError("Select an area of interest before processing.");
      return;
    }

    const limitError = polygonLimitError(aoiFeatures);
    if (limitError) {
      setError(limitError);
      return;
    }
    const areaLimitError = areaConstraintError(aoiFeatures, selectedSourceConstraints);
    if (areaLimitError) { setError(areaLimitError); return; }

    if (aoiMode === "draw" && !polygonLocationName.trim()) {
      setError("Enter an AOI location name before processing.");
      return;
    }

    if (aoiMode === "upload" && locationPropertyNames.length > 0 && !selectedLocationPropertyName) {
      setError("Select the property name field with location name before processing.");
      return;
    }

    const processingPayload = buildProcessingPayload();

    if (isFreeDataSource) {
      setProcessing(true);
      try {
        await submitProcessingJob(processingPayload, 0);
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    try {
      const pricingPayload = buildPricingPayload(processingPayload, aoiFeatures);
      const estimate = await requestPricingEstimate(pricingPayload);
      await loadWalletBalance();
      setSelectedPaymentMethod("card");
      setPendingProcessingPayload(processingPayload);
      setPricingEstimate(estimate);
      setPricingRequest(pricingPayload);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-visible lg:px-4 lg:py-4 lg:h-[calc(100dvh-0.3rem)] lg:min-h-0 lg:overflow-hidden">
      {pricingEstimate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-50/95 p-4 backdrop-blur-sm">
          <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(20rem,35rem)_minmax(22rem,35rem)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="text-sm font-black uppercase text-slate-500">Total cost</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-black leading-none text-slate-950">${pricingEstimate.finalPrice.toFixed(2)}</span>
                <span className="pb-1.5 text-xs font-bold uppercase text-slate-500">USD</span>
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>Ready to run · {formatPricingNumber(pricingRequest?.numberOfPolygons ?? 0)} polygons validated</span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Database className="size-4 text-slate-500" /><span className="text-slate-600">Data name</span><span className="max-w-[12rem] truncate text-right font-bold text-slate-950">{pricingRequest?.processDataName}</span></div>
                {pricingRequest?.dataSourceName ? (
                  <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Database className="size-4 text-slate-500" /><span className="text-slate-600">Data source</span><span className="max-w-[12rem] truncate text-right font-bold text-slate-950">{pricingRequest.dataSourceName}</span></div>
                ) : null}
                {pricingRequest?.modelName ? (
                  <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Cpu className="size-4 text-slate-500" /><span className="text-slate-600">Model</span><span className="max-w-[12rem] truncate text-right font-bold text-slate-950">{pricingRequest.modelName}</span></div>
                ) : null}
                {pricingRequest?.scenarioName ? (
                  <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Zap className="size-4 text-slate-500" /><span className="text-slate-600">Scenario</span><span className="max-w-[12rem] truncate text-right font-bold text-slate-950">{pricingRequest.scenarioName}</span></div>
                ) : null}
                <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Layers className="size-4 text-slate-500" /><span className="text-slate-600">Total polygons</span><span className="font-bold text-slate-950">{formatPricingNumber(pricingRequest?.numberOfPolygons ?? 0)}</span></div>
                <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Clock className="size-4 text-slate-500" /><span className="text-slate-600">Temporal resolution</span><span className="font-bold text-slate-950">{pricingRequest?.temporalResolution}</span></div>
                <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Calendar className="size-4 text-slate-500" /><span className="text-slate-600">Start date</span><span className="font-bold text-slate-950">{pricingRequest?.startDate}</span></div>
                <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"><Calendar className="size-4 text-slate-500" /><span className="text-slate-600">End date</span><span className="font-bold text-slate-950">{pricingRequest?.endDate}</span></div>
              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-950">Choose payment method</h3>
              <p className="mt-2 text-sm text-slate-600">
                Select how you want to pay before submitting the job.
              </p>

              <div className="mt-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    selectedPaymentMethod === "card"
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  onClick={() => setSelectedPaymentMethod("card")}
                  type="button"
                >
                  Use card
                </button>
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    selectedPaymentMethod === "wallet"
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  onClick={() => setSelectedPaymentMethod("wallet")}
                  type="button"
                >
                  Use balance
                </button>
              </div>

              {selectedPaymentMethod === "wallet" ? (
                <>
                  <div className="mt-6 space-y-3 rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Available balance</span>
                      <span className="font-bold text-slate-950">
                        {walletLoading ? "Loading..." : currencyAmount(walletBalance ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Processing charge</span>
                      <span className="font-bold text-slate-950">{currencyAmount(processingCharge)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <span className="text-slate-600">Balance after wallet debit</span>
                      <span className="font-bold text-slate-950">
                        {currencyAmount(Math.max(0, (walletBalance ?? 0) - processingCharge))}
                      </span>
                    </div>
                  </div>
                  {walletError ? <Alert className="mt-4" variant="destructive">{walletError}</Alert> : null}
                  {!walletLoading && !walletError && !hasSufficientWalletBalance ? (
                    <Alert className="mt-4" variant="destructive">
                      Insufficient wallet balance. Switch to card payment or top up your wallet.
                    </Alert>
                  ) : null}
                </>
              ) : null}

              {selectedPaymentMethod === "card" ? (
                <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Pay by card and process directly</p>
                  <p className="text-xs text-slate-600">Card charge: {currencyAmount(cardPaymentAmount)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Cardholder name</span>
                      <Input
                        className="mt-1 h-10"
                        disabled={processing}
                        onChange={(event) => setCardholderName(event.target.value)}
                        placeholder="Name on card"
                        value={cardholderName}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Country</span>
                      <select
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                        disabled={processing}
                        onChange={(event) => setCardCountry(event.target.value)}
                        value={cardCountry}
                      >
                        {countryOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-xs font-medium text-slate-500">Card number</span>
                    <div className="mt-2 min-h-6" ref={cardNumberMountRef} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-xs font-medium text-slate-500">Expiration</span>
                      <div className="mt-2 min-h-6" ref={cardExpiryMountRef} />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-xs font-medium text-slate-500">CVC</span>
                      <div className="mt-2 min-h-6" ref={cardCvcMountRef} />
                    </div>
                  </div>
                  {cardError ? <p className="text-xs font-medium text-red-600">{cardError}</p> : null}
                  {stripeError ? <Alert variant="destructive">{stripeError}</Alert> : null}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button
                  disabled={processing}
                  onClick={closePricingDialog}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                {selectedPaymentMethod === "wallet" ? (
                  <Button
                    className="bg-slate-950 text-white hover:bg-slate-800"
                    disabled={processing || walletLoading || !hasSufficientWalletBalance}
                    onClick={handleConfirmProcess}
                    type="button"
                  >
                    {processing ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {processing ? "Processing..." : "Deduct wallet balance & process"}
                  </Button>
                ) : (
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={!canPayByCard}
                    onClick={handlePayByCardAndProcess}
                    type="button"
                  >
                    {processing ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                    {processing ? "Processing..." : `Pay ${currencyAmount(cardPaymentAmount)} by card & process`}
                  </Button>
                )}
              </div>

              {selectedPaymentMethod === "wallet" ? (
                <p className="mt-4 text-xs text-slate-500">
                  Need more funds? <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/wallet">Top up wallet</Link>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid min-h-full gap-4 lg:h-full lg:grid-cols-[400px_minmax(0,1fr)]">
        <form
          className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="border-b border-slate-200 p-5">
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {isCmip6DataExtraction
                ? "CMIP6 Data Extraction Configuration"
                : isDataExtraction
                  ? "Data Extraction Configuration"
                  : "Services Configuration"}
            </h1>
          </div>

          {error || success ? (
            <div className="space-y-2 border-b border-slate-200 bg-white px-5 py-3" role="status">
              {error ? <Alert variant="destructive">{error}</Alert> : null}
              {success ? <Alert variant="success">{success}</Alert> : null}
            </div>
          ) : null}

          <div className="flex-1 space-y-5 overflow-visible p-5 lg:min-h-0 lg:overflow-y-auto">
            <label className="block">
              <Label className="font-semibold">Order Name</Label>
              <Input
                className="mt-2"
                maxLength={50}
                onChange={(event) => setOrderName(event.target.value)}
                placeholder={
                  isCmip6DataExtraction
                    ? "e.g. Bhaktapur CMIP6 extraction"
                    : isDataExtraction
                      ? "e.g. Bhaktapur Landsat extraction"
                      : "e.g. Bhaktapur annual land analysis"
                }
                required
                value={orderName}
              />
            </label>

            <label className="block">
              <Label className="font-semibold">Service</Label>
              <Select
                className="mt-2"
                disabled={loadingServices}
                onChange={(event) => handleServiceChange(event.target.value)}
                required
                value={selectedService}
              >
                <SelectOption value="">{loadingServices ? "Loading services..." : "Select service"}</SelectOption>
                {services.map((service) => (
                  <SelectOption key={service.id} value={service.id}>
                    {typeof service.service_name === "object" && service.service_name?.service_type_name
                      ? `${service.service_name.service_type_name} - ${service.name_label ?? service.name}`
                      : service.name_label ?? service.name}
                  </SelectOption>
                ))}
              </Select>
            </label>

            {isDataExtraction ? (
              <label className="block">
                <Label className="font-semibold">Data source</Label>
                <Select
                  className="mt-2"
                  disabled={!selectedService || !dataSources.length}
                  onChange={(event) => handleDataSourceChange(event.target.value)}
                  required
                  value={selectedDataSource}
                >
                  <SelectOption value="">
                    {!selectedService
                      ? "Select service first"
                      : dataSources.length
                        ? "Select data source"
                        : "No data sources available"}
                  </SelectOption>
                  {dataSources.map((dataSource, index) => {
                    const value = dataSourceValue(dataSource, index);
                    const label = dataSourceLabel(dataSource, value);

                    return (
                      <SelectOption key={value} value={value}>
                        {label}
                      </SelectOption>
                    );
                  })}
                </Select>
              </label>
            ) : null}

            {isCmip6DataExtraction ? (
              <>
                <label className="block">
                  <Label className="font-semibold">Model</Label>
                  <Select
                    className="mt-2"
                    disabled={!selectedService || !cmip6ModelOptions.length}
                    onChange={(event) => handleCmip6ModelChange(event.target.value)}
                    required
                    value={selectedCmip6Model}
                  >
                    <SelectOption value="">
                      {!selectedService
                        ? "Select service first"
                        : cmip6ModelOptions.length
                          ? "Select model"
                          : "No models available"}
                    </SelectOption>
                    {cmip6ModelOptions.map((source, index) => {
                      const value = cmip6ModelValue(source, index);
                      const label = cmip6ModelLabel(source, value);

                      return (
                        <SelectOption key={value} value={value}>
                          {label}
                        </SelectOption>
                      );
                    })}
                  </Select>
                </label>

                <label className="block">
                  <Label className="font-semibold">Scenario</Label>
                  <Select
                    className="mt-2"
                    disabled={!selectedCmip6Model || !cmip6ScenarioOptions.length}
                    onChange={(event) => handleCmip6ScenarioChange(event.target.value)}
                    required
                    value={selectedCmip6Scenario}
                  >
                    <SelectOption value="">
                      {!selectedCmip6Model
                        ? "Select model first"
                        : cmip6ScenarioOptions.length
                          ? "Select scenario"
                          : "No scenarios available"}
                    </SelectOption>
                    {cmip6ScenarioOptions.map((source, index) => {
                      const value = cmip6ScenarioValue(source, index);
                      const label = cmip6ScenarioLabel(source, value);

                      return (
                        <SelectOption key={value} value={value}>
                          {label}
                        </SelectOption>
                      );
                    })}
                  </Select>
                </label>

                {shouldShowCmip6PressureSelect ? (
                  <label className="block">
                    <Label className="font-semibold">Atmospheric pressure level</Label>
                    <Select
                      className="mt-2"
                      disabled={!selectedCmip6Scenario || !cmip6PressureOptions.length}
                      onChange={(event) => handleCmip6PressureLevelChange(event.target.value)}
                      required
                      value={selectedCmip6PressureLevel}
                    >
                      <SelectOption value="">Select pressure level</SelectOption>
                      {cmip6PressureOptions.map((source, index) => {
                        const value = cmip6PressureValue(source, index);
                        const label = cmip6PressureLabel(source, value);

                        return (
                          <SelectOption key={value} value={value}>
                            {label}
                          </SelectOption>
                        );
                      })}
                    </Select>
                  </label>
                ) : null}
              </>
            ) : null}

            {shouldShowTemporalResolutionSelect ? (
              <label className="block">
                <Label className="font-semibold">Temporal resolution type</Label>
                <Select
                  className="mt-2"
                  disabled={(isDataExtraction && !selectedDataSource) || (isCmip6DataExtraction && !selectedCmip6Scenario)}
                  onChange={(event) => handleTemporalResolutionChange(event.target.value)}
                  required
                  value={selectedTemporalResolution}
                >
                  <SelectOption value="">Select temporal resolution</SelectOption>
                  {temporalResolutionTypes.map((temporalType, index) => {
                    const value = temporalTypeValue(temporalType, index);
                    const label = temporalTypeLabel(temporalType, value);

                    return (
                      <SelectOption key={value} value={value}>
                        {label}
                      </SelectOption>
                    );
                  })}
                </Select>
              </label>
            ) : null}

            {shouldShowSpatialResolutionSelect ? (
              <label className="block">
                <Label className="font-semibold">Spatial resolution type</Label>
                <Select
                  className="mt-2"
                  disabled={!selectedTemporalResolution}
                  onChange={(event) => setSelectedSpatialResolution(event.target.value)}
                  required
                  value={selectedSpatialResolution}
                >
                  <SelectOption value="">Select spatial resolution</SelectOption>
                  {spatialResolutionTypes.map((spatialType, index) => {
                    const value = spatialTypeValue(spatialType, index);
                    const label = spatialTypeLabel(spatialType, value);

                    return (
                      <SelectOption key={value} value={value}>
                        {label}
                      </SelectOption>
                    );
                  })}
                </Select>
              </label>
            ) : null}

            {timeRangeMode === "annual" ? (
              <YearRangeSelector
                endYear={yearTo}
                maxYear={maximumSelectableEndDate(yearFrom ? `${yearFrom}-01-01` : null, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints).getFullYear()}
                maxStartYear={maximumSelectableEndDate(null, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints).getFullYear()}
                minYear={Number(selectedSourceConstraints?.minimum_start_date?.slice(0, 4) || 1990)}
                onEndYearChange={setYearTo}
                onStartYearChange={setYearFrom}
                startYear={yearFrom}
              />
            ) : null}

            {timeRangeMode === "monthly" ? (
              <MonthRangePicker
                endDate={monthPickerEnd}
                maxDate={maximumSelectableEndDate(monthPickerStart, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints)}
                startMaxDate={maximumSelectableEndDate(null, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints)}
                minDate={selectedSourceConstraints?.minimum_start_date ? new Date(`${selectedSourceConstraints.minimum_start_date}T00:00:00`) : undefined}
                onEndDateChange={setMonthPickerEnd}
                onStartDateChange={setMonthPickerStart}
                startDate={monthPickerStart}
              />
            ) : null}

            {timeRangeMode === "date" ? (
              <DateRangeSelector
                endDate={dateTo}
                maximumDate={maximumSelectableEndDateValue(dateFrom, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints)}
                maximumStartDate={maximumSelectableEndDateValue(null, temporalTypeLabel(selectedTemporalResolutionType), selectedSourceConstraints)}
                minimumDate={selectedSourceConstraints?.minimum_start_date}
                onEndDateChange={setDateTo}
                onStartDateChange={setDateFrom}
                startDate={dateFrom}
              />
            ) : null}

            <div>
              <Label className="font-semibold">Area of interest</Label>
              <RadioGroup
                className="mt-2"
                name="aoi-mode"
                onValueChange={handleAoiModeChange}
                options={aoiModes}
                value={aoiMode}
              />
            </div>

            {aoiMode === "draw" ? (
              <label className="block">
                <Label className="font-semibold">AOI location name</Label>
                <Input
                  className="mt-2"
                  maxLength={100}
                  onChange={(event) => setPolygonLocationName(event.target.value)}
                  placeholder="e.g. Bhaktapur study area"
                  required
                  value={polygonLocationName}
                />
              </label>
            ) : null}

            {aoiMode === "upload" ? (
              <>
                <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
                  <Label className="font-semibold">Upload AOI file</Label>
                  <Input
                    accept=".zip,.kml,.geojson,.json,.gpkg,application/geo+json,application/vnd.google-earth.kml+xml,application/geopackage+sqlite3,application/x-sqlite3"
                    className="mt-3 h-11 py-[5px] leading-8 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-0 file:text-sm file:font-semibold file:leading-8 file:text-white"
                    disabled={isUploadingAoi}
                    onChange={handleFileUpload}
                    type="file"
                  />
                  <span aria-live="polite" className="mt-2 block text-xs text-slate-500">
                    {isUploadingAoi ? (
                      <span className="inline-flex items-center gap-1.5">
                        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-teal-700" />
                        Uploading file...
                      </span>
                    ) : (
                      fileName || "Zipped shapefile, KML, GeoJSON or GPKG"
                    )}
                  </span>
                </label>

                <label className="block">
                  <Label className="font-semibold">Select property name field with location name</Label>
                  <Select
                    className="mt-2"
                    disabled={isUploadingAoi || !locationPropertyNames.length}
                    onChange={(event) => setSelectedLocationPropertyName(event.target.value)}
                    required={locationPropertyNames.length > 0}
                    value={selectedLocationPropertyName}
                  >
                    <SelectOption value="">
                      {fileName
                        ? locationPropertyNames.length
                          ? "Select property name"
                          : "No property columns found"
                        : "Upload a file first"}
                    </SelectOption>
                    {locationPropertyNames.map((name) => (
                      <SelectOption key={name} value={name}>
                        {name}
                      </SelectOption>
                    ))}
                  </Select>
                </label>
              </>
            ) : null}

          </div>

          <div className="border-t border-slate-200 p-5">
            <Button
              className="w-full"
              disabled={processing || isUploadingAoi}
              type="submit"
            >
              {processing ? "Processing..." : isExtractionWorkflow ? "Review & Continue" : "Process"}
            </Button>
          </div>
        </form>

        <section className="relative min-h-[26rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm lg:h-full">
          <div ref={mapElementRef} className="h-full min-h-[26rem] w-full lg:min-h-0" />
          {aoiOverlayElement
            ? createPortal(
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current AOI</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{aoiSummary}</p>
                  {aoiDetails ? <p className="mt-1 text-xs font-medium text-slate-700">{aoiDetails}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">{selectedMode?.description}</p>
                  <Button
                    className="mt-3"
                    onClick={resetAoi}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Clear AOI
                  </Button>
                </div>,
                aoiOverlayElement,
              )
            : null}
        </section>
      </div>
    </div>
  );
}
