import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import arcjet, { shield } from "@arcjet/next";
import { NextResponse } from "next/server";

const protectedRoute = createRouteMatcher([
  "/workspace/:path*",
  "/meeting/:path*",
  "/meeting",
]);

const API_KEY: string = process.env.NEXT_PUBLIC_ARCJET_KEY!;

const aj = arcjet({
  key: API_KEY,
  rules: [
    shield({
      mode: "LIVE",
    }),
  ],
});

const isAdminRoute = createRouteMatcher(["/admin/:path*"]);

export default clerkMiddleware(async (auth, req) => {
  const check = await aj.protect(req);

  if (check.isDenied()) {
    return NextResponse.json("Rate limit exceeded", { status: 403 });
  }

  if (
    isAdminRoute(req) &&
    (await auth()).sessionClaims?.metadata?.role !== "admin"
  ) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  if (protectedRoute(req)) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
