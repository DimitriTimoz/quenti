import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";

import { PageWrapper } from "../../common/page-wrapper";
import { AuthLayout } from "../../components/auth-layout";
import { AutoLogin } from "../../modules/auth/auto-login";

export default function Login() {
  const router = useRouter();
  const { status } = useSession();
  const [isAutoLoginComplete, setIsAutoLoginComplete] = useState(false);

  // Fonction de callback pour quand l'auto-login est terminé
  const handleAutoLoginComplete = () => {
    setIsAutoLoginComplete(true);
  };

  // Si l'utilisateur est déjà authentifié, rediriger
  if (status === "authenticated") {
    const callbackUrl = (router.query.callbackUrl as string) || "/home";
    void router.push(callbackUrl);
    return null;
  }

  if (status === "loading") {
    return <div>Chargement...</div>;
  }

  // Afficher le composant d'auto-login et le formulaire normal en même temps
  // AutoLogin tentera la connexion automatique, et si ça échoue, l'utilisateur verra le formulaire
  return (
    <>
      {!isAutoLoginComplete && (
        <AutoLogin onComplete={handleAutoLoginComplete} />
      )}
      <AuthLayout
        mode="login"
        autoLoginInProgress={!isAutoLoginComplete}
        onUserExists={(callback) => {
          void router.push(callback);
        }}
      />
    </>
  );
}

Login.PageWrapper = PageWrapper;
