import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  sender: "user" | "barista" | "philosopher";
  content: string;
  recipient?: "everyone" | "barista" | "philosopher";
  timestamp: Date;
}

const MessageBubble = ({ sender, content, recipient, timestamp }: MessageBubbleProps) => {
  const senderConfig = {
    user: {
      icon: "🧍",
      name: "You",
      bgColor: "bg-user",
      textColor: "text-foreground",
    },
    barista: {
      icon: "🧋",
      name: "Barista",
      bgColor: "bg-barista-light",
      textColor: "text-barista",
    },
    philosopher: {
      icon: "📚",
      name: "Philosopher",
      bgColor: "bg-philosopher-light",
      textColor: "text-philosopher",
    },
  };

  const config = senderConfig[sender];

  const getRecipientLabel = () => {
    if (!recipient || recipient === "everyone") return null;
    if (recipient === "barista") return "→ Barista 🧋";
    if (recipient === "philosopher") return "→ Philosopher 📚";
    return null;
  };

  const recipientLabel = getRecipientLabel();

  return (
    <div className={cn("flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300")}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <span className={cn("font-semibold", config.textColor)}>{config.name}</span>
        {recipientLabel && (
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
            {recipientLabel}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className={cn(
        "p-4 rounded-lg shadow-sm border border-border/50",
        config.bgColor
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
