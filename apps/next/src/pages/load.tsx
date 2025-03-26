import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Container, Heading, Spinner, Text, VStack, Code } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { PageWrapper } from "../common/page-wrapper";

export default function LoadingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [countdown, setCountdown] = useState(5);
  const destination = router.query.to as string || '/home';
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    session: any;
    cookies: any;
    headers: any;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/test-auth");
        const data = await res.json();
        console.log("Test Auth API response:", data);
        setAuthStatus(data);

        if (!data.authenticated && retryCount < MAX_RETRIES) {
          console.log(`Tentative de reconnexion ${retryCount + 1}/${MAX_RETRIES}`);
          const email = document.cookie
            .split("; ")
            .find((row) => row.startsWith("x-insa-auth-email="))
            ?.split("=")[1];

          if (email) {
            const res = await fetch("/api/simple-login", {
              method: "POST",
              headers: {
                "x-insa-auth-email": decodeURIComponent(email),
              },
            });
            const loginData = await res.json();
            console.log("Résultat de simple-login:", loginData);
          }

          setRetryCount(retryCount + 1);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
          if (authStatus?.authenticated) {
            router.push(callbackUrl || "/");
          } else if (retryCount >= MAX_RETRIES) {
            router.push("/auth/login");
          }
        }
        return prev - 1;
      });
    }, 1000);

    // Vérifier l'authentification toutes les 2.5 secondes
    const authTimer = setInterval(checkAuth, 2500);

    // Première vérification immédiate
    checkAuth();

    return () => {
      clearInterval(timer);
      clearInterval(authTimer);
    };
  }, [router, authStatus?.authenticated, retryCount]);

  const getStatusMessage = () => {
    if (!authStatus) return "Vérification de l'authentification...";
    if (authStatus.authenticated) return "Authentifié avec succès !";
    if (retryCount >= MAX_RETRIES) return "Échec de l'authentification";
    return `Tentative de reconnexion ${retryCount + 1}/${MAX_RETRIES}...`;
  };

  // Debug info
  const debugInfo = JSON.stringify({
    session: session ? {
      user: {
        email: session.user?.email,
        username: session.user?.username,
        id: session.user?.id
      }
    } : null,
    authStatus,
    nextAuthStatus: status
  }, null, 2);

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8} align="center" justify="center" minH="60vh">
        <Heading textAlign="center">Chargement de votre espace</Heading>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
        <Text textAlign="center">
          {getStatusMessage()}
        </Text>
        <Text textAlign="center">Redirection dans {countdown} secondes...</Text>
        <Box py={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Préparation de votre espace de travail
          </Text>
        </Box>
        
        {/* Information de débogage */}
        <Box 
          mt={8} 
          p={4} 
          bg="gray.100" 
          borderRadius="md" 
          width="100%" 
          maxH="300px" 
          overflowY="auto"
          whiteSpace="pre-wrap"
          fontSize="xs"
          _dark={{ bg: "gray.700" }}
        >
          <Text fontWeight="bold" mb={2}>Informations de débogage :</Text>
          <Code display="block" whiteSpace="pre" p={2} overflowX="auto">
            {debugInfo}
          </Code>
        </Box>
      </VStack>
    </Container>
  );
}

LoadingPage.PageWrapper = PageWrapper; 