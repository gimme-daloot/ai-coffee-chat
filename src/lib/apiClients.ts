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

function getLocalModeConfig(): { enabled: boolean; baseUrl?: string } {
  try {
    if (typeof window === 'undefined') return { enabled: false };
    const enabled = localStorage.getItem('coffeehouse-local-mode') === 'true';
    const baseUrl = localStorage.getItem('coffeehouse-ollama-base-url') || undefined;
    return { enabled, baseUrl };
  } catch {
    return { enabled: false };
  }
}

function convertMessagesToApiFormat(messages: Message[], agentId: string): ApiMessage[] {
  const filtered = messages
    .filter(msg => {
      // Include messages where:
      // 1. This agent is the recipient (messages TO this agent)
      // 2. This agent is the sender (messages FROM this agent - preserves context)
      // 3. Message is to everyone (group chat messages)
      return msg.recipient === 'everyone' ||
             msg.recipient === agentId ||
             msg.sender === agentId;
    })
    .map(msg => ({
      // Messages from THIS agent are 'assistant' messages
      // Messages from the user OR other agents are 'user' messages
      // This ensures proper conversation flow for the API
      role: msg.sender === agentId ? 'assistant' : 'user',
      content: msg.content,
    }));

  // Check for consecutive assistant messages (API violation)
  for (let i = 1; i < filtered.length; i++) {
    if (filtered[i].role === 'assistant' && filtered[i-1].role === 'assistant') {
      console.error(`[API Debug] CONSECUTIVE ASSISTANT MESSAGES for ${agentId} at index ${i}:`, {
        previous: filtered[i-1],
        current: filtered[i],
        allMessages: filtered,
      });
    }
  }

  console.log(`[API Debug] Messages for ${agentId}:`, filtered);
  return filtered;
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
      max_tokens: 300,
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

  // Validate response has content
  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    throw new ApiError('OpenAI API returned empty response');
  }

  const content = data.choices[0].message.content;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new ApiError('OpenAI API returned empty text content');
  }

  return content;
}

export async function callOllama(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const apiMessages = convertMessagesToApiFormat(messages, agent.id);

  // Ollama default base URL
  const baseUrl = agent.baseUrl?.replace(/\/$/, '') || 'http://localhost:11434';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.personality },
        ...apiMessages,
      ],
      stream: false,
      options: {
        temperature: 0.9,
        num_ctx: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new ApiError(
      errorText || `Ollama API error: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();

  // Ollama returns { message: { content: string } }
  const content = data?.message?.content;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new ApiError('Ollama API returned empty text content');
  }

  return content;
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
      max_tokens: 300,
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

  console.log(`[Anthropic API] Raw response for ${agent.name}:`, data);

  // Validate response has content
  if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
    console.error(`[Anthropic API] Empty response for ${agent.name}:`, data);
    throw new ApiError('Anthropic API returned empty response');
  }

  const text = data.content[0].text;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error(`[Anthropic API] Empty text for ${agent.name}:`, { text, fullContent: data.content[0] });
    throw new ApiError('Anthropic API returned empty text content');
  }

  console.log(`[Anthropic API] Response text for ${agent.name}:`, text);
  return text;
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
          maxOutputTokens: 300,
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

  // Validate response has content
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    throw new ApiError('Google API returned empty response');
  }

  const text = data.candidates[0].content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError('Google API returned empty text content');
  }

  return text;
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
      max_tokens: 300,
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

  // Validate response has content
  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    throw new ApiError('xAI API returned empty response');
  }

  const content = data.choices[0].message.content;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new ApiError('xAI API returned empty text content');
  }

  return content;
}

export async function callAgent(
  agent: AgentConfig,
  messages: Message[]
): Promise<string> {
  const { enabled: localModeEnabled, baseUrl: localModeBaseUrl } = getLocalModeConfig();
  if (localModeEnabled && agent.provider !== 'ollama') {
    // Route all providers through Ollama when local mode is enabled
    const ollamaAgent: AgentConfig = {
      ...agent,
      provider: 'ollama',
      // If user set agent-specific baseUrl, prefer it; otherwise use global local mode baseUrl
      baseUrl: agent.baseUrl || localModeBaseUrl,
      // Model can remain as-is; Ollama will error if unsupported. Prefer a common default.
      model: (typeof agent.model === 'string' ? agent.model : 'llama3') as any,
      apiKey: '',
    };
    return callOllama(ollamaAgent, messages);
  }
  switch (agent.provider) {
    case 'openai':
      return callOpenAI(agent, messages);
    case 'anthropic':
      return callAnthropic(agent, messages);
    case 'google':
      return callGoogle(agent, messages);
    case 'xai':
      return callXAI(agent, messages);
    case 'ollama':
      return callOllama(agent, messages);
    default:
      throw new ApiError(`Unsupported provider: ${agent.provider}`);
  }
}
