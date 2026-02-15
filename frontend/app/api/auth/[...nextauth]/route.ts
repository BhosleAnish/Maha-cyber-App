import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 🚨 1. FORCE CLEAN THE ENVIRONMENT VARIABLES
// This strips out hidden \r, spaces, and quotes before NextAuth boots up
if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.replace(/["']/g, "").trim();
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    }),
  ],
  secret: (process.env.NEXTAUTH_SECRET || "fallback_dev_secret_123").trim(),
  debug: true,
  
  // 🚨 2. CUSTOM LOGGER TO CATCH THE EXACT ERROR
  logger: {
    error(code, metadata) {
      console.error(`🛑 NEXTAUTH FATAL ERROR: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ NEXTAUTH WARN: ${code}`);
    },
  },
});

export { handler as GET, handler as POST };