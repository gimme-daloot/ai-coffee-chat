import { useState, useEffect, useRef } from 'react';
import { Bug, Copy, Download, X, GripHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AgentConfig } from '@/types/agent';
import { ConversationStateManager, ConversationMode } from '@/lib/conversationStateManager';
import { debugEvents } from '@/lib/debugEventEmitter';
import { DebugEvent } from '@/types/debug';

interface DebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentConfig[];
  conversationManager: ConversationStateManager;
  conversationMode: ConversationMode;
}

const DebugPanel = ({ open, onOpenChange, agents, conversationManager, conversationMode }: DebugPanelProps) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [consoleLog, setConsoleLog] = useState<Array<{type: 'log' | 'error' | 'warn', message: string, timestamp: number}>>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to debug events for LIVE updates
  useEffect(() => {
    if (!open || !debugEvents) return;

    try {
      const unsubscribe = debugEvents.subscribe((event) => {
        setEvents((prev) => [...prev.slice(-100), event]); // Keep last 100 events
      });

      // Load existing events
      setEvents(debugEvents.getEvents());

      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to debug events:', error);
    }
  }, [open]);

  // Capture console logs for debugging
  useEffect(() => {
    if (!open) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    try {
      console.log = (...args) => {
        originalLog(...args);
        try {
          setConsoleLog(prev => [...prev.slice(-50), {
            type: 'log',
            message: args.map(a => {
              try {
                return typeof a === 'object' ? JSON.stringify(a) : String(a);
              } catch {
                return String(a);
              }
            }).join(' '),
            timestamp: Date.now()
          }]);
        } catch (e) {
          // Ignore errors in console capture
        }
      };

      console.error = (...args) => {
        originalError(...args);
        try {
          setConsoleLog(prev => [...prev.slice(-50), {
            type: 'error',
            message: args.map(a => {
              try {
                return typeof a === 'object' ? JSON.stringify(a) : String(a);
              } catch {
                return String(a);
              }
            }).join(' '),
            timestamp: Date.now()
          }]);
        } catch (e) {
          // Ignore errors in console capture
        }
      };

      console.warn = (...args) => {
        originalWarn(...args);
        try {
          setConsoleLog(prev => [...prev.slice(-50), {
            type: 'warn',
            message: args.map(a => {
              try {
                return typeof a === 'object' ? JSON.stringify(a) : String(a);
              } catch {
                return String(a);
              }
            }).join(' '),
            timestamp: Date.now()
          }]);
        } catch (e) {
          // Ignore errors in console capture
        }
      };
    } catch (error) {
      console.error('Failed to setup console capture:', error);
    }

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [open]);

  // Auto-scroll console
  useEffect(() => {
    try {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      // Ignore scroll errors
    }
  }, [consoleLog]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const copyToClipboard = () => {
    try {
      const allModes = conversationManager.getAvailableModes();
      const text = `
=== DEBUG STATE ===
Mode: ${conversationMode}
Agents: ${agents.length}

AGENTS:
${agents.map(a => `- ${a.emoji} ${a.name} (${a.id}) - ${a.provider}/${a.model}`).join('\n')}

CONVERSATIONS:
${allModes.map(mode => `- ${mode}: ${conversationManager.getMessages(mode).length} messages`).join('\n')}

RECENT EVENTS (${events.length}):
${events.slice(-20).map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.type}: ${JSON.stringify(e.data).substring(0, 100)}`).join('\n')}

CONSOLE LOGS (${consoleLog.length}):
${consoleLog.slice(-20).map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n')}
      `;
      navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadJson = () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        currentMode: conversationMode,
        agents: agents.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, provider: a.provider, model: a.model })),
        conversations: conversationManager.getAvailableModes().map(mode => ({
          mode,
          messages: conversationManager.getMessages(mode)
        })),
        events: events,
        consoleLogs: consoleLog,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download JSON:', error);
    }
  };

  if (!open) return null;

  let allModes: string[] = [];
  try {
    allModes = conversationManager.getAvailableModes();
  } catch (error) {
    console.error('Failed to get conversation modes:', error);
  }

  const recentEvents = events.slice(-20).reverse();
  const recentLogs = consoleLog.slice(-30).reverse();

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      }}
      className="w-[900px] h-[600px] bg-gray-950 border border-gray-700 rounded-lg shadow-2xl flex flex-col text-xs font-mono"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900 rounded-t-lg cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-gray-500" />
          <Bug className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-white">DEBUG MONITOR</span>
          <Badge variant="outline" className="text-[10px]">LIVE</Badge>
          <span className="text-gray-500 text-[10px]">Mode: {conversationMode}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={() => setEvents([])} variant="ghost" size="sm" className="h-6 px-2" title="Clear events">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button onClick={copyToClipboard} variant="ghost" size="sm" className="h-6 px-2" title="Copy">
            <Copy className="w-3 h-3" />
          </Button>
          <Button onClick={downloadJson} variant="ghost" size="sm" className="h-6 px-2" title="Download JSON">
            <Download className="w-3 h-3" />
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost" size="sm" className="h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-2 overflow-hidden">

        {/* Left Column */}
        <div className="flex flex-col gap-2 overflow-hidden">

          {/* State */}
          <div className="border border-gray-800 rounded bg-gray-900 p-2">
            <div className="text-[10px] text-gray-500 mb-1">SYSTEM STATE</div>
            <div className="space-y-1 text-[11px]">
              <div className="text-green-400">Agents: {agents?.length || 0}</div>
              <div className="text-blue-400">Conversations: {allModes.length}</div>
              <div className="text-yellow-400">Total Messages: {allModes.reduce((sum, mode) => {
                try {
                  return sum + conversationManager.getMessages(mode).length;
                } catch {
                  return sum;
                }
              }, 0)}</div>
            </div>
          </div>

          {/* Agents */}
          <div className="border border-gray-800 rounded bg-gray-900 p-2 flex-1 overflow-hidden">
            <div className="text-[10px] text-gray-500 mb-1">AGENTS</div>
            <ScrollArea className="h-[calc(100%-20px)]">
              {agents && agents.length > 0 ? agents.map(agent => {
                let msgs = [];
                try {
                  msgs = conversationManager.getMessagesForAgent(agent.id);
                } catch (error) {
                  console.error('Failed to get messages for agent:', error);
                }
                return (
                  <div key={agent.id} className="text-[11px] mb-2 border-l-2 border-blue-500 pl-2">
                    <div className="text-white">{agent.emoji} {agent.name}</div>
                    <div className="text-gray-500">ID: {agent.id}</div>
                    <div className="text-gray-500">{agent.provider}/{agent.model}</div>
                    <div className="text-green-400">{msgs.length} messages in context</div>
                  </div>
                );
              }) : <div className="text-gray-500 text-[11px]">No agents configured</div>}
            </ScrollArea>
          </div>

          {/* Message Counts */}
          <div className="border border-gray-800 rounded bg-gray-900 p-2">
            <div className="text-[10px] text-gray-500 mb-1">MESSAGE COUNTS</div>
            <ScrollArea className="h-[80px]">
              {allModes.length > 0 ? allModes.map(mode => {
                let count = 0;
                try {
                  count = conversationManager.getMessages(mode).length;
                } catch (error) {
                  console.error('Failed to get message count:', error);
                }
                return (
                  <div key={mode} className="flex justify-between text-[11px] text-gray-400">
                    <span>{mode}</span>
                    <span className="text-green-400">{count}</span>
                  </div>
                );
              }) : <div className="text-gray-500 text-[11px]">No conversations yet</div>}
            </ScrollArea>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-2 overflow-hidden">

          {/* Live Event Feed */}
          <div className="border border-gray-800 rounded bg-gray-900 p-2 flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-gray-500">EVENT STREAM (LIVE)</div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates"></div>
            </div>
            <ScrollArea className="h-[calc(100%-20px)]">
              {recentEvents.length > 0 ? recentEvents.map((event, idx) => {
                const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false });
                let color = 'text-gray-400';
                if (event.type === 'api_request_error') color = 'text-red-400';
                else if (event.type === 'api_request_success') color = 'text-green-400';
                else if (event.type === 'message_added') color = 'text-blue-400';
                else if (event.type === 'orchestrator_decision') color = 'text-yellow-400';

                let dataStr = '';
                try {
                  dataStr = typeof event.data === 'object' ? JSON.stringify(event.data).substring(0, 80) : String(event.data);
                } catch {
                  dataStr = '[Complex object]';
                }

                return (
                  <div key={idx} className={`text-[10px] mb-1 ${color}`}>
                    <span className="text-gray-600">[{time}]</span> {event.type}
                    <div className="text-gray-500 pl-4 truncate">{dataStr}</div>
                  </div>
                );
              }) : (
                <div className="text-gray-600 text-[11px]">No events yet. Interact with the app to see live updates.</div>
              )}
            </ScrollArea>
          </div>

          {/* Console Logs */}
          <div className="border border-red-900 rounded bg-gray-900 p-2 flex-1 overflow-hidden">
            <div className="text-[10px] text-red-500 mb-1">CONSOLE / ERRORS</div>
            <ScrollArea className="h-[calc(100%-20px)]">
              {recentLogs.length > 0 ? recentLogs.map((log, idx) => {
                let color = 'text-gray-400';
                if (log.type === 'error') color = 'text-red-400';
                else if (log.type === 'warn') color = 'text-yellow-400';

                return (
                  <div key={idx} className={`text-[10px] mb-1 ${color}`}>
                    <span className="text-gray-600">[{log.type.toUpperCase()}]</span> {log.message}
                  </div>
                );
              }) : (
                <div className="text-gray-600 text-[11px]">No console output yet.</div>
              )}
              <div ref={logEndRef} />
            </ScrollArea>
          </div>

        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-800 bg-gray-900 p-1 text-[10px] text-gray-500 flex justify-between rounded-b-lg">
        <span>Events: {events.length} | Logs: {consoleLog.length}</span>
        <span>Drag window to move • Can interact with app while open</span>
      </div>
    </div>
  );
};

export default DebugPanel;
