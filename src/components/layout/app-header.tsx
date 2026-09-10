import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import { publicEnv } from "@/lib/env";

export function AppHeader({
  name,
  email,
  organizationName,
}: {
  name: string;
  email: string;
  organizationName: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <MobileNav />

      <div className="min-w-0 flex-1">
        {organizationName ? (
          <p className="truncate text-sm font-medium">{organizationName}</p>
        ) : null}
      </div>

      {publicEnv.blockchainMode === "mock" ? (
        <Badge
          variant="outline"
          className="hidden border-warning/40 bg-warning-muted text-warning-muted-foreground sm:inline-flex"
        >
          Simulation mode
        </Badge>
      ) : null}

      <UserMenu
        name={name}
        email={email}
        organizationName={organizationName}
      />
    </header>
  );
}
