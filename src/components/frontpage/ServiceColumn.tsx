"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Droplets, Flame, Sprout, Map, Mountain, Trees, TrendingUp, AlertTriangle } from "lucide-react";
import type { StaticImageData } from "next/image";
import featured from "@/assets/frontpage/service-featured.jpg";
import { apiRequest } from "@/api/client";
import flood from "@/assets/frontpage/service-flood.jpg";
import fire from "@/assets/frontpage/service-fire.jpg";
import crop from "@/assets/frontpage/service-crop.jpg";
import landcover from "@/assets/frontpage/service-landcover.jpg";
import land from "@/assets/frontpage/service-land.jpg";
import forest from "@/assets/frontpage/service-forest.jpg";

type Card = {
  title: string;
  desc: string;
  img: StaticImageData;
  icon: React.ElementType;
  stat: string;
  statLabel: string;
  progress: number;
  status: "live" | "scheduled" | "analyzing";
  accent: "cyan" | "orange" | "green";
};

const services: Card[] = [
  { title: "Flood Monitoring", desc: "Detect water inundation extent using SAR + Optical fusion.", img: flood, icon: Droplets, stat: "98.2%", statLabel: "Precision", progress: 92, status: "live", accent: "cyan" },
  { title: "Forest Fire Detection", desc: "Thermal hotspot identification and burn severity mapping.", img: fire, icon: Flame, stat: "412", statLabel: "Hotspots", progress: 58, status: "live", accent: "orange" },
  { title: "Crop Health", desc: "NDVI / EVI stress indicators for precision agriculture.", img: crop, icon: Sprout, stat: "+12%", statLabel: "NDVI Δ", progress: 76, status: "analyzing", accent: "green" },
  { title: "Land Cover Classification", desc: "AI-driven LULC mapping across urban, forest, water, crops.", img: landcover, icon: Map, stat: "9 classes", statLabel: "Resolved", progress: 71, status: "live", accent: "cyan" },
  { title: "Land Monitoring", desc: "Elevation, erosion, and terrain change detection over time.", img: land, icon: Mountain, stat: "30 m", statLabel: "Pixel", progress: 84, status: "scheduled", accent: "cyan" },
  { title: "Forest Monitoring", desc: "Deforestation alerts and canopy density trend analytics.", img: forest, icon: Trees, stat: "−2.4%", statLabel: "Cover Δ", progress: 68, status: "live", accent: "green" },
];

const statusDot = {
  live: "bg-cyber-green",
  analyzing: "bg-orbital-cyan",
  scheduled: "bg-fusion-orange",
};

const accentText = {
  cyan: "text-orbital-cyan",
  orange: "text-fusion-orange",
  green: "text-cyber-green",
};

type FeaturedServiceDataset = {
  id: string | number;
  title: string;
  overview: string;
  thumbnail_url?: string;
};

export function ServiceColumn() {
  const [featuredDatasets, setFeaturedDatasets] = useState<FeaturedServiceDataset[]>([]);
  const [cmip6Datasets, setCmip6Datasets] = useState<FeaturedServiceDataset[]>([]);

  useEffect(() => {
    apiRequest<FeaturedServiceDataset[]>(
      "/api/v1/datasets/?featured=true&service_type=Service%20Analysis",
      { auth: false }
    )
      .then(setFeaturedDatasets)
      .catch(() => setFeaturedDatasets([]));
    apiRequest<FeaturedServiceDataset[]>(
      "/api/v1/datasets/?featured=true&titles=CMIP6-CIL,CMIP6-NASA",
      { auth: false }
    )
      .then(setCmip6Datasets)
      .catch(() => setCmip6Datasets([]));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="mono-label text-orbital-cyan">01 / SERVICE ANALYSIS</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Service Analysis</h2>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Advanced environmental and disaster monitoring services powered by satellite imagery and AI.
        </p>
      </header>

      {/* Static mockup retained in source but not shown; live featured datasets are below. */}
      <div className="hidden" aria-hidden="true">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-orbital-cyan/40 via-transparent to-cyber-green/30 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative glass-panel rounded-2xl overflow-hidden">
          <div className="relative h-56 overflow-hidden">
            <Image src={featured} alt="Rapid impact assessment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            <div className="scan-line" />
            <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-full bg-background/70 border border-cyber-green/30">
              <span className="size-1.5 rounded-full bg-cyber-green animate-pulse" />
              <span className="mono-label text-cyber-green">Featured</span>
            </div>
            <div className="absolute bottom-4 right-4 glass-panel rounded-lg px-3 py-2 flex items-center gap-2">
              <TrendingUp className="size-3.5 text-orbital-cyan" />
              <span className="mono-label text-muted-foreground">NDVI Heatmap</span>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2">Rapid Impact Assessment</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Real-time geospatial modules designed for rapid environmental assessment — from flood
              inundation to fire burn severity within 15 minutes of satellite pass.
            </p>
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                { l: "Processing", v: "Cloud-native", c: "text-orbital-cyan" },
                { l: "Precision", v: "10 – 30 m", c: "text-foreground" },
                { l: "Latency", v: "< 2.5 h", c: "text-cyber-green" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="mono-label text-muted-foreground">{s.l}</div>
                  <div className={`text-sm font-mono font-bold mt-1 ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Static mockup cards are hidden in favour of the live catalog cards below. */}
      <div className="hidden grid-cols-1 sm:grid-cols-2 gap-4" aria-hidden="true">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="group relative glass-panel rounded-xl overflow-hidden hover:border-orbital-cyan/40 transition-all hover:-translate-y-0.5"
            >
              <div className="relative h-28 overflow-hidden">
                <Image src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/30 to-transparent" />
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur">
                  <span className={`size-1.5 rounded-full animate-pulse ${statusDot[s.status]}`} />
                  <span className="mono-label text-muted-foreground">{s.status}</span>
                </div>
                <Icon className={`absolute bottom-2 left-2 size-5 ${accentText[s.accent]}`} />
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold">{s.title}</h4>
                  <span className={`text-xs font-mono font-bold ${accentText[s.accent]}`}>{s.stat}</span>
                </div>
                <div className="mono-label text-muted-foreground mb-2">{s.statLabel}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                <div className="mt-3 h-1 rounded-full bg-background/60 overflow-hidden">
                  <div className={`h-full ${s.accent === "cyan" ? "bg-orbital-cyan" : s.accent === "orange" ? "bg-fusion-orange" : "bg-cyber-green"}`} style={{ width: `${s.progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {featuredDatasets.map((dataset) => (
          <Link
            className="group overflow-hidden rounded-xl glass-panel transition-all hover:-translate-y-0.5 hover:border-orbital-cyan/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbital-cyan"
            href={`/catalog/${dataset.id}`}
            key={dataset.id}
          >
            <div className="relative aspect-[16/8] overflow-hidden bg-space-deep">
              {dataset.thumbnail_url ? (
                // Django supplies the public thumbnail URL for catalog entries.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={dataset.title} className="size-full object-cover transition duration-500 group-hover:scale-105" src={dataset.thumbnail_url} />
              ) : (
                <div className="grid size-full place-items-center"><AlertTriangle className="size-8 text-orbital-cyan" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold text-foreground">{dataset.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dataset.overview || "No overview is available for this dataset."}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="space-y-4 border-t border-border pt-8">
        <header>
          <div className="mb-2 flex items-center gap-2">
            <span className="mono-label text-cyber-green">03 / CMIP6 DATA EXTRACTION</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">CMIP6 Data Extraction</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">Explore featured CMIP6 climate-model datasets for scenario-based data extraction.</p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cmip6Datasets.map((dataset) => (
            <Link className="group overflow-hidden rounded-xl glass-panel transition-all hover:-translate-y-0.5 hover:border-cyber-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-green" href={`/catalog/${dataset.id}`} key={dataset.id}>
              <div className="relative aspect-[16/8] overflow-hidden bg-space-deep">
                {dataset.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={dataset.title} className="size-full object-cover transition duration-500 group-hover:scale-105" src={dataset.thumbnail_url} />
                ) : <div className="grid size-full place-items-center"><AlertTriangle className="size-8 text-cyber-green" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent" />
              </div>
              <div className="p-4"><h3 className="text-base font-semibold text-foreground">{dataset.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dataset.overview || "No overview is available for this dataset."}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export { AlertTriangle };
