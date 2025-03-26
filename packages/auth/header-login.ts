import { serialize } from "cookie";
import { prisma } from "@quenti/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { env } from "@quenti/env/server";
import { authOptions } from "./next-auth-options";
import { SignJWT } from "jose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = req.headers["x-insa-auth-email"];

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Missing x-insa-auth-email header" });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const uniqueId = Date.now().toString().slice(-6);
      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = `${baseUsername}${uniqueId}`;

      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          username,
          emailVerified: new Date(),
          completedOnboarding: true,
        },
      });
    }

    // Créer un token JWT compatible avec NextAuth
    const token = {
      name: user.name,
      email: user.email,
      picture: user.image,
      sub: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        displayName: user.displayName,
        username: user.username,
        type: user.type,
        banned: !!user.bannedAt,
        flags: user.flags,
        completedOnboarding: user.completedOnboarding,
        organizationId: user.organizationId,
        isOrgEligible: user.isOrgEligible,
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    // Signer le token avec le secret NextAuth
    const signedToken = await new SignJWT(token)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .setSubject(user.id)
      .sign(new TextEncoder().encode(env.NEXTAUTH_SECRET));

    // Définir les cookies de session
    res.setHeader("Set-Cookie", [
      serialize("next-auth.session-token", signedToken, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      }),
      serialize("x-insa-auth-email", email, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      }),
    ]);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        type: user.type,
        banned: !!user.bannedAt,
        flags: user.flags,
        completedOnboarding: user.completedOnboarding,
        organizationId: user.organizationId,
        isOrgEligible: user.isOrgEligible,
      },
      message: "Authentification réussie",
    });
  } catch (error) {
    console.error("Error in header-login:", error);
    return res.status(500).json({ error: "Failed to authenticate user" });
  }
}
