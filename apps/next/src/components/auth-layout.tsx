import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import { z } from "zod";

import { Link } from "@quenti/components";
import { HeadSeo } from "@quenti/components/head-seo";

import {
  Alert,
  AlertIcon,
  Box,
  Center,
  Container,
  Fade,
  Flex,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

import { Logo } from "../../../../packages/components/logo";
import { LazyWrapper } from "../common/lazy-wrapper";
import { useTelemetry } from "../lib/telemetry";
import { getSafeRedirectUrl } from "../lib/urls";
import { Loading } from "./loading";

export interface AuthLayoutProps {
  mode: "login" | "signup";
  onUserExists: (callbackUrl: string) => void;
  autoLoginInProgress?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  mode,
  onUserExists,
  autoLoginInProgress = false,
}) => {
  const router = useRouter();
  const { event } = useTelemetry();
  const { status, data: session } = useSession();
  const callbackUrl =
    typeof router.query.callbackUrl == "string"
      ? router.query.callbackUrl
      : "/home";
  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  const loading = status === "loading" || session?.user;

  const calculateMargin = () => {
    const vh = window.innerHeight;
    const margin = vh / 2 - 200;
    return margin;
  };

  React.useEffect(() => {
    if (typeof window == "undefined") return;
    setMargin(calculateMargin());

    const handleResize = () => {
      setMargin(calculateMargin());
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const [margin, setMargin] = React.useState(0);

  const gradient = useColorModeValue(
    "linear(to-t, gray.50, blue.300)",
    "linear(to-t, gray.1000, blue.300)",
  );
  const gradientOpacity = useColorModeValue("0.3", "0.1");
  const termsColor = useColorModeValue("gray.400", "gray.600");

  // Si l'auto-login est en cours, ne pas afficher le formulaire
  if (autoLoginInProgress) {
    return null;
  }

  return (
    <>
      <HeadSeo title={mode == "login" ? "Log in" : "Sign up"} />
      <LazyWrapper>
        <Center h="100vh" w="full" position="relative">
          <Fade
            in
            transition={{
              enter: {
                duration: 1.5,
                delay: 0.2,
                ease: "easeOut",
              },
            }}
          >
            <Box
              position="absolute"
              top="0"
              left="0"
              w="full"
              h="50vh"
              opacity={gradientOpacity}
              bgGradient={gradient}
            />
          </Fade>
          {!loading ? (
            <Flex h="100vh" w="full" position="relative" pt={`${margin}px`}>
              <Container w="sm" zIndex={10}>
                <Fade
                  in
                  initial={{
                    opacity: -1,
                    transform: "translateY(-16px)",
                  }}
                  animate={{
                    opacity: 1,
                    transform: "translateY(0)",
                    transition: {
                      delay: 0.1,
                      duration: 0.3,
                      ease: "easeOut",
                    },
                  }}
                >
                  <VStack spacing="8">
                    <Logo width={24} height={24} />
                    <Heading fontSize="24px" textAlign="center">
                      {mode == "signup"
                        ? "Create your Quenti account"
                        : "Login to Quenti"}
                    </Heading>
                    <Alert status="info" rounded="md">
                      <AlertIcon />
                      <VStack align="start" spacing={2}>
                        <Text>
                          L'authentification par formulaire est désactivée. La
                          connexion se fait automatiquement via le CAS INSA
                          Rouen.
                        </Text>
                        <Text fontSize="sm">
                          Erreur contacter les administrateurs. Contact
                          disponibles sur{" "}
                          <Link href="https://insa.lol">insa.lol</Link>
                        </Text>
                      </VStack>
                    </Alert>
                  </VStack>
                </Fade>
              </Container>
            </Flex>
          ) : (
            <Loading />
          )}
        </Center>
      </LazyWrapper>
    </>
  );
};
