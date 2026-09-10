import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

/**
 * The Solidity toolchain lives in this package alone.
 *
 * The Next.js application never imports from here, and `DEPLOYER_PRIVATE_KEY` is
 * read only by the deployment script — it is never bundled, never sent to the
 * browser, and is not needed to run the application.
 */
const config: HardhatUserConfig = {
  plugins: [hardhatViem, hardhatNodeTestRunner, hardhatNetworkHelpers],
  paths: {
    sources: "src",
    tests: { nodejs: "test" },
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    baseSepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
