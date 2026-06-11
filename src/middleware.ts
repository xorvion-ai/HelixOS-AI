// Auth middleware (App Router).
//
// OPTIONAL: when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are unset the app is in
// demo mode and this is a pass-through — /dashboard stays open, no login.
// When configured, it refreshes the Supabase session cookie and redirects
// unauthenticated visitors away from /dashboard to /login.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ENABLED = Boolean(URL && ANON);

const PROTECTED = ["/dashboard"];

export async function middleware(request: NextRequest) {
  if (!ENABLED) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(URL!, ANON!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session if expired and revalidates the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on app routes, skip Next internals + static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
