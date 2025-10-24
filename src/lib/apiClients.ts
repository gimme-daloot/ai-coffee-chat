import { AgentConfig, Message } from '@/types/agent';

interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function convertMessagesToApiFormat(messages: Message[], agentId: string): ApiMessage[] {
  return messages
    .filter(msg => {
      // Include messages where this agent is the recipient or everyone
      return msg.recipient === 'everyone' || msg.recipient === agentId;
    })
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
}

export async function callOpenAI(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const apiMessages = convertMessagesToApiFormat(messages, agent.id);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.personality },
        ...apiMessages,
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || `OpenAI API error: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function callAnthropic(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const apiMessages = convertMessagesToApiFormat(messages, agent.id);
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': agent.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model,
      max_tokens: 150,
      system: agent.personality,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || `Anthropic API error: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function callGoogle(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const apiMessages = convertMessagesToApiFormat(messages, agent.id);
  
  const contents = apiMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${agent.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: agent.personality }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || `Google API error: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function callXAI(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const apiMessages = convertMessagesToApiFormat(messages, agent.id);
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agent.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.personality },
        ...apiMessages,
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || `xAI API error: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function callAgent(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  switch (agent.provider) {
    case 'openai':
      return callOpenAI(agent, messages);
    case 'anthropic':
      return callAnthropic(agent, messages);
    case 'google':
      return callGoogle(agent, messages);
    case 'xai':
      return callXAI(agent, messages);
    default:
      throw new ApiError(`Unsupported provider: ${agent.provider}`);
  }
}
