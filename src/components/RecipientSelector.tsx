import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentConfig } from "@/types/agent";

interface RecipientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  agents: AgentConfig[];
}

const RecipientSelector = ({ value, onChange, agents }: RecipientSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Send to:</span>
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
