import { network } from "hardhat";

/**
 * Deploys ProofChainRegistry.
 *
 * The deployer becomes the contract owner, which grants exactly one power:
 * pausing new registrations. Ownership cannot alter or delete a proof that has
 * already been recorded.
 *
 * Usage:
 *   npm run deploy:baseSepolia
 *
 * Requires DEPLOYER_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL in the environment.
 * The private key is used here and nowhere else — the web application never
 * reads it.
 */
async function main() {
  const networkName = process.env.HARDHAT_NETWORK ?? "default";
  const { viem } = await network.getOrCreate(networkName);

  const [deployer] = await viem.getWalletClients();
  if (!deployer) {
    throw new Error(
      "No account available. Set DEPLOYER_PRIVATE_KEY before deploying.",
    );
  }

  const publicClient = await viem.getPublicClient();
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });

  console.log(`Network:  ${networkName}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Balance:  ${balance} wei`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has no balance. Fund it from a Base Sepolia faucet first.",
    );
  }

  const registry = await viem.deployContract("ProofChainRegistry", [
    deployer.account.address,
  ]);

  console.log("");
  console.log(`ProofChainRegistry deployed at ${registry.address}`);
  console.log("");
  console.log("Add these to the application's .env:");
  console.log(`  CONTRACT_ADDRESS="${registry.address}"`);
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS="${registry.address}"`);
  console.log(`  BLOCKCHAIN_MODE="real"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
