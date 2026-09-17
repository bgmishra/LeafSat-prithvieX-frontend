"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useAuth } from "@/store/auth-provider";
import { useUnreadNotifications } from "@/store/use-unread-notifications";
import {
  BellIcon,
  ChartIcon,
  CollapseIcon,
  DashboardIcon,
  HomeIcon,
  LeafIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  UserIcon,
} from "./icons";

const navigation = [
  { label: "Home", href: "/", icon: HomeIcon, authOnly: false },
  { label: "Leaf-Off Readiness", href: "/leaf-off-readiness", icon: LeafIcon, authOnly: false },
  { label: "Leaf-Off Forecast", href: "/leaf-off-forecast", icon: ChartIcon, authOnly: false },
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon, authOnly: true, adminOnly: true },
  { label: "Orders", href: "/orders", icon: OrdersIcon, authOnly: true },
  { label: "Manage Sections", href: "/manage-sections", icon: LeafIcon, authOnly: true, sectionManagerOnly: true },
  { label: "Notifications", href: "/notifications", icon: BellIcon, authOnly: true, clientOnly: true, badge: "unread" },
  { label: "Team", href: "/team", icon: UserIcon, authOnly: true, clientSuperAdminOnly: true },
  { label: "Profile", href: "/profile", icon: UserIcon, authOnly: true },
  { label: "Admin", href: "/admin/services", icon: DashboardIcon, authOnly: true, adminOnly: true },
];

const shellHiddenRoutePrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

function Sidebar({
  collapsed,
  closeMobile,
}: {
  collapsed: boolean;
  closeMobile?: () => void;
}) {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const { isAdmin, isClientSuperAdmin, isEngineer, organizationRole } = useAuthUser({
    enabled: isAuthenticated,
  });
  const isClientUser = organizationRole !== null;
  const { count: unreadCount } = useUnreadNotifications(isClientUser);
  const visibleNavigation = navigation.filter((item) => {
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
  });

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className={`flex min-h-16 items-center border-b border-white/10 transition-all duration-300 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <Image
          alt="PrithivieX"
          className={`h-auto object-contain transition-all duration-300 ${collapsed ? "w-10" : "w-40"}`}
          height={48}
          priority
          src={collapsed ? "/images/logo1.png" : "/images/logo.png"}
          width={160}
        />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              className={`flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                active
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.href}
              onClick={closeMobile}
              title={collapsed ? item.label : undefined}
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {item.badge === "unread" && unreadCount > 0 && collapsed ? (
                  <span
                    aria-label={`${unreadCount} unread`}
                    className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[10px] font-bold leading-none text-slate-950 ring-2 ring-slate-950"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                  collapsed ? "max-w-0 -translate-x-2 opacity-0" : "max-w-[12rem] translate-x-0 opacity-100"
                }`}
              >
                {item.label}
              </span>
              {item.badge === "unread" && unreadCount > 0 && !collapsed ? (
                <span className="ml-auto min-w-6 rounded-full bg-teal-400 px-1.5 text-center text-xs font-bold leading-5 text-slate-950">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        {isAuthenticated ? (
          <button
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-sm font-medium text-slate-300 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            type="button"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                collapsed ? "max-w-0 -translate-x-2 opacity-0" : "max-w-[12rem] translate-x-0 opacity-100"
              }`}
            >
              Logout
            </span>
          </button>
        ) : (
          <Link
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-sm font-medium text-slate-300 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
            href="/login"
            onClick={closeMobile}
            title={collapsed ? "Login" : undefined}
          >
            <UserIcon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                collapsed ? "max-w-0 -translate-x-2 opacity-0" : "max-w-[12rem] translate-x-0 opacity-100"
              }`}
            >
              Login
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const hideShell = shellHiddenRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
  const mobileContentOffset = pathname === "/" ? "" : "pt-16";
  const mobileDrawerDurationMs = 300;

  const openMobileDrawer = () => {
    setMobileMounted(true);
    window.requestAnimationFrame(() => {
      setMobileOpen(true);
    });
  };

  const closeMobileDrawer = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    if (mobileOpen || !mobileMounted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMobileMounted(false);
    }, mobileDrawerDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mobileOpen, mobileMounted, mobileDrawerDurationMs]);

  useEffect(() => {
    if (!mobileMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMounted]);

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 outDivMain">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <Sidebar collapsed={collapsed} />
        <button
          aria-label="Collapse sidebar"
          className="customStyleButtonCol group absolute -right-4 top-5 z-10 hidden h-9 w-9 items-center justify-center rounded-full border border-[#1839cd] bg-[#1839cd] text-white shadow-md ring-4 ring-slate-50 transition duration-200 hover:-right-5 hover:scale-105 hover:border-[#1839cd] hover:bg-[#1839cd] hover:text-white hover:shadow-lg active:scale-95 lg:inline-flex"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <span className="absolute inset-0 rounded-full bg-teal-400/20 opacity-0 blur-md transition group-hover:opacity-100" />
          <CollapseIcon className={`relative h-5 w-5 transition duration-200 group-hover:drop-shadow ${collapsed ? "rotate-180" : ""}`} />
          <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border border-slate-200 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:translate-x-1 group-hover:opacity-100 xl:block">
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </button>
      </aside>

      <header className="mobileScreenHeader fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-center border-b border-slate-200 bg-white/95 px-4 text-slate-950 shadow-sm backdrop-blur lg:hidden">
        <button
          aria-label="Open navigation"
          className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          onClick={openMobileDrawer}
          type="button"
        >
          <MenuIcon />
        </button>
        <Link
          aria-label="PrithivieX home"
          className="flex items-center gap-2"
          href="/"
        >
          <Image alt="PrithivieX" className="h-auto w-32 object-contain" height={40} priority src="/images/logo.png" width={160} />
        </Link>
      </header>

      {mobileMounted ? (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            aria-label="Close navigation"
            className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-300 ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileDrawer}
            type="button"
          />
          <aside
            className={`relative h-full w-72 max-w-[82vw] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar collapsed={false} closeMobile={closeMobileDrawer} />
          </aside>
        </div>
      ) : null}

      <div
        className={`${mobileContentOffset} transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:pt-0 ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}
      >
        <main className="mx-auto flex w-full flex-col gap-10 px-1 py-1 sm:px-0 lg:px-0 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
