import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtVerify } from "jose";
import { type JWT } from "next-auth/jwt";
import jsonwebtoken from "jsonwebtoken";
import { SignJWT } from "jose";

import { env } from "@quenti/env/server";
import { APP_URL } from "@quenti/lib/constants/url";
import { prisma } from "@quenti/prisma";
import { type UserType } from "@prisma/client";

import pjson from "../../apps/next/package.json";
import { CustomPrismaAdapter } from "./prisma-adapter";

const version = pjson.version;

interface ExtendedToken extends JWT {
  user?: {
    id: string;
    name: string | null;
    username: string;
    type: UserType;
    displayName: boolean;
    banned: boolean;
    flags: number;
    completedOnboarding: boolean;
    organizationId: string | null;
    isOrgEligible: boolean;
  };
  version?: string;
  sessionToken?: string;
}

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    async session({ session, token }) {
      console.log("NextAuth session callback:", { session, token });
      const extendedToken = token as ExtendedToken;
      if (extendedToken.user) {
        session.user = extendedToken.user;
        session.version = extendedToken.version || version;
      }
      return session;
    },
    async jwt({ token, user }) {
      console.log("NextAuth jwt callback:", { token, user });
      if (user) {
        token.user = user;
        token.version = version;
      }
      return token;
    },
    redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(APP_URL).hostname) return url;
      return baseUrl;
    },
    async signIn({ user }) {
      console.log("NextAuth signIn callback:", { user });
      if (env.ENABLE_EMAIL_WHITELIST === "true") {
        if (
          !(await prisma.whitelistedEmail.findUnique({
            where: {
              email: user.email!,
            },
          }))
        )
          return "/unauthorized";
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/",
    newUser: "/onboarding",
    error: "/auth/error",
  },
  // Configure one or more authentication providers
  adapter: CustomPrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    encode: async ({ secret, token }) => {
      if (!token) return "";
      const encodedToken = await new SignJWT(token as any)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(new TextEncoder().encode(secret));
      return encodedToken;
    },
    decode: async ({ secret, token }) => {
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        return payload as JWT;
      } catch (error) {
        console.error("JWT decode error:", error);
        return null;
      }
    },
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials?.email;
        if (!email) {
          throw new Error("Missing email");
        }

        try {
          const uniqueId = Date.now().toString().slice(-6);
          const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          const username = `${baseUsername}${uniqueId}`;
          
          const user = await prisma.user.upsert({
            where: { email },
            update: {
              username,
              completedOnboarding: true,
            },
            create: {
              email,
              name: email.split("@")[0],
              username,
              emailVerified: new Date(),
              completedOnboarding: true,
            },
          });

          if (!user) {
            throw new Error("Failed to create or update user");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null,
            displayName: user.displayName,
            username: user.username,
            type: user.type,
            banned: !!user.bannedAt,
            bannedAt: user.bannedAt,
            flags: user.flags,
            completedOnboarding: user.completedOnboarding,
            organizationId: user.organizationId,
            isOrgEligible: user.isOrgEligible,
          };
        } catch (error) {
          console.error('Error in authorize:', error);
          throw new Error("Failed to authenticate user");
        }
      }
    }),
  ],
  debug: process.env.NODE_ENV === "development",
};
