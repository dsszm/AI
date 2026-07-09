/**
 * 公开相册页：无需登录，只读浏览
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Play, X, Loader2, ImageOff, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'image' | 'video';

export default function PublicGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [galleryData, catData] = await Promise.all([
          api.getPublicGallery(),
          api.getPublicCategories(),
        ]);
        setItems(galleryData);
        setCategories(catData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (activeCategory !== 'all' && item.categoryId !== activeCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-mesh">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center">
              <Image size={20} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">公共相册</h1>
              <p className="text-xs text-slate-500">浏览所有公开图片与视频</p>
            </div>
          </div>
          <a
            href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/90 transition-all duration-150 shadow-glow"
          >
            登录管理
          </a>
        </div>

        {/* 筛选器 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-card/40 border border-white/[0.06]">
            {(['all', 'image', 'video'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  filter === t
                    ? 'bg-brand-accent text-white shadow-glow'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {t === 'all' ? '全部' : t === 'image' ? '图片' : '视频'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1">
            <Filter size={14} className="text-slate-500 shrink-0" />
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border',
                activeCategory === 'all'
                  ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
                  : 'text-slate-400 hover:text-white border-white/[0.06]'
              )}
            >
              全部分类
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border',
                  activeCategory === c.id
                    ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
                    : 'text-slate-400 hover:text-white border-white/[0.06]'
                )}
              >
                {c.name} <span className="text-slate-600">({c.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={28} className="animate-spin text-brand-accent mb-3" />
            <span className="text-sm">加载相册内容…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ImageOff size={40} className="mb-3 opacity-40" />
            <span className="text-sm">暂无内容</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setPreview(item)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] hover:border-brand-accent/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-glow"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-brand-accent/80 group-hover:scale-110 transition-all duration-200">
                      <Play size={20} className="text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <div className="text-xs text-white font-medium truncate">{item.title}</div>
                  <div className="text-[10px] text-white/60 mt-0.5">
                    {item.type === 'video' ? '视频' : '图片'}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* 预览模态框 */}
      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PreviewModal({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-4xl w-full max-h-[85vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 btn-ghost"
          aria-label="关闭"
        >
          <X size={22} />
        </button>
        <div className="glass-card rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-black/40 min-h-0">
            {item.type === 'video' ? (
              <video
                src={item.url}
                controls
                autoPlay
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : (
              <img
                src={item.url}
                alt={item.title}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">{item.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {item.type === 'video' ? '视频内容' : '图片内容'}
              </div>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !py-1.5 text-xs"
            >
              查看原图
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
