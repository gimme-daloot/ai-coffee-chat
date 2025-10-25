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
import { ConversationStateManager, ConversationMode } from "@/lib/conversationStateManager";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<string>("everyone");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [conversationManager] = useState(() => new ConversationStateManager());
  const [conversationMode, setConversationMode] = useState<ConversationMode>('group');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load agents from localStorage
    const storedAgents = localStorage.getItem("coffeehouse-agents");
    if (storedAgents) {
      setAgents(JSON.parse(storedAgents));
    }

    // Load conversation states from localStorage
    const storedConversations = localStorage.getItem("coffeehouse-conversations");
    const storedMode = localStorage.getItem("coffeehouse-conversation-mode");
    if (storedConversations) {
      try {
        const conversations = JSON.parse(storedConversations);
        conversationManager.importStates(conversations, storedMode || 'group');
        const mode = storedMode || 'group';
        setConversationMode(mode);
        setRecipient(mode === 'group' ? 'everyone' : mode);
      } catch (e) {
        console.error("Failed to load conversation states:", e);
      }
    }
  }, [conversationManager]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const currentMessages = conversationManager.getCurrentMessages();
  useEffect(() => {
    scrollToBottom();
  }, [conversationMode, currentMessages.length]);

  const addMessage = (sender: string, recipient: string, content: string, targetMode?: ConversationMode) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      recipient,
      content,
      timestamp: Date.now(),
    };

    // If targetMode is specified, add to that specific conversation
    // Otherwise, add to current conversation
    if (targetMode) {
      conversationManager.addMessageToMode(targetMode, newMessage);
    } else {
      conversationManager.addMessage(newMessage);
    }

    // Persist to localStorage
    saveConversationState();

    return newMessage;
  };

  const saveConversationState = () => {
    const states = conversationManager.exportStates();
    localStorage.setItem("coffeehouse-conversations", JSON.stringify(states));
    localStorage.setItem("coffeehouse-conversation-mode", conversationMode);
  };

  const getAgentResponse = async (agent: AgentConfig) => {
    try {
      const agentMessages = conversationManager.getMessagesForAgent(agent.id);
      const response = await callAgent(agent, agentMessages);
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
    const messageRecipient = recipient;
    const messageMode = conversationMode; // Capture mode at send time
    setInput("");
    setIsLoading(true);

    // Add user message to the conversation (mode captured at send time)
    addMessage("user", messageRecipient, userMessage, messageMode);

    try {
      if (messageRecipient === "everyone") {
        // Group conversation mode - both agents respond
        for (const agent of agents) {
          const response = await getAgentResponse(agent);
          addMessage(agent.id, "everyone", response, 'group');

          // Small delay between responses for natural flow
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Private conversation mode - only the selected agent responds
        const targetAgent = agents.find(a => a.id === messageRecipient);
        if (targetAgent) {
          const response = await getAgentResponse(targetAgent);
          // Add response to the PRIVATE conversation, not current mode
          addMessage(targetAgent.id, "user", response, targetAgent.id);
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

  const handleRecipientChange = (newRecipient: string) => {
    setRecipient(newRecipient);
    
    // Switch conversation mode
    const newMode: ConversationMode = newRecipient === "everyone" ? "group" : newRecipient;
    
    if (newMode !== conversationMode) {
      conversationManager.switchMode(newMode);
      setConversationMode(newMode);
      
      // Persist the mode change
      localStorage.setItem("coffeehouse-conversation-mode", newMode);
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
          {conversationMode !== 'group' && (
            <span className="text-sm px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-700">
              Private: {getAgentInfo(conversationMode)?.emoji} {getAgentInfo(conversationMode)?.name}
            </span>
          )}
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
        {currentMessages.length === 0 && (
          <div className="text-center text-muted-foreground mt-12">
            <p className="text-lg mb-2">
              {conversationMode === 'group' 
                ? 'Welcome to the Coffeehouse! ☕' 
                : `Private chat with ${getAgentInfo(conversationMode)?.name || 'agent'}`}
            </p>
            <p className="text-sm">
              {conversationMode === 'group'
                ? 'Start a conversation with your AI agents'
                : 'This is a private conversation'}
            </p>
          </div>
        )}
        
        {currentMessages.map((message) => {
          const agent = message.sender !== 'user' ? getAgentInfo(message.sender) : null;
          return (
            <MessageBubble
              key={message.id}
              sender={message.sender === 'user' ? 'You' : (agent?.name || message.sender)}
              content={message.content}
              type={message.sender === 'user' ? 'user' : (agent?.color || 'user')}
              emoji={message.sender === 'user' ? '🧍' : (agent?.emoji || '🤖')}
              isWhisper={message.recipient !== 'everyone'}
              whisperTarget={
                message.recipient !== 'everyone'
                  ? message.sender === 'user'
                    ? getAgentInfo(message.recipient)?.name   // User whisper: show agent name
                    : 'You'                                    // Agent whisper: show "You"
                  : undefined
              }
            />
          );
        })}
        
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground bg-muted/50 p-4 rounded-lg border border-border">
            <div className="animate-pulse text-2xl">💭</div>
            <div>
              <span className="text-sm font-medium">Agent is thinking...</span>
              <div className="text-xs opacity-70">This may take a moment with local models</div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border p-4 space-y-3">
        <RecipientSelector
          value={recipient}
          onChange={handleRecipientChange}
          agents={agents}
          currentMode={conversationMode}
        />
        
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isLoading
                ? "⏳ Waiting for response..."
                : recipient === "everyone"
                  ? "Message everyone..."
                  : `Whisper to ${getAgentInfo(recipient)?.name}...`
            }
            className={`min-h-[80px] resize-none ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
