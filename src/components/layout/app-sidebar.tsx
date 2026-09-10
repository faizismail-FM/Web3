import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarNav />
      </div>
    </aside>
  );
}
