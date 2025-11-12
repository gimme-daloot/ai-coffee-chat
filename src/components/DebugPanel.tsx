import { useState, useEffect, useRef, useMemo } from 'react';
import { debugEvents } from '@/lib/debugEventEmitter';
import {
  DebugEvent,
  MessageAddedEvent,
  ApiRequestStartEvent,
  ApiRequestSuccessEvent,
  ApiRequestErrorEvent,
  OrchestratorDecisionEvent,
  MemoryOperationEvent,
  SystemEventEvent,
  AgentStatus,
  AgentContextInfo,
} from '@/types/debug';
import { AgentConfig } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Trash2,
  Clock,
  Activity,
  MessageSquare,
  Database,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentConfig[];
  conversationStateManager?: any;
}

export function DebugPanel({
  isOpen,
  onClose,
  agents,
  conversationStateManager,
}: DebugPanelProps) {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    agentStatus: true,
    messageFlow: true,
    contextInspection: false,
    apiCalls: true,
    systemEvents: true,
  });

  // Subscribe to debug events
  useEffect(() => {
    const unsubscribe = debugEvents.subscribe((event) => {
      setEvents((prev) => [...prev, event]);

      // Update agent statuses based on events
      if (event.type === 'api_request_start') {
        const data = event.data as ApiRequestStartEvent;
        setAgentStatuses((prev) => {
          const updated = new Map(prev);
          const status = updated.get(data.agentId) || {
            id: data.agentId,
            name: data.agentName,
            model: data.model,
            provider: data.provider,
            apiCallStatus: 'idle' as const,
          };
          updated.set(data.agentId, { ...status, apiCallStatus: 'pending' });
          return updated;
        });
      } else if (event.type === 'api_request_success') {
        const data = event.data as ApiRequestSuccessEvent;
        setAgentStatuses((prev) => {
          const updated = new Map(prev);
          const status = updated.get(data.agentId);
          if (status) {
            updated.set(data.agentId, {
              ...status,
              apiCallStatus: 'success',
              lastResponseTime: data.responseTime,
              tokenUsage: data.tokenUsage
                ? {
                    promptTokens: data.tokenUsage.promptTokens || 0,
                    completionTokens: data.tokenUsage.completionTokens || 0,
                    totalTokens: data.tokenUsage.totalTokens || 0,
                  }
                : status.tokenUsage,
            });
          }
          return updated;
        });
      } else if (event.type === 'api_request_error') {
        const data = event.data as ApiRequestErrorEvent;
        setAgentStatuses((prev) => {
          const updated = new Map(prev);
          const status = updated.get(data.agentId);
          if (status) {
            updated.set(data.agentId, {
              ...status,
              apiCallStatus: 'error',
              lastError: data.error,
              lastResponseTime: data.responseTime,
            });
          }
          return updated;
        });
      }
    });

    // Load existing events
    setEvents(debugEvents.getEvents());

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Filter events by selected agent
  const filteredEvents = useMemo(() => {
    if (!selectedAgent) return events;

    return events.filter((event) => {
      if (event.type === 'message_added') {
        const data = event.data as MessageAddedEvent;
        return (
          data.sender === selectedAgent ||
          data.recipient === selectedAgent ||
          data.recipient === 'everyone'
        );
      }
      if (
        event.type === 'api_request_start' ||
        event.type === 'api_request_success' ||
        event.type === 'api_request_error'
      ) {
        return event.data.agentId === selectedAgent;
      }
      return true; // Show all other events
    });
  }, [events, selectedAgent]);

  // Get context info for selected agent
  const contextInfo = useMemo<AgentContextInfo | null>(() => {
    if (!selectedAgent || !conversationStateManager) return null;

    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) return null;

    const messages = conversationStateManager.getMessagesForAgent(selectedAgent);
    const groupMessages = conversationStateManager.getGroupMessages();
    const privateMessages = conversationStateManager.getPrivateMessages(selectedAgent);

    return {
      agentId: selectedAgent,
      agentName: agent.name,
      totalMessages: messages.length,
      privateMessages: privateMessages.length,
      groupMessages: groupMessages.length,
      lastMessages: messages.slice(-5).map((m: any) => ({
        sender: m.sender,
        recipient: m.recipient,
        content: m.content.substring(0, 100),
        timestamp: m.timestamp,
      })),
    };
  }, [selectedAgent, agents, conversationStateManager, events]);

  const handleExport = () => {
    const data = debugEvents.exportEvents();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    debugEvents.clear();
    setEvents([]);
    setAgentStatuses(new Map());
  };

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getEventColor = (event: DebugEvent) => {
    switch (event.type) {
      case 'message_added':
        const msgData = event.data as MessageAddedEvent;
        return msgData.sender === 'user' ? 'text-blue-400' : 'text-green-400';
      case 'api_request_error':
        return 'text-red-400';
      case 'system_event':
      case 'orchestrator_decision':
        return 'text-yellow-400';
      case 'memory_operation':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: AgentStatus['apiCallStatus']) => {
    const variants: Record<typeof status, { label: string; className: string }> = {
      idle: { label: 'Idle', className: 'bg-gray-600' },
      pending: { label: 'Pending', className: 'bg-yellow-600 animate-pulse' },
      success: { label: 'Success', className: 'bg-green-600' },
      error: { label: 'Error', className: 'bg-red-600' },
    };
    const variant = variants[status];
    return (
      <Badge className={cn('text-xs', variant.className)}>{variant.label}</Badge>
    );
  };

  if (!isOpen || !debugEvents.isEnabled()) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-gray-950 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Debug Monitor</h2>
          <Badge variant="outline" className="text-xs">
            DEV
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            title="Export logs as JSON"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Agent Filter */}
      <div className="p-3 border-b border-gray-800 bg-gray-900">
        <label className="text-xs text-gray-400 mb-1 block">Filter by Agent:</label>
        <select
          value={selectedAgent || ''}
          onChange={(e) => setSelectedAgent(e.target.value || null)}
          className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
        >
          <option value="">All Agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.emoji} {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* Agent Status Section */}
          <Collapsible
            open={sectionsOpen.agentStatus}
            onOpenChange={() => toggleSection('agentStatus')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-900 rounded hover:bg-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-white">Agent Status</span>
              </div>
              {sectionsOpen.agentStatus ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {agents.map((agent) => {
                const status = agentStatuses.get(agent.id);
                return (
                  <div
                    key={agent.id}
                    className="p-3 bg-gray-900 rounded border border-gray-800 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{agent.emoji}</span>
                        <span className="font-semibold text-white">{agent.name}</span>
                      </div>
                      {status && getStatusBadge(status.apiCallStatus)}
                    </div>
                    <div className="space-y-1 text-gray-400">
                      <div>
                        <span className="text-gray-500">Model:</span> {agent.model}
                      </div>
                      <div>
                        <span className="text-gray-500">Provider:</span> {agent.provider}
                      </div>
                      {status?.lastResponseTime && (
                        <div>
                          <span className="text-gray-500">Last Response:</span>{' '}
                          {status.lastResponseTime}ms
                        </div>
                      )}
                      {status?.tokenUsage && (
                        <div>
                          <span className="text-gray-500">Tokens:</span>{' '}
                          {status.tokenUsage.totalTokens} (
                          {status.tokenUsage.promptTokens}/
                          {status.tokenUsage.completionTokens})
                        </div>
                      )}
                      {status?.lastError && (
                        <div className="text-red-400 mt-1">
                          <span className="text-gray-500">Error:</span>{' '}
                          {status.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* Context Inspection Section */}
          {selectedAgent && contextInfo && (
            <Collapsible
              open={sectionsOpen.contextInspection}
              onOpenChange={() => toggleSection('contextInspection')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-900 rounded hover:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">
                    Context: {contextInfo.agentName}
                  </span>
                </div>
                {sectionsOpen.contextInspection ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-gray-900 rounded border border-gray-800 font-mono text-xs space-y-2">
                  <div className="text-gray-400">
                    <span className="text-gray-500">Total Messages:</span>{' '}
                    {contextInfo.totalMessages}
                  </div>
                  <div className="text-gray-400">
                    <span className="text-gray-500">Private Messages:</span>{' '}
                    {contextInfo.privateMessages}
                  </div>
                  <div className="text-gray-400">
                    <span className="text-gray-500">Group Messages:</span>{' '}
                    {contextInfo.groupMessages}
                  </div>
                  <div className="mt-3">
                    <div className="text-gray-500 mb-1">Last 5 Messages:</div>
                    <div className="space-y-1">
                      {contextInfo.lastMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className="text-gray-400 pl-2 border-l-2 border-gray-700"
                        >
                          <div className="text-gray-500">
                            {msg.sender} → {msg.recipient}
                          </div>
                          <div className="truncate">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Message Flow Section */}
          <Collapsible
            open={sectionsOpen.messageFlow}
            onOpenChange={() => toggleSection('messageFlow')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-900 rounded hover:bg-gray-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">
                  Message Flow ({filteredEvents.filter((e) => e.type === 'message_added').length})
                </span>
              </div>
              {sectionsOpen.messageFlow ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {filteredEvents
                .filter((e) => e.type === 'message_added')
                .map((event) => {
                  const data = event.data as MessageAddedEvent;
                  return (
                    <div
                      key={event.id}
                      className="p-2 bg-gray-900 rounded border border-gray-800 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {data.mode}
                        </Badge>
                      </div>
                      <div className={cn('mb-1', getEventColor(event))}>
                        {data.sender} → {data.recipient}
                      </div>
                      <div className="text-gray-400 truncate">{data.preview}</div>
                    </div>
                  );
                })}
            </CollapsibleContent>
          </Collapsible>

          {/* API Call Monitor Section */}
          <Collapsible
            open={sectionsOpen.apiCalls}
            onOpenChange={() => toggleSection('apiCalls')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-900 rounded hover:bg-gray-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-white">
                  API Calls (
                  {
                    filteredEvents.filter((e) =>
                      ['api_request_start', 'api_request_success', 'api_request_error'].includes(
                        e.type
                      )
                    ).length
                  }
                  )
                </span>
              </div>
              {sectionsOpen.apiCalls ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {filteredEvents
                .filter((e) =>
                  ['api_request_start', 'api_request_success', 'api_request_error'].includes(
                    e.type
                  )
                )
                .map((event) => {
                  const isStart = event.type === 'api_request_start';
                  const isSuccess = event.type === 'api_request_success';
                  const isError = event.type === 'api_request_error';

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'p-2 bg-gray-900 rounded border font-mono text-xs',
                        isError ? 'border-red-900' : 'border-gray-800'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        {isStart && (
                          <Badge className="bg-yellow-600 text-xs">Starting</Badge>
                        )}
                        {isSuccess && (
                          <Badge className="bg-green-600 text-xs">Success</Badge>
                        )}
                        {isError && <Badge className="bg-red-600 text-xs">Error</Badge>}
                      </div>
                      <div className="text-white mb-1">
                        {event.data.agentName} ({event.data.provider || event.data.model})
                      </div>
                      {isStart && (
                        <div className="text-gray-400">
                          Messages: {event.data.messageCount}
                        </div>
                      )}
                      {isSuccess && (
                        <div className="text-gray-400">
                          Response Time: {event.data.responseTime}ms
                          {event.data.tokenUsage && (
                            <span className="ml-2">
                              | Tokens: {event.data.tokenUsage.totalTokens}
                            </span>
                          )}
                        </div>
                      )}
                      {isError && (
                        <div className="text-red-400 mt-1">{event.data.error}</div>
                      )}
                    </div>
                  );
                })}
            </CollapsibleContent>
          </Collapsible>

          {/* System Events Section */}
          <Collapsible
            open={sectionsOpen.systemEvents}
            onOpenChange={() => toggleSection('systemEvents')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-900 rounded hover:bg-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-white">
                  System Events (
                  {
                    filteredEvents.filter((e) =>
                      ['orchestrator_decision', 'memory_operation', 'system_event'].includes(
                        e.type
                      )
                    ).length
                  }
                  )
                </span>
              </div>
              {sectionsOpen.systemEvents ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {filteredEvents
                .filter((e) =>
                  ['orchestrator_decision', 'memory_operation', 'system_event'].includes(
                    e.type
                  )
                )
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-2 bg-gray-900 rounded border border-gray-800 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {event.type === 'orchestrator_decision' && (
                      <div>
                        <div className="text-yellow-400 mb-1">
                          {(event.data as OrchestratorDecisionEvent).decision}
                        </div>
                        <div className="text-gray-400">
                          {(event.data as OrchestratorDecisionEvent).reason}
                        </div>
                        {(event.data as OrchestratorDecisionEvent).affectedAgents && (
                          <div className="text-gray-500 mt-1">
                            Agents:{' '}
                            {(event.data as OrchestratorDecisionEvent).affectedAgents?.join(
                              ', '
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {event.type === 'memory_operation' && (
                      <div>
                        <div className="text-purple-400 mb-1">
                          {(event.data as MemoryOperationEvent).operation}
                        </div>
                        <div className="text-gray-400">
                          {(event.data as MemoryOperationEvent).details}
                        </div>
                      </div>
                    )}
                    {event.type === 'system_event' && (
                      <div>
                        <div className="text-yellow-400 mb-1">
                          {(event.data as SystemEventEvent).event}
                        </div>
                        {(event.data as SystemEventEvent).details && (
                          <div className="text-gray-400">
                            {(event.data as SystemEventEvent).details}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredEvents.length} events</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>
      </div>
    </div>
  );
}
