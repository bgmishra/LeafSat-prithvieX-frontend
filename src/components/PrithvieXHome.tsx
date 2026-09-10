/**
 * PrithvieX — Home (main content, light theme)
 * ------------------------------------------------------------------
 * Drop this in next to your existing dark Sidebar, e.g.:
 *
 *   <div className="flex min-h-screen">
 *     <Sidebar />                {/* unchanged, dark theme *\/}
 *     <PrithvieXHome />          {/* this file, white theme *\/}
 *   </div>
 *
 * Fonts (add to app/layout.tsx):
 *
 *   import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
 *
 *   const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
 *   const body = Inter({ subsets: ["latin"], variable: "--font-body" });
 *   const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
 *
 *   <html className={`${display.variable} ${body.variable} ${mono.variable}`}>
 *
 * Deps: lucide-react
 *   npm install lucide-react
 *
 * Design tokens (for reference — used as arbitrary Tailwind values below
 * so no tailwind.config changes are required):
 *   --paper:        #FFFFFF   page background
 *   --paper-sunken: #F6F7F5   recessed panels
 *   --ink:          #10151A   primary text
 *   --ink-soft:     #5B6570   secondary text
 *   --line:         #E3E6E2   hairline borders
 *   --brand:        #0E8F82   signal teal (from the PX mark)
 *   --brand-tint:   #E9F6F3   teal wash
 *   data channels →  flood #2E63D6 · fire #D9622C · vegetation #3F9142 · drought #B98421
 */

"use client";

import {
  MapPin,
  Layers,
  CloudCog,
  Mail,
  ArrowRight,
  PlayCircle,
  Waves,
  Flame,
  Sprout,
  Grid3x3,
  Mountain,
  TreePine,
  Droplets,
  Thermometer,
  Download,
  Radio,
} from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Signature element: viewport frame                                  */
/*  A cropped-corner bracket, standing in for the ROI box a user       */
/*  draws on the map — the one gesture the whole product turns on.     */
/* ------------------------------------------------------------------ */

function ViewfinderFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const corner =
    "absolute h-3 w-3 border-[#0E8F82] transition-colors duration-300";
  return (
    <div className={`relative ${className}`}>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[#5B6570]">
      <span className="h-1 w-1 rounded-full bg-[#0E8F82]" />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data readout — mono label/value pair used across HUD-style cards   */
/* ------------------------------------------------------------------ */

function Readout({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "brand";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[#8A9199]">
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-mono)] text-sm font-medium ${
          tone === "brand" ? "text-[#0E8F82]" : "text-[#10151A]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline — tiny inline trend, no library needed                   */
/* ------------------------------------------------------------------ */

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Module card — Service Analysis grid item                           */
/* ------------------------------------------------------------------ */

type ModuleCard = {
  icon: ReactNode;
  status: "Live" | "Analyzing" | "Scheduled";
  title: string;
  metric: string;
  description: string;
  accent: string;
};

const serviceModules: ModuleCard[] = [
  {
    icon: <Waves size={16} />,
    status: "Live",
    title: "Flood Monitoring",
    metric: "98.2% precision",
    description: "Map water inundation extent from SAR and optical fusion.",
    accent: "#2E63D6",
  },
  {
    icon: <Flame size={16} />,
    status: "Live",
    title: "Forest Fire Detection",
    metric: "412 hotspots",
    description: "Identify thermal hotspots and estimate burn severity.",
    accent: "#D9622C",
  },
  {
    icon: <Sprout size={16} />,
    status: "Analyzing",
    title: "Crop Health",
    metric: "NDVI +12%",
    description: "Track vegetation stress indicators for precision farming.",
    accent: "#3F9142",
  },
  {
    icon: <Grid3x3 size={16} />,
    status: "Live",
    title: "Land Cover Classification",
    metric: "9 classes resolved",
    description: "Classify urban, forest, water and crop land automatically.",
    accent: "#5B6570",
  },
  {
    icon: <Mountain size={16} />,
    status: "Scheduled",
    title: "Land Monitoring",
    metric: "30 m pixel",
    description: "Detect elevation, erosion and terrain change over time.",
    accent: "#B98421",
  },
  {
    icon: <TreePine size={16} />,
    status: "Live",
    title: "Forest Monitoring",
    metric: "-2.4% cover",
    description: "Flag deforestation alerts and canopy density trends.",
    accent: "#3F9142",
  },
];

const statusStyle: Record<ModuleCard["status"], string> = {
  Live: "text-[#0E8F82] bg-[#E9F6F3]",
  Analyzing: "text-[#B98421] bg-[#FBF3E4]",
  Scheduled: "text-[#5B6570] bg-[#F0F1EF]",
};

/* ------------------------------------------------------------------ */
/*  Extraction variable — Data Extraction grid item                    */
/* ------------------------------------------------------------------ */

type ExtractVar = {
  icon: ReactNode;
  label: string;
  source: string;
  unit: string;
  trend: number[];
  color: string;
};

const extractVars: ExtractVar[] = [
  { icon: <Sprout size={14} />, label: "NDVI Max", source: "Sentinel-2", unit: "0.0 – 1.0", trend: [2, 4, 3, 6, 8, 7, 9], color: "#3F9142" },
  { icon: <Droplets size={14} />, label: "Precipitation", source: "CHIRPS · 5km", unit: "mm / day", trend: [5, 3, 6, 4, 7, 5, 8], color: "#2E63D6" },
  { icon: <Thermometer size={14} />, label: "Land Surface Temp", source: "Landsat 8/9", unit: "°C", trend: [3, 5, 4, 6, 5, 7, 6], color: "#D9622C" },
  { icon: <Waves size={14} />, label: "NDWI", source: "Sentinel-2", unit: "-1.0 – 1.0", trend: [6, 5, 7, 6, 8, 7, 9], color: "#2E63D6" },
  { icon: <Droplets size={14} />, label: "Soil Moisture", source: "SMAP · 9km", unit: "m³/m³", trend: [4, 6, 5, 7, 6, 8, 7], color: "#B98421" },
  { icon: <Mountain size={14} />, label: "Elevation & Terrain", source: "SRTM DEM", unit: "meters", trend: [1, 2, 2, 3, 3, 4, 4], color: "#5B6570" },
  { icon: <TreePine size={14} />, label: "Vegetation Health Index", source: "MODIS", unit: "0 – 100", trend: [5, 6, 6, 7, 8, 8, 9], color: "#3F9142" },
  { icon: <Radio size={14} />, label: "Drought Indicators", source: "Dynamic World", unit: "SPI / SPEI", trend: [7, 6, 8, 6, 5, 6, 5], color: "#D9622C" },
];

/* ------------------------------------------------------------------ */
/*  Workflow — this one is a real, ordered sequence, so numbering it   */
/*  actually carries information rather than decorating the section.   */
/* ------------------------------------------------------------------ */

const workflow = [
  { icon: <MapPin size={20} />, title: "Draw your ROI", body: "Mark the area you care about on the interactive map. No shapefiles, no coordinates to type." },
  { icon: <Layers size={20} />, title: "Choose a module", body: "Pick an environmental indicator and a date range from plain-language options." },
  { icon: <CloudCog size={20} />, title: "We process it", body: "Our cloud pipeline pulls and analyzes the matching Sentinel, Landsat, MODIS or ERA5 archives." },
  { icon: <Mail size={20} />, title: "Results land in your inbox", body: "A report, GeoTIFFs and CSVs arrive by email — nothing to install, nothing to configure." },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function PrithvieXHome() {
  return (
    <main className="min-h-screen flex-1 bg-white font-[family-name:var(--font-body)] text-[#10151A]">
      {/* ---------------------------------------------------------- */}
      {/* Hero                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-[#E3E6E2] px-6 pb-16 pt-14 sm:px-10 lg:px-16">
        {/* faint topographic backdrop */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] w-full opacity-[0.05]"
          viewBox="0 0 1200 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[60, 130, 200, 270, 340].map((y, i) => (
            <path
              key={y}
              d={`M0 ${y} C 200 ${y - 40 + i * 6}, 400 ${y + 50 - i * 4}, 600 ${y} S 1000 ${y - 30}, 1200 ${y}`}
              fill="none"
              stroke="#0E8F82"
              strokeWidth="1"
            />
          ))}
        </svg>

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Copy */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E3E6E2] bg-[#F6F7F5] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[#5B6570]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0E8F82]" />
              Geospatial intelligence for everyone
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-[2.75rem] font-medium leading-[1.05] tracking-tight text-[#10151A] sm:text-6xl">
              Read the land,
              <br />
              <span className="text-[#0E8F82]">not the GIS manual.</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#5B6570]">
              Draw an area on the map, pick a date and an indicator — flood
              extent, fire risk, crop stress, land cover — and get the
              analysis emailed to you. Satellite-grade processing, zero GIS
              software.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button className="inline-flex items-center gap-2 rounded-md bg-[#10151A] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0E8F82] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E8F82]">
                Start an analysis
                <ArrowRight size={15} />
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-[#E3E6E2] px-5 py-3 text-sm font-medium text-[#10151A] transition-colors hover:border-[#0E8F82] hover:text-[#0E8F82] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E8F82]">
                <PlayCircle size={15} />
                See a sample report
              </button>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-[#E3E6E2] pt-6">
              {[
                ["10 m", "Pixel resolution"],
                ["< 2.5 h", "Typical turnaround"],
                ["40+", "Analysis modules"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#10151A]">
                    {value}
                  </dt>
                  <dd className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] text-[#8A9199]">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Instrument panel */}
          <ViewfinderFrame className="justify-self-center rounded-lg border border-[#E3E6E2] bg-[#FBFCFB] p-1 shadow-[0_1px_2px_rgba(16,21,26,0.04)]">
            <div className="w-full max-w-sm rounded-md">
              <div className="flex items-center justify-between border-b border-[#E3E6E2] px-4 py-3">
                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[#5B6570]">
                  Analysis · Preview
                </span>
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#0E8F82]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0E8F82]" />
                  Ready
                </span>
              </div>

              <div className="relative m-4 h-32 overflow-hidden rounded border border-[#E3E6E2] bg-[#EFF3EE]">
                <svg viewBox="0 0 300 130" className="h-full w-full">
                  <path d="M0 90 Q 60 60 120 85 T 300 70 V130 H0 Z" fill="#DCEAE0" />
                  <path d="M0 100 Q 80 70 160 95 T 300 90" fill="none" stroke="#B7CDBE" strokeWidth="1" />
                </svg>
                <div className="absolute left-1/2 top-1/2 h-14 w-20 -translate-x-1/2 -translate-y-1/2 border border-[#0E8F82]">
                  <span className="absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2 border-[#0E8F82]" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2 border-[#0E8F82]" />
                  <span className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-[#0E8F82]" />
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-[#0E8F82]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 px-4 pb-4">
                <Readout label="Area" value="4,281 km²" />
                <Readout label="Flood probability" value="82.4%" tone="brand" />
              </div>
              <div className="flex items-center justify-between border-t border-[#E3E6E2] px-4 py-3">
                <Readout label="Source" value="Sentinel-2" />
                <Readout label="Pixel" value="10 m" />
                <Sparkline points={[3, 5, 4, 7, 6, 8, 9]} color="#0E8F82" />
              </div>
            </div>
          </ViewfinderFrame>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Service Analysis + Data Extraction                          */}
      {/* ---------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl gap-14 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:px-16">
        {/* Service Analysis */}
        <div>
          <Eyebrow>Service analysis</Eyebrow>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-medium text-[#10151A]">
            Point at a risk, get an answer
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5B6570]">
            Purpose-built modules for the questions people actually ask about
            a place: is it flooding, is it burning, is the soil healthy.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {serviceModules.map((m) => (
              <div
                key={m.title}
                className="group rounded-lg border border-[#E3E6E2] p-4 transition-colors hover:border-[#0E8F82]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ color: m.accent, backgroundColor: `${m.accent}14` }}
                  >
                    {m.icon}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] ${statusStyle[m.status]}`}
                  >
                    {m.status}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-[#10151A]">{m.title}</h3>
                <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-[#8A9199]">{m.metric}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#5B6570]">{m.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Extraction */}
        <div>
          <Eyebrow>Data extraction</Eyebrow>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-medium text-[#10151A]">
            Every variable, already extracted
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5B6570]">
            Pull satellite-derived time series for your region straight out
            of Sentinel, Landsat, MODIS and ERA5 — as GeoTIFF or CSV.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {extractVars.map((v) => (
              <div
                key={v.label}
                className="flex flex-col justify-between rounded-lg border border-[#E3E6E2] p-4 transition-colors hover:border-[#0E8F82]"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#5B6570]">
                    {v.icon}
                    <span className="text-sm font-medium text-[#10151A]">{v.label}</span>
                  </div>
                  <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#8A9199]">
                    {v.source} · {v.unit}
                  </p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <Sparkline points={v.trend} color={v.color} />
                  <button className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#0E8F82] hover:underline">
                    Extract
                    <Download size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Workflow — a genuine sequence, so it earns its numbering    */}
      {/* ---------------------------------------------------------- */}
      <section className="border-t border-[#E3E6E2] bg-[#FBFCFB] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 max-w-lg font-[family-name:var(--font-display)] text-2xl font-medium text-[#10151A] sm:text-3xl">
            From a drawn box to a finished report, in four steps
          </h2>

          <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, i) => (
              <li key={step.title} className="relative pl-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E3E6E2] bg-white text-[#0E8F82]">
                    {step.icon}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[#8A9199]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-medium text-[#10151A]">{step.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5B6570]">{step.body}</p>
                {i < workflow.length - 1 && (
                  <span className="absolute right-[-1rem] top-5 hidden h-px w-8 bg-[#E3E6E2] lg:block" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Footer                                                       */}
      {/* ---------------------------------------------------------- */}
      <footer className="border-t border-[#E3E6E2] px-6 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[#8A9199]">
            © 2026 PrithvieX Geospatial · Imagery courtesy ESA · NASA · USGS
          </span>
          <div className="flex gap-6 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[#8A9199]">
            <a href="#" className="hover:text-[#0E8F82]">Terms</a>
            <a href="#" className="hover:text-[#0E8F82]">Privacy</a>
            <a href="#" className="hover:text-[#0E8F82]">Docs</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
