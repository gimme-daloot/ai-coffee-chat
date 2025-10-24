import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ApiKeySetup from "./ApiKeySetup";
import { AgentConfig } from "@/types/agent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentConfig[];
  onAgentsChange: (agents: AgentConfig[]) => void;
}

const SettingsModal = ({ open, onOpenChange, agents, onAgentsChange }: SettingsModalProps) => {
  const { toast } = useToast();
  const [editedAgents, setEditedAgents] = useState<AgentConfig[]>(agents);

  const handleResetOnboarding = () => {
    localStorage.removeItem("coffeehouse-onboarded");
    localStorage.removeItem("coffeehouse-agents");
    toast({
      title: "Reset Complete",
      description: "Refresh the page to see the onboarding screen again.",
    });
  };

  const handleSave = () => {
    // Validate that all agents have API keys
    const missingKeys = editedAgents.filter(agent => !agent.apiKey.trim());
    
    if (missingKeys.length > 0) {
      toast({
        title: "Missing API Keys",
        description: "Please provide API keys for all agents.",
        variant: "destructive",
      });
      return;
    }

    onAgentsChange(editedAgents);
    toast({
      title: "Settings Saved",
      description: "Your agent configurations have been updated.",
    });
    onOpenChange(false);
  };

  const handleAgentChange = (index: number, updatedAgent: AgentConfig) => {
    const newAgents = [...editedAgents];
    newAgents[index] = updatedAgent;
    setEditedAgents(newAgents);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your AI Coffeehouse preferences and agent configurations
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agents" className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {editedAgents.map((agent, index) => (
                <ApiKeySetup
                  key={agent.id}
                  agent={agent}
                  onChange={(updated) => handleAgentChange(index, updated)}
                />
              ))}
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </TabsContent>
          
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">About</h3>
              <p className="text-sm text-muted-foreground">
                AI Coffeehouse lets you create conversations between AI agents using your own API keys. 
                All conversations are processed through your configured AI providers.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Your API keys are stored locally in your browser and never sent to our servers. 
                All AI requests go directly from your browser to your chosen AI providers.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Reset</h3>
              <Button
                variant="outline"
                onClick={handleResetOnboarding}
                className="w-full"
              >
                Reset Onboarding
              </Button>
              <p className="text-xs text-muted-foreground">
                This will clear your settings and show the setup screen again when you refresh.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
