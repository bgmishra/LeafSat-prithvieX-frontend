import type { JSX } from "react";
import {
  BellIcon,
  ChartIcon,
  DashboardIcon,
  HomeIcon,
  LeafIcon,
  SectionsIcon,
  UserIcon,
  UsersIcon,
  type IconProps,
} from "../icons";

export type NavChild = { label: string; href: string };

export type NavItem = {
  /** Stable key, also used for the remembered expand state. */
  id: string;
  label: string;
  /** For a parent this is the landing route, used for active matching only. */
  href: string;
  icon: (props: IconProps) => JSX.Element;
  /** Prefix used for active matching (defaults to href). */
  match?: string;
  exact?: boolean;
  children?: NavChild[];
  badge?: "unread";
  authOnly?: boolean;
  adminOnly?: boolean;
  clientOnly?: boolean;
  sectionManagerOnly?: boolean;
  clientSuperAdminOnly?: boolean;
};

export type NavGroup = { id: string; label: string | null; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    id: "home",
    label: null,
    items: [{ id: "home", label: "Home", href: "/", icon: HomeIcon, exact: true }],
  },
  {
    id: "models",
    label: "Models",
    items: [
      {
        id: "leaf-off-readiness",
        label: "Leaf-Off Readiness",
        href: "/leaf-off-readiness",
        icon: LeafIcon,
        children: [
          { label: "Run Model", href: "/leaf-off-readiness/run-model" },
          { label: "View Model Results", href: "/leaf-off-readiness/results" },
          { label: "Shared Model Results", href: "/leaf-off-readiness/shared-results" },
        ],
      },
      {
        id: "leaf-off-forecast",
        label: "Leaf-Off Forecast",
        href: "/leaf-off-forecast",
        icon: ChartIcon,
        children: [
          { label: "Run Forecast Model", href: "/leaf-off-forecast/run-model" },
          { label: "View Model Results", href: "/leaf-off-forecast/results" },
          { label: "Shared Model Results", href: "/leaf-off-forecast/shared-results" },
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "manage-sections",
        label: "Manage Sections",
        href: "/manage-sections",
        icon: SectionsIcon,
        authOnly: true,
        sectionManagerOnly: true,
      },
      { id: "team", label: "Team", href: "/team", icon: UsersIcon, authOnly: true, clientSuperAdminOnly: true },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: BellIcon,
        authOnly: true,
        clientOnly: true,
        badge: "unread",
      },
      { id: "profile", label: "Profile", href: "/profile", icon: UserIcon, authOnly: true },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      {
        id: "admin",
        label: "Admin",
        href: "/admin/clients",
        match: "/admin",
        icon: DashboardIcon,
        authOnly: true,
        adminOnly: true,
      },
    ],
  },
];

export type NavAccess = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClientSuperAdmin: boolean;
  isEngineer: boolean;
  isClientUser: boolean;
};

/** The same per-item gate the flat navigation list used. */
export function isVisible(item: NavItem, access: NavAccess) {
  const { isAuthenticated, isAdmin, isClientSuperAdmin, isEngineer, isClientUser } = access;

  if (item.adminOnly) {
    return isAuthenticated && isAdmin;
  }

  if (item.clientSuperAdminOnly) {
    return isAuthenticated && isClientSuperAdmin;
  }

  if (item.sectionManagerOnly) {
    return isAuthenticated && (isClientSuperAdmin || isEngineer);
  }

  if (item.clientOnly) {
    return isAuthenticated && isClientUser;
  }

  return !item.authOnly || isAuthenticated;
}

/** Gated on the signed-in user's profile, so unknown until it loads. */
export function isRoleGated(item: NavItem) {
  return Boolean(item.adminOnly || item.clientSuperAdminOnly || item.sectionManagerOnly || item.clientOnly);
}

export function matchesPath(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isItemActive(pathname: string, item: NavItem) {
  return matchesPath(pathname, item.match ?? item.href, item.exact);
}

export function isChildActive(pathname: string, item: NavItem, child: NavChild) {
  // A section's landing page (/leaf-off-readiness, /leaf-off-forecast) renders its Run Model screen.
  return matchesPath(pathname, child.href) || (pathname === item.href && child.href === item.children?.[0]?.href);
}

export function formatBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}
