import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentConfig } from "@/types/agent";
import { ConversationStateManager, ConversationMode } from "@/lib/conversationStateManager";
import { Copy, Download } from "lucide-react";

interface DebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentConfig[];
  conversationManager: ConversationStateManager;
  conversationMode: ConversationMode;
}

const DebugPanel = ({ open, onOpenChange, agents, conversationManager, conversationMode }: DebugPanelProps) => {

  // Get all conversation modes
  const allModes = conversationManager.getAvailableModes();

  // Get message counts
  const messageCounts = allModes.map(mode => ({
    mode,
    count: conversationManager.getMessages(mode).length
  }));

  // Get recent messages (last 20 across all conversations)
  const allMessages = allModes.flatMap(mode =>
    conversationManager.getMessages(mode).map(msg => ({
      ...msg,
      conversationMode: mode
    }))
  )
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 20);

  // Get what each agent actually sees
  const agentViews = agents.map(agent => {
    const messages = conversationManager.getMessagesForAgent(agent.id);
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      messageCount: messages.length,
      messages: messages.slice(-5) // Last 5 messages
    };
  });

  const copyToClipboard = () => {
    const text = `
=== DEBUG INFO ===
Current Mode: ${conversationMode}
Agents: ${agents.length}

AGENTS:
${agents.map(a => `- ${a.emoji} ${a.name} (${a.id})`).join('\n')}

MESSAGE COUNTS:
${messageCounts.map(m => `- ${m.mode}: ${m.count} messages`).join('\n')}

RECENT MESSAGES:
${allMessages.map(m => `[${m.conversationMode}] ${m.sender} → ${m.recipient}: ${m.content.substring(0, 50)}...`).join('\n')}

AGENT VIEWS:
${agentViews.map(av => `
${av.agentEmoji} ${av.agentName} sees ${av.messageCount} messages:
${av.messages.map(m => `  - ${m.sender} → ${m.recipient}: ${m.content.substring(0, 40)}...`).join('\n')}
`).join('\n')}
    `;

    navigator.clipboard.writeText(text);
  };

  const downloadJson = () => {
    const data = {
      timestamp: new Date().toISOString(),
      currentMode: conversationMode,
      agents: agents.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, provider: a.provider, model: a.model })),
      conversations: allModes.map(mode => ({
        mode,
        messages: conversationManager.getMessages(mode)
      })),
      agentViews
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coffeehouse-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>🐛 Debug Panel</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={downloadJson} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="space-y-4 pr-4">

            {/* Current State */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">📊 Current State</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Mode:</strong> <code className="bg-background px-2 py-1 rounded">{conversationMode}</code></p>
                <p><strong>Agents Configured:</strong> {agents.length}</p>
                <p><strong>Total Conversations:</strong> {allModes.length}</p>
              </div>
            </div>

            {/* Agents */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">🤖 Agents</h3>
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents configured</p>
              ) : (
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div key={agent.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                      <div><strong>{agent.emoji} {agent.name}</strong></div>
                      <div className="text-muted-foreground">
                        ID: <code className="text-xs">{agent.id}</code> |
                        {agent.provider}/{agent.model}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Counts */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">💬 Message Counts by Conversation</h3>
              {messageCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              ) : (
                <div className="space-y-1">
                  {messageCounts.map(({ mode, count }) => (
                    <div key={mode} className="text-sm flex justify-between">
                      <code className="text-xs bg-background px-2 py-1 rounded">{mode}</code>
                      <span className="font-mono">{count} messages</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Messages */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">📝 Recent Messages (Last 20)</h3>
              {allMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {allMessages.map(msg => {
                    const agentInfo = agents.find(a => a.id === msg.sender);
                    return (
                      <div key={msg.id} className="text-xs border-b pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-background px-1 rounded text-[10px]">{msg.conversationMode}</code>
                          <span className="font-semibold">
                            {msg.sender === 'user' ? '🧍 You' : `${agentInfo?.emoji} ${agentInfo?.name || msg.sender}`}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span>{msg.recipient === 'everyone' ? '☕ Everyone' : msg.recipient}</span>
                        </div>
                        <p className="text-muted-foreground pl-4">{msg.content.substring(0, 100)}...</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Agent Memory Views */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-lg mb-3">🧠 What Each Agent Sees</h3>
              {agentViews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents configured</p>
              ) : (
                <div className="space-y-4">
                  {agentViews.map(view => (
                    <div key={view.agentId} className="border-l-4 border-primary pl-4">
                      <div className="font-semibold mb-2">
                        {view.agentEmoji} {view.agentName}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({view.messageCount} messages)
                        </span>
                      </div>
                      {view.messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No messages in memory</p>
                      ) : (
                        <div className="space-y-1">
                          {view.messages.map((msg, idx) => {
                            const senderInfo = msg.sender === 'user' ? null : agents.find(a => a.id === msg.sender);
                            return (
                              <div key={idx} className="text-xs text-muted-foreground">
                                {msg.sender === 'user' ? '🧍' : senderInfo?.emoji} → {msg.recipient}:
                                <span className="ml-1">{msg.content.substring(0, 60)}...</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DebugPanel;
