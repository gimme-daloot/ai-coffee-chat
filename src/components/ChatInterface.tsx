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
  const [isAutoChatActive, setIsAutoChatActive] = useState(false);
  const [autoChatRounds, setAutoChatRounds] = useState(3); // Number of rounds for auto-chat
  const autoChatAbortRef = useRef(false);
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

  const addMessage = (sender: string, recipient: string, content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      recipient,
      content,
      timestamp: Date.now(),
    };
    conversationManager.addMessage(newMessage);
    
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
    if (!input.trim() || isLoading || isAutoChatActive) return;

    const userMessage = input.trim();
    setInput("");

    // Capture the conversation mode at the time of sending
    const messageConversationMode = conversationMode;

    // Add user message to the current conversation
    addMessage("user", recipient, userMessage);

    try {
      if (recipient === "everyone") {
        // Start auto-chat: agents respond sequentially and continue conversing
        await startAutoChat(messageConversationMode);
      } else {
        // Private conversation mode - only the selected agent responds
        setIsLoading(true);
        const targetAgent = agents.find(a => a.id === recipient);
        if (targetAgent) {
          const response = await getAgentResponse(targetAgent);

          const newMessage: Message = {
            id: Date.now().toString(),
            sender: targetAgent.id,
            recipient: "user",
            content: response,
            timestamp: Date.now(),
          };
          conversationManager.addMessageToMode(messageConversationMode, newMessage);
          saveConversationState();
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      setIsLoading(false);
    }
  };

  const startAutoChat = async (messageConversationMode: ConversationMode) => {
    if (isAutoChatActive || agents.length === 0) return;

    setIsAutoChatActive(true);
    autoChatAbortRef.current = false;

    try {
      // Run multiple rounds of conversation
      for (let round = 0; round < autoChatRounds; round++) {
        if (autoChatAbortRef.current) break;

        // Each agent takes a turn to respond
        for (let i = 0; i < agents.length; i++) {
          if (autoChatAbortRef.current) break;

          const agent = agents[i];
          const messages = conversationManager.getMessagesForAgent(agent.id);

          // Skip if the last message was from this same agent (prevent double responses)
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.sender === agent.id) {
            continue;
          }

          try {
            setIsLoading(true);
            const response = await getAgentResponse(agent);
            setIsLoading(false);

            const newMessage: Message = {
              id: Date.now().toString() + `-${round}-${i}`,
              sender: agent.id,
              recipient: "everyone",
              content: response,
              timestamp: Date.now(),
            };

            conversationManager.addMessageToMode(messageConversationMode, newMessage);
            saveConversationState();

            // Small delay between agent responses for readability
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (error) {
            console.error(`Error getting response from ${agent.name}:`, error);
            // Continue with next agent even if this one fails
          }
        }
      }
    } finally {
      setIsLoading(false);
      setIsAutoChatActive(false);
      autoChatAbortRef.current = false;
    }
  };

  const stopAutoChat = () => {
    autoChatAbortRef.current = true;
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
              whisperTarget={message.recipient !== 'everyone' && message.sender === 'user' 
                ? getAgentInfo(message.recipient)?.name 
                : undefined}
            />
          );
        })}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-pulse">💭</div>
            <span className="text-sm">
              {isAutoChatActive ? 'Auto-chatting...' : 'Thinking...'}
            </span>
          </div>
        )}

        {isAutoChatActive && (
          <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-pulse text-lg">💬</div>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Auto-chat in progress...
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={stopAutoChat}
              className="bg-white dark:bg-gray-800"
            >
              Stop
            </Button>
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
              isAutoChatActive
                ? "Auto-chat in progress..."
                : recipient === "everyone"
                  ? "Message everyone..."
                  : `Whisper to ${getAgentInfo(recipient)?.name}...`
            }
            className="min-h-[80px] resize-none"
            disabled={isLoading || isAutoChatActive}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isAutoChatActive}
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
