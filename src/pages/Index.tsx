import { useState, useEffect } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    const onboarded = localStorage.getItem("coffeehouse-onboarded");
    if (onboarded === "true") {
      setShowOnboarding(false);
    }
  }, []);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return <ChatInterface />;
};

export default Index;
