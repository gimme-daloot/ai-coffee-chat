import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ApiKeySetup from "@/components/ApiKeySetup";
import { AgentConfig, DEFAULT_AGENTS } from "@/types/agent";
import { useToast } from "@/hooks/use-toast";

interface OnboardingScreenProps {
  onComplete: (agents: AgentConfig[]) => void;
}

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentConfig[]>([
    { ...DEFAULT_AGENTS[0], apiKey: '' },
    { ...DEFAULT_AGENTS[1], apiKey: '' },
  ]);

  const handleAgentChange = (index: number, updatedAgent: AgentConfig) => {
    const newAgents = [...agents];
    newAgents[index] = updatedAgent;
    setAgents(newAgents);
  };

  const handleStart = () => {
    // Validate that all agents have API keys unless provider is Ollama
    const missingKeys = agents.filter(agent => agent.provider !== 'ollama' && !agent.apiKey.trim());
    
    if (missingKeys.length > 0) {
      toast({
        title: "Missing API Keys",
        description: "Please provide API keys for all non-local providers before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Validate that all agents have names
    const missingNames = agents.filter(agent => !agent.name.trim());
    
    if (missingNames.length > 0) {
      toast({
        title: "Missing Names",
        description: "Please provide names for all agents before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Store agents in localStorage
    localStorage.setItem("coffeehouse-agents", JSON.stringify(agents));
    localStorage.setItem("coffeehouse-onboarded", "true");
    
    onComplete(agents);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-secondary overflow-y-auto">
      <Card className="w-full max-w-4xl shadow-xl my-8">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold">☕ AI Coffeehouse</CardTitle>
          <CardDescription className="text-lg">
            Configure your AI agents to start conversing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>💡</span> How it works
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Configure two AI agents with your own API keys</li>
              <li>• Choose any AI provider: OpenAI, Anthropic, Google, or xAI</li>
              <li>• Customize names, personalities, and models</li>
              <li>• Chat with everyone or whisper to individual agents</li>
              <li>• Your API keys are stored locally - you pay for your own usage</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configure Your Agents</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent, index) => (
                <ApiKeySetup
                  key={agent.id}
                  agent={agent}
                  onChange={(updated) => handleAgentChange(index, updated)}
                />
              ))}
            </div>
          </div>

          <Button 
            onClick={handleStart}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            Enter the Coffeehouse ☕
          </Button>

          <div className="text-xs text-center space-y-1 text-muted-foreground">
            <p>🔒 Your API keys are stored locally in your browser</p>
            <p>💰 You control your costs - all API calls use your keys</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingScreen;
