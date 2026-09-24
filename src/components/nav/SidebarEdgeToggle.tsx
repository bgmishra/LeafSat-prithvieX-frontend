"use client";

import { SidebarEdgeChevronIcon } from "../icons";
import { RailTooltip, RailTooltipProvider } from "./RailTooltip";

/** Must match the aside's width transition in app-shell.tsx so the disc and the edge move as one. */
const EDGE_MOTION = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

const DISC_SHADOW =
  "shadow-[0_1px_2px_rgba(2,6,23,0.10),0_4px_12px_-2px_rgba(2,6,23,0.22),inset_0_1px_0_#fff,inset_0_-1px_0_rgba(15,23,42,0.05)]";
const DISC_SHADOW_HOVER =
  "hover:shadow-[0_2px_4px_rgba(2,6,23,0.12),0_8px_20px_-4px_rgba(2,6,23,0.28),inset_0_1px_0_#fff,inset_0_-1px_0_rgba(15,23,42,0.05)]";
const DISC_SHADOW_ACTIVE = "active:shadow-[0_1px_2px_rgba(2,6,23,0.12),inset_0_1px_0_#fff]";

/**
 * The desktop sidebar's collapse/expand control: a white disc that straddles
 * the sidebar/content seam, level with the header row.
 *
 * It is a fixed sibling of the aside (which clips horizontally), not a child.
 * Its centre sits on the aside's right border: `left: 0` plus a transform of
 * `sidebarWidth - 14px` (256 - 14 = 242, 80 - 14 = 66), animated with the
 * same duration and curve as the aside's width, so it rides the edge.
 *
 * Transforms are split across three elements so they never overwrite each
 * other: the wrapper travels, the button scales, the icon span nudges and
 * the svg rotates.
 *
 * z-[45]: above the aside (z-40) and page content, including OpenLayers maps;
 * below dialogs, popovers and the mobile drawer (z-50) and toasts (z-[80]).
 */
export function SidebarEdgeToggle({
  collapsed,
  animate,
  onToggle,
  onHotChange,
}: {
  collapsed: boolean;
  /** False until the first user toggle, so the stored state is applied without a slide. */
  animate: boolean;
  onToggle: () => void;
  /** Hover or keyboard focus: the shell lights the sidebar edge this control moves. */
  onHotChange: (hot: boolean) => void;
}) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <RailTooltipProvider>
      <div
        className={`fixed left-0 top-[18px] z-[45] hidden h-7 w-7 lg:block ${
          animate ? `transition-transform ${EDGE_MOTION}` : ""
        } ${collapsed ? "translate-x-[66px]" : "translate-x-[242px]"}`}
      >
        <RailTooltip label={label} shortcut="[" sideOffset={10}>
          <button
            aria-controls="app-sidebar"
            aria-expanded={!collapsed}
            aria-keyshortcuts="["
            aria-label={label}
            className={`group relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-b from-white to-slate-50 text-slate-600 ring-1 ring-slate-900/10 ${DISC_SHADOW} transition-[scale,box-shadow,color] duration-150 ease-out motion-reduce:transition-none hover:scale-[1.06] hover:text-teal-700 hover:ring-teal-600/35 ${DISC_SHADOW_HOVER} active:scale-[0.94] active:from-slate-50 active:to-slate-100 active:text-teal-800 active:duration-75 ${DISC_SHADOW_ACTIVE} outline-none focus-visible:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white before:absolute before:-inset-1.5 before:rounded-full before:content-['']`}
            onBlur={() => onHotChange(false)}
            onClick={onToggle}
            onFocus={(event) => onHotChange(event.currentTarget.matches(":focus-visible"))}
            onPointerEnter={() => onHotChange(true)}
            onPointerLeave={(event) => onHotChange(event.currentTarget.matches(":focus-visible"))}
            type="button"
          >
            <span
              className={`grid place-items-center transition-transform duration-150 ease-out motion-reduce:transition-none ${
                collapsed ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"
              }`}
            >
              <SidebarEdgeChevronIcon
                className={`h-4 w-4 ${animate ? `transition-transform ${EDGE_MOTION}` : ""} ${
                  collapsed ? "rotate-180" : "rotate-0"
                }`}
              />
            </span>
          </button>
        </RailTooltip>
      </div>
    </RailTooltipProvider>
  );
}
