"use client";

import { Loader2, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TARGET_CHAIN } from "@/lib/blockchain/wagmi";
import { truncateHex } from "@/lib/format";

/**
 * Wallet connection, worded for people who have never used one.
 *
 * Copy avoids provider jargon: "Connect a wallet to create a blockchain proof",
 * not "wallet provider unavailable".
 */
export function WalletConnect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== TARGET_CHAIN.id;

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              disabled={isPending}
              onClick={() => connect({ connector })}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wallet className="size-4" aria-hidden="true" />
              )}
              {connector.name}
            </Button>
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            Wallet connection failed. Please make sure your wallet is unlocked
            and try again.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connect a wallet to create a blockchain proof. Your documents stay
            private — the wallet only signs the fingerprint.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Wallet className="size-4" aria-hidden="true" />
              <span className="hash-text">{truncateHex(address ?? "", 6, 4)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="font-normal">
              <p className="hash-text text-xs break-all">{address}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => disconnect()}>
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-muted-foreground">
          {wrongNetwork ? "Connected to the wrong network" : TARGET_CHAIN.name}
        </span>
      </div>

      {wrongNetwork ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">
            Your wallet is on a different network. Switch to{" "}
            {TARGET_CHAIN.name} to continue.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
          >
            {isSwitching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Switch to {TARGET_CHAIN.name}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
