import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, the service worker, the manifest, icons and the offline page.
    "/((?!_next/static|_next/image|sw\.js|manifest\.webmanifest|icons/|offline|favicon\.ico|icon\.svg|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
