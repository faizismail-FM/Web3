import {
  CheckCircle2,
  FileText,
  Link2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
};

const GETTING_STARTED = [
  {
    icon: Upload,
    title: "Upload a document",
    description:
      "Add a PDF. The file is stored securely and never leaves your organization.",
  },
  {
    icon: Link2,
    title: "Create a blockchain proof",
    description:
      "A fingerprint of the document is published, proving when it existed.",
  },
  {
    icon: ShieldCheck,
    title: "Share for verification",
    description:
      "Anyone with the link or QR code can confirm the document is authentic.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  // Counts are scoped to the caller's organization; there is no cross-tenant
  // read path anywhere in the product.
  const [total, registered, verified, pending] = user.organizationId
    ? await Promise.all([
        prisma.document.count({
          where: { organizationId: user.organizationId },
        }),
        prisma.document.count({
          where: { organizationId: user.organizationId, status: "REGISTERED" },
        }),
        prisma.document.count({
          where: { organizationId: user.organizationId, status: "VERIFIED" },
        }),
        prisma.document.count({
          where: { organizationId: user.organizationId, status: "PENDING" },
        }),
      ])
    : [0, 0, 0, 0];

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Register documents, create tamper-proof records, and let anyone verify them."
        actions={
          <Button asChild>
            <Link href="/documents/new">
              <Upload className="size-4" aria-hidden="true" />
              Upload document
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total documents" value={total} icon={FileText} />
        <StatCard
          label="Registered"
          value={registered}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Verified" value={verified} icon={ShieldCheck} />
        <StatCard label="Pending" value={pending} icon={Link2} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Three steps from a file on your desktop to a proof anyone can check.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {GETTING_STARTED.map((step, index) => (
            <div key={step.title} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <step.icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
