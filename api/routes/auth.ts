/**
 * 鉴权路由:发送验证码、登录、获取当前用户、登出
 */
import { Router, type Request, type Response } from 'express';
import {
  generateCode,
  verifyCode,
  createToken,
  buildUserInfo,
  ADMIN_EMAIL,
  type AuthedRequest,
} from '../services/authService.js';

const router = Router();

// 邮箱格式校验
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 简单的发送频率限制:同邮箱 60 秒内只能请求一次
const sendCooldown = new Map<string, number>();

/**
 * 发送验证码
 */
router.post('/auth/send-code', async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 频率限制
  const lastSent = sendCooldown.get(normalizedEmail);
  if (lastSent && Date.now() - lastSent < 60_000) {
    const wait = Math.ceil((60_000 - (Date.now() - lastSent)) / 1000);
    res.status(429).json({ success: false, error: `请求过于频繁,请 ${wait} 秒后再试` });
    return;
  }
  sendCooldown.set(normalizedEmail, Date.now());

  const result = await generateCode(normalizedEmail);
  const isAdminEmail = normalizedEmail === ADMIN_EMAIL;

  res.json({
    success: true,
    data: {
      sent: result.sent,
      devMode: result.devMode,
      // 演示/降级模式下返回验证码便于测试
      devCode: result.devMode ? result.devCode : undefined,
      isAdminEmail,
      message: result.sent
        ? `验证码已发送至 ${normalizedEmail}`
        : `演示模式(未配置 SMTP),验证码: ${result.devCode}`,
    },
  });
});

/**
 * 登录(校验验证码,签发令牌)
 */
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, code } = req.body as { email: string; code: string };

  if (!email || !code) {
    res.status(400).json({ success: false, error: '邮箱与验证码必填' });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: '邮箱格式不正确' });
    return;
  }

  const result = verifyCode(email, code);
  if (!result.valid) {
    res.status(400).json({ success: false, error: result.reason || '验证失败' });
    return;
  }

  const token = createToken(email);
  const user = buildUserInfo(email);

  res.json({
    success: true,
    data: { token, user },
  });
});

/**
 * 获取当前登录用户(通过令牌)
 */
router.get('/auth/me', (req: Request, res: Response) => {
  const user = (req as unknown as AuthedRequest).authUser;
  if (!user) {
    res.status(401).json({ success: false, error: '未登录' });
    return;
  }
  res.json({ success: true, data: user });
});

/**
 * 登出(无状态令牌,前端清除即可)
 */
router.post('/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
