import { useState } from 'react';
import { Download, ImagePlus, Mail, Check, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function GenImageActions({
  imageUrl,
  prompt,
  savedToGallery,
  onSaved,
}: {
  imageUrl: string;
  prompt?: string;
  savedToGallery?: boolean;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedToGallery);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSaveToGallery = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await api.addGalleryUrl(imageUrl, prompt?.slice(0, 30) || 'AI 生成图片');
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error('保存到相册失败', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendEmail = async () => {
    if (!email || sendingEmail) return;
    setSendingEmail(true);
    setEmailError('');
    try {
      await api.sendImageEmail(imageUrl, email, prompt);
      setEmailSent(true);
      setTimeout(() => {
        setShowEmail(false);
        setEmailSent(false);
        setEmail('');
      }, 2000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={handleSaveToGallery}
        disabled={saved || saving}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all',
          saved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
        )}
        title={saved ? '已保存到相册' : '保存到相册'}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <ImagePlus size={14} />}
        <span>{saved ? '已保存' : '存相册'}</span>
      </button>

      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all"
        title="下载图片"
      >
        <Download size={14} />
        <span>下载</span>
      </button>

      <div className="relative">
        <button
          onClick={() => setShowEmail(!showEmail)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-all"
          title="发送到邮箱"
        >
          <Mail size={14} />
          <span>发邮箱</span>
        </button>

        {showEmail && (
          <div className="absolute top-full left-0 mt-2 z-10 w-64 p-3 rounded-xl bg-surface-raised border border-white/10 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">发送到邮箱</span>
              <button
                onClick={() => {
                  setShowEmail(false);
                  setEmailError('');
                  setEmailSent(false);
                }}
                className="text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              className="w-full px-3 py-2 text-xs bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-accent/50 mb-2"
            />
            {emailError && <p className="text-[11px] text-danger mb-2">{emailError}</p>}
            {emailSent && <p className="text-[11px] text-emerald-400 mb-2">发送成功！</p>}
            <button
              onClick={handleSendEmail}
              disabled={!email || sendingEmail}
              className="w-full py-1.5 text-xs rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
            >
              {sendingEmail ? <Loader2 size={12} className="animate-spin" /> : null}
              发送
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
