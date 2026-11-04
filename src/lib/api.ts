import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BookingError } from "./errors";
import { firstIssue } from "./validators";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BookingError("INVALID", "The request could not be read. Reload the page and try again.");
  }
}

/** Blocks cross-site form posts: the Origin header, when present, must match this site. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new Error("mismatch");
  } catch {
    throw new BookingError("FORBIDDEN", "This request was blocked.");
  }
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: same-origin check on writes, friendly JSON errors, no stack traces to the client. */
export function route<P = Record<string, never>>(handler: (req: Request, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof BookingError) return json({ error: err.message, code: err.code, ...err.extra }, err.status);
      if (err instanceof ZodError) return json({ error: firstIssue(err), code: "INVALID" }, 400);
      console.error("[api]", req.method, new URL(req.url).pathname, err);
      return json({ error: "Something went wrong on our side. Please try again in a moment.", code: "SERVER" }, 500);
    }
  };
}
