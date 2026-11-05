import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// On Render, BACKEND_URL is "host:port" (no scheme), so add one if missing
const rawBackend = (process.env.BACKEND_URL || "http://localhost:8000").trim();
const BACKEND_URL = /^https?:\/\//.test(rawBackend) ? rawBackend : `http://${rawBackend}`;

// Render provides the public URL; NextAuth needs it for callbacks
if (!process.env.NEXTAUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.NEXTAUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Step 2 of login. Step 1 (email + password) happens against the backend
    // /api/auth/login, which emails an OTP and returns a challenge id. The session
    // is only created once the emailed OTP is verified here.
    CredentialsProvider({
      name: "Email OTP",
      credentials: {
        challengeId: { label: "Challenge", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.challengeId || !credentials?.otp) return null;
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challenge_id: credentials.challengeId, otp: credentials.otp }),
          });
          if (!res.ok) return null;
          const u = await res.json();
          return { id: u.id, name: u.name, email: u.email, badge: u.badge_number } as never;
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one shift
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.badge = (user as { badge?: string }).badge;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { badge?: string }).badge = token.badge as string | undefined;
      return session;
    },
  },
  // Set NEXTAUTH_SECRET in frontend/.env.local; there is deliberately no fallback.
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
