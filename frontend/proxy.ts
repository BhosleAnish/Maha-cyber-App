import { withAuth } from "next-auth/middleware";

// This explicit export stops the Next.js compiler from throwing function errors
export default withAuth;

export const config = {
  // Protects all pages except static files and APIs
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};