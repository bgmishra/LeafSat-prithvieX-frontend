"use client";

import Link from "next/link";
import { formatBadgeCount, type NavItem } from "./nav-config";
import { iconStateClass, RAIL_ROW_BASE, ROW_BASE, rowStateClass } from "./nav-styles";
import { RailTooltip } from "./RailTooltip";

/** A top-level item without children: a plain link, or an icon with a tooltip in the rail. */
export function NavLinkRow({
  item,
  active,
  collapsed,
  unreadCount,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const showBadge = item.badge === "unread" && unreadCount > 0;
  const badgeText = formatBadgeCount(unreadCount);
  const accessibleName = showBadge ? `${item.label}, ${badgeText} unread` : undefined;

  if (collapsed) {
    return (
      <RailTooltip label={showBadge ? `${item.label} · ${badgeText} unread` : item.label}>
        <Link
          aria-current={active ? "page" : undefined}
          aria-label={accessibleName ?? item.label}
          className={`${RAIL_ROW_BASE} ${rowStateClass(active)}`}
          href={item.href}
          onClick={onNavigate}
        >
          <span className="relative">
            <Icon className={iconStateClass(active)} />
            {showBadge ? (
              <span
                aria-hidden="true"
                className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[10px] font-bold leading-none text-slate-950 ring-2 ${
                  active ? "ring-slate-900" : "ring-slate-950"
                }`}
              >
                {badgeText}
              </span>
            ) : null}
          </span>
        </Link>
      </RailTooltip>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={accessibleName}
      className={`${ROW_BASE} ${rowStateClass(active)}`}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon className={iconStateClass(active)} />
      <span className="nav-label truncate">{item.label}</span>
      {showBadge ? (
        <span
          aria-hidden="true"
          className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-400 px-1.5 text-[11px] font-bold tabular-nums leading-none text-slate-950"
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}
