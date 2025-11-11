import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, apiKey, parameters } = req.body;

  if (!model || !messages || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Use HuggingFace's OpenAI-compatible endpoint
    const response = await fetch(
      'https://router.huggingface.co/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages, // Already in OpenAI format
          max_tokens: parameters?.max_new_tokens || 300,
          temperature: parameters?.temperature || 0.9,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('HF API Error:', error);
      return res.status(response.status).json({ error });
    }

    const result = await response.json();

    // Extract text from OpenAI-compatible response
    const generatedText = result.choices?.[0]?.message?.content || '';

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
