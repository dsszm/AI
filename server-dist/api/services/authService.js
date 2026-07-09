/**
 * 鉴权服务:邮箱 + 验证码登录
 * - 验证码:6 位数字,5 分钟有效期,存于内存
 * - 配置 SMTP 时通过邮件真实发送;未配置时降级为演示模式(devCode 直接返回)
 * - 登录成功后签发 HMAC 令牌,前端存 localStorage,请求时带 Authorization 头
 * - 管理员邮箱:dashuaishizhimao@qq.com
 */
import crypto from 'crypto';
import { sendVerificationCode } from './mailService.js';
// 管理员邮箱(可通过环境变量覆盖)
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'dashuaishizhimao@qq.com').toLowerCase();
// 令牌签名密钥(生产环境务必通过环境变量配置)
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'console-auth-secret-key-change-me';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const codeStore = new Map();
/**
 * 生成并存储 6 位验证码,同时尝试通过邮件发送
 * - SMTP 配置完整:发送邮件,返回 { devMode: false }
 * - SMTP 未配置或发送失败:降级为演示模式,{ devMode: true, devCode }
 */
export async function generateCode(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    codeStore.set(normalizedEmail, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 分钟有效
        attempts: 0,
    });
    // 尝试发送邮件(直接发送,不依赖异步验证状态)
    const result = await sendVerificationCode(normalizedEmail, code);
    if (result.sent) {
        console.log(`[验证码] 邮件已发送至 ${normalizedEmail}`);
        return { code, devMode: false, sent: true };
    }
    // 未配置 SMTP 或发送失败 — 降级为演示模式
    console.warn(`[验证码] ${result.reason || '发送失败'},降级为演示模式`);
    console.log(`[验证码] 验证码: ${code} (发送至 ${normalizedEmail})`);
    return { code, devMode: true, devCode: code, sent: false, error: result.reason };
}
/**
 * 校验验证码
 */
export function verifyCode(email, code) {
    const normalizedEmail = email.toLowerCase().trim();
    const entry = codeStore.get(normalizedEmail);
    if (!entry) {
        return { valid: false, reason: '请先获取验证码' };
    }
    if (Date.now() > entry.expiresAt) {
        codeStore.delete(normalizedEmail);
        return { valid: false, reason: '验证码已过期,请重新获取' };
    }
    if (entry.attempts >= 5) {
        codeStore.delete(normalizedEmail);
        return { valid: false, reason: '尝试次数过多,请重新获取验证码' };
    }
    entry.attempts += 1;
    if (entry.code !== code.trim()) {
        return { valid: false, reason: '验证码错误' };
    }
    // 验证成功,删除验证码
    codeStore.delete(normalizedEmail);
    return { valid: true };
}
/**
 * 签发令牌(HMAC-SHA256 签名的 base64url payload)
 */
export function createToken(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const payload = {
        email: normalizedEmail,
        isAdmin: isAdmin(normalizedEmail),
        iat: Date.now(),
        exp: Date.now() + TOKEN_TTL_MS,
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = sign(data);
    return `${data}.${sig}`;
}
/**
 * 校验令牌,返回 payload 或 null
 */
export function verifyToken(token) {
    try {
        const [data, sig] = token.split('.');
        if (!data || !sig)
            return null;
        if (sign(data) !== sig)
            return null;
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
        if (Date.now() > payload.exp)
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
export function isAdmin(email) {
    return email.toLowerCase().trim() === ADMIN_EMAIL;
}
export function buildUserInfo(email) {
    const normalizedEmail = email.toLowerCase().trim();
    return {
        email: normalizedEmail,
        isAdmin: isAdmin(normalizedEmail),
        nickname: normalizedEmail.split('@')[0],
    };
}
function sign(data) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}
