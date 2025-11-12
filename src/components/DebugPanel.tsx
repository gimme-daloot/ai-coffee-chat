import { useMemo } from 'react';
import { Bug, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AgentConfig, Message } from '@/types/agent';
import { ConversationStateManager, ConversationMode } from '@/lib/conversationStateManager';
import { useToast } from '@/hooks/use-toast';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentConfig[];
  conversationManager: ConversationStateManager;
  conversationMode: ConversationMode;
  messageVersion: number;
}

export function DebugPanel({
  isOpen,
  onClose,
  agents,
  conversationManager,
  conversationMode,
  messageVersion,
}: DebugPanelProps) {
  const { toast } = useToast();

  // Get all messages across all conversations
  const allMessages = useMemo(() => {
    const modes = conversationManager.getAvailableModes();
    const messages: Array<Message & { conversation: string }> = [];

    modes.forEach((mode) => {
      const modeMessages = conversationManager.getMessages(mode);
      modeMessages.forEach((msg) => {
        messages.push({
          ...msg,
          conversation: mode,
        });
      });
    });

    // Sort by timestamp and take last 10
    return messages.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [conversationManager, messageVersion]);

  // Get message counts per conversation
  const messageCounts = useMemo(() => {
    const modes = conversationManager.getAvailableModes();
    const counts: Record<string, number> = {};

    modes.forEach((mode) => {
      counts[mode] = conversationManager.getMessages(mode).length;
    });

    return counts;
  }, [conversationManager, messageVersion]);

  // Get agent memory views
  const agentMemoryViews = useMemo(() => {
    return agents.map((agent) => {
      const messages = conversationManager.getMessagesForAgent(agent.id);
      return {
        agent,
        totalMessages: messages.length,
        lastMessages: messages.slice(-3),
      };
    });
  }, [agents, conversationManager, messageVersion]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const generateDebugText = () => {
    let text = '=== AI COFFEEHOUSE DEBUG STATE ===\n\n';

    text += `Current Conversation Mode: ${conversationMode}\n`;
    text += `Timestamp: ${new Date().toISOString()}\n\n`;

    text += '--- AGENTS ---\n';
    agents.forEach((agent) => {
      text += `${agent.emoji} ${agent.name} (${agent.id})\n`;
      text += `  Provider: ${agent.provider}\n`;
      text += `  Model: ${agent.model}\n`;
    });

    text += '\n--- MESSAGE COUNTS ---\n';
    Object.entries(messageCounts).forEach(([mode, count]) => {
      const label = mode === 'group' ? 'Group Chat' : agents.find((a) => a.id === mode)?.name || mode;
      text += `${label}: ${count} messages\n`;
    });

    text += '\n--- LAST 10 MESSAGES ---\n';
    allMessages.forEach((msg) => {
      const sender = msg.sender === 'user' ? 'User' : agents.find((a) => a.id === msg.sender)?.name || msg.sender;
      const recipient = msg.recipient === 'everyone' ? 'Everyone' : agents.find((a) => a.id === msg.recipient)?.name || msg.recipient;
      const conversation = msg.conversation === 'group' ? 'Group' : agents.find((a) => a.id === msg.conversation)?.name || msg.conversation;
      const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
      text += `[${formatTimestamp(msg.timestamp)}] ${sender} → ${recipient} (${conversation})\n`;
      text += `  ${preview}\n`;
    });

    text += '\n--- AGENT MEMORY VIEWS ---\n';
    agentMemoryViews.forEach(({ agent, totalMessages, lastMessages }) => {
      text += `\n${agent.emoji} ${agent.name}:\n`;
      text += `  Total messages in context: ${totalMessages}\n`;
      text += `  Last 3 messages:\n`;
      lastMessages.forEach((msg) => {
        const sender = msg.sender === 'user' ? 'User' : agents.find((a) => a.id === msg.sender)?.name || msg.sender;
        const preview = msg.content.substring(0, 40) + (msg.content.length > 40 ? '...' : '');
        text += `    [${formatTimestamp(msg.timestamp)}] ${sender}: ${preview}\n`;
      });
    });

    return text;
  };

  const generateDebugJSON = () => {
    return {
      timestamp: new Date().toISOString(),
      conversationMode,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        provider: a.provider,
        model: a.model,
      })),
      messageCounts,
      lastMessages: allMessages,
      agentMemoryViews: agentMemoryViews.map(({ agent, totalMessages, lastMessages }) => ({
        agentId: agent.id,
        agentName: agent.name,
        totalMessages,
        lastMessages,
      })),
      fullState: conversationManager.exportStates(),
    };
  };

  const handleCopyToClipboard = () => {
    const text = generateDebugText();
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: 'Debug state has been copied to clipboard',
      });
    });
  };

  const handleDownloadJSON = () => {
    const json = generateDebugJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Download started',
      description: 'Debug state JSON has been downloaded',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Debug Panel
          </DialogTitle>
          <DialogDescription>
            Diagnostic information for troubleshooting conversation state and agent memory
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handleCopyToClipboard} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownloadJSON} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Current Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Conversation Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-base">
                  {conversationMode === 'group'
                    ? 'Group Chat'
                    : `Private: ${agents.find((a) => a.id === conversationMode)?.name || conversationMode}`}
                </Badge>
              </CardContent>
            </Card>

            {/* Agents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Agents ({agents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-start gap-2 p-2 bg-muted rounded-lg text-sm"
                    >
                      <span className="text-xl">{agent.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {agent.id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.provider} / {agent.model}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message Counts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Message Counts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(messageCounts).map(([mode, count]) => {
                    const label =
                      mode === 'group'
                        ? 'Group Chat'
                        : agents.find((a) => a.id === mode)?.name || mode;
                    return (
                      <div key={mode} className="flex justify-between text-sm">
                        <span>{label}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Last 10 Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last 10 Messages (All Conversations)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allMessages.map((msg) => {
                    const sender =
                      msg.sender === 'user'
                        ? 'User'
                        : agents.find((a) => a.id === msg.sender)?.name || msg.sender;
                    const recipient =
                      msg.recipient === 'everyone'
                        ? 'Everyone'
                        : agents.find((a) => a.id === msg.recipient)?.name || msg.recipient;
                    const conversation =
                      msg.conversation === 'group'
                        ? 'Group'
                        : agents.find((a) => a.id === msg.conversation)?.name || msg.conversation;
                    const preview =
                      msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');

                    return (
                      <div key={msg.id} className="p-2 bg-muted rounded-lg text-sm space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTimestamp(msg.timestamp)}</span>
                          <Badge variant="outline" className="text-xs">
                            {conversation}
                          </Badge>
                        </div>
                        <div className="font-medium">
                          {sender} → {recipient}
                        </div>
                        <div className="text-muted-foreground">{preview}</div>
                      </div>
                    );
                  })}
                  {allMessages.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No messages yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agent Memory Views */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Agent Memory Views</CardTitle>
                <CardDescription>
                  What each agent sees via getMessagesForAgent()
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentMemoryViews.map(({ agent, totalMessages, lastMessages }) => (
                    <div key={agent.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{agent.emoji}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{agent.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {totalMessages} messages in context
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Last 3 messages:
                        </div>
                        {lastMessages.map((msg) => {
                          const sender =
                            msg.sender === 'user'
                              ? 'User'
                              : agents.find((a) => a.id === msg.sender)?.name || msg.sender;
                          const preview =
                            msg.content.substring(0, 40) + (msg.content.length > 40 ? '...' : '');
                          return (
                            <div
                              key={msg.id}
                              className="text-xs bg-muted/50 rounded p-2 space-y-1"
                            >
                              <div className="text-muted-foreground">
                                [{formatTimestamp(msg.timestamp)}] {sender}
                              </div>
                              <div>{preview}</div>
                            </div>
                          );
                        })}
                        {lastMessages.length === 0 && (
                          <div className="text-xs text-muted-foreground italic">
                            No messages yet
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
