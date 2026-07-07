/**
 * 相册分类页:左侧分类树 + 右侧内容分配
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  FolderPlus,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';

export default function GalleryCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cats, gallery] = await Promise.all([api.getCategories(), api.getGallery()]);
      setCategories(cats);
      setItems(gallery);
      if (!activeId && cats.length > 0) setActiveId(cats[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.createCategory(newName.trim());
      setNewName('');
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await api.updateCategory(id, editingName.trim());
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该分类?分类下的内容将变为未分类。')) return;
    try {
      await api.deleteCategory(id);
      if (activeId === id) setActiveId(null);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (itemId: string, categoryId: string) => {
    try {
      await api.assignCategory(itemId, categoryId);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const activeItems = activeId ? items.filter((i) => i.categoryId === activeId) : [];

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 h-full flex flex-col">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-6 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center">
            <FolderTree size={20} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">相册分类</h1>
            <p className="text-xs text-slate-500">创建分类、分配内容,便于组织素材</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <Loader2 size={24} className="animate-spin text-brand-accent mr-2" />
            <span className="text-sm">加载中…</span>
          </div>
        ) : (
          <div className="flex-1 grid md:grid-cols-[280px_1fr] gap-4 min-h-0">
            {/* 分类列表 */}
            <div className="glass-card rounded-2xl p-4 flex flex-col animate-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">分类列表</h2>
                <span className="text-[11px] text-slate-500">{categories.length} 个</span>
              </div>

              {/* 新建分类 */}
              <div className="flex gap-1.5 mb-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="新分类名称"
                  className="input-base !py-2 text-xs flex-1"
                />
                <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary !px-2.5 !py-2">
                  <Plus size={15} />
                </button>
              </div>

              {/* 分类项 */}
              <div className="flex-1 overflow-y-auto scroll-thin space-y-1">
                {categories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-600">
                    <FolderPlus size={24} className="mx-auto mb-2 opacity-40" />
                    暂无分类,新建一个吧
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className={cn(
                        'group rounded-xl transition-all duration-150 border',
                        activeId === cat.id
                          ? 'bg-brand-accent/15 border-brand-accent/30'
                          : 'border-transparent hover:bg-white/[0.04]'
                      )}
                    >
                      {editingId === cat.id ? (
                        <div className="flex items-center gap-1.5 p-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdate(cat.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="input-base !py-1.5 !px-2 text-xs flex-1"
                          />
                          <button onClick={() => handleUpdate(cat.id)} className="btn-ghost !p-1.5">
                            <Check size={14} className="text-success" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="btn-ghost !p-1.5">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2">
                          <button
                            onClick={() => setActiveId(cat.id)}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <FolderTree
                              size={14}
                              className={cn(
                                'shrink-0',
                                activeId === cat.id ? 'text-brand-accent' : 'text-slate-600'
                              )}
                            />
                            <span className="text-sm text-slate-200 truncate">{cat.name}</span>
                            <span className="text-[10px] text-slate-600 shrink-0">({cat.count})</span>
                          </button>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="btn-ghost !p-1.5"
                              title="重命名"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="btn-ghost !p-1.5"
                              title="删除"
                            >
                              <Trash2 size={12} className="text-danger" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 右侧内容区 */}
            <div className="glass-card rounded-2xl p-4 flex flex-col min-h-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
              {activeId ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">
                      {categories.find((c) => c.id === activeId)?.name} 的内容
                    </h2>
                    <span className="text-[11px] text-slate-500">{activeItems.length} 项</span>
                  </div>

                  {activeItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                      <ImageIcon size={32} className="mb-2 opacity-40" />
                      <span className="text-sm">该分类暂无内容</span>
                      <span className="text-xs text-slate-600 mt-1">可在相册页浏览后分配到此分类</span>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto scroll-thin">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {activeItems.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                            className="relative group"
                          >
                            <div className="aspect-square rounded-lg overflow-hidden border border-white/[0.06]">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-1.5">{item.title}</div>
                            {/* 移动到其他分类 */}
                            <select
                              value={item.categoryId || ''}
                              onChange={(e) => handleAssign(item.id, e.target.value)}
                              className="w-full text-[10px] bg-surface-base border border-white/[0.06] rounded px-1.5 py-1 text-slate-400 mt-0.5 focus:outline-none focus:border-brand-accent/40"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <FolderTree size={40} className="mb-3 opacity-40" />
                  <span className="text-sm">选择左侧分类查看内容</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
