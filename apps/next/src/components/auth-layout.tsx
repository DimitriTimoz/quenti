import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { Link } from "@quenti/components";
import { HeadSeo } from "@quenti/components/head-seo";
import { WEBSITE_URL } from "@quenti/lib/constants/url";

import {
  Box,
  Button,
  Center,
  Container,
  Fade,
  Flex,
  FormControl,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  useColorModeValue,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

import { Logo } from "../../../../packages/components/logo";
import { LazyWrapper } from "../common/lazy-wrapper";
import { useTelemetry } from "../lib/telemetry";
import { getSafeRedirectUrl } from "../lib/urls";
import { Loading } from "./loading";

export interface AuthLayoutProps {
  mode: "login" | "signup";
  onUserExists: (callbackUrl: string) => void;
}

interface EmailFormInputs {
  email: string;
}

const schema = z.object({
  email: z.string().email(),
});

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  mode,
  onUserExists,
}) => {
  const router = useRouter();
  const { event } = useTelemetry();
  const { status, data: session } = useSession();
  const callbackUrl =
    typeof router.query.callbackUrl == "string"
      ? router.query.callbackUrl
      : "/home";
  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  const loading = status === "loading";

  const emailMethods = useForm<EmailFormInputs>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });
  const {
    formState: { errors },
  } = emailMethods;

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
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit: SubmitHandler<EmailFormInputs> = async (data) => {
    setIsLoading(true);
    setError(null);
    
    const result = await signIn("credentials", {
      email: data.email,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email address");
      setIsLoading(false);
    } else if (result?.ok) {
      // Direct redirection without waiting for session
      window.location.href = safeCallbackUrl;
    }
  };

  const verb = mode == "signup" ? "up" : "in";
  const gradient = useColorModeValue(
    "linear(to-t, gray.50, blue.300)",
    "linear(to-t, gray.1000, blue.300)",
  );
  const gradientOpacity = useColorModeValue("0.3", "0.1");
  const termsColor = useColorModeValue("gray.400", "gray.600");

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
                        : "Welcome back"}
                    </Heading>
                    <form
                      style={{
                        width: "100%",
                      }}
                      onSubmit={emailMethods.handleSubmit(onSubmit)}
                    >
                      <Stack spacing="3" w="full">
                        {error && (
                          <Alert status="error" size="sm" rounded="md">
                            <AlertIcon />
                            {error}
                          </Alert>
                        )}
                        <Controller
                          name="email"
                          control={emailMethods.control}
                          render={({ field }) => (
                            <FormControl isInvalid={!!errors.email}>
                              <Input
                                {...field}
                                mt="2"
                                minH="40px"
                                placeholder="Enter your email address"
                                fontSize="sm"
                                borderColor="gray.300"
                                _dark={{
                                  borderColor: "gray.600",
                                }}
                              />
                              {errors.email && (
                                <Text color="red.500" fontSize="sm" mt={1}>
                                  {errors.email.message}
                                </Text>
                              )}
                            </FormControl>
                          )}
                        />
                        <Button
                          w="full"
                          size="lg"
                          fontSize="sm"
                          type="submit"
                          isLoading={isLoading}
                        >
                          Sign {verb} with email
                        </Button>
                      </Stack>
                    </form>
                    {mode == "signup" && (
                      <Text
                        textAlign="center"
                        fontSize="xs"
                        color={termsColor}
                        maxW="260px"
                        mt="-4"
                      >
                        By signing up, you agree to the{" "}
                        <Link
                          href={`${WEBSITE_URL}/terms`}
                          _hover={{
                            textDecoration: "underline",
                          }}
                        >
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link
                          href={`${WEBSITE_URL}/privacy`}
                          _hover={{
                            textDecoration: "underline",
                          }}
                        >
                          Terms of Service
                        </Link>
                        .
                      </Text>
                    )}
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
