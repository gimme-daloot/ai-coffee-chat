import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, apiKey, parameters } = req.body;

  // Validate required fields
  if (!model || !messages || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Format messages into a single prompt string for HF
    const prompt = formatMessagesForHF(messages);

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: parameters?.max_new_tokens || 300,
            temperature: parameters?.temperature || 0.9,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const result = await response.json();

    // Handle different response formats
    let generatedText = '';
    if (Array.isArray(result)) {
      generatedText = result[0]?.generated_text || '';
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    }

    return res.status(200).json({
      generated_text: generatedText
    });

  } catch (error) {
    console.error('HF API Error:', error);
    return res.status(500).json({
      error: 'Failed to call HuggingFace API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to format messages for HF
function formatMessagesForHF(messages: any[]): string {
  return messages.map(msg => {
    if (msg.role === 'system') {
      return `<|system|>\n${msg.content}`;
    } else if (msg.role === 'user') {
      return `<|user|>\n${msg.content}`;
    } else if (msg.role === 'assistant') {
      return `<|assistant|>\n${msg.content}`;
    }
    return msg.content;
  }).join('\n') + '\n<|assistant|>\n';
}
