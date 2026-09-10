"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

/**
 * Creates the blockchain proof for a document.
 *
 * The label says "Create blockchain proof", never "submit transaction": the
 * user is doing something to their document, not operating a wallet.
 */
export function RegisterProofButton({
  documentId,
  disabled = false,
  retry = false,
}: {
  documentId: string;
  disabled?: boolean;
  retry?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function register() {
    setPending(true);
    const { error } = await apiFetch(`/api/documents/${documentId}/register`, {
      method: "POST",
    });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Blockchain proof created");
    router.refresh();
  }

  return (
    <Button onClick={register} disabled={pending || disabled}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Creating proof
        </>
      ) : (
        <>
          <ShieldCheck className="size-4" aria-hidden="true" />
          {retry ? "Try again" : "Create blockchain proof"}
        </>
      )}
    </Button>
  );
}
