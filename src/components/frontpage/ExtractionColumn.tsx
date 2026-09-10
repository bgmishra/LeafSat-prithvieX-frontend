"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Database, Thermometer, CloudRain, Leaf, Droplet, Waves, Mountain, Activity, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/api/client";

type Dataset = {
  id?: string | number;
  thumbnail?: string;
  title: string;
  source: string;
  desc: string;
  icon: React.ElementType;
  unit: string;
  trend: number[];
  accent: "cyan" | "green" | "orange" | "blue";
};

const datasets: Dataset[] = [
  { title: "NDVI Max", source: "Sentinel-2", desc: "Peak vegetation index per period.", icon: Leaf, unit: "0.0 – 1.0", trend: [3,5,4,6,7,8,7,9], accent: "green" },
  { title: "Precipitation", source: "CHIRPS · 5km", desc: "Daily rainfall anomalies.", icon: CloudRain, unit: "mm/day", trend: [2,4,3,7,5,8,6,9], accent: "blue" },
  { title: "Land Surface Temp", source: "Landsat 8/9", desc: "Surface heat extraction.", icon: Thermometer, unit: "°C", trend: [4,5,6,5,7,8,9,7], accent: "orange" },
  { title: "NDWI", source: "Sentinel-2", desc: "Water content index.", icon: Waves, unit: "−1.0 – 1.0", trend: [5,4,6,5,4,3,4,5], accent: "cyan" },
  { title: "Soil Moisture", source: "SMAP · 9km", desc: "Volumetric soil water.", icon: Droplet, unit: "m³/m³", trend: [3,4,5,4,3,4,3,2], accent: "blue" },
  { title: "Elevation & Terrain", source: "SRTM DEM", desc: "30m global DEM extract.", icon: Mountain, unit: "meters", trend: [5,5,6,6,7,7,8,8], accent: "cyan" },
  { title: "Vegetation Health Index", source: "MODIS", desc: "Composite VHI score.", icon: Activity, unit: "0 – 100", trend: [6,7,5,8,7,9,8,7], accent: "green" },
  { title: "Drought Indicators", source: "Dynamic World", desc: "SPI / SPEI extraction.", icon: AlertTriangle, unit: "index", trend: [2,3,2,4,3,5,4,6], accent: "orange" },
];

// Kept as visual fallback metadata while live featured datasets are loaded.
void datasets;

const accentMap = {
  cyan: { text: "text-orbital-cyan", bar: "bg-orbital-cyan", bg: "bg-orbital-cyan/10", border: "border-orbital-cyan/30" },
  green: { text: "text-cyber-green", bar: "bg-cyber-green", bg: "bg-cyber-green/10", border: "border-cyber-green/30" },
  orange: { text: "text-fusion-orange", bar: "bg-fusion-orange", bg: "bg-fusion-orange/10", border: "border-fusion-orange/30" },
  blue: { text: "text-orbital-cyan", bar: "bg-orbital-cyan/70", bg: "bg-orbital-cyan/5", border: "border-orbital-cyan/20" },
};

export function ExtractionColumn() {
  const [featuredDatasets, setFeaturedDatasets] = useState<Dataset[]>([]);
  useEffect(() => {
    apiRequest<Array<{ id: string | number; title: string; overview: string; thumbnail_url?: string; data_source_name?: string }>>("/api/v1/datasets/?featured=true&extraction_type=true", { auth: false })
      .then((items) => setFeaturedDatasets(items.map((item, index) => ({ id: item.id, thumbnail: item.thumbnail_url, title: item.title, source: item.data_source_name || "Data extraction", desc: item.overview, icon: [Leaf, CloudRain, Thermometer, Waves][index % 4], unit: "Featured dataset", trend: [3, 5, 4, 7, 6, 8, 7, 9], accent: ["green", "blue", "orange", "cyan"][index % 4] as Dataset["accent"] }))))
      .catch(() => setFeaturedDatasets([]));
  }, []);
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="mono-label text-cyber-green">02 / DATA EXTRACTION</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Data Extraction</h2>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Extract satellite-derived environmental variables instantly from your selected region.
        </p>
      </header>

      {/* The static time-series mockup is intentionally hidden; live featured datasets are listed below. */}
      <div className="hidden" aria-hidden="true">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyber-green/40 via-transparent to-orbital-cyan/30 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative glass-panel rounded-2xl p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="size-4 text-cyber-green" />
                <span className="mono-label text-cyber-green">Time-Series Terminal</span>
              </div>
              <h3 className="text-xl font-bold">Multi-Source Extraction</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Automated cloud processing across Sentinel, Landsat, MODIS and ERA5 archives.
              </p>
            </div>
            <button className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background/40 hover:border-cyber-green/40 transition-colors">
              <Download className="size-3.5" />
              <span className="mono-label">Export</span>
            </button>
          </div>

          {/* Chart */}
          <div className="relative h-40 rounded-lg border border-border bg-background/40 p-3 mb-4 overflow-hidden">
            <div className="scan-line" />
            <div className="absolute top-2 left-3 mono-label text-muted-foreground">NDVI · 2024</div>
            <div className="absolute top-2 right-3 mono-label text-cyber-green">PEAK 0.84</div>
            <div className="h-full flex items-end gap-1 mt-4">
              {[30,45,38,55,42,68,75,62,80,72,90,85,78,65,58,52].map((h, i) => (
                <div key={i} className="flex-1 relative group/bar">
                  <div
                    className="w-full bg-gradient-to-t from-cyber-green/80 to-cyber-green/30 rounded-t-sm group-hover/bar:from-orbital-cyan group-hover/bar:to-orbital-cyan/40 transition-colors"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            {/* axis */}
            <div className="absolute bottom-1 left-3 right-3 flex justify-between mono-label text-muted-foreground">
              <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { l: "Primary Source", v: "Landsat 8/9" },
              { l: "Format", v: "GeoTIFF · CSV" },
              { l: "Coverage", v: "Global · 30 m" },
            ].map((c) => (
              <div key={c.l} className="p-3 rounded-lg border border-border bg-background/40">
                <div className="mono-label text-muted-foreground">{c.l}</div>
                <div className="text-sm font-medium mt-1">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dataset cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {featuredDatasets.map((d) => {
          const Icon = d.icon;
          const a = accentMap[d.accent];
          return (
            <Link
              className="group glass-panel rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-orbital-cyan/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbital-cyan"
              href={`/catalog/${d.id}`}
              key={d.id}
            >
              <div className={`relative aspect-[16/8] overflow-hidden rounded-lg border ${a.border} ${a.bg}`}>
                {d.thumbnail ? (
                  // The catalog thumbnail is supplied by Django's public dataset API.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={d.title} className="size-full object-cover transition duration-300 group-hover:scale-105" src={d.thumbnail} />
                ) : (
                  <div className="grid size-full place-items-center"><Icon className={`size-8 ${a.text}`} /></div>
                )}
              </div>
              <div className="px-1 pt-4">
                <h4 className="text-base font-semibold leading-tight text-foreground">{d.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.desc || "No overview is available for this dataset."}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
