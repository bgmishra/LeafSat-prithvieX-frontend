"use client";

import Link from "next/link";
import { ChevronDownIcon } from "../icons";
import { isChildActive, type NavItem } from "./nav-config";
import { FOCUS, iconStateClass, ROW_BASE } from "./nav-styles";

/**
 * Expanded-sidebar parent: the row only toggles its children, it never
 * navigates. Its landing route still works, it just is not a nav target.
 */
export function NavParentRow({
  item,
  pathname,
  open,
  animate,
  onToggle,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  /** False until the remembered state is applied, so the first paint does not animate. */
  animate: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const children = item.children ?? [];
  const hasActiveChild = children.some((child) => isChildActive(pathname, item, child));
  const regionId = `nav-sub-${item.id}`;
  const motion = animate ? "duration-200 ease-out motion-reduce:transition-none" : "transition-none";

  return (
    <>
      <button
        aria-controls={regionId}
        aria-expanded={open}
        className={`${ROW_BASE} ${
          hasActiveChild
            ? "text-white hover:bg-white/[0.05] active:bg-white/[0.08]"
            : "text-slate-300 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08]"
        }`}
        onClick={onToggle}
        type="button"
      >
        <Icon className={iconStateClass(hasActiveChild)} />
        <span className="nav-label truncate">{item.label}</span>
        {hasActiveChild ? <span className="sr-only">(current section)</span> : null}
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 shrink-0 transition-transform ${motion} ${open ? "rotate-180" : "rotate-0"} ${
            hasActiveChild ? "text-slate-300" : "text-slate-500 group-hover:text-slate-300"
          }`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] ${motion} ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        id={regionId}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ul className="relative mb-1 ml-[21px] mr-1 mt-0.5 space-y-0.5 border-l border-white/10 py-0.5 pl-3" role="list">
            {children.map((child) => {
              const active = isChildActive(pathname, item, child);

              return (
                <li key={child.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-9 items-center rounded-md px-3 text-[13px] leading-5 transition-colors duration-150 motion-reduce:transition-none ${FOCUS} ${
                      active
                        ? "bg-teal-400/10 font-medium text-teal-300 before:absolute before:-left-[14px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-teal-400"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 active:bg-white/[0.08]"
                    }`}
                    href={child.href}
                    onClick={onNavigate}
                  >
                    <span className="nav-label truncate">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
