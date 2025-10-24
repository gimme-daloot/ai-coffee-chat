interface MessageBubbleProps {
  sender: string;
  content: string;
  type: string; // "user" | "barista" | "philosopher" | any custom agent color
  emoji: string;
  isWhisper?: boolean;
  whisperTarget?: string;
}

const MessageBubble = ({ sender, content, type, emoji, isWhisper, whisperTarget }: MessageBubbleProps) => {
  const getBgColor = () => {
    if (type === "user") return "bg-user-light border-user/20";
    if (type === "barista") return "bg-barista-light border-barista/20";
    if (type === "philosopher") return "bg-philosopher-light border-philosopher/20";
    return "bg-muted border-border"; // fallback for custom agents
  };

  const getTextColor = () => {
    if (type === "user") return "text-user";
    if (type === "barista") return "text-barista";
    if (type === "philosopher") return "text-philosopher";
    return "text-foreground"; // fallback for custom agents
  };

  return (
    <div className={`flex items-start gap-3 animate-fade-in ${type === "user" ? "flex-row-reverse" : ""}`}>
      <div className="text-2xl">{emoji}</div>
      <div className={`flex-1 max-w-[80%] ${type === "user" ? "items-end" : ""}`}>
        <div className={`text-sm font-semibold mb-1 ${getTextColor()}`}>
          {sender}
          {isWhisper && whisperTarget && (
            <span className="ml-2 text-xs text-muted-foreground italic">
              (whispered to {whisperTarget})
            </span>
          )}
        </div>
        <div className={`rounded-2xl p-4 ${getBgColor()} border shadow-sm`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
