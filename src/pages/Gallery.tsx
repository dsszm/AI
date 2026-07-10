/**
 * 相册页:展示阿里云点播内容,网格化 + 预览模态框
 * 支持批量选择、批量删除、批量设置分类、标题样式编辑
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Play, X, Loader2, ImageOff, Filter, Plus, Upload, Link, Trash2, FileImage,
  CheckSquare, Square, Edit3, Palette, Type, FolderEdit, Check, RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';
import { AuthUser } from '@/lib/api';

type FilterType = 'all' | 'image' | 'video';
type UploadMode = 'url' | 'file';

// 预设颜色
const PRESET_COLORS = [
  { name: '白色', value: '#ffffff' },
  { name: '品牌色', value: '#10a37f' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '紫色', value: '#a855f7' },
  { name: '黄色', value: '#eab308' },
  { name: '青色', value: '#06b6d4' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#94a3b8' },
];

// 标题样式选项
const STYLE_OPTIONS = [
  { label: '加粗', value: 'bold', css: 'font-bold' },
  { label: '斜体', value: 'italic', css: 'italic' },
  { label: '下划线', value: 'underline', css: 'underline' },
  { label: '删除线', value: 'line-through', css: 'line-through' },
  { label: '大字', value: 'text-base', css: 'text-base' },
  { label: '小字', value: 'text-[10px]', css: 'text-[10px]' },
  { label: '阴影', value: 'shadow', css: 'drop-shadow-lg' },
  { label: '居中', value: 'center', css: 'text-center' },
];

function parseTitleStyle(styleStr?: string): Set<string> {
  if (!styleStr) return new Set();
  return new Set(styleStr.split(',').filter(Boolean));
}

function titleStyleToCss(styleStr?: string): string {
  const styles = parseTitleStyle(styleStr);
  const cssMap: Record<string, string> = {
    'bold': 'font-bold',
    'italic': 'italic',
    'underline': 'underline',
    'line-through': 'line-through',
    'text-base': 'text-base',
    'text-[10px]': 'text-[10px]',
    'shadow': 'drop-shadow-lg',
    'center': 'text-center',
  };
  return Array.from(styles).map(s => cssMap[s] || '').filter(Boolean).join(' ');
}

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

  // 批量选择
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<'delete' | 'category' | 'style' | null>(null);
  const [batchCategoryId, setBatchCategoryId] = useState('');
  const [batchColor, setBatchColor] = useState<string>('');
  const [batchStyle, setBatchStyle] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // 单项编辑
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState<string>('');
  const [editStyle, setEditStyle] = useState<Set<string>>(new Set());

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

  // 批量选择操作
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map(i => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBatchAction = async () => {
    if (selectedIds.size === 0 || !batchAction) return;
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (batchAction === 'delete') {
        if (!confirm(`确定要删除选中的 ${ids.length} 张图片吗？`)) {
          setBatchLoading(false);
          return;
        }
        await api.batchGallery({ ids, action: 'delete' });
      } else if (batchAction === 'category') {
        if (!batchCategoryId) {
          alert('请选择分类');
          setBatchLoading(false);
          return;
        }
        await api.batchGallery({ ids, action: 'category', categoryId: batchCategoryId });
      } else if (batchAction === 'style') {
        await api.batchGallery({
          ids,
          action: 'style',
          titleColor: batchColor || null,
          titleStyle: Array.from(batchStyle).join(',') || null,
        });
      }
      setBatchAction(null);
      setSelectedIds(new Set());
      setBatchMode(false);
      setBatchColor('');
      setBatchStyle(new Set());
      setBatchCategoryId('');
      load();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 单项编辑保存
  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      await api.updateGalleryItem(editItem.id, {
        title: editTitle,
        titleColor: editColor || null,
        titleStyle: Array.from(editStyle).join(',') || null,
      });
      setEditItem(null);
      load();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '保存失败');
    }
  };

  const openEdit = (item: GalleryItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditColor(item.titleColor || '');
    setEditStyle(parseTitleStyle(item.titleStyle));
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedIds(new Set());
                  setBatchAction(null);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  batchMode
                    ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400'
                    : 'bg-surface-card/60 border border-white/[0.06] text-slate-400 hover:text-white'
                )}
              >
                <CheckSquare size={16} />
                {batchMode ? '退出批量' : '批量操作'}
              </motion.button>
            )}
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
        </div>

        {/* 批量操作工具栏 */}
        {batchMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 border border-orange-500/20 mb-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-orange-400 font-medium">
                已选 {selectedIds.size} 项
              </span>
              <button onClick={selectAll} className="text-xs text-slate-400 hover:text-white">
                全选
              </button>
              <button onClick={deselectAll} className="text-xs text-slate-400 hover:text-white">
                取消选择
              </button>

              <div className="h-4 w-px bg-white/10" />

              {/* 批量操作按钮 */}
              <button
                onClick={() => { setBatchAction('style'); setBatchColor(''); setBatchStyle(new Set()); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/20 transition-all"
              >
                <Palette size={12} />
                设置样式
              </button>
              <button
                onClick={() => { setBatchAction('category'); setBatchCategoryId(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"
              >
                <FolderEdit size={12} />
                设置分类
              </button>
              <button
                onClick={() => setBatchAction('delete')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={12} />
                批量删除
              </button>
            </div>
          </motion.div>
        )}

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
            {isAdmin && <span className="text-xs text-slate-600 mt-1">点击右上角「添加图片」上传</span>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                className={cn(
                  'group relative aspect-square rounded-xl overflow-hidden border transition-all duration-200',
                  batchMode && selectedIds.has(item.id)
                    ? 'border-orange-500 ring-2 ring-orange-500/40'
                    : 'border-white/[0.06] hover:border-brand-accent/40',
                  !batchMode && 'hover:-translate-y-1 hover:shadow-glow cursor-pointer'
                )}
                onClick={() => {
                  if (batchMode) {
                    toggleSelect(item.id);
                  } else {
                    setPreview(item);
                  }
                }}
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
                  <div
                    className={cn('text-xs text-white font-medium truncate', titleStyleToCss(item.titleStyle))}
                    style={item.titleColor ? { color: item.titleColor } : undefined}
                  >
                    {item.title}
                  </div>
                  <div className="text-[10px] text-white/60 mt-0.5">
                    {item.type === 'video' ? '视频' : '图片'}
                  </div>
                </div>

                {/* 批量选择勾选框 */}
                {batchMode && (
                  <div className="absolute top-2 left-2">
                    {selectedIds.has(item.id) ? (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-black/50 border-2 border-white/30 flex items-center justify-center" />
                    )}
                  </div>
                )}

                {/* 非批量模式下的操作按钮 */}
                {!batchMode && isAdmin && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(item);
                      }}
                      className="absolute top-2 right-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-brand-accent transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </motion.div>
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

      {/* 批量操作弹窗 */}
      <AnimatePresence>
        {batchAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setBatchAction(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md glass-card rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  {batchAction === 'delete' && '批量删除'}
                  {batchAction === 'category' && '批量设置分类'}
                  {batchAction === 'style' && '批量设置标题样式'}
                </h2>
                <button onClick={() => setBatchAction(null)} className="btn-ghost">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-sm text-slate-400">
                  将对 <span className="text-orange-400 font-medium">{selectedIds.size}</span> 张图片执行操作
                </div>

                {/* 批量删除确认 */}
                {batchAction === 'delete' && (
                  <div className="text-sm text-red-400">
                    确定要删除选中的 {selectedIds.size} 张图片吗？此操作不可撤销。
                  </div>
                )}

                {/* 批量设置分类 */}
                {batchAction === 'category' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">选择分类</label>
                    <select
                      value={batchCategoryId}
                      onChange={(e) => setBatchCategoryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-card/60 border border-white/[0.06] text-white text-sm focus:outline-none focus:border-brand-accent/50 transition-colors"
                    >
                      <option value="">请选择分类</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 批量设置样式 */}
                {batchAction === 'style' && (
                  <div className="space-y-4">
                    {/* 颜色选择 */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                        <Palette size={12} />
                        标题颜色
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setBatchColor('')}
                          className={cn(
                            'w-7 h-7 rounded-lg border-2 flex items-center justify-center text-[10px]',
                            batchColor === ''
                              ? 'border-brand-accent'
                              : 'border-white/10 text-slate-500'
                          )}
                        >
                          默认
                        </button>
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setBatchColor(c.value)}
                            className={cn(
                              'w-7 h-7 rounded-lg border-2 transition-all',
                              batchColor === c.value ? 'border-white scale-110' : 'border-white/10'
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                        <input
                          type="color"
                          value={batchColor || '#ffffff'}
                          onChange={(e) => setBatchColor(e.target.value)}
                          className="w-7 h-7 rounded-lg border-2 border-white/10 cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>

                    {/* 样式选择 */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                        <Type size={12} />
                        标题样式
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              const next = new Set(batchStyle);
                              if (next.has(opt.value)) {
                                next.delete(opt.value);
                              } else {
                                next.add(opt.value);
                              }
                              setBatchStyle(next);
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              batchStyle.has(opt.value)
                                ? 'bg-brand-accent/20 border-brand-accent/40 text-brand-accent'
                                : 'bg-surface-card/40 border-white/[0.06] text-slate-400 hover:text-white'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 预览 */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">预览</label>
                      <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                        <span
                          className={cn('text-sm', titleStyleToCss(Array.from(batchStyle).join(',')))}
                          style={batchColor ? { color: batchColor } : { color: '#ffffff' }}
                        >
                          标题预览文字
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
                <button
                  onClick={() => setBatchAction(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchAction}
                  disabled={batchLoading || (batchAction === 'category' && !batchCategoryId)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                    batchAction === 'delete'
                      ? 'bg-red-500 text-white hover:bg-red-500/90'
                      : 'bg-brand-accent text-white hover:bg-brand-accent/90',
                    (batchLoading || (batchAction === 'category' && !batchCategoryId)) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {batchLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      执行中…
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      确认
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 单项编辑弹窗 */}
      <AnimatePresence>
        {editItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setEditItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md glass-card rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">编辑图片</h2>
                <button onClick={() => setEditItem(null)} className="btn-ghost">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* 缩略图预览 */}
                <div className="flex justify-center">
                  <img
                    src={editItem.thumbnail}
                    alt={editItem.title}
                    className="w-24 h-24 rounded-xl object-cover border border-white/[0.06]"
                  />
                </div>

                {/* 标题编辑 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">标题</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-card/60 border border-white/[0.06] text-white text-sm focus:outline-none focus:border-brand-accent/50 transition-colors"
                  />
                </div>

                {/* 颜色选择 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <Palette size={12} />
                    标题颜色
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditColor('')}
                      className={cn(
                        'w-7 h-7 rounded-lg border-2 flex items-center justify-center text-[10px]',
                        editColor === '' ? 'border-brand-accent' : 'border-white/10 text-slate-500'
                      )}
                    >
                      默认
                    </button>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setEditColor(c.value)}
                        className={cn(
                          'w-7 h-7 rounded-lg border-2 transition-all',
                          editColor === c.value ? 'border-white scale-110' : 'border-white/10'
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor || '#ffffff'}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-2 border-white/10 cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {/* 样式选择 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <Type size={12} />
                    标题样式
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const next = new Set(editStyle);
                          if (next.has(opt.value)) {
                            next.delete(opt.value);
                          } else {
                            next.add(opt.value);
                          }
                          setEditStyle(next);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          editStyle.has(opt.value)
                            ? 'bg-brand-accent/20 border-brand-accent/40 text-brand-accent'
                            : 'bg-surface-card/40 border-white/[0.06] text-slate-400 hover:text-white'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 预览 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">预览</label>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                    <span
                      className={cn('text-sm', titleStyleToCss(Array.from(editStyle).join(',')))}
                      style={editColor ? { color: editColor } : { color: '#ffffff' }}
                    >
                      {editTitle || '标题预览'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-brand-accent text-white hover:bg-brand-accent/90 transition-all"
                >
                  <Check size={14} />
                  保存
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
              <div
                className={cn('text-sm font-medium text-white', titleStyleToCss(item.titleStyle))}
                style={item.titleColor ? { color: item.titleColor } : undefined}
              >
                {item.title}
              </div>
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
