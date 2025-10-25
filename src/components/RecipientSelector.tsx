import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentConfig } from "@/types/agent";
import { ConversationMode } from "@/lib/conversationStateManager";

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  agents: AgentConfig[];
  currentMode?: ConversationMode;
}

const RecipientSelector = ({ value, onChange, agents, currentMode }: RecipientSelectorProps) => {
  const getModeLabel = () => {
    if (currentMode === 'group') {
      return 'Group Chat';
    }
    const agent = agents.find(a => a.id === currentMode);
    return agent ? `Private: ${agent.name}` : 'Private Chat';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {currentMode && currentMode !== 'group' ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {getModeLabel()}
          </span>
        ) : (
          'Send to:'
        )}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="everyone">
            <span className="flex items-center gap-2">
              ☕ Everyone
            </span>
          </SelectItem>
          {agents.map(agent => (
            <SelectItem key={agent.id} value={agent.id}>
              <span className="flex items-center gap-2">
                {agent.emoji} {agent.name} only
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RecipientSelector;
