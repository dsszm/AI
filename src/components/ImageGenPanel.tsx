import { useState } from 'react';
import { Sparkles, X, Loader2, Wand2, ImagePlus, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export default function ImageGenPanel() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '768x1024' | '1024x768'>('1024x1024');
  const [saveToGallery, setSaveToGallery] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const { currentModel, sendGenImageMessage } = useChatStore();

  const sizes = [
    { value: '1024x1024', label: '1:1 方形' },
    { value: '768x1024', label: '3:4 竖图' },
    { value: '1024x768', label: '4:3 横图' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');

    try {
      const result = await api.generateImage({
        model: currentModel,
        prompt: prompt.trim(),
        size,
        saveToGallery,
        title: prompt.trim().slice(0, 30),
      });

      sendGenImageMessage(prompt.trim(), result.url, saveToGallery);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="px-4 pb-2">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-[11px] text-slate-500 hover:text-brand-accent transition-colors"
        >
          <Wand2 size={12} />
          <span>AI 图像生成</span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {open && (
          <div className="glass-card rounded-2xl p-3 mb-2 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-brand-accent shrink-0" />
              <span className="text-xs font-medium text-white">AI 画图</span>
              <span className="text-[10px] text-slate-500">使用 {currentModel} 模型生成</span>
            </div>

            <div className="flex gap-2 mb-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="描述你想要生成的图片，例如：一只可爱的橘猫坐在窗边…"
                className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-accent/50 scroll-thin"
                disabled={generating}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="btn-primary shrink-0 !px-4 self-stretch flex items-center gap-1"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span className="text-xs">{generating ? '生成中' : '生成'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sizes.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value as typeof size)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] transition-all',
                      size === s.value
                        ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
                        : 'bg-white/[0.04] text-slate-400 border border-transparent hover:bg-white/[0.08]'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToGallery}
                  onChange={(e) => setSaveToGallery(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-accent"
                />
                <ImagePlus size={11} className="text-slate-500" />
                <span className="text-[10px] text-slate-400">自动存相册</span>
              </label>
            </div>

            {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
