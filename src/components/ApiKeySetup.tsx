import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AgentConfig, ApiProvider, PROVIDER_MODELS, PROVIDER_LABELS, ModelType, DEFAULT_BASE_URLS } from "@/types/agent";

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

      {agent.model === 'custom' && agent.provider === 'ollama' && (
        <div className="space-y-2">
          <Label htmlFor={`${agent.id}-custom-model`}>Custom Model Name</Label>
          <Input
            id={`${agent.id}-custom-model`}
            value={agent.customModel || ''}
            onChange={(e) => onChange({ ...agent, customModel: e.target.value })}
            placeholder="e.g., llama2, codellama, your-custom-model"
          />
          <p className="text-xs text-muted-foreground">
            Enter the exact model name from Ollama (run `ollama list` to see available models)
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-base-url`}>
          Custom Base URL {agent.provider !== 'ollama' && '(Optional)'}
        </Label>
        <Input
          id={`${agent.id}-base-url`}
          value={agent.customBaseUrl || ''}
          onChange={(e) => onChange({ ...agent, customBaseUrl: e.target.value })}
          placeholder={DEFAULT_BASE_URLS[agent.provider]}
        />
        <p className="text-xs text-muted-foreground">
          {agent.provider === 'ollama' 
            ? 'Default: http://localhost:11434 (change if Ollama is running elsewhere)'
            : 'Override the default API endpoint (useful for proxies or OpenAI-compatible servers)'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${agent.id}-key`}>
          API Key {agent.provider === 'ollama' && '(Not required for Ollama)'}
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${agent.id}-key`}
            type={showKey ? "text" : "password"}
            value={agent.apiKey}
            onChange={(e) => onChange({ ...agent, apiKey: e.target.value })}
            placeholder={
              agent.provider === 'ollama' 
                ? 'Not required (leave empty)' 
                : `Enter ${PROVIDER_LABELS[agent.provider]} API key`
            }
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
