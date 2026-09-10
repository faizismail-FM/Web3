import {
  Building2,
  FileCheck2,
  Globe,
  Clock3,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { ProofPipeline } from "@/components/marketing/proof-pipeline";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    number: "01",
    title: "Upload",
    description:
      "Add a document to your workspace. The file is stored securely and stays private to your organization.",
  },
  {
    number: "02",
    title: "Register",
    description:
      "We compute a SHA-256 fingerprint and publish only that fingerprint, proving the document existed at that moment.",
  },
  {
    number: "03",
    title: "Verify",
    description:
      "Share a link or QR code. Anyone can confirm the document is authentic and has not been altered since.",
  },
];

const CAPABILITIES = [
  {
    icon: FileCheck2,
    title: "Document Integrity",
    description:
      "A single changed character produces a different fingerprint, so tampering is detected immediately.",
  },
  {
    icon: Clock3,
    title: "Blockchain Timestamping",
    description:
      "Each proof carries an independent, immutable timestamp that nobody — including us — can alter after the fact.",
  },
  {
    icon: QrCode,
    title: "QR Verification",
    description:
      "Print a QR code on the document itself. A phone camera is all a counterparty needs to check it.",
  },
  {
    icon: Building2,
    title: "Organization Management",
    description:
      "Invite your team with owner, admin, member and viewer roles. Documents never cross organization boundaries.",
  },
  {
    icon: Globe,
    title: "Public Verification",
    description:
      "Recipients verify without an account, a wallet, or any knowledge of blockchain technology.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description:
      "Document contents are never published. Only a one-way fingerprint leaves your workspace.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">
              Blockchain-backed document verification
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Verify. Prove. Trust.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Blockchain-backed document verification for businesses. Prove a
              document existed at a point in time and has not been modified —
              without ever publishing its contents.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">Start Verifying</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/verify">Verify a Document</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No wallet required. No crypto knowledge required.
            </p>
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section id="how-it-works" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Three steps, from a file on your desktop to a proof any counterparty
            can check for themselves.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <p className="tabular text-sm font-medium text-primary">
                  {step.number}
                </p>
                <h3 className="text-lg font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            What actually gets published
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your document never leaves your workspace. Only its fingerprint is
            anchored, which is enough to prove integrity and nothing else.
          </p>
          <div className="mt-12">
            <ProofPipeline />
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built for document-heavy businesses
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Bills of lading, invoices, certificates and contracts — anywhere a
            counterparty needs to trust a piece of paper.
          </p>

          <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title} className="space-y-3">
                <capability.icon
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                <h3 className="text-base font-medium">{capability.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-xl border bg-card px-8 py-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Start proving your documents are genuine
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Create a workspace, upload your first document, and share a
              verification link in minutes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">Start Verifying</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/verify">Verify a Document</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
