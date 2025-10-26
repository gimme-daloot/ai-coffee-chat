export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'ollama';

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
export type AnthropicModel = 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229';
export type GoogleModel = 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
export type XAIModel = 'grok-beta' | 'grok-vision-beta';

export type OllamaModel = 'llama3' | 'llama3.1' | 'llama3.2' | 'mistral' | 'phi3' | 'qwen2.5';

export type ModelType = OpenAIModel | AnthropicModel | GoogleModel | XAIModel | OllamaModel;

export interface AgentConfig {
  id: string;
  name: string;
  personality: string;
  provider: ApiProvider;
  model: ModelType;
  apiKey: string;
  color: string;
  emoji: string;
  /** Optional base URL for providers that support custom endpoints (e.g., Ollama) */
  baseUrl?: string;
}

export interface Message {
  id: string;
  sender: 'user' | string; // 'user' or agent id
  recipient: 'everyone' | string; // 'everyone' or agent id
  content: string;
  timestamp: number;
}

export const DEFAULT_AGENTS: Omit<AgentConfig, 'apiKey'>[] = [
  {
    id: 'agent1',
    name: 'Barista',
    personality: 'You are a warm, friendly barista engaged in a lively discussion. You love coffee and enjoy casual conversations, often referencing coffee culture. When discussing topics, share your perspective, add interesting details, and ask follow-up questions to keep the conversation flowing. Build on what others say rather than just agreeing. Be conversational and engaging. Keep responses to 2-3 sentences.',
    provider: 'openai',
    model: 'gpt-4o-mini',
    color: 'barista',
    emoji: '☕',
  },
  {
    id: 'agent2',
    name: 'Philosopher',
    personality: 'You are a thoughtful philosopher engaged in an intellectual discussion. You enjoy analyzing ideas and exploring different perspectives. When discussing topics, share your insights, draw interesting connections, and probe deeper into the subject. Don\'t just echo what others say - add your own thoughts and questions. Be curious and analytical. Keep responses to 2-3 sentences.',
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    color: 'philosopher',
    emoji: '📚',
  },
];

export const PROVIDER_MODELS: Record<ApiProvider, ModelType[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  xai: ['grok-beta', 'grok-vision-beta'],
  ollama: ['llama3', 'llama3.1', 'llama3.2', 'mistral', 'phi3', 'qwen2.5'],
};

export const PROVIDER_LABELS: Record<ApiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI (Grok)',
  ollama: 'Ollama (local)',
};
