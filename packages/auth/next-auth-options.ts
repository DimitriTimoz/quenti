import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "@quenti/prisma/client";

import { env } from "@quenti/env/server";
import { APP_URL } from "@quenti/lib/constants/url";
import { prisma } from "@quenti/prisma";

import pjson from "../../apps/next/package.json";
import { CustomPrismaAdapter } from "./prisma-adapter";

const version = pjson.version;

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    jwt: async ({ token, user }) => {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username || "";
        token.displayName = user.displayName || false;
        token.type = user.type;
        token.banned = !!user.bannedAt;
        token.flags = user.flags;
        token.completedOnboarding = user.completedOnboarding;
        token.organizationId = user.organizationId;
        token.isOrgEligible = user.isOrgEligible;
        token.lastUpdated = Date.now();
      }
      
      // Revalidate the token every 10 seconds
      const lastUpdated = token.lastUpdated as number | undefined;
      const shouldRevalidate = 
        !lastUpdated || 
        Date.now() - lastUpdated > 10 * 1000;
      
      if (shouldRevalidate && token.id) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string }
          });
          
          if (user) {
            token.username = user.username || "";
            token.displayName = user.displayName;
            token.type = user.type;
            token.banned = !!user.bannedAt;
            token.flags = user.flags;
            token.completedOnboarding = user.completedOnboarding;
            token.organizationId = user.organizationId;
            token.isOrgEligible = user.isOrgEligible;
            token.lastUpdated = Date.now();
          }
        } catch (error) {
          console.error("Error revalidating token", error);
        }
      }
      
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.displayName = token.displayName as boolean;
        session.user.type = token.type as any;
        session.user.banned = token.banned as boolean;
        session.user.flags = token.flags as number;
        session.user.completedOnboarding = token.completedOnboarding as boolean;
        session.user.organizationId = token.organizationId as string | null;
        session.user.isOrgEligible = token.isOrgEligible as boolean;

        session.version = version;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(APP_URL).hostname) return url;
      return baseUrl;
    },
    async signIn({ user }) {
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
  // JWT is required when using credentials provider
  session: {
    strategy: "jwt",
  },
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        let user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          // Create a new user if one doesn't exist
          const emailPrefix = credentials.email.split('@')[0];
          
          // Generate a unique username
          let uniqueUsername = emailPrefix;
          let counter = 1;
          
          // Check if username exists
          while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${emailPrefix}${counter}`;
            counter++;
          }
          
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: emailPrefix,
              username: uniqueUsername, 
              type: "Student", 
              displayName: true,
              completedOnboarding: false,
            }
          });
        }

        return user;
      }
    }),
  ],
};
