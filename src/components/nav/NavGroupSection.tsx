"use client";

import { isItemActive, type NavGroup, type NavItem } from "./nav-config";
import { GROUP_LABEL, RAIL_DIVIDER, SKELETON_ROW } from "./nav-styles";
import { NavLinkRow } from "./NavLinkRow";
import { NavParentRow } from "./NavParentRow";
import { NavRailFlyout } from "./NavRailFlyout";

/** One labelled group of nav items. Renders nothing when every item is gated away. */
export function NavGroupSection({
  group,
  items,
  placeholderCount,
  isFirst,
  isFirstLabelled,
  collapsed,
  pathname,
  unreadCount,
  expanded,
  animateExpand,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  items: NavItem[];
  /** Skeleton rows standing in for role-gated items while the profile loads. */
  placeholderCount: number;
  /** First rendered group: no rail divider above it. */
  isFirst: boolean;
  /** First group with a visible label: slightly tighter top padding. */
  isFirstLabelled: boolean;
  collapsed: boolean;
  pathname: string;
  unreadCount: number;
  expanded: (item: NavItem) => boolean;
  animateExpand: boolean;
  onToggle: (item: NavItem) => void;
  onNavigate?: () => void;
}) {
  if (!items.length && !placeholderCount) {
    return null;
  }

  const headingId = group.label ? `nav-group-${group.id}` : undefined;

  return (
    <div>
      {group.label ? (
        collapsed ? (
          <>
            {isFirst ? null : <div aria-hidden="true" className={RAIL_DIVIDER} />}
            <h3 className="sr-only" id={headingId}>
              {group.label}
            </h3>
          </>
        ) : (
          <h3 className={`${GROUP_LABEL} ${isFirstLabelled ? "pt-4" : "pt-5"}`} id={headingId}>
            {group.label}
          </h3>
        )
      ) : null}
      <ul aria-labelledby={headingId} className="space-y-0.5" role="list">
        {items.map((item) => (
          <li key={item.id}>
            {item.children?.length ? (
              collapsed ? (
                <NavRailFlyout groupLabel={group.label} item={item} pathname={pathname} />
              ) : (
                <NavParentRow
                  animate={animateExpand}
                  item={item}
                  onNavigate={onNavigate}
                  onToggle={() => onToggle(item)}
                  open={expanded(item)}
                  pathname={pathname}
                />
              )
            ) : (
              <NavLinkRow
                active={isItemActive(pathname, item)}
                collapsed={collapsed}
                item={item}
                onNavigate={onNavigate}
                unreadCount={unreadCount}
              />
            )}
          </li>
        ))}
        {Array.from({ length: placeholderCount }, (_, index) => (
          <li aria-hidden="true" key={`placeholder-${index}`}>
            <div className={collapsed ? `${SKELETON_ROW} mx-auto w-12` : SKELETON_ROW} />
          </li>
        ))}
      </ul>
    </div>
  );
}
