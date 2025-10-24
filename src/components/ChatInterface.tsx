import { useState, useRef, useEffect } from "react";
import { Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import RecipientSelector from "./RecipientSelector";
import SettingsModal from "./SettingsModal";
import { useToast } from "@/hooks/use-toast";
import { AgentConfig, Message } from "@/types/agent";
import { callAgent, ApiError } from "@/lib/apiClients";

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<string>("everyone");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load agents from localStorage
    const storedAgents = localStorage.getItem("coffeehouse-agents");
    if (storedAgents) {
      setAgents(JSON.parse(storedAgents));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (sender: string, recipient: string, content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      recipient,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const getAgentResponse = async (agent: AgentConfig, currentMessages: Message[]) => {
    try {
      const response = await callAgent(agent, currentMessages);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          title: `${agent.name} Error`,
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: `${agent.name} Error`,
          description: "Failed to get response. Please check your API key and try again.",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    addMessage("user", recipient, userMessage);
    let currentMessages = [...messages, { 
      id: Date.now().toString(), 
      sender: "user", 
      recipient, 
      content: userMessage,
      timestamp: Date.now()
    }];

    try {
      if (recipient === "everyone") {
        // Both agents respond in sequence
        for (const agent of agents) {
          const response = await getAgentResponse(agent, currentMessages);
          const agentMessage = addMessage(agent.id, "everyone", response);
          currentMessages = [...currentMessages, agentMessage];
          
          // Small delay between responses for natural flow
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Only the selected agent responds
        const targetAgent = agents.find(a => a.id === recipient);
        if (targetAgent) {
          const response = await getAgentResponse(targetAgent, currentMessages);
          addMessage(targetAgent.id, "everyone", response);
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentInfo = (agentId: string) => {
    return agents.find(a => a.id === agentId);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-muted to-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">☕ AI Coffeehouse</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-12">
            <p className="text-lg mb-2">Welcome to the Coffeehouse! ☕</p>
            <p className="text-sm">Start a conversation with your AI agents</p>
          </div>
        )}
        
        {messages.map((message) => {
          const agent = message.sender !== 'user' ? getAgentInfo(message.sender) : null;
          return (
            <MessageBubble
              key={message.id}
              sender={message.sender === 'user' ? 'You' : (agent?.name || message.sender)}
              content={message.content}
              type={message.sender === 'user' ? 'user' : (agent?.color || 'user')}
              emoji={message.sender === 'user' ? '🧍' : (agent?.emoji || '🤖')}
              isWhisper={message.recipient !== 'everyone'}
              whisperTarget={message.recipient !== 'everyone' && message.sender === 'user' 
                ? getAgentInfo(message.recipient)?.name 
                : undefined}
            />
          );
        })}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-pulse">💭</div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border p-4 space-y-3">
        <RecipientSelector
          value={recipient}
          onChange={setRecipient}
          agents={agents}
        />
        
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              recipient === "everyone" 
                ? "Message everyone..." 
                : `Whisper to ${getAgentInfo(recipient)?.name}...`
            }
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="self-end h-[80px] w-[80px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings}
        agents={agents}
        onAgentsChange={(newAgents) => {
          setAgents(newAgents);
          localStorage.setItem("coffeehouse-agents", JSON.stringify(newAgents));
        }}
      />
    </div>
  );
};

export default ChatInterface;
