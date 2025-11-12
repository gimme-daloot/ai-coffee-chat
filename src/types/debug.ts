// Debug event types for the debug panel

export type DebugEventType =
  | 'message_added'
  | 'api_request_start'
  | 'api_request_success'
  | 'api_request_error'
  | 'orchestrator_decision'
  | 'memory_operation'
  | 'system_event';

export interface DebugEvent {
  id: string;
  timestamp: number;
  type: DebugEventType;
  data: any;
}

export interface MessageAddedEvent {
  messageId: string;
  sender: string;
  recipient: string;
  content: string;
  mode: 'group' | 'private';
  preview: string;
}

export interface ApiRequestStartEvent {
  requestId: string;
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  messageCount: number;
}

export interface ApiRequestSuccessEvent {
  requestId: string;
  agentId: string;
  agentName: string;
  responseTime: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ApiRequestErrorEvent {
  requestId: string;
  agentId: string;
  agentName: string;
  error: string;
  responseTime: number;
}

export interface OrchestratorDecisionEvent {
  decision: string;
  reason: string;
  affectedAgents?: string[];
  context?: any;
}

export interface MemoryOperationEvent {
  operation: 'add' | 'clear' | 'switch_mode' | 'export' | 'import';
  mode?: 'group' | 'private';
  details?: string;
}

export interface SystemEventEvent {
  event: string;
  details?: string;
  data?: any;
}

export interface AgentStatus {
  id: string;
  name: string;
  model: string;
  provider: string;
  lastResponseTime?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  apiCallStatus: 'idle' | 'pending' | 'success' | 'error';
  lastError?: string;
}

export interface AgentContextInfo {
  agentId: string;
  agentName: string;
  totalMessages: number;
  privateMessages: number;
  groupMessages: number;
  lastMessages: Array<{
    sender: string;
    recipient: string;
    content: string;
    timestamp: number;
  }>;
}
