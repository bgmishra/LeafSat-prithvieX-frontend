import { MapPin, Layers, Cloud, Mail } from "lucide-react";

const steps = [
  { n: "01", icon: MapPin, t: "Draw ROI", d: "Select your area of interest directly on our interactive global map." },
  { n: "02", icon: Layers, t: "Select Analysis", d: "Choose an environmental module and configure date range." },
  { n: "03", icon: Cloud, t: "Cloud Processing", d: "Our distributed compute engine processes petabytes of satellite data." },
  { n: "04", icon: Mail, t: "Receive Results", d: "Get comprehensive PDF reports, GeoTIFFs and CSVs in your inbox." },
];

export function Workflow() {
  return (
    <section id="workflow" className="py-24 border-t border-border bg-space-deep/40 relative grid-bg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="mono-label text-orbital-cyan mb-3"> WORKFLOW</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
            Four clicks to <span className="text-orbital-cyan">geospatial intelligence</span>
          </h2>
          <p className="text-muted-foreground">
            PrithivieX bridges petabyte-scale satellite archives and actionable environmental decisions.
          </p>
        </div>

        <div className="relative">
          {/* connector */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-orbital-cyan/40 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.n} className="relative text-center" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="relative size-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-orbital-cyan/10 blur-xl" />
                    <div className="relative size-24 rounded-2xl glass-panel border-orbital-cyan/30 flex items-center justify-center group hover:border-orbital-cyan transition-colors">
                      <Icon className="size-8 text-orbital-cyan" />
                      <span className="absolute -top-2 -right-2 mono-label text-orbital-cyan bg-background border border-orbital-cyan/40 rounded-full px-2 py-0.5">
                        {s.n}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold mb-2">{s.t}</h4>
                  <p className="text-sm text-muted-foreground max-w-[24ch] mx-auto">{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
