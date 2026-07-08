/**
 * 图像生成服务（文生图）
 * 支持通义万相（qwen）、DALL-E（openai）等
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getApiKey } from './keyService.js';
import type { ModelId } from '../../shared/types.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');

export interface GenImageOptions {
  model: ModelId;
  prompt: string;
  size?: '1024x1024' | '768x1024' | '1024x768' | '512x512';
}

export interface GenImageResult {
  url: string;
  filePath: string;
  fileName: string;
}

export async function generateImage(opts: GenImageOptions): Promise<GenImageResult> {
  const apiKey = getApiKey(opts.model);
  if (!apiKey) {
    throw new Error(`${opts.model} 未配置 API Key`);
  }

  const size = opts.size || '1024x1024';

  let imageBuffer: Buffer;
  let fileName: string;

  switch (opts.model) {
    case 'qwen':
      imageBuffer = await genQwenWanxiang(apiKey, opts.prompt, size);
      break;
    case 'openai':
      imageBuffer = await genOpenAIDalle(apiKey, opts.prompt, size);
      break;
    default:
      throw new Error(`模型 ${opts.model} 暂不支持图像生成`);
  }

  fileName = `${Date.now()}-${randomUUID()}.png`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, imageBuffer);

  return {
    url: `/uploads/${fileName}`,
    filePath,
    fileName,
  };
}

async function genQwenWanxiang(apiKey: string, prompt: string, size: string): Promise<Buffer> {
  const sizeMap: Record<string, string> = {
    '1024x1024': '1024*1024',
    '768x1024': '768*1024',
    '1024x768': '1024*768',
    '512x512': '512*512',
  };

  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx2.1-t2i-turbo',
      input: { prompt },
      parameters: {
        size: sizeMap[size] || '1024*1024',
        n: 1,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`通义万相请求失败: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { output?: { task_id?: string }; code?: string; message?: string };
  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error(`创建图像任务失败: ${data.message || JSON.stringify(data)}`);
  }

  const imageUrl = await pollQwenTask(apiKey, taskId);
  return await downloadImage(imageUrl);
}

async function pollQwenTask(apiKey: string, taskId: string): Promise<string> {
  const maxAttempts = 60;
  const intervalMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    if (!res.ok) continue;

    const data = await res.json() as {
      output?: { task_status?: string; results?: Array<{ url?: string }> };
    };

    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') {
      const url = data.output?.results?.[0]?.url;
      if (url) return url;
      throw new Error('图像生成成功但未获取到图片URL');
    }
    if (status === 'FAILED') {
      throw new Error('图像生成失败');
    }
  }

  throw new Error('图像生成超时');
}

async function genOpenAIDalle(apiKey: string, prompt: string, size: string): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DALL-E 请求失败: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data.data?.[0];

  if (item?.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item?.url) {
    return await downloadImage(item.url);
  }

  throw new Error('DALL-E 返回数据格式异常');
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载图片失败: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
