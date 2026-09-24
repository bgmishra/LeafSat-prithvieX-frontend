export const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

/** Focus ring for controls sitting on the slate-900 flyout surface. */
export const FLYOUT_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

export const ROW_BASE = `group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCUS}`;

export const RAIL_ROW_BASE = `group relative mx-auto flex h-10 w-12 items-center justify-center rounded-lg transition-colors duration-150 motion-reduce:transition-none ${FOCUS}`;

const ACTIVE_BAR =
  "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-teal-400";

export function rowStateClass(active: boolean) {
  return active
    ? `bg-white/[0.08] text-white ${ACTIVE_BAR}`
    : "text-slate-300 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08]";
}

export function iconStateClass(highlighted: boolean) {
  return highlighted
    ? "h-5 w-5 shrink-0 text-teal-300"
    : "h-5 w-5 shrink-0 text-slate-400 transition-colors duration-150 group-hover:text-slate-200 motion-reduce:transition-none";
}

export const GROUP_LABEL =
  "px-3 pb-1.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-slate-400";

export const RAIL_DIVIDER = "mx-auto my-3 h-px w-8 bg-white/10";

export const SKELETON_ROW = "h-10 rounded-lg bg-white/[0.04] animate-pulse motion-reduce:animate-none";

/** Dark flyout surface. `!` because `cn` does not merge away PopoverContent's light defaults. */
export const FLYOUT_SURFACE =
  "nav-flyout w-60! rounded-xl! border border-white/10! bg-slate-900! p-1.5! text-slate-200! shadow-xl! shadow-black/40!";

export const FLYOUT_LINK = `flex h-9 items-center rounded-md px-2.5 text-[13px] transition-colors duration-150 motion-reduce:transition-none ${FLYOUT_FOCUS}`;

export const TOOLTIP_CONTENT =
  "nav-tooltip z-50 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10";
