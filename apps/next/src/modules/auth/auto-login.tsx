import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

interface AutoLoginProps {
  onComplete?: () => void;
}

export const AutoLogin = ({ onComplete }: AutoLoginProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Tenter de se connecter - les headers seront transmis automatiquement à la requête
        const result = await signIn("credentials", {
          redirect: false,
        });

        if (result?.ok) {
          // Redirection vers la page demandée ou la page d'accueil
          const callbackUrl = (router.query.callbackUrl as string) || "/home";
          window.location.href = callbackUrl;
        } else {
          // Si la connexion échoue, on affiche un message d'erreur spécifique
          setError(
            "Authentification échouée. Vérifiez que les headers x-insa-auth-email et x-insa-auth-uid sont correctement définis.",
          );
          setIsLoading(false);
          if (onComplete) onComplete();
        }
      } catch (err) {
        console.error("Auto-login failed:", err);
        setError(
          "Une erreur est survenue lors de la tentative d'authentification automatique.",
        );
        setIsLoading(false);
        if (onComplete) onComplete();
      }
    };

    autoLogin();
  }, [router, onComplete]);

  if (isLoading) {
    return (
      <Center p={8}>
        <VStack spacing={4}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          <Text>Authentification in progress...</Text>
          <Text fontSize="sm" color="gray.500">
            Login in... Please wait...
          </Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert status="error" variant="solid" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">Authentification impossible</Text>
            <Text>{error}</Text>
          </VStack>
        </Alert>
      </Box>
    );
  }

  return null;
};
