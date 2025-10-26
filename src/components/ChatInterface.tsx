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
  const [isAutoChat, setIsAutoChat] = useState(false);
  const autoChatActive = useRef(false); // Use ref for reliable closure behavior
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

  // Cleanup auto-chat on unmount
  useEffect(() => {
    return () => {
      autoChatActive.current = false;
    };
  }, []);

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
        // Group conversation mode - both agents respond in parallel
        // IMPORTANT: Get all responses BEFORE adding any to the conversation
        // This prevents later agents from seeing earlier agents' responses
        const responses = await Promise.all(
          agents.map(async (agent) => {
            const response = await getAgentResponse(agent);
            return { agent, response };
          })
        );

        // Now add all responses to the conversation with slight delays for natural flow
        for (let i = 0; i < responses.length; i++) {
          const { agent, response } = responses[i];

          const newMessage: Message = {
            id: Date.now().toString() + i, // Ensure unique IDs
            sender: agent.id,
            recipient: "everyone",
            content: response,
            timestamp: Date.now() + i, // Slight timestamp offset for ordering
          };
          conversationManager.addMessageToMode(messageConversationMode, newMessage);
          saveConversationState();

          // Small delay between responses for natural flow (except after the last one)
          if (i < responses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
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
    // Stop auto-chat if switching away from group mode
    if (newRecipient !== "everyone" && isAutoChat) {
      stopAutoChat();
    }

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

  // Determine which agent should speak next in auto-chat mode
  const determineNextSpeaker = (): string | 'user' => {
    const messages = conversationManager.getCurrentMessages();
    if (messages.length === 0 || agents.length === 0) {
      return agents[0]?.id || 'user';
    }

    const lastMessage = messages[messages.length - 1];
    const lastContent = lastMessage.content.toLowerCase();

    // Priority 1: Check for @mentions
    for (const agent of agents) {
      const mention = `@${agent.name.toLowerCase()}`;
      if (lastContent.includes(mention)) {
        return agent.id;
      }
    }
    if (lastContent.includes('@user')) {
      return 'user';
    }

    // Priority 2: Check if message ends with "?" - pause for user
    if (lastContent.trim().endsWith('?')) {
      return 'user';
    }

    // Priority 3: Check last 5 messages for same speaker count
    const recentMessages = messages.slice(-5);
    const speakerCounts: { [key: string]: number } = {};
    recentMessages.forEach(msg => {
      speakerCounts[msg.sender] = (speakerCounts[msg.sender] || 0) + 1;
    });

    // If same agent spoke 3+ times, switch to other agent
    if (lastMessage.sender !== 'user') {
      const lastSpeakerCount = speakerCounts[lastMessage.sender] || 0;
      if (lastSpeakerCount >= 3) {
        // Switch to the other agent
        const otherAgent = agents.find(a => a.id !== lastMessage.sender);
        if (otherAgent) {
          return otherAgent.id;
        }
      }
    }

    // Priority 4: Simple alternation
    if (lastMessage.sender === 'user') {
      return agents[0]?.id || 'user';
    }

    const lastAgentIndex = agents.findIndex(a => a.id === lastMessage.sender);
    if (lastAgentIndex === -1) {
      return agents[0]?.id || 'user';
    }

    const nextAgentIndex = (lastAgentIndex + 1) % agents.length;
    return agents[nextAgentIndex].id;
  };

  // Run auto-chat loop
  const runAutoChat = async () => {
    // Check ref instead of state to avoid closure issues
    if (!autoChatActive.current || isLoading) {
      console.log('[AutoChat] Skipping - autoChatActive:', autoChatActive.current, 'isLoading:', isLoading);
      return;
    }

    console.log('[AutoChat] Starting iteration');

    try {
      const nextSpeaker = determineNextSpeaker();
      console.log('[AutoChat] Next speaker:', nextSpeaker);

      // If next speaker is 'user', pause auto-chat
      if (nextSpeaker === 'user') {
        stopAutoChat();
        toast({
          title: "Auto-Chat Paused",
          description: "An agent asked a question. Auto-chat has been paused.",
        });
        return;
      }

      const agent = agents.find(a => a.id === nextSpeaker);
      if (!agent) {
        console.log('[AutoChat] No agent found for:', nextSpeaker);
        return;
      }

      console.log('[AutoChat] Agent responding:', agent.name);
      setIsLoading(true);

      // Get agent response
      const response = await getAgentResponse(agent);

      // Add response to conversation
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: agent.id,
        recipient: "everyone",
        content: response,
        timestamp: Date.now(),
      };
      conversationManager.addMessage(newMessage);
      saveConversationState();

      setIsLoading(false);

      // Wait 2-3 seconds before next message
      if (autoChatActive.current) {
        const delay = 2000 + Math.random() * 1000; // 2-3 seconds
        console.log('[AutoChat] Scheduling next iteration in', delay, 'ms');
        setTimeout(() => {
          runAutoChat();
        }, delay);
      }
    } catch (error) {
      console.error("Error in auto-chat:", error);
      setIsLoading(false);
      stopAutoChat();
    }
  };

  const startAutoChat = () => {
    if (recipient !== "everyone") {
      toast({
        title: "Auto-Chat Only Works in Group Mode",
        description: "Please switch to 'everyone' to start auto-chat.",
        variant: "destructive",
      });
      return;
    }

    if (agents.length < 2) {
      toast({
        title: "Need Multiple Agents",
        description: "Auto-chat requires at least 2 agents configured.",
        variant: "destructive",
      });
      return;
    }

    console.log('[AutoChat] Starting auto-chat');
    autoChatActive.current = true;
    setIsAutoChat(true);
    toast({
      title: "Auto-Chat Started",
      description: "Agents will now chat autonomously.",
    });

    // Start the auto-chat loop
    setTimeout(() => runAutoChat(), 500);
  };

  const stopAutoChat = () => {
    console.log('[AutoChat] Stopping auto-chat');
    autoChatActive.current = false;
    setIsAutoChat(false);
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

        {/* Auto-Chat Button (only in group mode) */}
        {recipient === "everyone" && (
          <div className="flex justify-center">
            <Button
              onClick={isAutoChat ? stopAutoChat : startAutoChat}
              variant={isAutoChat ? "destructive" : "secondary"}
              disabled={isLoading && !isAutoChat}
              className="w-full max-w-xs"
            >
              {isAutoChat ? "Stop Auto Chat" : "Start Auto Chat"}
            </Button>
          </div>
        )}

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
            disabled={isLoading || isAutoChat}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isAutoChat}
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
