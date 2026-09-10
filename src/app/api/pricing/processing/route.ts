import { NextRequest, NextResponse } from "next/server";
import { calculateProcessingPricing, PricingInput } from "@/lib/processing-pricing";

function parseNumber(value: unknown, fieldName: string, required = true) {
  if (value == null || value === "") {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return numberValue;
}

function parsePricingInput(body: Record<string, unknown>): PricingInput {
  const bytesPerReturnedValue = parseNumber(body.bytesPerReturnedValue, "bytesPerReturnedValue", false);

  return {
    totalAreaHa: parseNumber(body.totalAreaHa, "totalAreaHa") as number,
    spatialResolutionMeters: parseNumber(body.spatialResolutionMeters, "spatialResolutionMeters") as number,
    temporalResolution: String(body.temporalResolution || ""),
    startDate: String(body.startDate || ""),
    endDate: String(body.endDate || ""),
    numberOfPolygons: parseNumber(body.numberOfPolygons, "numberOfPolygons") as number,
    ...(bytesPerReturnedValue == null ? {} : { bytesPerReturnedValue }),
    serviceType: String(body.serviceType || ""),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pricing = calculateProcessingPricing(parsePricingInput(body));

    return NextResponse.json(pricing);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to calculate processing price." },
      { status: 400 },
    );
  }
}
