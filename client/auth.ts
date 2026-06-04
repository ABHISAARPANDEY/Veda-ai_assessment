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
        return {
          id: data.user._id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.avatarUrl || null,
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
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as any).backendToken;
        token.school = (user as any).school;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).backendToken = token.backendToken;
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).school = token.school;
      }
      return session;
    },
  },
});
