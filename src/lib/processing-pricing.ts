export type TemporalResolution =
  | "Daily"
  | "5 Days"
  | "Weekly"
  | "Bi-weekly"
  | "Monthly"
  | "Annual"
  | string;

export type PricingServiceType =
  | "NDVI"
  | "Temperature"
  | "Forest Loss"
  | "Precipitation"
  | "CMIP6"
  | "Data Extraction"
  | string;

export type PricingInput = {
  totalAreaHa: number;
  spatialResolutionMeters: number;
  temporalResolution: TemporalResolution;
  startDate: string;
  endDate: string;
  numberOfPolygons: number;
  bytesPerReturnedValue?: number;
  serviceType: PricingServiceType;
};

export type PricingCoefficients = {
  processingScoreMultiplier: number;
  deliveryScoreMultiplier: number;
};

export type PricingResult = {
  pixelAreaHa: number;
  pixelCount: number;
  temporalCount: number;
  processingPixels: number;
  processingScore: number;
  deliveryCount: number;
  deliveryScore: number;
  outputSizeBytes: number;
  processingCharge: number;
  handlingCharge: number;
  finalPrice: number;
  coefficients: PricingCoefficients;
};

const defaultCoefficients: PricingCoefficients = {
  processingScoreMultiplier: 1,
  deliveryScoreMultiplier: 2.5,
};

const serviceCoefficientOverrides: Record<string, Partial<PricingCoefficients>> = {
  cmip6: {},
  "data extraction": {},
  ndvi: {},
  temperature: {},
  "forest loss": {},
  precipitation: {},
};

type PricingCoefficientConfig = {
  default?: Partial<PricingCoefficients>;
  services?: Record<string, Partial<PricingCoefficients>>;
};

function toDecimal(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Pricing inputs must be finite numbers.");
  }

  return value;
}

function roundDecimal(value: number, places = 8) {
  const factor = 10 ** places;
  return Math.round((toDecimal(value) + Number.EPSILON) * factor) / factor;
}

function roundCurrency(value: number) {
  return roundDecimal(value, 2);
}

function cleanCoefficients(value: Partial<PricingCoefficients> | undefined) {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, coefficient]) => Number.isFinite(coefficient)),
  ) as Partial<PricingCoefficients>;
}

function configuredCoefficients(): PricingCoefficientConfig {
  const rawConfig = process.env.PROCESSING_PRICING_COEFFICIENTS;

  if (!rawConfig) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawConfig) as PricingCoefficientConfig;

    return {
      default: cleanCoefficients(parsed.default),
      services: Object.fromEntries(
        Object.entries(parsed.services || {}).map(([service, coefficients]) => [
          service.toLowerCase().trim(),
          cleanCoefficients(coefficients),
        ]),
      ),
    };
  } catch {
    return {};
  }
}

function inclusiveDays(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Math.floor((endUtc - startUtc) / msPerDay) + 1;
}

function inclusiveMonths(startDate: Date, endDate: Date) {
  return (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth() +
    1;
}

function inclusiveYears(startDate: Date, endDate: Date) {
  return endDate.getUTCFullYear() - startDate.getUTCFullYear() + 1;
}

function parseDate(value: string, fieldName: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return date;
}

export function calculatePixelAreaHa(spatialResolutionMeters: number) {
  const resolution = toDecimal(spatialResolutionMeters);
  return roundDecimal((resolution * resolution) / 10_000);
}

export function calculatePixelCount(totalAreaHa: number, pixelAreaHa: number) {
  return roundDecimal(toDecimal(totalAreaHa) / toDecimal(pixelAreaHa));
}

export function calculateTemporalCount(temporalResolution: TemporalResolution, startDateValue: string, endDateValue: string) {
  const startDate = parseDate(startDateValue, "startDate");
  const endDate = parseDate(endDateValue, "endDate");

  if (endDate < startDate) {
    throw new Error("endDate must be on or after startDate.");
  }

  const normalized = temporalResolution.toLowerCase().replace(/[_-]+/g, " ").trim();
  const days = inclusiveDays(startDate, endDate);

  if (normalized.includes("annual") || normalized.includes("year")) {
    return inclusiveYears(startDate, endDate);
  }
  if (normalized.includes("month")) {
    return inclusiveMonths(startDate, endDate);
  }
  if (normalized.includes("bi weekly") || normalized.includes("biweekly")) {
    return Math.ceil(days / 14);
  }
  if (normalized.includes("5") && normalized.includes("day")) {
    return Math.ceil(days / 5);
  }
  if (normalized.includes("week")) {
    return Math.ceil(days / 7);
  }

  return days;
}

export function getPricingCoefficients(serviceType: PricingServiceType): PricingCoefficients {
  const serviceKey = serviceType.toLowerCase().trim();
  const envConfig = configuredCoefficients();
  const overrides = serviceCoefficientOverrides[serviceKey] || {};
  const envOverrides = envConfig.services?.[serviceKey] || {};

  return { ...defaultCoefficients, ...envConfig.default, ...overrides, ...envOverrides };
}

export function calculateProcessingPricing(input: PricingInput): PricingResult {
  const bytesPerReturnedValue = input.bytesPerReturnedValue ?? 8;
  const coefficients = getPricingCoefficients(input.serviceType);

  if (input.totalAreaHa <= 0) {
    throw new Error("totalAreaHa must be greater than 0.");
  }
  if (input.spatialResolutionMeters <= 0) {
    throw new Error("spatialResolutionMeters must be greater than 0.");
  }
  if (input.numberOfPolygons <= 0) {
    throw new Error("numberOfPolygons must be greater than 0.");
  }
  if (bytesPerReturnedValue <= 0) {
    throw new Error("bytesPerReturnedValue must be greater than 0.");
  }

  const pixelAreaHa = calculatePixelAreaHa(input.spatialResolutionMeters);
  const pixelCount = calculatePixelCount(input.totalAreaHa, pixelAreaHa);
  const temporalCount = calculateTemporalCount(input.temporalResolution, input.startDate, input.endDate);
  const processingPixels = roundDecimal(pixelCount * temporalCount);
  const processingScore = roundDecimal(Math.log10(processingPixels));
  const deliveryCount = input.numberOfPolygons * temporalCount;
  const deliveryScore = roundDecimal(Math.log10(deliveryCount));
  const outputSizeBytes = deliveryCount * bytesPerReturnedValue;
  const processingCharge = roundDecimal(processingScore * coefficients.processingScoreMultiplier);
  const handlingCharge = roundDecimal(deliveryScore * coefficients.deliveryScoreMultiplier);
  const finalPrice = roundCurrency(processingCharge + handlingCharge);

  return {
    pixelAreaHa,
    pixelCount,
    temporalCount,
    processingPixels,
    processingScore,
    deliveryCount,
    deliveryScore,
    outputSizeBytes,
    processingCharge,
    handlingCharge,
    finalPrice,
    coefficients,
  };
}
