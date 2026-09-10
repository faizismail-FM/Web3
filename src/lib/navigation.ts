import {
  Activity,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Matched as a prefix so nested routes keep the parent item highlighted. */
  match?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const APP_NAVIGATION: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Verify", href: "/verify", icon: ShieldCheck },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Organization", href: "/organizations", icon: Building2 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  const base = item.match ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}
