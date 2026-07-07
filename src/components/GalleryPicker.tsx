/**
 * 相册图片选择弹窗:在对话中引用相册图片
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ImageOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';

export default function GalleryPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
}) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    api
      .getGallery({ type: 'image' })
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const toggle = (item: GalleryItem) => {
    const next = new Set(selected);
    if (next.has(item.url)) next.delete(item.url);
    else next.add(item.url);
    setSelected(next);
  };

  const confirm = () => {
    onPick(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl glass-card rounded-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-white">从相册选择图片</h3>
            <p className="text-xs text-slate-500 mt-0.5">已选 {selected.size} 张,引用后 AI 可进行图像理解</p>
          </div>
          <button onClick={onClose} className="btn-ghost" aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 size={28} className="animate-spin text-brand-accent mb-3" />
              <span className="text-sm">加载相册中…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ImageOff size={32} className="mb-3 opacity-50" />
              <span className="text-sm">相册暂无图片</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => {
                const active = selected.has(item.url);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item)}
                    className={cn(
                      'relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 group',
                      active
                        ? 'border-brand-accent shadow-glow'
                        : 'border-transparent hover:border-brand-secondary/50'
                    )}
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div
                      className={cn(
                        'absolute inset-0 transition-opacity',
                        active ? 'bg-brand-accent/30' : 'bg-black/0 group-hover:bg-black/20'
                      )}
                    />
                    {active && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center shadow-glow">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <span className="text-[11px] text-white/90 truncate block">{item.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={confirm} disabled={selected.size === 0} className="btn-primary">
            引用 {selected.size > 0 ? `${selected.size} 张` : ''}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
