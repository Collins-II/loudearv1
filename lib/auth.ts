import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import { connectToDatabase } from "@/lib/database";
import { User } from "@/lib/database/models/user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      stageName?: string | null;
      image?: string | null;
      genres?: string[];
      role?: "fan" | "artist" | "producer";
      location?: string | null;
      isNewUser?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    stageName?: string | null;
    genres?: string[];
    role?: "fan" | "artist" | "producer";
    location?: string | null;
    isNewUser?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [AppleProvider({
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [FacebookProvider({
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        })]
      : []),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXT_AUTH_SECRET,

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      if (account?.provider === "google" || account?.provider === "apple") {
        const providerProfile = profile as { email_verified?: boolean | string } | undefined;
        const emailVerified = providerProfile?.email_verified;
        if (emailVerified !== true && emailVerified !== "true") return false;
      }

      await connectToDatabase();

      const email = user.email.trim().toLowerCase();
      let dbUser = await User.findOne({ email });

      if (!dbUser) {
        dbUser = await User.create({
          name: user.name,
          email,
          image: user.image,
          role: "fan",
          isNewUser: true,
        });

        user.id = dbUser._id.toString();
        (user as any).isNewUser = true;
        (user as any).image = dbUser.image;
        (user as any).role = dbUser.role ?? "fan";
        (user as any).stageName = dbUser.stageName ?? null;
        (user as any).genres = dbUser.genres ?? [];
        (user as any).location = dbUser.location ?? null;
      } else {
        user.id = dbUser._id.toString();
        (user as any).isNewUser = dbUser.isNewUser === true;
        (user as any).image = dbUser.image;
        (user as any).role = dbUser.role ?? "fan";
        (user as any).stageName = dbUser.stageName ?? null;
        (user as any).genres = dbUser.genres ?? [];
        (user as any).location = dbUser.location ?? null;
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.name = user.name as string;
        token.email = user.email as string;
        token.image = user.image as string;
        token.role = (user as any).role ?? "fan";
        token.stageName = (user as any).stageName ?? null;
        token.genres = (user as any).genres ?? [];
        token.location = (user as any).location ?? null;
        token.isNewUser = (user as any).isNewUser ?? false;
      }

      if (trigger === "update" && token.id) {
        await connectToDatabase();
        const dbUser = await User.findById(token.id).lean();
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.image = dbUser.image;
          token.role = dbUser.role ?? "fan";
          token.stageName = dbUser.stageName ?? null;
          token.genres = dbUser.genres ?? [];
          token.location = dbUser.location ?? null;
          token.isNewUser = dbUser.isNewUser === true;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (!session.user) return session;

      session.user.id = token.id!;
      session.user.email = token.email ?? null;
      session.user.name = token.name ?? null;
      session.user.image = token.image ?? null;
      session.user.role = token.role ?? "fan";
      session.user.stageName = token.stageName ?? null;
      session.user.genres = token.genres ?? [];
      session.user.location = token.location ?? null;
      session.user.isNewUser = token.isNewUser ?? false;

      return session;
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },
};
