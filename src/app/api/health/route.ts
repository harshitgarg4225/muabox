import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight liveness probe for uptime monitoring / load balancers. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "muabox",
    time: new Date().toISOString(),
  });
}
