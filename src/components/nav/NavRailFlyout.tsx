"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRightIcon } from "../icons";
import { isChildActive, type NavItem } from "./nav-config";
import { FLYOUT_LINK, FLYOUT_SURFACE, iconStateClass, RAIL_ROW_BASE, rowStateClass } from "./nav-styles";

const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_GRACE_MS = 200;

type OpenReason = "hover" | "press";

/**
 * Icon-rail parent: the children are hidden in the rail, so the row opens a
 * dark flyout listing them. Opens on click/Enter/Space/ArrowRight (focus moves
 * to the first link) and on hover (focus stays put).
 */
export function NavRailFlyout({
  item,
  groupLabel,
  pathname,
}: {
  item: NavItem;
  groupLabel: string | null;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const reasonRef = useRef<OpenReason>("press");
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;
  const children = item.children ?? [];
  const hasActiveChild = children.some((child) => isChildActive(pathname, item, child));
  const flyoutId = `flyout-${item.id}`;

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };

  useEffect(() => clearTimers, []);

  const openWith = (reason: OpenReason) => {
    clearTimers();
    reasonRef.current = reason;
    setOpen(true);
  };

  const close = () => {
    clearTimers();
    setOpen(false);
  };

  const handlePointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    window.clearTimeout(closeTimer.current);

    if (!open) {
      window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(() => openWith("hover"), HOVER_OPEN_DELAY_MS);
    }
  };

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    window.clearTimeout(openTimer.current);

    // Only hover-opened flyouts close on leave; a clicked one stays until dismissed.
    if (open && reasonRef.current === "hover") {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_GRACE_MS);
    }
  };

  const focusLink = (index: "first" | "last" | number) => {
    const links = Array.from(contentRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);

    if (!links.length) {
      return;
    }

    const target = index === "first" ? 0 : index === "last" ? links.length - 1 : (index + links.length) % links.length;
    links[target]?.focus();
  };

  const handleContentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const links = Array.from(contentRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusLink(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusLink(current < 0 ? "last" : current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusLink("first");
        break;
      case "End":
        event.preventDefault();
        focusLink("last");
        break;
      case "ArrowLeft":
      case "Tab":
        // The flyout is portalled, so Tab would otherwise jump to the end of
        // the page. Close it and hand focus back to the rail row instead.
        event.preventDefault();
        reasonRef.current = "press";
        close();
        break;
    }
  };

  return (
    <Popover
      onOpenChange={(next) => {
        if (next) {
          openWith("press");
        } else {
          close();
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <button
          aria-controls={flyoutId}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={hasActiveChild ? `${item.label} (current section)` : item.label}
          className={`${RAIL_ROW_BASE} ${rowStateClass(hasActiveChild)} ${open && !hasActiveChild ? "bg-white/[0.05] text-white" : ""}`}
          onClick={(event) => {
            // Take over Radix's toggle: a click on a hover-opened flyout pins it open.
            event.preventDefault();

            if (open && reasonRef.current === "hover") {
              reasonRef.current = "press";
              clearTimers();
              focusLink("first");
              return;
            }

            if (open) {
              close();
            } else {
              openWith("press");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();

              if (open) {
                reasonRef.current = "press";
                focusLink("first");
              } else {
                openWith("press");
              }
            }
          }}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          type="button"
        >
          <Icon className={iconStateClass(hasActiveChild)} />
          <ChevronRightIcon className="absolute right-0.5 h-3 w-3 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={FLYOUT_SURFACE}
        id={flyoutId}
        onCloseAutoFocus={(event) => {
          if (reasonRef.current === "hover") {
            event.preventDefault();
          }
        }}
        onKeyDown={handleContentKeyDown}
        onOpenAutoFocus={(event) => {
          // Hover previews must not steal focus; pressed opens focus the first link.
          event.preventDefault();

          if (reasonRef.current === "press") {
            focusLink("first");
          }
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        ref={contentRef}
        side="right"
        sideOffset={12}
      >
        <div className="mb-1 border-b border-white/10 px-2.5 pb-2 pt-1.5">
          {groupLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{groupLabel}</p>
          ) : null}
          <p className="text-sm font-semibold text-white">{item.label}</p>
        </div>
        <ul aria-label={item.label} className="space-y-0.5" role="list">
          {children.map((child) => {
            const active = isChildActive(pathname, item, child);

            return (
              <li key={child.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`${FLYOUT_LINK} ${
                    active ? "bg-teal-400/10 font-medium text-teal-300" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                  href={child.href}
                  onClick={close}
                >
                  {active ? <span aria-hidden="true" className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" /> : null}
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
