import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Text, VStack, useToast } from '@chakra-ui/react';
import { signOut, useSession } from 'next-auth/react';
import { PageWrapper } from "../common/page-wrapper";

export default function CompleteProfile() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'loading') {
    return <Container maxW="container.sm" py={10}><Text>Chargement...</Text></Container>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: 'Profil mis à jour',
        description: 'Votre profil a été mis à jour avec succès.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Rediriger vers la page d'accueil
      router.push('/home');
    } catch (error: unknown) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    signOut({ redirect: false })
      .then(() => {
        // Supprimer le cookie d'email
        document.cookie = 'x-insa-auth-email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth/login');
      });
  };

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8}>
        <Heading>Compléter votre profil</Heading>
        <Text>
          Bienvenue {session?.user?.email}! Pour continuer, veuillez choisir un nom d'utilisateur.
        </Text>

        <Box as="form" onSubmit={handleSubmit} w="full">
          <FormControl id="username" isRequired>
            <FormLabel>Nom d'utilisateur</FormLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choisissez un nom d'utilisateur"
            />
          </FormControl>

          <Button
            mt={4}
            colorScheme="blue"
            type="submit"
            isLoading={isSubmitting}
            w="full"
          >
            Enregistrer
          </Button>
        </Box>

        <Button variant="ghost" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </VStack>
    </Container>
  );
}

CompleteProfile.PageWrapper = PageWrapper; 