import { Satellite } from "lucide-react";

export function Nav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-orbital-cyan to-cyber-green flex items-center justify-center shadow-[0_0_20px_-4px_var(--orbital-cyan)]">
            <Satellite className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-mono font-bold tracking-tight text-base">
            PRITHIVIE<span className="text-orbital-cyan">X</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 mono-label text-muted-foreground">
          <a href="#services" className="hover:text-orbital-cyan transition-colors">Services</a>
          <a href="#extraction" className="hover:text-orbital-cyan transition-colors">Datasets</a>
          <a href="#workflow" className="hover:text-orbital-cyan transition-colors">Workflow</a>
          <a href="#" className="hover:text-orbital-cyan transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyber-green/30 bg-cyber-green/5">
            <span className="size-1.5 rounded-full bg-cyber-green animate-pulse" />
            <span className="mono-label text-cyber-green">Live</span>
          </div>
          <button className="px-4 h-9 rounded-md bg-orbital-cyan text-primary-foreground text-sm font-semibold hover:shadow-[0_0_24px_-4px_var(--orbital-cyan)] transition-shadow">
            Start Analysis
          </button>
        </div>
      </div>
    </nav>
  );
}
