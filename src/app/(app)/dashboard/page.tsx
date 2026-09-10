import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityFeed } from "@/components/activity/activity-feed";
import { EmptyState } from "@/components/common/empty-state";
import { StatCard } from "@/components/common/stat-card";
import { BlockchainStatusCard } from "@/components/dashboard/blockchain-status-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { can } from "@/lib/auth/rbac";
import { requireUser } from "@/lib/auth/session";
import {
  getBlockchainStatus,
  getDashboardStats,
  getRecentActivity,
} from "@/lib/services/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

const GETTING_STARTED = [
  {
    title: "Upload a document",
    description:
      "Add a PDF. The file is stored securely and never leaves your organization.",
  },
  {
    title: "Create a blockchain proof",
    description:
      "A fingerprint of the document is published, proving when it existed.",
  },
  {
    title: "Share for verification",
    description:
      "Anyone with the link or QR code can confirm the document is authentic.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  const [stats, blockchain, recentActivity] = user.organizationId
    ? await Promise.all([
        getDashboardStats(user.organizationId),
        getBlockchainStatus(user.organizationId),
        getRecentActivity(user.organizationId),
      ])
    : [
        { total: 0, registered: 0, verified: 0, pending: 0, failed: 0 },
        null,
        [],
      ];

  const firstName = user.name.split(" ")[0];
  const isNewWorkspace = stats.total === 0;

  const uploadButton = can.uploadDocuments(user.role) ? (
    <Button asChild>
      <Link href="/documents/new">
        <Upload className="size-4" aria-hidden="true" />
        Upload document
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Register documents, create tamper-proof records, and let anyone verify them."
        actions={uploadButton}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total documents" value={stats.total} icon={FileText} />
        <StatCard
          label="Registered"
          value={stats.registered}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Verified"
          value={stats.verified}
          icon={ShieldCheck}
          tone="success"
        />
        {/* Failures deserve the fourth slot only when there are any; otherwise
            pending is the more useful number to watch. */}
        {stats.failed > 0 ? (
          <StatCard
            label="Failed"
            value={stats.failed}
            icon={XCircle}
            tone="destructive"
          />
        ) : (
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock3}
            tone="warning"
          />
        )}
      </div>

      {isNewWorkspace ? (
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              Three steps from a file on your desktop to a proof anyone can
              check.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            {GETTING_STARTED.map((step, index) => (
              <div key={step.title} className="space-y-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              The latest events across your workspace.
            </CardDescription>
            {recentActivity.length > 0 ? (
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/activity">View all</Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Nothing has happened yet"
                description="Once you upload a document, its history will appear here."
              />
            ) : (
              <ActivityFeed entries={recentActivity} />
            )}
          </CardContent>
        </Card>

        {blockchain ? <BlockchainStatusCard status={blockchain} /> : null}
      </div>
    </>
  );
}
