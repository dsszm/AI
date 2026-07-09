import { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Wand2, ImagePlus, Mail, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '../../shared/types';

export default function ImageGenPanel() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '768x1024' | '1024x768'>('1024x1024');
  const saveToGallery = true;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [referenceImage, setReferenceImage] = useState<GalleryItem | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(0.6);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const { currentModel, sendGenImageMessage } = useChatStore();

  const sizes = [
    { value: '1024x1024', label: '1:1 方形' },
    { value: '768x1024', label: '3:4 竖图' },
    { value: '1024x768', label: '4:3 横图' },
  ];

  useEffect(() => {
    if (showGalleryPicker) {
      loadGallery();
    }
  }, [showGalleryPicker]);

  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const items = await api.getGallery({ type: 'image' });
      setGalleryItems(items);
    } catch {
      // 忽略错误
    } finally {
      setLoadingGallery(false);
    }
  };

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
        referenceImage: referenceImage?.url,
        referenceStrength,
      });

      sendGenImageMessage(prompt.trim(), result.url, saveToGallery);
      setPrompt('');
      setReferenceImage(null);
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

  const selectReference = (item: GalleryItem) => {
    setReferenceImage(item);
    setShowGalleryPicker(false);
  };

  const clearReference = () => {
    setReferenceImage(null);
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

            {referenceImage && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                <img
                  src={referenceImage.url}
                  alt="参考图"
                  className="w-10 h-10 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white truncate">参考图：{referenceImage.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">相似度</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={referenceStrength}
                      onChange={(e) => setReferenceStrength(parseFloat(e.target.value))}
                      className="flex-1 accent-brand-accent h-1"
                    />
                    <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(referenceStrength * 100)}%</span>
                  </div>
                </div>
                <button
                  onClick={clearReference}
                  className="p-1 text-slate-500 hover:text-white transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

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
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="btn-secondary !px-3 flex items-center gap-1"
                  title="从相册选择参考图"
                >
                  <ImageIcon size={14} />
                  <span className="text-xs">参考图</span>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="btn-primary !px-4 flex-1 flex items-center gap-1"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span className="text-xs">{generating ? '生成中' : '生成'}</span>
                </button>
              </div>
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

              <div className="flex items-center gap-1.5">
                <ImagePlus size={11} className="text-brand-accent" />
                <span className="text-[10px] text-brand-accent">生成后自动保存到相册</span>
              </div>
            </div>

            {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
          </div>
        )}
      </div>

      {showGalleryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d24] rounded-2xl p-4 w-full max-w-2xl max-h-[80vh] flex flex-col border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">选择参考图片</h3>
              <button
                onClick={() => setShowGalleryPicker(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin">
              {loadingGallery ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : galleryItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  相册里还没有图片
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {galleryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectReference(item)}
                      className="aspect-square rounded-lg overflow-hidden border border-white/[0.08] hover:border-brand-accent/50 transition-colors group relative"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                        <p className="w-full px-1.5 py-1 text-[10px] text-white truncate bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
