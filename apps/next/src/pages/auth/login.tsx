import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { Box, Button, Container, Heading, Spinner, Text, VStack, useToast } from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import { PageWrapper } from "../../common/page-wrapper";

export default function Login() {
  const router = useRouter()
  const { from } = router.query
  const toast = useToast()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Effet pour l'initialisation
  useEffect(() => {
    if (status !== 'loading') {
      setIsInitialized(true)
    }
  }, [status])

  const navigateToLoadPage = useCallback((destination: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    const loadPageUrl = `/load?to=${encodeURIComponent(destination)}`;
    router.push(loadPageUrl).catch(console.error);
  }, [router, isNavigating]);

  // Effet pour la redirection si authentifié
  useEffect(() => {
    if (!isInitialized || status !== 'authenticated' || !session?.user || isNavigating) return;

    console.log('Session authentifiée, redirection vers la page de chargement')
    const destination = typeof from === 'string' ? from : '/home';
    navigateToLoadPage(destination);
  }, [status, session, from, isInitialized, isNavigating, navigateToLoadPage])

  // Effet pour la vérification du cookie
  useEffect(() => {
    if (!isInitialized || status !== 'unauthenticated' || isNavigating) return;

    const email = document.cookie.split('; ').find(row => row.startsWith('x-insa-auth-email='))?.split('=')[1]
    console.log('Cookie x-insa-auth-email:', email)

    if (email) {
      console.log('Cookie email trouvé, tentative de connexion avec API simplifiée')
      handleSimpleLogin();
    }
  }, [status, isInitialized, isNavigating])

  const handleSimpleLogin = async (customEmail?: string) => {
    if (isLoading || isNavigating) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: customEmail ? JSON.stringify({ email: customEmail }) : JSON.stringify({}),
      });

      const data = await response.json();
      console.log('Résultat de simple-login:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la connexion');
      }

      // Rediriger vers la page de chargement
      const destination = typeof from === 'string' ? from : '/home';
      navigateToLoadPage(destination);
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    }
  }

  const handleLogin = () => {
    if (isLoading || isNavigating) return;
    const email = `user${Math.random().toString(36).substring(2, 15)}@insa.fr`;
    console.log('Tentative de connexion avec:', email);
    handleSimpleLogin(email);
  }

  const handleLogout = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    signOut({ redirect: false })
      .then(() => {
        // Supprimer le cookie d'email
        document.cookie = 'x-insa-auth-email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth/login').catch(console.error);
      })
      .catch((error) => {
        console.error('Erreur lors de la déconnexion:', error);
        setIsNavigating(false);
      });
  }

  if (!isInitialized || isLoading || isNavigating) {
    return (
      <Container maxW="container.sm" py={10}>
        <VStack spacing={8}>
          <Heading>Chargement...</Heading>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          <Text>Veuillez patienter...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8}>
        <Heading>Connexion</Heading>
        {session ? (
          <Box>
            <Text mb={4}>Connecté en tant que {session.user?.email}</Text>
            <Button colorScheme="red" onClick={handleLogout} isLoading={isNavigating}>
              Se déconnecter
            </Button>
          </Box>
        ) : (
          <Button colorScheme="blue" onClick={handleLogin} isLoading={isLoading}>
            Se connecter avec un email INSA
          </Button>
        )}
      </VStack>
    </Container>
  )
}

Login.PageWrapper = PageWrapper;
