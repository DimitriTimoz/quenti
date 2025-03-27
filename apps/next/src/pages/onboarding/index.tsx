import { useRouter } from "next/router";
import { useEffect } from "react";
import { PageWrapper } from "../../common/page-wrapper";
import { OnboardingIntro } from "../../modules/onboarding/onboarding-intro";

const Page = () => {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  
  return null;
};

Page.PageWrapper = PageWrapper;

export default Page;
