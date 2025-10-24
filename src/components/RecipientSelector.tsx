import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecipientSelectorProps {
  value: "everyone" | "barista" | "philosopher";
  onChange: (value: "everyone" | "barista" | "philosopher") => void;
}

const RecipientSelector = ({ value, onChange }: RecipientSelectorProps) => {
  const options = [
    { value: "everyone" as const, label: "Everyone", icon: "☕" },
    { value: "barista" as const, label: "Barista", icon: "🧋" },
    { value: "philosopher" as const, label: "Philosopher", icon: "📚" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1.5 transition-all",
            value === option.value && "shadow-md"
          )}
        >
          <span>{option.icon}</span>
          <span className="text-xs">{option.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default RecipientSelector;
