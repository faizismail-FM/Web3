import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const organization = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true },
      })
    : null;

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          name={user.name}
          email={user.email}
          organizationName={organization?.name ?? null}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
