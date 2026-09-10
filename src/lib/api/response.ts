import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { rateLimit } from "@/lib/api/rate-limit";

/**
 * Every API route returns the same envelope so clients never have to guess at
 * the shape of a failure:
 *   success -> { data: ... }
 *   failure -> { error: { code, message, fields? } }
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
};

/** An error that is safe to surface to the user verbatim. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
    /** Extra response headers, e.g. `Retry-After` on a rate limit. */
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Applies a rate limit, throwing a 429 with `Retry-After` when exceeded.
 *
 * Used on endpoints that are unauthenticated, expensive, or both — where an
 * unbounded caller could burn CPU (bcrypt, hashing a 10 MB upload) or create
 * accounts in a loop.
 */
export function enforceRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): void {
  const result = rateLimit(key, options);
  if (result.allowed) return;

  throw new ApiError(
    "RATE_LIMITED",
    "Too many requests. Please wait a moment and try again.",
    undefined,
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiFailure(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
  headers?: HeadersInit,
) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status: STATUS_BY_CODE[code], headers },
  );
}

function fieldsFromZodError(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Wraps a route handler so that thrown errors become consistent JSON instead of
 * a framework stack trace. Unexpected errors are logged server-side and
 * reported to the client as a generic message.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiFailure(
          error.code,
          error.message,
          error.fields,
          error.headers,
        );
      }
      if (error instanceof ZodError) {
        return apiFailure(
          "BAD_REQUEST",
          "Some of the information provided is not valid.",
          fieldsFromZodError(error),
        );
      }

      console.error("[api] Unhandled error:", error);
      return apiFailure(
        "INTERNAL_ERROR",
        "Something went wrong on our end. Please try again.",
      );
    }
  };
}
