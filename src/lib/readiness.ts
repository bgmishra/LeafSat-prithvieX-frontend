/**
 * The leaf-off readiness colour ramp, shared by the legend and anything else
 * that draws readiness colours.
 *
 * These stops MUST match the ColorMap in the GeoServer style
 * (SLDAll/leaf_off_readiness.sld): GeoServer's `type="ramp"` and a CSS
 * `linear-gradient` both interpolate linearly in sRGB, so identical stops at
 * identical positions render identically. Do not add `in oklch` to the gradient.
 *
 * Semantics (product-owner decision): 1.0 = READY for leaf-off, 0.0 = NOT READY.
 * The colours are deliberately NOT flipped: green sits at 0 and red at 1.
 */
export const READINESS_STOPS = [
  { value: 0.0, color: "#1a9850" },
  { value: 0.5, color: "#fee08b" },
  { value: 1.0, color: "#d73027" },
] as const;

export const READINESS_GRADIENT_CSS = `linear-gradient(to right, ${READINESS_STOPS.map(
  (stop) => `${stop.color} ${Math.round(stop.value * 100)}%`,
).join(", ")})`;

export const READINESS_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

export const READINESS_END_LABELS = {
  low: "Not ready",
  mid: "Moderate",
  high: "Ready",
} as const;

/** A word for a value, so the map never relies on colour alone. */
export function readinessBand(value: number) {
  if (value < 1 / 3) {
    return READINESS_END_LABELS.low;
  }
  if (value <= 2 / 3) {
    return READINESS_END_LABELS.mid;
  }
  return READINESS_END_LABELS.high;
}
