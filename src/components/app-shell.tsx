"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MenuIcon } from "./icons";
import { readCollapsedState, writeCollapsedState } from "./nav/nav-storage";
import { Sidebar } from "./nav/Sidebar";
import { SidebarEdgeToggle } from "./nav/SidebarEdgeToggle";

const shellHiddenRoutePrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedLoaded, setCollapsedLoaded] = useState(false);
  // Only fade labels in after a user toggle, never on the first paint.
  const [hasToggled, setHasToggled] = useState(false);
  // The edge handle is hovered or keyboard-focused: light the seam it moves.
  const [edgeHot, setEdgeHot] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
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

  const toggleCollapsed = () => {
    setHasToggled(true);
    setCollapsed((value) => !value);
  };

  // Route changes close the drawer (as well as link clicks via closeMobile).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);

    if (mobileOpen) {
      setMobileOpen(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readCollapsedState();

      if (stored !== null) {
        setCollapsed(stored);
      }

      setCollapsedLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (collapsedLoaded) {
      writeCollapsedState(collapsed);
    }
  }, [collapsed, collapsedLoaded]);

  // "[" toggles the desktop sidebar, except while typing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "[" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTypingTarget(event.target) ||
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
        return;
      }

      event.preventDefault();
      setHasToggled(true);
      setCollapsed((value) => !value);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Drawer focus: close button on open, Esc closes, back to the hamburger on close.
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const menuButton = menuButtonRef.current;
    drawerRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  const trapDrawerFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) {
      return;
    }

    const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !element.closest("[inert]"),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 outDivMain">
      {/* Width, padding and the edge handle share one duration and curve, and
          only animate after a user toggle, so the stored state lands without a slide. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-x-hidden border-r border-white/5 bg-slate-950 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:bg-teal-400/50 after:opacity-0 after:transition-opacity after:duration-150 after:ease-out after:content-[''] data-[edge-hot=true]:after:opacity-100 motion-reduce:after:transition-none lg:block ${
          hasToggled ? "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" : ""
        } ${collapsed ? "w-20" : "w-64"}`}
        data-animate-labels={hasToggled ? "true" : undefined}
        data-edge-hot={edgeHot ? "true" : undefined}
        id="app-sidebar"
      >
        <Sidebar collapsed={collapsed} />
      </aside>
      <SidebarEdgeToggle
        animate={hasToggled}
        collapsed={collapsed}
        onHotChange={setEdgeHot}
        onToggle={toggleCollapsed}
      />

      <header className="mobileScreenHeader fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-center border-b border-slate-200 bg-white/95 px-4 text-slate-950 shadow-sm backdrop-blur lg:hidden">
        <button
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          onClick={openMobileDrawer}
          ref={menuButtonRef}
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
          className={`fixed inset-0 z-50 transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileDrawer}
          />
          <aside
            aria-label="Navigation"
            aria-modal="true"
            className={`relative h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onKeyDown={trapDrawerFocus}
            ref={drawerRef}
            role="dialog"
          >
            <Sidebar collapsed={false} closeMobile={closeMobileDrawer} />
          </aside>
        </div>
      ) : null}

      <div
        className={`${mobileContentOffset} ${
          hasToggled ? "transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" : ""
        } lg:pt-0 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <main className="mx-auto flex w-full flex-col gap-10 px-1 py-1 sm:px-0 lg:px-0 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
