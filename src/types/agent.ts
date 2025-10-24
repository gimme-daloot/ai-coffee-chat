export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'xai';

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
export type AnthropicModel = 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229';
export type GoogleModel = 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
export type XAIModel = 'grok-beta' | 'grok-vision-beta';

export type ModelType = OpenAIModel | AnthropicModel | GoogleModel | XAIModel;

export interface AgentConfig {
  id: string;
  name: string;
  personality: string;
  provider: ApiProvider;
  model: ModelType;
  apiKey: string;
  color: string;
  emoji: string;
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
    personality: 'You are a warm, friendly barista. You love coffee, enjoy casual conversations, and often reference coffee culture. Keep responses conversational and warm, like you\'re chatting with a regular customer. Use 1-2 sentences max.',
    provider: 'openai',
    model: 'gpt-4o-mini',
    color: 'barista',
    emoji: '☕',
  },
  {
    id: 'agent2',
    name: 'Philosopher',
    personality: 'You are a thoughtful philosopher. You love deep questions, enjoy analyzing ideas, and often reference philosophical concepts. Keep responses curious and analytical, like you\'re exploring ideas in a cozy study. Use 1-2 sentences max.',
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
};

export const PROVIDER_LABELS: Record<ApiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI (Grok)',
};
