import { NextApiRequest, NextApiResponse } from 'next';
import { getServerAuthSession } from '@quenti/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Log des headers pour le débogage
    console.log('Headers reçus:', req.headers);
    
    // Récupérer la session
    const session = await getServerAuthSession({ req, res });
    
    // Log des cookies pour le débogage
    console.log('Cookies dans /api/test-auth:', req.cookies);
    
    // Vérifier si nous avons un cookie de session
    const hasSessionCookie = !!req.cookies['next-auth.session-token'];
    const hasEmailCookie = !!req.cookies['x-insa-auth-email'];
    
    // Répondre avec l'état de l'authentification
    return res.status(200).json({
      authenticated: !!session?.user,
      session,
      cookies: {
        all: req.cookies,
        hasSessionCookie,
        hasEmailCookie,
      },
      headers: {
        cookie: req.headers.cookie,
        authorization: req.headers.authorization,
      }
    });
  } catch (error) {
    console.error('Error in test-auth:', error);
    return res.status(500).json({ 
      error: 'Failed to test authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 