import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const sessionUser = await requireUser("/settings");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      walletAddress: true,
      createdAt: true,
      organization: { select: { name: true } },
    },
  });

  if (!user) notFound();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your personal details and how you appear to your team."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your name is shown alongside every document you register.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultName={user.name}
            defaultWalletAddress={user.walletAddress ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Details that cannot be changed from this screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Email address</dt>
              <dd className="text-sm font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Member since</dt>
              <dd className="tabular text-sm font-medium">
                {formatDate(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Organization</dt>
              <dd className="text-sm font-medium">
                {user.organization?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd className="text-sm font-medium">
                {sessionUser.role ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {ROLE_LABELS[sessionUser.role]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {ROLE_DESCRIPTIONS[sessionUser.role]}
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <Separator />

          <p className="text-sm text-muted-foreground">
            Appearance (light or dark) is set from the theme options in your
            profile menu.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
