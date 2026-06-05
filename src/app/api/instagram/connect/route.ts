import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { buildAuthorizeUrl } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/**
 * Kicks off the Instagram OAuth flow. Sets a CSRF `state` cookie that the
 * callback verifies.
 */
export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
