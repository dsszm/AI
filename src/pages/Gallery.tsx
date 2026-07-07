/**
 * 相册页:展示阿里云点播内容,网格化 + 预览模态框
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Play, X, Loader2, ImageOff, Filter, Plus, Upload, Link, Trash2, FileImage } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';
import { AuthUser } from '@/lib/api';

type FilterType = 'all' | 'image' | 'video';
type UploadMode = 'url' | 'file';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [preview, setPreview] = useState<GalleryItem | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('url');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState<string | undefined>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [galleryData, catData] = await Promise.all([
        api.getGallery(),
        api.getCategories(),
      ]);
      setItems(galleryData);
      setCategories(catData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const handleAddUrl = async () => {
    if (!uploadUrl.trim()) {
      setUploadError('请输入图片URL');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      await api.addGalleryUrl(uploadUrl.trim(), uploadTitle.trim() || undefined, uploadCategoryId || undefined);
      setShowUploadModal(false);
      setUploadUrl('');
      setUploadTitle('');
      setUploadCategoryId('');
      load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    api.uploadGalleryImage(file, uploadTitle.trim() || undefined, uploadCategoryId || undefined)
      .then(() => {
        setShowUploadModal(false);
        setUploadTitle('');
        setUploadCategoryId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
      })
      .catch(err => {
        setUploadError(err instanceof Error ? err.message : '上传失败');
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这张图片吗？')) return;
    try {
      await api.deleteGalleryItem(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (activeCategory !== 'all' && item.categoryId !== activeCategory) return false;
    return true;
  });

  const isAdmin = user?.isAdmin;

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center">
              <Image size={20} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">相册</h1>
              <p className="text-xs text-slate-500">阿里云视频点播内容 · 支持图片预览与视频播放</p>
            </div>
          </div>
          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-white text-sm font-medium hover:bg-brand-accent/90 transition-all duration-150 shadow-glow"
            >
              <Plus size={16} />
              添加图片
            </motion.button>
          )}
        </div>

        {/* 筛选器 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
          {/* 类型筛选 */}
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

          {/* 分类筛选 */}
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
            {isAdmin && <span className="text-xs text-slate-600 mt-1">点击右上角「添加图片」上传</span>}
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
                {isAdmin && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </motion.button>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* 预览模态框 */}
      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}

      {/* 上传模态框 */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowUploadModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md glass-card rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">添加图片</h2>
                <button onClick={() => setShowUploadModal(false)} className="btn-ghost" aria-label="关闭">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* 模式切换 */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-card/40 border border-white/[0.06]">
                  <button
                    onClick={() => { setUploadMode('url'); setUploadError(''); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                      uploadMode === 'url'
                        ? 'bg-brand-accent text-white shadow-glow'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Link size={14} />
                    URL链接
                  </button>
                  <button
                    onClick={() => { setUploadMode('file'); setUploadError(''); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                      uploadMode === 'file'
                        ? 'bg-brand-accent text-white shadow-glow'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Upload size={14} />
                    本地文件
                  </button>
                </div>

                {/* 标题输入 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">标题（可选）</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="输入图片标题"
                    className="w-full px-3 py-2 rounded-lg bg-surface-card/60 border border-white/[0.06] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-accent/50 transition-colors"
                  />
                </div>

                {/* URL输入 */}
                {uploadMode === 'url' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">图片URL</label>
                    <input
                      type="url"
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 rounded-lg bg-surface-card/60 border border-white/[0.06] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-accent/50 transition-colors"
                    />
                  </div>
                )}

                {/* 文件上传 */}
                {uploadMode === 'file' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">选择图片</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="gallery-upload"
                    />
                    <label
                      htmlFor="gallery-upload"
                      className="flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed border-white/[0.15] bg-surface-card/30 hover:border-brand-accent/40 hover:bg-surface-card/40 transition-all cursor-pointer"
                    >
                      <FileImage size={28} className="text-slate-500 mb-2" />
                      <span className="text-xs text-slate-500">点击选择图片文件</span>
                      <span className="text-[10px] text-slate-600 mt-1">支持 jpg, png, gif, webp（最大10MB）</span>
                    </label>
                  </div>
                )}

                {/* 分类选择 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">分类（可选）</label>
                  <select
                    value={uploadCategoryId}
                    onChange={(e) => setUploadCategoryId(e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-card/60 border border-white/[0.06] text-white text-sm focus:outline-none focus:border-brand-accent/50 transition-colors"
                  >
                    <option value="">未分类</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 错误提示 */}
                {uploadError && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <span className="text-red-400">!</span>
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={uploadMode === 'url' ? handleAddUrl : () => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                    uploading
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-accent text-white hover:bg-brand-accent/90'
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      处理中…
                    </>
                  ) : (
                    <>{uploadMode === 'url' ? '添加链接' : '选择文件'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
