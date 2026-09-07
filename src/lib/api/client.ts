import type { ApiErrorBody } from "@/lib/api/response";

export type ApiClientError = {
  message: string;
  fields: Record<string, string>;
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/**
 * Calls a ProofChain API route and normalises both transport and application
 * failures into a single `{ data }` / `{ error }` result, so form components
 * never deal with raw responses or thrown network errors.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<{ data: T; error: null } | { data: null; error: ApiClientError }> {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    return {
      data: null,
      error: {
        message: "Could not reach the server. Check your connection and retry.",
        fields: {},
      },
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T }
    | ApiErrorBody
    | null;

  if (!response.ok) {
    const error = body && "error" in body ? body.error : null;
    return {
      data: null,
      error: {
        message: error?.message ?? GENERIC_MESSAGE,
        fields: error?.fields ?? {},
      },
    };
  }

  return { data: (body as { data: T }).data, error: null };
}
