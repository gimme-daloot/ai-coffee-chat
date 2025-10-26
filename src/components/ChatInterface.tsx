import { useState, useRef, useEffect } from "react";
import { Send, Settings, MessagesSquare, Square } from "lucide-react";
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
  const [isAutoChat, setIsAutoChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStopAutoChat = useRef(false);
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

  const getAgentResponse = async (agent: AgentConfig, skipErrorToast = false) => {
    try {
      const agentMessages = conversationManager.getMessagesForAgent(agent.id);
      const response = await callAgent(agent, agentMessages);
      return response;
    } catch (error) {
      if (!skipErrorToast) {
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
      }
      // Return empty string instead of throwing - this prevents one agent error from breaking auto chat
      return "";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Capture the conversation mode at the time of sending
    // This ensures responses go to the correct conversation even if the user switches tabs
    const messageConversationMode = conversationMode;

    // Add user message to the current conversation
    addMessage("user", recipient, userMessage);

    try {
      if (recipient === "everyone") {
        // Group conversation mode - agents respond in parallel within each round
        // If auto chat is enabled, agents will continue indefinitely until stopped
        shouldStopAutoChat.current = false;
        let round = 0;

        // Loop continues indefinitely when auto chat is enabled, or runs once for manual mode
        while (true) {
          // IMPORTANT: Get all responses BEFORE adding any to the conversation
          // This prevents agents from seeing each other's responses within the same round
          const responses = await Promise.all(
            agents.map(async (agent) => {
              // Skip error toasts after first round in auto chat to prevent spam
              const skipToast = isAutoChat && round > 0;
              const response = await getAgentResponse(agent, skipToast);
              return { agent, response };
            })
          );

          // Now add all responses to the conversation with slight delays for natural flow
          for (let i = 0; i < responses.length; i++) {
            const { agent, response } = responses[i];

            // Skip empty responses (from errors)
            if (!response || !response.trim()) {
              continue;
            }

            const newMessage: Message = {
              id: Date.now().toString() + round + i, // Ensure unique IDs
              sender: agent.id,
              recipient: "everyone",
              content: response,
              timestamp: Date.now() + (round * 1000) + i, // Timestamp offset for ordering
            };
            conversationManager.addMessageToMode(messageConversationMode, newMessage);

            // Small delay between responses for natural flow
            if (i < responses.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }

          // Save state once per round for better performance
          saveConversationState();

          round++;

          // Check if we should stop: either auto chat is disabled or user clicked stop
          if (!isAutoChat || shouldStopAutoChat.current) {
            break;
          }

          // Longer delay between rounds for better readability
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } else {
        // Private conversation mode - only the selected agent responds
        const targetAgent = agents.find(a => a.id === recipient);
        if (targetAgent) {
          const response = await getAgentResponse(targetAgent);

          // Add response to the original conversation mode, not the current one
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
          {conversationMode === 'group' && isAutoChat && isLoading && (
            <span className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border border-blue-300 dark:border-blue-700 animate-pulse">
              Auto Chat Running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {conversationMode === 'group' && (
            <>
              {isLoading && isAutoChat ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    shouldStopAutoChat.current = true;
                    toast({
                      title: "Stopping Auto Chat",
                      description: "Auto chat will stop after the current round",
                    });
                  }}
                  className="text-sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Auto Chat
                </Button>
              ) : (
                <Button
                  variant={isAutoChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsAutoChat(!isAutoChat);
                    toast({
                      title: isAutoChat ? "Auto Chat Disabled" : "Auto Chat Enabled",
                      description: isAutoChat
                        ? "Agents will respond once to your messages"
                        : "Agents will continue chatting until you stop them",
                    });
                  }}
                  className="text-sm"
                  disabled={isLoading}
                >
                  {isAutoChat ? <Square className="h-4 w-4 mr-2" /> : <MessagesSquare className="h-4 w-4 mr-2" />}
                  {isAutoChat ? "Disable Auto" : "Auto Chat"}
                </Button>
              )}
            </>
          )}
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
