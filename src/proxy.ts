import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Only run on authenticated sections. Public pages (landing, login, privacy,
   * data-deletion status) never touch Supabase, so they stay up even if the
   * backend is misconfigured.
   */
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/discover/:path*",
    "/artists/:path*",
    "/deals/:path*",
  ],
};
