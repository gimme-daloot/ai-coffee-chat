import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AgentConfig, ApiProvider, PROVIDER_MODELS, PROVIDER_LABELS, ModelType } from "@/types/agent";

interface ApiKeySetupProps {
  agent: AgentConfig;
  onChange: (agent: AgentConfig) => void;
}

const ApiKeySetup = ({ agent, onChange }: ApiKeySetupProps) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="p-4 space-y-4 border-2" style={{ borderColor: `hsl(var(--${agent.color}))` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{agent.emoji}</span>
        <h3 className="font-semibold text-lg">{agent.name}</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-name`}>Agent Name</Label>
        <Input
          id={`${agent.id}-name`}
          value={agent.name}
          onChange={(e) => onChange({ ...agent, name: e.target.value })}
          placeholder="Enter agent name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-emoji`}>Emoji</Label>
        <Input
          id={`${agent.id}-emoji`}
          value={agent.emoji}
          onChange={(e) => onChange({ ...agent, emoji: e.target.value })}
          placeholder="🤖"
          maxLength={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-provider`}>AI Provider</Label>
        <Select
          value={agent.provider}
          onValueChange={(value) => {
            const newProvider = value as ApiProvider;
            const firstModel = PROVIDER_MODELS[newProvider][0];
            onChange({ 
              ...agent, 
              provider: newProvider,
              model: firstModel,
              apiKey: '' // Clear API key when changing provider
            });
          }}
        >
          <SelectTrigger id={`${agent.id}-provider`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-model`}>Model</Label>
        <Select
          value={agent.model}
          onValueChange={(value) => onChange({ ...agent, model: value as ModelType })}
        >
          <SelectTrigger id={`${agent.id}-model`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_MODELS[agent.provider].map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-key`}>API Key</Label>
        <div className="flex gap-2">
          <Input
            id={`${agent.id}-key`}
            type={showKey ? "text" : "password"}
            value={agent.apiKey}
            onChange={(e) => onChange({ ...agent, apiKey: e.target.value })}
            placeholder={`Enter ${PROVIDER_LABELS[agent.provider]} API key`}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-personality`}>Personality Prompt</Label>
        <textarea
          id={`${agent.id}-personality`}
          value={agent.personality}
          onChange={(e) => onChange({ ...agent, personality: e.target.value })}
          className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background text-sm"
          placeholder="Describe the agent's personality..."
        />
      </div>
    </Card>
  );
};

export default ApiKeySetup;
