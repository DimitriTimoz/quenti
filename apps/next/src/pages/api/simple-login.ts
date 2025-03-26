import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@quenti/prisma';
import { SignJWT } from "jose";
import { env } from "@quenti/env/server";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer l'email depuis le corps de la requête ou des cookies
    let email = req.body.email;
    
    if (!email) {
      // Si l'email n'est pas dans le corps, vérifier les cookies
      const emailCookie = req.cookies['x-insa-auth-email'];
      if (emailCookie) {
        email = emailCookie;
      } else {
        // Générer un email aléatoire
        email = `user${Math.random().toString(36).substring(2, 15)}@insa.fr`;
      }
    }

    // Générer un username unique
    const uniqueId = Date.now().toString().slice(-6);
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const username = `${baseUsername}${uniqueId}`;

    // Créer ou mettre à jour l'utilisateur
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

    // Créer une session
    const session = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        username: user.username,
        type: user.type,
        banned: !!user.bannedAt,
        flags: user.flags,
        completedOnboarding: user.completedOnboarding,
        organizationId: user.organizationId,
        isOrgEligible: user.isOrgEligible,
      },
      version: "dev",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    // Signer le token JWT
    const token = await new SignJWT(session)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode(env.NEXTAUTH_SECRET));

    // Définir le cookie
    res.setHeader("Set-Cookie", [
      serialize("next-auth.session-token", token, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      }),
      serialize("x-insa-auth-email", email, {
        path: "/",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      })
    ]);

    return res.status(200).json({ 
      success: true, 
      user,
      email,
      message: "Authentification réussie"
    });
  } catch (error) {
    console.error('Error in simple-login:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
} 