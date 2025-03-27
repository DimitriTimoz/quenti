import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";

import { APP_URL } from "@quenti/lib/constants/url";

export const useOnboardingRedirect = () => {
  const { data: session, status } = useSession();
  const isLoading = status == "loading";
  const router = useRouter();

  // Désactivation de la redirection vers l'onboarding
  // Les utilisateurs ont maintenant completedOnboarding=true par défaut
  return;
};
