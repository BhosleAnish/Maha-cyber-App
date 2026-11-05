import { withAuth } from "next-auth/middleware";

// This explicit export stops the Next.js compiler from throwing function errors
export default withAuth;

export const config = {
  // Protects all pages except /login, the /backend API proxy, static files and APIs
  matcher: ["/((?!api|backend|login|_next/static|_next/image|favicon.ico).*)"]
};
