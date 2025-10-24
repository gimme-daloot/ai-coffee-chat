import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MessageBubble from "./MessageBubble";
import RecipientSelector from "./RecipientSelector";
import { Send, Settings } from "lucide-react";
import SettingsModal from "./SettingsModal";

interface Message {
  id: string;
  sender: "user" | "barista" | "philosopher";
  content: string;
  recipient?: "everyone" | "barista" | "philosopher";
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<"everyone" | "barista" | "philosopher">("everyone");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callAI = async (agent: "barista" | "philosopher", conversationHistory: Message[]) => {
    const agentMessages = conversationHistory.map(msg => ({
      role: msg.sender === agent ? "assistant" : "user",
      content: msg.content,
    }));

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { messages: agentMessages, agent },
    });

    if (error) throw error;
    return data.choices[0].message.content;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: input.trim(),
      recipient,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = [...messages, userMessage];

      // Determine which agents should respond
      const shouldBaristaRespond = recipient === "everyone" || recipient === "barista";
      const shouldPhilosopherRespond = recipient === "everyone" || recipient === "philosopher";

      // Barista responds first (if applicable)
      if (shouldBaristaRespond) {
        const baristaResponse = await callAI("barista", conversationHistory);
        const baristaMessage: Message = {
          id: Date.now().toString() + "-barista",
          sender: "barista",
          content: baristaResponse,
          timestamp: new Date(),
        };
        conversationHistory.push(baristaMessage);
        setMessages(prev => [...prev, baristaMessage]);
      }

      // Philosopher responds (if applicable)
      if (shouldPhilosopherRespond) {
        const philosopherResponse = await callAI("philosopher", conversationHistory);
        const philosopherMessage: Message = {
          id: Date.now().toString() + "-philosopher",
          sender: "philosopher",
          content: philosopherResponse,
          timestamp: new Date(),
        };
        conversationHistory.push(philosopherMessage);
        setMessages(prev => [...prev, philosopherMessage]);
      }

      // If both agents responded, let them have one exchange
      if (shouldBaristaRespond && shouldPhilosopherRespond) {
        // Barista responds to Philosopher
        const baristaFollowup = await callAI("barista", conversationHistory);
        const baristaFollowupMessage: Message = {
          id: Date.now().toString() + "-barista-followup",
          sender: "barista",
          content: baristaFollowup,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, baristaFollowupMessage]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-primary">☕ AI Coffeehouse</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="hover:bg-muted"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <p className="text-lg text-muted-foreground">
                Welcome to the Coffeehouse! Start a conversation below.
              </p>
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <span className="text-4xl">🧋</span>
                  <p className="text-sm text-barista font-medium mt-1">Barista</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl">📚</span>
                  <p className="text-sm text-philosopher font-medium mt-1">Philosopher</p>
                </div>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} {...message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-pulse">💭</div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <RecipientSelector value={recipient} onChange={setRecipient} />
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] resize-none bg-background"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
};

export default ChatInterface;
