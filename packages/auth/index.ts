import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "./next-auth-options";

/**
 * Wrapper for unstable_getServerSession, used in trpc createContext and the
 * restricted API route
 *
 * Don't worry too much about the "unstable", it's safe to use but the syntax
 * may change in future versions
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */

export const getServerAuthSession = async (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  console.log("getServerAuthSession - Request Headers:", ctx.req.headers);
  console.log("getServerAuthSession - Cookies:", ctx.req.cookies);

  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  console.log("getServerAuthSession - Session Result:", {
    sessionExists: !!session,
    userExists: !!session?.user,
    sessionDetails: session,
  });

  return session;
};
