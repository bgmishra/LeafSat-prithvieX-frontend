"use client";

import Link from "next/link";
import { useState } from "react";
import type { AuthUser, OrganizationRole } from "@/admin/types/resources";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoutIcon, UserIcon } from "../icons";
import {
  FLYOUT_LINK,
  FLYOUT_SURFACE,
  FOCUS,
  iconStateClass,
  RAIL_ROW_BASE,
  ROW_BASE,
  rowStateClass,
} from "./nav-styles";
import { RailTooltip } from "./RailTooltip";

const roleLabels: Record<OrganizationRole, string> = {
  client_super_admin: "Super admin",
  engineer: "Engineer",
  field_supervisor: "Field supervisor",
};

function displayName(user: AuthUser | null) {
  return user?.full_name?.trim() || user?.name?.trim() || user?.email || "Signed in";
}

function initials(user: AuthUser | null) {
  const source = user?.full_name?.trim() || user?.name?.trim() || user?.email?.split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);

  if (!words.length) {
    return "?";
  }

  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : words[0].slice(0, 2);
  return letters.toUpperCase();
}

export type SidebarUser = {
  user: AuthUser | null;
  organization: string | null;
  organizationRole: OrganizationRole | null;
  isAdmin: boolean;
  loading: boolean;
};

function metaLine({ organization, organizationRole, isAdmin }: SidebarUser) {
  const role = isAdmin ? "Platform admin" : organizationRole ? roleLabels[organizationRole] : null;
  return [role, organization].filter(Boolean).join(" · ");
}

function Avatar({ user }: { user: AuthUser | null }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-300 ring-1 ring-teal-400/30"
    >
      {initials(user)}
    </span>
  );
}

function RailUserMenu({ account, onSignOut }: { account: SidebarUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const name = displayName(account.user);
  const meta = metaLine(account);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Account menu for ${name}`}
          className={`mx-auto grid h-10 w-10 place-items-center rounded-full hover:bg-white/[0.05] ${FOCUS}`}
          type="button"
        >
          <Avatar user={account.user} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={FLYOUT_SURFACE} side="right" sideOffset={12}>
        <div className="mb-1 border-b border-white/10 px-2.5 pb-2 pt-1.5">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {meta ? <p className="truncate text-xs text-slate-400">{meta}</p> : null}
        </div>
        <Link
          className={`${FLYOUT_LINK} text-slate-300 hover:bg-white/[0.06] hover:text-white`}
          href="/profile"
          onClick={() => setOpen(false)}
        >
          Profile
        </Link>
        <div aria-hidden="true" className="my-1 h-px bg-white/10" />
        <button
          className={`${FLYOUT_LINK} w-full text-left text-slate-300 hover:bg-white/[0.06] hover:text-white`}
          onClick={() => {
            setOpen(false);
            onSignOut();
          }}
          type="button"
        >
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}

function UserCard({
  account,
  collapsed,
  onSignOut,
}: {
  account: SidebarUser;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  if (account.loading && !account.user) {
    return collapsed ? (
      <div aria-hidden="true" className="mx-auto h-10 w-10 animate-pulse rounded-full bg-white/[0.04] motion-reduce:animate-none" />
    ) : (
      <div aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none" />
    );
  }

  if (collapsed) {
    return <RailUserMenu account={account} onSignOut={onSignOut} />;
  }

  const name = displayName(account.user);
  const meta = metaLine(account);

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <Avatar user={account.user} />
      <div className="min-w-0 flex-1">
        <p className="nav-label truncate text-sm font-medium text-white">{name}</p>
        {meta ? <p className="nav-label truncate text-xs text-slate-400">{meta}</p> : null}
      </div>
      <RailTooltip label="Sign out">
        <button
          aria-label="Sign out"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-white motion-reduce:transition-none ${FOCUS}`}
          onClick={onSignOut}
          type="button"
        >
          <LogoutIcon className="h-4 w-4" />
        </button>
      </RailTooltip>
    </div>
  );
}

export function SidebarFooter({
  collapsed,
  isAuthenticated,
  account,
  onSignOut,
  onNavigate,
}: {
  collapsed: boolean;
  isAuthenticated: boolean;
  account: SidebarUser;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="shrink-0 space-y-1 border-t border-white/5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {isAuthenticated ? (
        <UserCard account={account} collapsed={collapsed} onSignOut={onSignOut} />
      ) : (
        <RailTooltip enabled={collapsed} label="Sign in">
          <Link
            aria-label={collapsed ? "Sign in" : undefined}
            className={`${collapsed ? RAIL_ROW_BASE : ROW_BASE} ${rowStateClass(false)}`}
            href="/login"
            onClick={onNavigate}
          >
            <UserIcon className={iconStateClass(false)} />
            {collapsed ? null : <span className="nav-label">Sign in</span>}
          </Link>
        </RailTooltip>
      )}
    </div>
  );
}
