/**
 * 登录页:邮箱 + 验证码
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  ShieldCheck,
  Send,
  Loader2,
  Terminal,
  ArrowRight,
  KeyRound,
  Crown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { sendCode, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async () => {
    setError('');
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setSending(true);
    try {
      const res = await sendCode(email.trim());
      setDevCode(res.devCode);
      setIsAdminEmail(res.isAdminEmail);
      setStep('code');
      setCountdown(60);
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!code.trim() || code.trim().length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'email') handleSendCode();
      else handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 grid-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-primary/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-primary shadow-glow-lg mb-4">
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-white tracking-wide">控制台</h1>
          <p className="text-sm text-slate-400 mt-1.5">多模型 AI 调用工具 · 邮箱验证码登录</p>
        </div>

        {/* 登录卡片 */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* 步骤指示 */}
          <div className="flex items-center gap-2 mb-6">
            <StepDot active={step === 'email'} done={step === 'code'} num={1} label="邮箱" />
            <div className={cn('flex-1 h-px transition-colors', step === 'code' ? 'bg-brand-accent/40' : 'bg-white/[0.06]')} />
            <StepDot active={step === 'code'} done={false} num={2} label="验证码" />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger animate-slide-up">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <label className="block text-xs text-slate-400 mb-2">邮箱地址</label>
              <div className="relative mb-4">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="you@example.com"
                  autoFocus
                  className="input-base !pl-10 text-sm"
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={sending}
                className="btn-primary w-full"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    获取验证码 <Send size={15} />
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              {isAdminEmail && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2 animate-slide-up">
                  <Crown size={14} className="text-warning shrink-0" />
                  <span className="text-xs text-warning">检测到管理员邮箱,登录后将获得管理权限</span>
                </div>
              )}

              {/* 邮件发送成功提示 */}
              {!devCode && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2 animate-slide-up">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  <span className="text-xs text-success">
                    验证码邮件已发送,请注意查收(可能在垃圾邮件中)
                  </span>
                </div>
              )}

              {/* 演示模式验证码提示 */}
              {devCode && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 animate-slide-up">
                  <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-400">
                    演示模式验证码:<span className="font-mono font-semibold tracking-widest">{devCode}</span>
                    <span className="opacity-70">(未配置 SMTP 邮件服务)</span>
                  </span>
                </div>
              )}

              <label className="block text-xs text-slate-400 mb-2">
                验证码 <span className="text-slate-600">(已发送至 {email})</span>
              </label>
              <div className="relative mb-4">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder="6 位数字"
                  autoFocus
                  className="input-base !pl-10 text-sm font-mono tracking-[0.5em] text-center"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading || code.length !== 6}
                className="btn-primary w-full"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    登录 <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← 更换邮箱
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sending}
                  className="text-xs text-brand-accent hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-brand-accent"
                >
                  {countdown > 0 ? `${countdown}s 后重新获取` : '重新获取验证码'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* 底部说明 */}
        <p className="text-center text-[11px] text-slate-600 mt-6 leading-relaxed">
          登录即代表同意使用本服务 · 演示环境验证码将直接显示
          <br />
          管理员邮箱享有完整权限
        </p>
      </motion.div>
    </div>
  );
}

function StepDot({
  active,
  done,
  num,
  label,
}: {
  active: boolean;
  done: boolean;
  num: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-all',
          done
            ? 'bg-success text-white'
            : active
            ? 'bg-brand-accent text-white shadow-glow'
            : 'bg-surface-raised text-slate-500 border border-white/[0.08]'
        )}
      >
        {done ? <CheckCircle2 size={13} /> : num}
      </div>
      <span
        className={cn(
          'text-[11px] font-medium transition-colors',
          active || done ? 'text-slate-200' : 'text-slate-600'
        )}
      >
        {label}
      </span>
    </div>
  );
}
