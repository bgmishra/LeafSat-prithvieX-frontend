import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  HardHat,
  Leaf,
  Map,
  Radio,
  ShieldCheck,
  TrainFront,
} from "lucide-react";
import { LeafSatScene } from "./LeafSatScene";

const CHAIN = [
  {
    icon: Leaf,
    title: "Leaves fall",
    body: "Lineside trees shed onto the track through autumn, heaviest in the days after the first hard frost.",
  },
  {
    icon: TrainFront,
    title: "Trains crush them",
    body: "Passing wheels bake the leaves into a black film on the railhead, barely thicker than paper.",
  },
  {
    icon: ShieldCheck,
    title: "Adhesion drops",
    body: "That film cuts grip. Braking distances stretch, wheels slip, and the timetable starts to give.",
  },
];

const CAPABILITIES = [
  {
    icon: Radio,
    title: "Leaf-off readiness",
    body: "Satellite observation of how much canopy is still holding along each section you monitor, refreshed as new passes land.",
    href: "/leaf-off-readiness",
    action: "Open readiness",
  },
  {
    icon: CalendarClock,
    title: "Leaf-off forecast",
    body: "Where the canopy is heading next, so the season is planned against a forecast rather than last week's inspection.",
    href: "/leaf-off-forecast",
    action: "Open forecast",
  },
  {
    icon: Map,
    title: "Your own sections",
    body: "Engineers draw or upload the sections that matter to your railway. Nothing is shared between companies.",
    href: "/manage-sections",
    action: "Manage sections",
  },
];

// Ordered by authority: the client super admin runs the account, then their
// engineers, then the supervisors working from what has been approved.
const ROLES = [
  {
    icon: CheckCircle2,
    role: "Client super admin",
    body: "Approves or rejects each section, and invites the rest of the team.",
  },
  {
    icon: HardHat,
    role: "Engineer",
    body: "Draws or bulk-uploads train sections and sends them up for approval.",
  },
  {
    icon: Radio,
    role: "Field supervisor",
    body: "Works from approved sections only, with the leaf-off index for each one.",
  },
];

export function LeafSatConcept() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border grid-bg">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-orbital-cyan/30 bg-orbital-cyan/5 px-3 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-orbital-cyan" />
            <span className="mono-label text-orbital-cyan">Leaf-off monitoring &amp; forecasting</span>
          </div>

          <div className="mt-6 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Leaves on the line,{" "}
                <span className="bg-gradient-to-r from-fusion-orange via-orbital-cyan to-cyber-green bg-clip-text text-transparent">
                  seen from orbit
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
                Every autumn, leaf fall turns the railhead slick and braking distances grow. LeafSat
                tracks how much canopy is still standing over your track, forecasts when it will
                drop, and puts that in front of the people who plan the season.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-foreground transition hover:opacity-90"
                  href="/leaf-off-readiness"
                >
                  See leaf-off readiness
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-white/5"
                  href="/leaf-off-forecast"
                >
                  View the forecast
                </Link>
              </div>
            </div>

            <LeafSatScene />
          </div>
        </div>
      </section>

      {/* The problem, in three steps */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <span className="mono-label text-orbital-cyan">Why it matters</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A paper-thin film, a season-long problem
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {CHAIN.map((step, index) => {
              const Icon = step.icon;

              return (
                <div className="rounded-xl border border-border p-6 glass-panel" key={step.title}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-orbital-cyan/10 text-orbital-cyan">
                      <Icon className="size-5" />
                    </div>
                    <span className="mono-label text-muted-foreground">
                      Step {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What the platform does */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <span className="mono-label text-cyber-green">What LeafSat gives you</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Watch the canopy, not the calendar
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="flex flex-col justify-between rounded-xl border border-border p-6 glass-panel"
                  key={item.title}
                >
                  <div>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-cyber-green/10 text-cyber-green">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                  <Link
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orbital-cyan transition hover:opacity-80"
                    href={item.href}
                  >
                    {item.action}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who does what */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <span className="mono-label text-orbital-cyan">How your team works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Sections are drafted, approved, then acted on
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            LeafSat is invitation only. Your company is set up by a LeafSat administrator, and from
            there your client super admin invites everyone else.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROLES.map((item) => {
              const Icon = item.icon;

              return (
                <div className="rounded-xl border border-border p-6" key={item.role}>
                  <Icon className="size-5 text-orbital-cyan" />
                  <h3 className="mt-4 text-lg font-semibold">{item.role}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
