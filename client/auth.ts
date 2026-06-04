import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        if (!creds?.email || !creds?.password) return null;
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: creds.email, password: creds.password }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          token: string;
          user: { _id: string; email: string; name: string; avatarUrl: string; school: string };
        };
        // CRITICAL: never put the avatarUrl directly into session — it's a
        // base64 data URL (potentially MBs). The session JWT lives in a cookie
        // and Vercel rejects requests with headers >8KB. Instead, store a tiny
        // HTTP URL pointing at the public avatar endpoint.
        const image = data.user.avatarUrl
          ? `${API}/api/users/${data.user._id}/avatar`
          : null;
        return {
          id: data.user._id,
          email: data.user.email,
          name: data.user.name,
          image,
          // Stash the backend JWT on the user object so it's available in callbacks
          backendToken: data.token,
          school: data.user.school,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: stash backend token + school on the JWT
      if (user) {
        token.backendToken = (user as any).backendToken;
        token.school = (user as any).school;
      }
      // session.update({ user: {...} }) was called — merge new fields into JWT
      // so the layout/sidebar/topbar reflect the change immediately without
      // any round-trip to the backend.
      if (trigger === "update" && session?.user) {
        const u = session.user as {
          name?: string | null;
          image?: string | null;
          school?: string | null;
        };
        if (typeof u.name === "string") token.name = u.name;
        // Reject anything that smells like a base64 data URL — those would
        // balloon the cookie past Vercel's header limit.
        if (typeof u.image === "string" && !u.image.startsWith("data:")) {
          token.picture = u.image;
        } else if (u.image === null) {
          token.picture = undefined;
        }
        if (typeof u.school === "string") token.school = u.school;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).backendToken = token.backendToken;
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).school = token.school;
        // NextAuth populates name/email/image from token.* automatically,
        // so the update above is reflected here.
      }
      return session;
    },
  },
});
