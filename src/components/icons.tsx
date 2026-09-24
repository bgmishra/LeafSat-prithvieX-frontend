export type IconProps = {
  className?: string;
};

const iconClass = "h-5 w-5";

function Svg({
  children,
  className,
}: IconProps & {
  children: React.ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className || iconClass}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </Svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m8 15 3-4 3 2 4-6" />
    </Svg>
  );
}

export function ExtractIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h14v5H5z" />
      <path d="M7 14h10" />
      <path d="M9 18h6" />
      <path d="M12 9v9" />
    </Svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-11 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </Svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h7v7H4z" />
      <path d="M13 5h7v4h-7z" />
      <path d="M13 11h7v8h-7z" />
      <path d="M4 14h7v5H4z" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </Svg>
  );
}

export function OrdersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10l2 4v12H5V8z" />
      <path d="M7 8h10" />
      <path d="M9 13h6" />
      <path d="M9 16h4" />
    </Svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h15a1 1 0 0 1 1 1v10H5a2 2 0 0 1-2-2V6a2 2 0 0 0 2 2h15" />
      <path d="M16 13h.01" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

/**
 * Chevron for the sidebar edge handle. Drawn at stroke 2.25 (1.5px at 16px) so
 * it holds its weight on the 28px disc; it is centred on x=12, so rotating it
 * 180deg keeps it in place.
 */
export function SidebarEdgeChevronIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className || iconClass}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <path d="m14.5 7-5 5 5 5" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 17 15 12l-5-5" />
      <path d="M15 12H3" />
      <path d="M21 4v16" />
    </Svg>
  );
}


export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function SectionsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 21a7 7 0 0 0-14 0" />
      <circle cx="9" cy="8" r="4" />
      <path d="M16 3.5a4 4 0 0 1 0 7.5" />
      <path d="M22 21a7 7 0 0 0-4-6.3" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}
