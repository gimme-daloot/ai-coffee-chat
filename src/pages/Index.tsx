import { useState, useEffect } from "react";
import OnboardingScreen from "@/components/OnboardingScreen";
import ChatInterface from "@/components/ChatInterface";
import { AgentConfig } from "@/types/agent";

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [agents, setAgents] = useState<AgentConfig[]>([]);

  useEffect(() => {
    const onboarded = localStorage.getItem("coffeehouse-onboarded");
    const storedAgents = localStorage.getItem("coffeehouse-agents");
    
    if (onboarded === "true" && storedAgents) {
      setAgents(JSON.parse(storedAgents));
      setShowOnboarding(false);
    }
  }, []);

  const handleOnboardingComplete = (configuredAgents: AgentConfig[]) => {
    setAgents(configuredAgents);
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <ChatInterface />;
};

export default Index;
