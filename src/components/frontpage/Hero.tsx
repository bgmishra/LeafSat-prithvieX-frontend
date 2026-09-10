import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Activity, Layers, Radio } from "lucide-react";
import heroEarth from "@/assets/frontpage/hero-earth.jpg";
import dashboardMap from "@/assets/frontpage/dashboard-map.jpg";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16 pb-16 grid-bg sm:pt-20 lg:pt-24">
      {/* Earth backdrop */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroEarth}
          alt="Earth from low orbit at night"
          priority
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      {/* Floating telemetry chips */}
      <div className="absolute top-32 right-10 hidden items-center gap-2 rounded-md px-3 py-2 glass-panel animate-[float_6s_ease-in-out_infinite] lg:flex">
        <Radio className="size-3 text-orbital-cyan" />
        <span className="mono-label text-muted-foreground">Sentinel-2 · Pass 14:32 UTC</span>
      </div>
      <div
        className="absolute bottom-32 left-1/2 hidden items-center gap-2 rounded-md px-3 py-2 glass-panel animate-[float_6s_ease-in-out_infinite] lg:flex"
        style={{ animationDelay: "1.5s" }}
      >
        <Activity className="size-3 text-cyber-green" />
        <span className="mono-label text-muted-foreground">NDVI Δ +0.12 · 7d</span>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
        {/* Left copy */}
        <div className="animate-[fade-up_0.8s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orbital-cyan/30 bg-orbital-cyan/5 mb-6">
            <span className="size-1.5 rounded-full bg-orbital-cyan animate-pulse" />
            <span className="mono-label text-orbital-cyan">Geospatial Intelligence for Everyone</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Environmental Intelligence{" "}
            <span className="bg-gradient-to-r from-orbital-cyan via-cyber-green to-orbital-cyan bg-clip-text text-transparent">
              Without GIS Complexity
            </span>
          </h1>
          <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            Analyze floods, forest fires, crop health, land cover, and climate indicators directly
            from your browser using advanced cloud-native geospatial analytics. No GIS software
            required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="group flex h-12 items-center gap-2 rounded-lg bg-orbital-cyan px-6 font-semibold text-primary-foreground transition-all hover:shadow-[0_0_32px_-4px_var(--orbital-cyan)]" href="/service-analysis">
              Start Analysis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link className="group flex h-12 items-center gap-2 rounded-lg bg-orbital-cyan px-6 font-semibold text-primary-foreground transition-all hover:shadow-[0_0_32px_-4px_var(--orbital-cyan)]" href="/data-extraction">
              Data Extraction
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link className="group flex h-12 items-center gap-2 rounded-lg bg-orbital-cyan px-6 font-semibold text-primary-foreground transition-all hover:shadow-[0_0_32px_-4px_var(--orbital-cyan)]" href="/cmip6-data-extraction">
              CMIP6 Data Extraction
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-3 gap-4 sm:gap-6">
            {[
              { v: "10m", l: "Resolution" },
              { v: "<2.5h", l: "Latency" },
              { v: "40+", l: "Modules" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-bold font-mono text-foreground">{s.v}</div>
                <div className="mono-label text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right dashboard mockup */}
        <div className="relative animate-[fade-up_1s_ease-out]">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-orbital-cyan/40 via-transparent to-cyber-green/30 blur-xl opacity-60" />
          <div className="relative rounded-2xl p-3 shadow-2xl glass-panel">
            {/* terminal header */}
            <div className="flex items-center justify-between px-2 py-2 border-b border-border mb-3">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-destructive/60" />
                <div className="size-2.5 rounded-full bg-fusion-orange/60" />
                <div className="size-2.5 rounded-full bg-cyber-green/60" />
              </div>
              <span className="mono-label text-muted-foreground">ANALYSIS_MODULE · LIVE</span>
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-cyber-green animate-pulse" />
                <span className="mono-label text-cyber-green">OK</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              {/* Map */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-space-deep sm:col-span-3">
                <Image
                  src={dashboardMap}
                  alt="Satellite ROI map"
                  className="w-full h-full object-cover"
                />
                <div className="scan-line" />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-background/80 border border-orbital-cyan/30 mono-label text-orbital-cyan">
                  ROI · 34.05°N, −118.24°W
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 border border-border flex items-center gap-1.5">
                  <Layers className="size-3 text-orbital-cyan" />
                  <span className="mono-label text-muted-foreground">L8 · NDVI</span>
                </div>
              </div>

              {/* Side panel */}
              <div className="flex flex-col gap-3 sm:col-span-2">
                <div className="p-3 rounded-lg border border-border bg-background/40">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="size-3 text-orbital-cyan" />
                    <span className="mono-label text-muted-foreground">Area</span>
                  </div>
                  <div className="text-lg font-mono font-bold">4,281 km²</div>
                </div>
                <div className="p-3 rounded-lg border border-fusion-orange/30 bg-fusion-orange/5">
                  <span className="mono-label text-fusion-orange">Flood Probability</span>
                  <div className="text-lg font-mono font-bold text-fusion-orange mt-1">82.4%</div>
                  <div className="mt-2 h-1 bg-background/60 rounded-full overflow-hidden">
                    <div className="h-full bg-fusion-orange w-[82%]" />
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background/40 flex-1">
                  <span className="mono-label text-muted-foreground">7d Trend</span>
                  <svg viewBox="0 0 100 30" className="w-full h-10 mt-1">
                    <polyline
                      points="0,22 15,18 30,20 45,12 60,15 75,8 90,10 100,4"
                      fill="none"
                      stroke="var(--orbital-cyan)"
                      strokeWidth="1.5"
                    />
                    <polyline
                      points="0,22 15,18 30,20 45,12 60,15 75,8 90,10 100,4 100,30 0,30"
                      fill="var(--orbital-cyan)"
                      opacity="0.15"
                    />
                  </svg>
                  <div className="flex justify-between mono-label text-muted-foreground">
                    <span>Mon</span>
                    <span>Sun</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
              {[
                { l: "Source", v: "Sentinel-2" },
                { l: "Pixel", v: "10 m" },
                { l: "Status", v: "Ready", on: true },
              ].map((c) => (
                <div key={c.l} className="px-2">
                  <div className="mono-label text-muted-foreground">{c.l}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.on && <span className="size-1.5 rounded-full bg-cyber-green animate-pulse" />}
                    <span className="text-sm font-medium">{c.v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
