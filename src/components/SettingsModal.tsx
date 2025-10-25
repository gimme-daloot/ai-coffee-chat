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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
    // Validate that all agents have API keys except Ollama
    const missingKeys = editedAgents.filter(agent => agent.provider !== 'ollama' && !agent.apiKey.trim());
    
    if (missingKeys.length > 0) {
      toast({
        title: "Missing API Keys",
        description: "Please provide API keys for all non-local providers.",
        variant: "destructive",
      });
      return;
    }

    onAgentsChange(editedAgents);
    // Persist local mode settings if present
    try {
      // no-op; values already saved via onChange handlers below
    } catch {}
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
              <h3 className="text-sm font-semibold">Local Mode</h3>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Route all providers to local Ollama</span>
                <Switch
                  checked={typeof window !== 'undefined' && localStorage.getItem('coffeehouse-local-mode') === 'true'}
                  onCheckedChange={(checked) => {
                    try {
                      localStorage.setItem('coffeehouse-local-mode', checked ? 'true' : 'false');
                    } catch {}
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="local-ollama-base-url" className="text-sm">Local Ollama Base URL</label>
                <Input
                  id="local-ollama-base-url"
                  placeholder="http://localhost:11434"
                  defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('coffeehouse-ollama-base-url') || '') : ''}
                  onChange={(e) => {
                    try {
                      localStorage.setItem('coffeehouse-ollama-base-url', e.target.value);
                    } catch {}
                  }}
                />
                <p className="text-xs text-muted-foreground">Used when Local Mode is enabled or for Ollama providers without a custom base URL.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Your API keys are stored locally in your browser and never sent to our servers.
                Requests are sent directly from your browser to your chosen providers. For Ollama, requests go to your local endpoint.
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
