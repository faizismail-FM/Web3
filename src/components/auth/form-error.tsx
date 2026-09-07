import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Alert
      variant="destructive"
      className="border-destructive/30 bg-destructive-muted text-destructive-muted-foreground"
    >
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
