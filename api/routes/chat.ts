/**
 * 对话路由:统一 AI 调用代理(SSE 流式)
 */
import { Router, type Request, type Response } from 'express';
import { getApiKey } from '../services/keyService.js';
import { checkRateLimit, recordAccess } from '../services/rateLimiter.js';
import {
  createSession,
  saveMessage,
  getMessages,
  getSessions,
} from '../services/sessionService.js';
import { streamChat } from '../providers/chatProvider.js';
import { getDb } from '../db/index.js';
import type { AuthedRequest } from '../services/authService.js';
import type { ChatRequest, ModelId } from '../../shared/types.js';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  const { model, messages, sessionId } = req.body as ChatRequest;

  if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, error: '参数缺失:model 与 messages 必填' });
    return;
  }

  const validModels: ModelId[] = ['qwen', 'openai', 'deepseek', 'claude', 'gemini', 'glm', 'moonshot', 'doubao', 'spark'];
  if (!validModels.includes(model)) {
    res.status(400).json({ success: false, error: '不支持的模型' });
    return;
  }

  // 获取 API Key
  const apiKey = getApiKey(model);
  if (!apiKey) {
    res.status(400).json({
      success: false,
      error: `${model} 未配置 API Key,请先在秘钥管理页配置`,
    });
    return;
  }

  // 通义千问使用管理员 Key 时启用限流
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const useAdminKey = model === 'qwen' && !hasUserKey(model);
  if (useAdminKey) {
    const rate = checkRateLimit(clientIp);
    if (!rate.allowed) {
      res.status(429).json({
        success: false,
        error: `提问过于频繁,请等待 ${Math.ceil(rate.retryAfterMs / 1000)} 秒后再试`,
        retryAfter: rate.retryAfterMs,
      });
      return;
    }
  }

  // 会话管理:复用或新建
  const sid = sessionId || createSession(truncateTitle(messages), clientIp);
  if (useAdminKey) recordAccess(sid, clientIp, 'anonymous');

  // 持久化用户消息
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMsg) {
    saveMessage(sid, 'user', lastUserMsg.content, model, lastUserMsg.images);
  }

  // SSE 流式响应
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const writeSSE = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 推送 sessionId 让前端绑定
  writeSSE('session', { sessionId: sid });

  let assistantContent = '';

  try {
    await streamChat(
      { apiKey, messages, model },
      {
        onToken: (token) => {
          assistantContent += token;
          writeSSE('token', { content: token });
        },
        onDone: () => {
          if (assistantContent) {
            saveMessage(sid, 'assistant', assistantContent, model);
          }
          writeSSE('done', { sessionId: sid });
          res.end();
        },
        onError: (message) => {
          writeSSE('error', { message });
          res.end();
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '调用失败';
    writeSSE('error', { message: msg });
    res.end();
  }
});

/**
 * 获取会话历史消息
 */
router.get('/chat/history/:sessionId', (req: Request, res: Response) => {
  const authUser = (req as unknown as AuthedRequest).authUser;
  if (!authUser || !authUser.isAdmin) {
    res.status(403).json({ success: false, error: '仅管理员可查看历史记录' });
    return;
  }
  const { sessionId } = req.params;
  const messages = getMessages(sessionId);
  res.json({ success: true, data: messages });
});

/**
 * 获取会话列表（仅管理员）
 */
router.get('/chat/sessions', (req: Request, res: Response) => {
  const authUser = (req as unknown as AuthedRequest).authUser;
  if (!authUser || !authUser.isAdmin) {
    res.status(403).json({ success: false, error: '仅管理员可查看历史记录' });
    return;
  }
  const sessions = getSessions();
  res.json({ success: true, data: sessions });
});

/**
 * 演示用:返回模拟的流式回复(当无真实 Key 时前端可调用此接口体验对话)
 */
router.post('/chat/demo', async (req: Request, res: Response) => {
  const { messages } = req.body as ChatRequest;
  if (!messages || messages.length === 0) {
    res.status(400).json({ success: false, error: '参数缺失' });
    return;
  }

  const sid = createSession(truncateTitle(messages), 'demo');
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMsg) saveMessage(sid, 'user', lastUserMsg.content, 'qwen', lastUserMsg.images);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const writeSSE = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  writeSSE('session', { sessionId: sid });

  // 生成模拟回复
  const userText = lastUserMsg?.content || '';
  const reply = buildDemoReply(userText);

  for (const ch of reply) {
    writeSSE('token', { content: ch });
    await sleep(20);
  }

  saveMessage(sid, 'assistant', reply, 'qwen');
  writeSSE('done', { sessionId: sid });
  res.end();
});

function truncateTitle(messages: ChatRequest['messages']): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '新对话';
  const text = first.content.replace(/\s+/g, ' ').trim();
  return text.length > 20 ? text.slice(0, 20) + '…' : text || '新对话';
}

function hasUserKey(model: ModelId): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM key_config WHERE model = ?').get(model);
  return !!row;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDemoReply(userText: string): string {
  return `收到你的提问:「${userText}」\n\n这是控制台的演示回复。当前为演示模式,未配置真实的 API Key。\n\n你可以在「秘钥管理」页面为 OpenAI、DeepSeek、Claude 配置各自的 API Key,即可获得真实的模型回答;通义千问默认启用(使用管理员 Key 时会有 5 秒冷却)。\n\n支持功能:\n- 多模型切换对比\n- 引用相册图片进行图像理解\n- 对话历史自动保存\n\n请尝试切换模型或在输入框上传图片体验完整功能。`;
}

export default router;
