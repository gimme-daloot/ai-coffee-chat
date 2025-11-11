import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Settings, Play, Square } from "lucide-react";
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
  const [messageVersion, setMessageVersion] = useState(0);
  const [autoConversationActive, setAutoConversationActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const autoConversationActiveRef = useRef(false);
  const autoTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTurnInProgressRef = useRef(false);
  const agentsRef = useRef<AgentConfig[]>([]);
  const conversationModeRef = useRef<ConversationMode>('group');
  const isLoadingRef = useRef(false);

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

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    return () => {
      stopAutoConversation({ silent: true });
      autoTurnInProgressRef.current = false;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const currentMessages = useMemo(
    () => conversationManager.getCurrentMessages(),
    [conversationManager, conversationMode, messageVersion]
  );
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
    setMessageVersion((prev) => prev + 1);

    // Persist to localStorage
    saveConversationState(conversationManager.getCurrentMode());

    return newMessage;
  };

  const saveConversationState = (mode: ConversationMode = conversationMode) => {
    const states = conversationManager.exportStates();
    localStorage.setItem("coffeehouse-conversations", JSON.stringify(states));
    localStorage.setItem("coffeehouse-conversation-mode", mode);
  };

  const clearAutoConversationTimeout = () => {
    if (autoTurnTimeoutRef.current) {
      clearTimeout(autoTurnTimeoutRef.current);
      autoTurnTimeoutRef.current = null;
    }
  };

  const scheduleAutoTurn = (delay = 1500) => {
    if (!autoConversationActiveRef.current) return;
    clearAutoConversationTimeout();
    autoTurnTimeoutRef.current = setTimeout(() => {
      executeAutoTurn();
    }, delay);
  };

  const stopAutoConversation = (options?: { silent?: boolean }) => {
    autoConversationActiveRef.current = false;
    if (!options?.silent) {
      setAutoConversationActive(false);
    }
    clearAutoConversationTimeout();
  };

  const executeAutoTurn = async () => {
    if (!autoConversationActiveRef.current) return;
    if (autoTurnInProgressRef.current) return;
    if (isLoadingRef.current) {
      scheduleAutoTurn(800);
      return;
    }

    const currentAgents = agentsRef.current;
    if (!currentAgents.length) {
      stopAutoConversation();
      return;
    }

    autoTurnInProgressRef.current = true;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      if (conversationModeRef.current !== 'group' || recipient !== 'everyone') {
        conversationManager.switchMode('group');
        setConversationMode('group');
        setRecipient('everyone');
        conversationModeRef.current = 'group';
        localStorage.setItem("coffeehouse-conversation-mode", 'group');
      }

      for (let i = 0; i < currentAgents.length; i++) {
        if (!autoConversationActiveRef.current) {
          break;
        }

        const agent = currentAgents[i];
        const response = await getAgentResponse(agent);
        const timestamp = Date.now();

        const newMessage: Message = {
          id: `${timestamp}-${agent.id}-${i}`,
          sender: agent.id,
          recipient: "everyone",
          content: response,
          timestamp: timestamp + i,
        };
        conversationManager.addMessageToMode('group', newMessage);
        setMessageVersion((prev) => prev + 1);
        saveConversationState('group');

        if (i < currentAgents.length - 1 && autoConversationActiveRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Auto conversation error:", error);
    } finally {
      autoTurnInProgressRef.current = false;
      isLoadingRef.current = false;
      setIsLoading(false);
      if (autoConversationActiveRef.current) {
        scheduleAutoTurn(1500);
      }
    }
  };

  const startAutoConversation = () => {
    if (autoConversationActiveRef.current) return;
    if (!agentsRef.current.length) {
      toast({
        title: "No agents configured",
        description: "Add at least one agent before starting automatic conversation.",
      });
      return;
    }

    autoConversationActiveRef.current = true;
    setAutoConversationActive(true);

    if (conversationModeRef.current !== 'group' || recipient !== 'everyone') {
      conversationManager.switchMode('group');
      setConversationMode('group');
      setRecipient('everyone');
      conversationModeRef.current = 'group';
      localStorage.setItem("coffeehouse-conversation-mode", 'group');
    }

    scheduleAutoTurn(200);
  };

  const toggleAutoConversation = () => {
    if (autoConversationActiveRef.current) {
      stopAutoConversation();
    } else {
      startAutoConversation();
    }
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

    if (autoConversationActiveRef.current) {
      stopAutoConversation();
    }

    const userMessage = input.trim();
    setInput("");
    isLoadingRef.current = true;
    setIsLoading(true);

    // Capture the conversation mode at the time of sending
    // This ensures responses go to the correct conversation even if the user switches tabs
    const messageConversationMode = conversationMode;

    // Add user message to the current conversation
    addMessage("user", recipient, userMessage);

    try {
      if (recipient === "everyone") {
        // Group conversation mode - agents respond one after another so they can react to each other
        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];
          const response = await getAgentResponse(agent);
          const timestamp = Date.now();

          const newMessage: Message = {
            id: `${timestamp}-${agent.id}-${i}`,
            sender: agent.id,
            recipient: "everyone",
            content: response,
            timestamp: timestamp + i, // Slight offset keeps ordering deterministic
          };
          conversationManager.addMessageToMode(messageConversationMode, newMessage);
          setMessageVersion((prev) => prev + 1);
          saveConversationState(messageConversationMode);

          // Small delay between responses for natural flow (except after the last one)
          if (i < agents.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } else {
        // Private conversation mode - only the selected agent responds
        const targetAgent = agents.find((a) => a.id === recipient);
        if (targetAgent) {
          const response = await getAgentResponse(targetAgent);
          const timestamp = Date.now();

          // Add response to the original conversation mode, not the current one
          const newMessage: Message = {
            id: `${timestamp}-${targetAgent.id}`,
            sender: targetAgent.id,
            recipient: "user",
            content: response,
            timestamp,
          };
          conversationManager.addMessageToMode(messageConversationMode, newMessage);
          setMessageVersion((prev) => prev + 1);
          saveConversationState(messageConversationMode);
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRecipientChange = (newRecipient: string) => {
    if (autoConversationActiveRef.current && newRecipient !== 'everyone') {
      stopAutoConversation();
    }

    setRecipient(newRecipient);
    
    // Switch conversation mode
    const newMode: ConversationMode = newRecipient === "everyone" ? "group" : newRecipient;
    
    if (newMode !== conversationMode) {
      conversationManager.switchMode(newMode);
      setConversationMode(newMode);
      conversationModeRef.current = newMode;
      
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
            {autoConversationActive && (
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Auto conversation running
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoConversationActive ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoConversation}
              className="flex items-center gap-2"
            >
              {autoConversationActive ? (
                <>
                  <Square className="h-4 w-4" />
                  <span>Stop Auto</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Auto</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
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
            <span className="text-sm">Thinking...</span>
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
