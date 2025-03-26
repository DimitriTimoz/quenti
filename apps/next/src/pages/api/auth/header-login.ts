import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@quenti/prisma'
import { SignJWT } from 'jose'
import { env } from '@quenti/env/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = req.headers['x-insa-auth-email']

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing x-insa-auth-email header' })
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          emailVerified: new Date(),
        },
      })
    }

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
      version: 'dev',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }

    const token = await new SignJWT(session)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(new TextEncoder().encode(env.NEXTAUTH_SECRET))

    res.setHeader(
      'Set-Cookie',
      `next-auth.session-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    )

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in header-login:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 