import { DocumentStatus, RegistrationStatus } from "@prisma/client";

import { BASE_SEPOLIA } from "@/lib/blockchain/networks";
import { getContractAddress, getPublicClient } from "@/lib/blockchain/client";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  total: number;
  registered: number;
  verified: number;
  pending: number;
  failed: number;
};

/**
 * Counts for the dashboard tiles.
 *
 * `registered` counts documents whose proof exists, whether or not anyone has
 * checked it yet — a verified document is still a registered one, and showing
 * the count dropping when a customer verifies a document would be nonsense.
 */
export async function getDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const [total, registered, verified, pending, failed] = await Promise.all([
    prisma.document.count({ where: { organizationId } }),
    prisma.document.count({
      where: {
        organizationId,
        status: { in: [DocumentStatus.REGISTERED, DocumentStatus.VERIFIED] },
      },
    }),
    prisma.document.count({
      where: { organizationId, status: DocumentStatus.VERIFIED },
    }),
    prisma.document.count({
      where: { organizationId, status: DocumentStatus.PENDING },
    }),
    prisma.document.count({
      where: { organizationId, status: DocumentStatus.FAILED },
    }),
  ]);

  return { total, registered, verified, pending, failed };
}

export type BlockchainStatus = {
  mode: "mock" | "real";
  networkName: string;
  /** `connected` only when the chain actually answered. */
  connection: "simulated" | "connected" | "unreachable" | "unconfigured";
  contractAddress: string | null;
  blockNumber: string | null;
  proofsRecorded: number;
};

/**
 * The blockchain status card.
 *
 * In real mode the RPC endpoint is actually queried rather than assumed
 * reachable: "Connected" has to mean the chain answered, or the card is
 * decoration.
 */
export async function getBlockchainStatus(
  organizationId: string,
): Promise<BlockchainStatus> {
  const env = getServerEnv();

  const proofsRecorded = await prisma.blockchainRegistration.count({
    where: {
      status: RegistrationStatus.CONFIRMED,
      document: { organizationId },
    },
  });

  if (env.BLOCKCHAIN_MODE !== "real") {
    return {
      mode: "mock",
      networkName: BASE_SEPOLIA.name,
      connection: "simulated",
      contractAddress: null,
      blockNumber: null,
      proofsRecorded,
    };
  }

  try {
    const client = getPublicClient();
    const blockNumber = await client.getBlockNumber();

    return {
      mode: "real",
      networkName: BASE_SEPOLIA.name,
      connection: "connected",
      contractAddress: getContractAddress(),
      blockNumber: blockNumber.toString(),
      proofsRecorded,
    };
  } catch (error) {
    // A misconfigured or unreachable node must show as a problem, not as a
    // blank card that looks like everything is fine.
    console.error("[dashboard] Chain unreachable:", error);
    return {
      mode: "real",
      networkName: BASE_SEPOLIA.name,
      connection: env.CONTRACT_ADDRESS ? "unreachable" : "unconfigured",
      contractAddress: env.CONTRACT_ADDRESS ?? null,
      blockNumber: null,
      proofsRecorded,
    };
  }
}

/** The most recent entries, for the dashboard's activity panel. */
export async function getRecentActivity(organizationId: string, take = 6) {
  return prisma.activityLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      user: { select: { name: true } },
      document: { select: { id: true, filename: true } },
    },
  });
}
