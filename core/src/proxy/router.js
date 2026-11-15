import { detectProvider, calculateCost, estimateTokens } from '../models/catalog.js';

/**
 * TokenArmor Universal Protocol Router
 * Translates OpenAI-standard chat completion requests to OpenAI, Anthropic, or Gemini APIs
 */
export async function forwardUpstream(payload, headers = {}) {
  const model = payload.model || 'gpt-4o-mini';
  const provider = detectProvider(model);

  // Check for provider API keys in env or incoming headers
  const authHeader = headers['authorization'] || '';
  const incomingApiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  const openaiKey = process.env.OPENAI_API_KEY || incomingApiKey;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || headers['x-api-key'] || incomingApiKey;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || incomingApiKey;

  // 1. Anthropic Claude translation
  if (provider === 'anthropic') {
    return await handleAnthropic(payload, anthropicKey, model);
  }

  // 2. Google Gemini translation
  if (provider === 'gemini') {
    return await handleGemini(payload, geminiKey, model);
  }

  // 3. Standard OpenAI proxy
  return await handleOpenAI(payload, openaiKey, model);
}

/**
 * Handle OpenAI Upstream
 */
async function handleOpenAI(payload, apiKey, model) {
  // If no API key configured, provide a simulated high-fidelity mock response for local testing
  if (!apiKey || apiKey === 'anonymous' || apiKey.startsWith('mock_')) {
    return generateMockResponse(model, payload.messages);
  }

  const endpoint = process.env.OPENAI_BASE_URL 
    ? `${process.env.OPENAI_BASE_URL}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Upstream Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Handle Anthropic Upstream & Translate to OpenAI Format
 */
async function handleAnthropic(payload, apiKey, model) {
  if (!apiKey || apiKey === 'anonymous' || apiKey.startsWith('mock_')) {
    return generateMockResponse(model, payload.messages);
  }

  // Extract system prompt if present
  let systemPrompt = '';
  const anthropicMessages = [];

  for (const msg of payload.messages || []) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }
  }

  const anthropicPayload = {
    model,
    messages: anthropicMessages,
    max_tokens: payload.max_tokens || 1024,
    temperature: payload.temperature ?? 0.7
  };
  if (systemPrompt) {
    anthropicPayload.system = systemPrompt;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(anthropicPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic Upstream Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Translate Anthropic response -> OpenAI format
  const content = data.content?.[0]?.text || '';
  const promptTokens = data.usage?.input_tokens || estimateTokens(payload.messages);
  const completionTokens = data.usage?.output_tokens || estimateTokens(content);

  return {
    id: 'chatcmpl-' + data.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}

/**
 * Handle Google Gemini Upstream & Translate to OpenAI Format
 */
async function handleGemini(payload, apiKey, model) {
  if (!apiKey || apiKey === 'anonymous' || apiKey.startsWith('mock_')) {
    return generateMockResponse(model, payload.messages);
  }

  // Clean model name (e.g. gemini-1.5-flash)
  const geminiModel = model.startsWith('gemini-') ? model : 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  // Convert OpenAI messages to Gemini contents
  const contents = (payload.messages || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
  }));

  const geminiPayload = {
    contents,
    generationConfig: {
      temperature: payload.temperature ?? 0.7,
      maxOutputTokens: payload.max_tokens || 1024
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Upstream Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text || '';
  
  const promptTokens = data.usageMetadata?.promptTokenCount || estimateTokens(payload.messages);
  const completionTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(content);

  return {
    id: 'chatcmpl-gemini-' + Math.random().toString(36).substring(2, 9),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}

/**
 * High-fidelity simulated response generator for zero-friction local testing
 */
function generateMockResponse(model, messages = []) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || 'Hello';
  const sampleReply = `[TokenArmor Gateway Demo Response]\nReceived query: "${String(lastUserMsg).slice(0, 50)}..." via ${model}. The request was proxied, tokenized, and tracked by TokenArmor.`;
  
  const promptTokens = estimateTokens(messages);
  const completionTokens = estimateTokens(sampleReply);

  return {
    id: 'chatcmpl-mock-' + Math.random().toString(36).substring(2, 9),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: sampleReply
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}
