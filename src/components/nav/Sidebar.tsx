"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useAuth } from "@/store/auth-provider";
import { useUnreadNotifications } from "@/store/use-unread-notifications";
import { CloseIcon } from "../icons";
import { isChildActive, isRoleGated, isVisible, matchesPath, navGroups, type NavItem } from "./nav-config";
import { readExpandedState, writeExpandedState } from "./nav-storage";
import { FOCUS } from "./nav-styles";
import { NavGroupSection } from "./NavGroupSection";
import { RailTooltipProvider } from "./RailTooltip";
import { SidebarFooter } from "./SidebarFooter";

/** Nothing stored and no child active: open, so the core task is visible on a first visit. */
const DEFAULT_EXPANDED = true;

function isInSection(pathname: string, item: NavItem) {
  return (
    matchesPath(pathname, item.match ?? item.href) ||
    Boolean(item.children?.some((child) => isChildActive(pathname, item, child)))
  );
}

/** Items whose sub-menu should be forced open for this route. */
function sectionsFor(pathname: string) {
  return navGroups.flatMap((group) =>
    group.items.filter((item) => item.children?.length && isInSection(pathname, item)).map((item) => item.id),
  );
}

export function Sidebar({
  collapsed,
  closeMobile,
}: {
  collapsed: boolean;
  /** Set for the mobile drawer: closes it on link click and shows the close button. */
  closeMobile?: () => void;
}) {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const { isAdmin, isClientSuperAdmin, isEngineer, loading, organization, organizationRole, user } = useAuthUser({
    enabled: isAuthenticated,
  });
  const isClientUser = organizationRole !== null;
  const { count: unreadCount } = useUnreadNotifications(isClientUser);
  const access = { isAuthenticated, isAdmin, isClientSuperAdmin, isEngineer, isClientUser };
  const profileLoading = isAuthenticated && loading;

  // Server render and first client render agree: open only for the current
  // section. The remembered state is applied after mount.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sectionsFor(pathname).map((id) => [id, true])),
  );
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readExpandedState();
      const forced = Object.fromEntries(sectionsFor(window.location.pathname).map((id) => [id, true]));
      const defaults = Object.fromEntries(
        navGroups.flatMap((group) =>
          group.items.filter((item) => item.children?.length).map((item) => [item.id, DEFAULT_EXPANDED]),
        ),
      );

      setExpanded({ ...defaults, ...stored, ...forced });
      setStorageLoaded(true);
    });
  }, []);

  // Navigating into a section opens it. The user can still close it; it is
  // only re-forced on the next navigation.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    const forced = sectionsFor(pathname);

    if (forced.some((id) => !expanded[id])) {
      setExpanded((current) => ({ ...current, ...Object.fromEntries(forced.map((id) => [id, true])) }));
    }
  }

  useEffect(() => {
    if (storageLoaded) {
      writeExpandedState(expanded);
    }
  }, [expanded, storageLoaded]);

  const toggleItem = (item: NavItem) => {
    setExpanded((current) => ({ ...current, [item.id]: !(current[item.id] ?? DEFAULT_EXPANDED) }));
  };

  const isExpanded = (item: NavItem) =>
    expanded[item.id] ?? (storageLoaded ? DEFAULT_EXPANDED : false);

  const groups = navGroups
    .map((group) => ({
      group,
      items: group.items.filter((item) => isVisible(item, access)),
      placeholderCount: profileLoading
        ? Math.min(2, group.items.filter((item) => isRoleGated(item) && !isVisible(item, access)).length)
        : 0,
    }))
    .filter(({ items, placeholderCount }) => items.length > 0 || placeholderCount > 0);
  const firstLabelledIndex = groups.findIndex(({ group }) => group.label);

  return (
    <RailTooltipProvider>
      <div className="flex h-full flex-col bg-slate-950 text-white">
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/5 ${collapsed ? "justify-center px-0" : "px-5"}`}
        >
          <Link aria-label="PrithivieX home" className={`rounded-md ${FOCUS}`} href="/" onClick={closeMobile}>
            <Image
              alt="PrithivieX"
              className={`h-auto object-contain ${collapsed ? "w-9" : "w-36"}`}
              height={48}
              priority
              src={collapsed ? "/images/logo1.png" : "/images/logo.png"}
              width={160}
            />
          </Link>
          {closeMobile ? (
            <button
              aria-label="Close navigation"
              className={`ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white ${FOCUS}`}
              data-drawer-close=""
              onClick={closeMobile}
              type="button"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <nav
          aria-label="Main"
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 [scrollbar-color:var(--color-slate-700)_transparent] [scrollbar-width:thin]"
        >
          {groups.map(({ group, items, placeholderCount }, index) => (
            <NavGroupSection
              animateExpand={storageLoaded}
              collapsed={collapsed}
              expanded={isExpanded}
              group={group}
              isFirst={index === 0}
              isFirstLabelled={index === firstLabelledIndex}
              items={items}
              key={group.id}
              onNavigate={closeMobile}
              onToggle={toggleItem}
              pathname={pathname}
              placeholderCount={placeholderCount}
              unreadCount={unreadCount}
            />
          ))}
        </nav>
        <SidebarFooter
          account={{ user, organization, organizationRole, isAdmin, loading: profileLoading }}
          collapsed={collapsed}
          isAuthenticated={isAuthenticated}
          onNavigate={closeMobile}
          onSignOut={logout}
        />
      </div>
    </RailTooltipProvider>
  );
}
