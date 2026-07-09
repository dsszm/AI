/**
 * 图像生成路由
 * - 文生图
 * - 保存生成图片到相册
 * - 发送图片到邮箱
 */
import { Router, type Request, type Response } from 'express';
import { generateImage } from '../services/imageGenService.js';
import { getDb } from '../db/index.js';
import { sendImageEmail } from '../services/mailService.js';
import { logUsage } from '../services/usageService.js';
import { randomUUID } from 'crypto';
import type { AuthedRequest } from '../services/authService.js';
import type { ModelId } from '../../shared/types.js';

const router = Router();

const IMAGE_GEN_MODELS: ModelId[] = ['qwen', 'openai'];

router.get('/image-gen/models', (_req: Request, res: Response) => {
  res.json({ success: true, data: IMAGE_GEN_MODELS });
});

router.post('/image-gen', async (req: Request, res: Response) => {
  const { prompt, model, size, saveToGallery, title, categoryId, referenceImage, referenceStrength } = req.body as {
    prompt: string;
    model: ModelId;
    size?: string;
    saveToGallery?: boolean;
    title?: string;
    categoryId?: string;
    referenceImage?: string;
    referenceStrength?: number;
  };
  const authUser = (req as unknown as AuthedRequest).authUser;
  const userEmail = authUser?.email || 'anonymous';

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ success: false, error: '提示词必填' });
    return;
  }

  if (!IMAGE_GEN_MODELS.includes(model)) {
    res.status(400).json({ success: false, error: `模型 ${model} 暂不支持图像生成` });
    return;
  }

  try {
    const result = await generateImage({
      model,
      prompt: prompt.trim(),
      size: (size as '1024x1024') || '1024x1024',
      referenceImageUrl: referenceImage,
      referenceStrength: referenceStrength ?? 0.6,
    });

    let galleryId: string | undefined;
    if (saveToGallery) {
      const db = getDb();
      galleryId = randomUUID();
      const safeTitle = title?.trim() || prompt.slice(0, 30);
      db.prepare(
        'INSERT INTO gallery_item (id, type, url, thumbnail, title, category_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(galleryId, 'image', result.url, result.url, safeTitle, categoryId || null);
    }

    logUsage(userEmail, 'image_gen', model, prompt.trim());

    res.json({
      success: true,
      data: {
        url: result.url,
        galleryId,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ success: false, error: msg });
  }
});

router.post('/image-gen/send-email', async (req: Request, res: Response) => {
  const { imageUrl, email, prompt } = req.body as {
    imageUrl: string;
    email: string;
    prompt?: string;
  };

  if (!imageUrl || !email) {
    res.status(400).json({ success: false, error: '图片URL和邮箱必填' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, error: '邮箱格式不正确' });
    return;
  }

  try {
    const result = await sendImageEmail(imageUrl, email, prompt);
    if (result.sent) {
      res.json({ success: true, message: '发送成功' });
    } else {
      res.status(500).json({ success: false, error: result.reason || '发送失败' });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发送失败';
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
