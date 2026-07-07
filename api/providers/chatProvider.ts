/**
 * AI 模型 Provider 适配器接口
 * 各模型实现统一流式接口,服务端聚合转发
 */
import type { ModelId, ChatMessage } from '../../shared/types.js';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (sessionId: string) => void;
  onError: (message: string) => void;
}

export interface ProviderContext {
  apiKey: string;
  messages: ChatMessage[];
  model: ModelId;
}

/**
 * 统一流式调用入口:按 model 分发到具体 Provider
 */
export async function streamChat(ctx: ProviderContext, cb: StreamCallbacks): Promise<void> {
  try {
    switch (ctx.model) {
      case 'qwen':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          model: 'qwen-plus',
        });
      case 'openai':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-4o-mini',
        });
      case 'deepseek':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-chat',
        });
      case 'claude':
        return streamClaude(ctx, cb);
      case 'gemini':
        return streamGemini(ctx, cb);
      case 'glm':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          model: 'glm-4-flash',
        });
      case 'moonshot':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://api.moonshot.cn/v1/chat/completions',
          model: 'moonshot-v1-8k',
        });
      case 'doubao':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          model: 'doubao-pro-32k',
        });
      case 'spark':
        return streamOpenAICompatible(ctx, cb, {
          url: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
          model: 'generalv3.5',
        });
      default:
        cb.onError('不支持的模型');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '调用失败';
    cb.onError(msg);
  }
}

// ============ OpenAI 兼容协议通用实现(通义/OpenAI/DeepSeek/GLM/Kimi/豆包/星火)============
async function streamOpenAICompatible(
  ctx: ProviderContext,
  cb: StreamCallbacks,
  opts: { url: string; model: string }
): Promise<void> {
  const body = {
    model: opts.model,
    messages: toOpenAIMessages(ctx.messages),
    stream: true,
  };
  await fetchSSE(opts.url, ctx.apiKey, body, (chunk) => {
    const token = extractOpenAIToken(chunk);
    if (token) cb.onToken(token);
  });
  cb.onDone('');
}

// ============ Claude(Anthropic)============
async function streamClaude(ctx: ProviderContext, cb: StreamCallbacks): Promise<void> {
  const url = 'https://api.anthropic.com/v1/messages';
  // Claude 需要把 system 单独拆出
  const { system, messages } = splitClaudeMessages(ctx.messages);
  const body: Record<string, unknown> = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    stream: true,
    messages,
  };
  if (system) body.system = system;

  await fetchSSE(url, ctx.apiKey, body, (chunk) => {
    const token = extractClaudeToken(chunk);
    if (token) cb.onToken(token);
  }, {
    'anthropic-version': '2023-06-01',
  });
  cb.onDone('');
}

// ============ Google Gemini(streamGenerateContent)============
async function streamGemini(ctx: ProviderContext, cb: StreamCallbacks): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${ctx.apiKey}`;
  const { system, contents } = toGeminiContents(ctx.messages);
  const body: Record<string, unknown> = { contents };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  await fetchSSE(
    url,
    ctx.apiKey,
    body,
    (chunk) => {
      const token = extractGeminiToken(chunk);
      if (token) cb.onToken(token);
    },
    {},
    true
  );
  cb.onDone('');
}

// ============ 工具函数 ============

function toOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.images && m.images.length > 0) {
      // 多模态消息
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          ...m.images.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

function splitClaudeMessages(messages: ChatMessage[]) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const rest = messages.filter((m) => m.role !== 'system');
  // Claude 不支持 system role 在 messages 数组里
  const claudeMsgs = rest.map((m) => {
    if (m.images && m.images.length > 0) {
      return {
        role: m.role,
        content: [
          ...m.images.map((url) => ({
            type: 'image',
            source: { type: 'url', url },
          })),
          { type: 'text', text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
  return { system, messages: claudeMsgs };
}

function extractOpenAIToken(data: unknown): string {
  const obj = data as { choices?: Array<{ delta?: { content?: string } }> };
  return obj?.choices?.[0]?.delta?.content || '';
}

function extractClaudeToken(data: unknown): string {
  const obj = data as { type?: string; delta?: { text?: string }; content_block?: { text?: string } };
  if (obj?.type === 'content_block_delta' && obj.delta?.text) return obj.delta.text;
  if (obj?.type === 'content_block_start' && obj.content_block?.text) return obj.content_block.text;
  return '';
}

/**
 * 将消息转换为 Gemini contents 格式(role: user/model,system 单独拆出)
 */
function toGeminiContents(messages: ChatMessage[]) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const rest = messages.filter((m) => m.role !== 'system');
  const contents = rest.map((m) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (m.images && m.images.length > 0) {
      const parts: Array<Record<string, unknown>> = [{ text: m.content }];
      for (const url of m.images) {
        const inline = dataUrlToInline(url);
        if (inline) {
          parts.push({ inline_data: inline });
        } else {
          // 外链图片 Gemini 需要 fileData,这里退化为文本提示
          parts.push({ text: `[图片链接] ${url}` });
        }
      }
      return { role, parts };
    }
    return { role, parts: [{ text: m.content }] };
  });
  return { system, contents };
}

/**
 * data:URL 转 Gemini inline_data(mimeType + data)
 * 外链图片 Gemini 不直接支持,返回 null
 */
function dataUrlToInline(url: string): { mime_type: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!match) return null;
  return { mime_type: match[1], data: match[2] };
}

function extractGeminiToken(data: unknown): string {
  const obj = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return obj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * 通用 SSE 拉取:逐行解析 data: {...}
 * noAuth=true 时跳过 Authorization 头(用于 Gemini 等 Query 鉴权的模型)
 */
async function fetchSSE(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  onData: (data: unknown) => void,
  extraHeaders: Record<string, string> = {},
  noAuth = false
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (!noAuth) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`上游返回 ${res.status}:${errText.slice(0, 200)}`);
  }

  if (!res.body) throw new Error('无响应流');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        onData(json);
      } catch {
        // 忽略无法解析的行
      }
    }
  }
}
