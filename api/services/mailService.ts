/**
 * 邮件服务:通过 SMTP 发送验证码邮件
 *
 * SMTP 配置(环境变量):
 *   SMTP_HOST      - SMTP 服务器地址
 *   SMTP_PORT      - SMTP 端口(默认 465 SSL)
 *   SMTP_SECURE    - 是否使用 SSL(true/false,默认 true)
 *   SMTP_USER      - SMTP 用户名/发件邮箱
 *   SMTP_PASS      - SMTP 密码/授权码
 *   SMTP_FROM      - 发件人显示名(可选,默认"控制台")
 *
 * 未配置 SMTP 时,自动降级为演示模式(验证码通过响应返回 devCode)
 * 支持通过 HTTP 代理发送(自动检测环境变量 HTTP_PROXY/HTTPS_PROXY)
 */
import net from 'net';
import tls from 'tls';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');

function getImageBuffer(imageUrl: string): { buffer: Buffer; filename: string; mimeType: string } | null {
  if (imageUrl.startsWith('/uploads/')) {
    const fileName = imageUrl.replace('/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
      };
      return {
        buffer: fs.readFileSync(filePath),
        filename: fileName,
        mimeType: mimeMap[ext] || 'image/png',
      };
    }
  }
  return null;
}

function parseProxy(proxyUrl: string): { host: string; port: number } | null {
  try {
    const url = new URL(proxyUrl);
    return { host: url.hostname, port: parseInt(url.port, 10) };
  } catch {
    return null;
  }
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false' && port === 465;
  const proxy = parseProxy(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '');

  return { host, port, secure, auth: { user, pass }, proxy };
}

export function isMailServiceReady(): boolean {
  return getSmtpConfig() !== null;
}

interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

async function sendMailRaw(config: NonNullable<ReturnType<typeof getSmtpConfig>>, options: SendMailOptions): Promise<{ messageId: string }> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let step = 0;
    let messageId = '';
    const timeout = setTimeout(() => reject(new Error('SMTP 超时, step=' + step)), 30000);

    const finish = (err?: Error, result?: { messageId: string }) => {
      clearTimeout(timeout);
      if (err) reject(err);
      else if (result) resolve(result);
    };

    let socket: net.Socket | tls.TLSSocket | null = null;

    const handleData = (data: Buffer) => {
      buffer += data.toString();
      while (buffer.includes('\r\n')) {
        const idx = buffer.indexOf('\r\n');
        const line = buffer.substring(0, idx);
        buffer = buffer.substring(idx + 2);

        if (step === 0 && line.startsWith('220')) {
          socket!.write(`EHLO ${config.host}\r\n`);
          step = 1;
        } else if (step === 1 && line.startsWith('250-')) {
        } else if (step === 1 && line.startsWith('250 ')) {
          socket!.write('AUTH LOGIN\r\n');
          step = 2;
        } else if (step === 2 && line.startsWith('334')) {
          socket!.write(Buffer.from(config.auth.user).toString('base64') + '\r\n');
          step = 3;
        } else if (step === 3 && line.startsWith('334')) {
          socket!.write(Buffer.from(config.auth.pass).toString('base64') + '\r\n');
          step = 4;
        } else if (step === 4 && line.startsWith('235')) {
          socket!.write(`MAIL FROM:<${config.auth.user}>\r\n`);
          step = 5;
        } else if (step === 5 && line.startsWith('250')) {
          socket!.write(`RCPT TO:<${options.to}>\r\n`);
          step = 6;
        } else if (step === 6 && line.startsWith('250')) {
          socket!.write('DATA\r\n');
          step = 7;
        } else if (step === 7 && line.startsWith('354')) {
          messageId = `<${Date.now()}-${Math.random().toString(36).substring(2)}@${config.host}>`;
          const subjectEncoded = '=?UTF-8?B?' + Buffer.from(options.subject).toString('base64') + '?=';
          const bodyEncoded = Buffer.from(options.html).toString('base64');
          const msg = `From: ${options.from}
To: ${options.to}
Subject: ${subjectEncoded}
Message-ID: ${messageId}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: base64

${bodyEncoded}
.\r\n`;
          socket!.write(msg);
          step = 8;
        } else if (step === 8 && line.startsWith('250')) {
          socket!.write('QUIT\r\n');
          step = 9;
          finish(undefined, { messageId });
        } else if (line.startsWith('5')) {
          socket!.destroy();
          finish(new Error('SMTP error: ' + line));
        }
      }
    };

    if (config.proxy) {
      const proxySocket = net.createConnection({ host: config.proxy.host, port: config.proxy.port });
      proxySocket.on('error', (err) => finish(err));
      proxySocket.setTimeout(10000, () => finish(new Error('代理连接超时')));

      proxySocket.on('connect', () => {
        proxySocket.setTimeout(0);
        proxySocket.write(`CONNECT ${config.host}:${config.port} HTTP/1.1\r\nHost: ${config.host}:${config.port}\r\n\r\n`);

        let proxyBuf = '';
        const onProxyData = (data: Buffer) => {
          proxyBuf += data.toString();
          if (proxyBuf.includes('\r\n\r\n')) {
            proxySocket.removeListener('data', onProxyData);
            if (!proxyBuf.includes('200')) {
              proxySocket.destroy();
              finish(new Error('代理连接失败: ' + proxyBuf.split('\r\n')[0]));
              return;
            }

            if (config.secure) {
              const tlsSocket = tls.connect({
                socket: proxySocket,
                servername: config.host,
                rejectUnauthorized: false,
              });
              tlsSocket.on('secureConnect', () => {
                socket = tlsSocket;
                tlsSocket.on('data', handleData);
              });
              tlsSocket.on('error', (err) => finish(err));
            } else {
              socket = proxySocket;
              proxySocket.on('data', handleData);
            }
          }
        };
        proxySocket.on('data', onProxyData);
      });
    } else {
      if (config.secure) {
        const tlsSocket = tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
          rejectUnauthorized: false,
        });
        tlsSocket.on('secureConnect', () => {
          socket = tlsSocket;
        });
        tlsSocket.on('data', handleData);
        tlsSocket.on('error', (err) => finish(err));
      } else {
        const s = net.createConnection({ host: config.host, port: config.port });
        s.on('connect', () => { socket = s; });
        s.on('data', handleData);
        s.on('error', (err) => finish(err));
      }
    }
  });
}

/**
 * 发送验证码邮件
 * 返回 { sent: true } 表示成功发出;{ sent: false, reason } 表示失败/未配置
 */
export async function sendVerificationCode(
  to: string,
  code: string
): Promise<{ sent: boolean; reason?: string }> {
  const config = getSmtpConfig();
  if (!config) {
    return { sent: false, reason: '未配置 SMTP 邮件服务' };
  }

  const fromName = process.env.SMTP_FROM || '控制台';
  const fromUser = process.env.SMTP_USER || '';
  const html = buildCodeEmail(code);

  try {
    const result = await sendMailRaw(config, {
      from: `${fromName} <${fromUser}>`,
      to,
      subject: '【控制台】您的登录验证码',
      html,
    });
    console.log(`[邮件服务] 验证码已发送至 ${to}, messageId: ${result.messageId}`);
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发送失败';
    console.error(`[邮件服务] 发送失败(${to}):`, msg);
    return { sent: false, reason: msg };
  }
}

function buildCodeEmail(code: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录验证码</title>
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    .wrapper { padding: 32px 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
    .header { padding: 28px 32px 0; text-align: center; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0066FF, #1E3A5F); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 0 20px rgba(0,102,255,0.35); }
    .logo-text { color: #fff; font-size: 20px; font-weight: 700; }
    .title { font-size: 20px; font-weight: 600; color: #e2e8f0; margin: 0 0 8px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    .code-section { padding: 32px; text-align: center; }
    .code-label { font-size: 12px; color: #64748b; margin-bottom: 12px; letter-spacing: 2px; }
    .code { display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0066FF; font-family: 'JetBrains Mono', 'Courier New', monospace; background: rgba(0,102,255,0.08); padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(0,102,255,0.2); }
    .notice { padding: 0 32px 28px; font-size: 12px; color: #64748b; line-height: 1.8; }
    .notice strong { color: #e2e8f0; font-weight: 500; }
    .footer { padding: 20px 32px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid rgba(255,255,255,0.04); }
    .footer a { color: #0066FF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo"><span class="logo-text">⬡</span></div>
        <h1 class="title">登录验证码</h1>
        <p class="subtitle">请在 5 分钟内完成验证</p>
      </div>
      <div class="code-section">
        <div class="code-label">VERIFICATION CODE</div>
        <div class="code">${code}</div>
      </div>
      <div class="notice">
        <p>尊敬的用户,您好:</p>
        <p>您正在使用邮箱验证码登录 <strong>控制台</strong>。请将上方 6 位数字填入登录页完成验证。</p>
        <p>· 验证码 <strong>5 分钟</strong> 内有效,过期后请重新获取<br>
        · 请勿将验证码告知任何人,包括平台工作人员<br>
        · 如非本人操作,请忽略此邮件</p>
      </div>
      <div class="footer">
        本邮件由系统自动发送,请勿直接回复 · 控制台 多模型 AI 工具
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendImageEmail(
  imageUrl: string,
  to: string,
  prompt?: string
): Promise<{ sent: boolean; reason?: string }> {
  const config = getSmtpConfig();
  if (!config) {
    return { sent: false, reason: '未配置 SMTP 邮件服务' };
  }

  const img = getImageBuffer(imageUrl);
  if (!img) {
    return { sent: false, reason: '图片文件不存在' };
  }

  const fromName = process.env.SMTP_FROM || '控制台';
  const fromUser = process.env.SMTP_USER || '';

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const html = buildImageEmail(prompt || 'AI 生成的图片', imageUrl);

    await transporter.sendMail({
      from: `${fromName} <${fromUser}>`,
      to,
      subject: '【控制台】AI 生成的图片',
      html,
      attachments: [
        {
          filename: img.filename,
          content: img.buffer,
          contentType: img.mimeType,
          cid: 'generated-image',
        },
      ],
    });

    console.log(`[邮件服务] 图片邮件已发送至 ${to}`);
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发送失败';
    console.error(`[邮件服务] 发送图片邮件失败(${to}):`, msg);
    return { sent: false, reason: msg };
  }
}

function buildImageEmail(prompt: string, imageUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 生成的图片</title>
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    .wrapper { padding: 32px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
    .header { padding: 24px 28px 0; text-align: center; }
    .title { font-size: 18px; font-weight: 600; color: #e2e8f0; margin: 0 0 8px; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .image-section { padding: 20px 28px; }
    .image-wrapper { border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .image-wrapper img { width: 100%; display: block; }
    .prompt-section { padding: 0 28px 24px; }
    .prompt-label { font-size: 11px; color: #64748b; margin-bottom: 6px; letter-spacing: 1px; }
    .prompt-text { font-size: 13px; color: #cbd5e1; background: rgba(0,102,255,0.08); padding: 12px 16px; border-radius: 8px; line-height: 1.6; border: 1px solid rgba(0,102,255,0.15); }
    .footer { padding: 20px 28px; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid rgba(255,255,255,0.04); }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="title">AI 生成的图片</h1>
        <p class="subtitle">由控制台多模型 AI 工具生成</p>
      </div>
      <div class="image-section">
        <div class="image-wrapper">
          <img src="cid:generated-image" alt="AI 生成图片" />
        </div>
      </div>
      <div class="prompt-section">
        <div class="prompt-label">PROMPT</div>
        <div class="prompt-text">${prompt}</div>
      </div>
      <div class="footer">
        本邮件由系统自动发送,请勿直接回复 · 控制台 多模型 AI 工具
      </div>
    </div>
  </div>
</body>
</html>`;
}
