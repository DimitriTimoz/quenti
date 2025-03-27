import { useRouter } from "next/router";
import { useEffect } from "react";

export const RedirectFromOnboarding = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return null;
};
