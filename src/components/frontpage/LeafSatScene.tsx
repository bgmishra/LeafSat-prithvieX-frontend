import { AlertTriangle, TrainFront } from "lucide-react";

/**
 * The problem LeafSat exists for, in one picture: leaves fall onto the line,
 * a train crushes them into a slick black film on the railhead, and adhesion
 * drops. Built from CSS 3D transforms - see the "LeafSat home scene" block in
 * globals.css for how the perspective is set up.
 */

// Spread across the width with varied timing so the fall never reads as a loop.
const FALLING_LEAVES = [
  { left: "8%", delay: "0s", duration: "7.5s" },
  { left: "17%", delay: "2.4s", duration: "6.2s" },
  { left: "29%", delay: "4.1s", duration: "8.1s" },
  { left: "38%", delay: "1.2s", duration: "6.8s" },
  { left: "47%", delay: "5.3s", duration: "7.2s" },
  { left: "56%", delay: "0.8s", duration: "8.4s" },
  { left: "65%", delay: "3.6s", duration: "6.5s" },
  { left: "74%", delay: "1.9s", duration: "7.8s" },
  { left: "83%", delay: "4.7s", duration: "6.9s" },
  { left: "92%", delay: "2.9s", duration: "7.4s" },
];

// Crushed leaves pinned to one rail or the other, streaming past with the track.
const STUCK_LEAVES = [
  { marginLeft: "-186px", delay: "0s" },
  { marginLeft: "150px", delay: "0.7s" },
  { marginLeft: "-180px", delay: "1.4s" },
  { marginLeft: "156px", delay: "2.1s" },
  { marginLeft: "-176px", delay: "2.8s" },
  { marginLeft: "148px", delay: "3.5s" },
  { marginLeft: "-184px", delay: "4.1s" },
];

export function LeafSatScene() {
  return (
    <div aria-hidden className="ls-scene rounded-xl border border-border">
      <div className="ls-horizon" />

      <div className="ls-world">
        <div className="ls-sleepers" />
        <div className="ls-rail ls-rail--left">
          <div className="ls-rail-film" />
        </div>
        <div className="ls-rail ls-rail--right">
          <div className="ls-rail-film" />
        </div>

        {STUCK_LEAVES.map((leaf) => (
          <div
            className="ls-stuck"
            key={`${leaf.marginLeft}-${leaf.delay}`}
            style={{ animationDelay: leaf.delay, marginLeft: leaf.marginLeft }}
          />
        ))}

      </div>

      <div className="ls-train">
        <div className="ls-train-body">
          <div className="ls-train-window" />
          <div className="ls-train-stripe" />
          <div className="ls-train-lamp ls-train-lamp--left" />
          <div className="ls-train-lamp ls-train-lamp--right" />
        </div>
      </div>

      {FALLING_LEAVES.map((leaf) => (
        <div
          className="ls-leaf"
          key={leaf.left}
          style={{
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
            left: leaf.left,
          }}
        />
      ))}

      {/* Readouts naming what the scene is showing. */}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md px-3 py-2 glass-panel">
        <TrainFront className="size-3 text-orbital-cyan" />
        <span className="mono-label text-muted-foreground">Leaf fall · active</span>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md px-3 py-2 glass-panel">
        <AlertTriangle className="size-3 text-fusion-orange" />
        <span className="mono-label text-muted-foreground">Railhead contamination · rising</span>
      </div>
    </div>
  );
}
