/**
 * AI Provider abstraction layer.
 * Supports: OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama (local).
 */
export interface AIProvider {
  name: string;
  /** Send a prompt and get a streaming response. Yields chunks as they arrive. */
  streamChat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<string>;

  /** Send a prompt and get the full response (non-streaming). */
  chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<string>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** JSON schema for structured output */
  responseFormat?: 'json_object' | 'text';
}

export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
}

// ── OpenAI Provider ──
class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4o';
  }

  async *streamChat(messages: AIMessage[], options?: AIChatOptions): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
        stream: true,
        ...(options?.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: options?.signal,
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }

  async chat(messages: AIMessage[], options?: AIChatOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(messages, options)) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

// ── Anthropic Provider ──
class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-sonnet-4-20250514';
  }

  async *streamChat(messages: AIMessage[], options?: AIChatOptions): AsyncGenerator<string> {
    // Extract system message
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
        system: systemMsg?.content,
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'content_block_delta') {
              yield json.delta?.text || '';
            }
          } catch {}
        }
      }
    }
  }

  async chat(messages: AIMessage[], options?: AIChatOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(messages, options)) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

// ── Google Gemini Provider ──
class GeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string;
  private defaultModel: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gemini-2.5-pro';
  }

  async *streamChat(messages: AIMessage[], options?: AIChatOptions): AsyncGenerator<string> {
    const model = options?.model || this.defaultModel;
    const systemMsg = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
      },
    };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options?.signal,
      }
    );

    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {}
        }
      }
    }
  }

  async chat(messages: AIMessage[], options?: AIChatOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(messages, options)) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

// ── OpenRouter Provider (OpenAI-compatible API) ──
class OpenRouterProvider extends OpenAIProvider {
  name = 'openrouter';
  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: 'https://openrouter.ai/api/v1',
    });
  }
}

// ── Ollama Provider (local, OpenAI-compatible API) ──
class OllamaProvider extends OpenAIProvider {
  name = 'ollama';
  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://localhost:11434/v1',
    });
  }
}

// ── Provider Factory ──
export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai': return new OpenAIProvider(config);
    case 'anthropic': return new AnthropicProvider(config);
    case 'gemini': return new GeminiProvider(config);
    case 'openrouter': return new OpenRouterProvider(config);
    case 'ollama': return new OllamaProvider(config);
    default: throw new Error(`Unknown provider type: ${config.type}`);
  }
}

// ── Managing multiple providers ──
const providers = new Map<string, AIProvider>();

export function getProvider(type: string): AIProvider | undefined {
  return providers.get(type);
}

export function registerProvider(type: string, config: ProviderConfig): AIProvider {
  const provider = createProvider(config);
  providers.set(type, provider);
  console.log(`🤖 AI Provider registered: ${type} (model: ${config.defaultModel})`);
  return provider;
}

// Auto-register from env vars
export function autoRegisterProviders() {
  if (process.env.OPENAI_API_KEY) {
    registerProvider('openai', {
      type: 'openai', apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
    });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    registerProvider('anthropic', {
      type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    });
  }
  if (process.env.GEMINI_API_KEY) {
    registerProvider('gemini', {
      type: 'gemini', apiKey: process.env.GEMINI_API_KEY,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    registerProvider('openrouter', {
      type: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY,
      defaultModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o',
    });
  }
  // Ollama is always available if enabled
  if (process.env.OLLAMA_ENABLED === 'true') {
    registerProvider('ollama', {
      type: 'ollama', apiKey: 'ollama',
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
      defaultModel: process.env.OLLAMA_MODEL || 'llama3.2',
    });
  }
  if (providers.size === 0) {
    console.warn('⚠️ No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY');
  }
}
