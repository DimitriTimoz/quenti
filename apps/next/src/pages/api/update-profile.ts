import { NextApiRequest, NextApiResponse } from 'next';
import { getServerAuthSession } from '@quenti/auth';
import { prisma } from '@quenti/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier si l'utilisateur est authentifié
    const session = await getServerAuthSession({ req, res });

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Vérifier si le username est déjà pris
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Mettre à jour le profil de l'utilisateur
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        completedOnboarding: true,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
} 