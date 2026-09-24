"use client";

import { Tooltip } from "radix-ui";
import { TOOLTIP_CONTENT } from "./nav-styles";

export function RailTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
      {children}
    </Tooltip.Provider>
  );
}

/**
 * Right-side label for an icon-only control. Shows on hover and keyboard focus.
 * It supplements the control's aria-label and never replaces it.
 */
export function RailTooltip({
  label,
  enabled = true,
  shortcut,
  sideOffset = 12,
  children,
}: {
  label: string;
  enabled?: boolean;
  /** Key hint shown after the label, e.g. "[". */
  shortcut?: string;
  /** Gap between the trigger and the tooltip, in px. */
  sideOffset?: number;
  children: React.ReactElement;
}) {
  if (!enabled) {
    return children;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={TOOLTIP_CONTENT} side="right" sideOffset={sideOffset}>
          {label}
          {shortcut ? (
            <kbd className="ml-2 rounded border border-white/15 bg-white/5 px-1.5 font-sans text-[10px] text-slate-300">
              {shortcut}
            </kbd>
          ) : null}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
