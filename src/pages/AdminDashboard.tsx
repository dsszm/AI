/**
 * 管理员后台:系统管理总览页面
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Users, 
  Images, 
  Settings, 
  BarChart3,
  Database,
  Server,
  Mail,
  Shield,
  Activity,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, GalleryItem } from '../../shared/types';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    totalImages: number;
    totalCategories: number;
    recentUploads: GalleryItem[];
    emailConfigured: boolean;
  }>({
    totalImages: 0,
    totalCategories: 0,
    recentUploads: [],
    emailConfigured: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [gallery, categories] = await Promise.all([
        api.getGallery(),
        api.getCategories(),
      ]);
      
      const emailConfigured = !!process.env.SMTP_HOST;
      
      setStats({
        totalImages: gallery.length,
        totalCategories: categories.length,
        recentUploads: gallery.slice(0, 5),
        emailConfigured,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const statCards = [
    {
      title: '图片总数',
      value: stats.totalImages,
      icon: Images,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      desc: '相册中的图片数量',
    },
    {
      title: '分类数量',
      value: stats.totalCategories,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      desc: '图片分类总数',
    },
    {
      title: '邮件服务',
      value: stats.emailConfigured ? '已配置' : '未配置',
      icon: Mail,
      color: stats.emailConfigured ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600',
      bgColor: stats.emailConfigured ? 'bg-green-500/10' : 'bg-orange-500/10',
      desc: 'SMTP 邮件服务状态',
      isText: true,
    },
    {
      title: '系统状态',
      value: '正常',
      icon: Server,
      color: 'from-brand-accent to-brand-primary',
      bgColor: 'bg-brand-accent/10',
      desc: '服务运行状态',
      isText: true,
    },
  ];

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">管理员后台</h1>
              <p className="text-xs text-slate-500">系统管理与数据统计</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card/60 border border-white/[0.06] text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </motion.button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4 border border-white/[0.06]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bgColor)}>
                  <stat.icon size={18} className={cn('bg-gradient-to-br bg-clip-text', stat.isText ? 'text-white' : '')} style={{ color: stat.isText ? undefined : 'inherit' }} />
                </div>
                {stat.isText ? (
                  stat.value === '已配置' ? (
                    <CheckCircle2 size={18} className="text-green-400" />
                  ) : (
                    <AlertCircle size={18} className="text-orange-400" />
                  )
                ) : null}
              </div>
              <div className="text-[11px] text-slate-500 mb-1">{stat.title}</div>
              <div className={cn(
                'text-2xl font-bold',
                stat.isText 
                  ? stat.value === '已配置' ? 'text-green-400' : 'text-orange-400'
                  : 'text-white'
              )}>
                {stat.value}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">{stat.desc}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近上传 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="glass-card rounded-2xl p-5 border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-brand-accent" />
              <h2 className="text-sm font-semibold text-white">最近上传</h2>
            </div>
            
            {stats.recentUploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Images size={32} className="opacity-40 mb-2" />
                <span className="text-xs">暂无上传记录</span>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentUploads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-card/40 border border-white/[0.04] hover:border-brand-accent/30 transition-colors"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.type === 'image' ? '图片' : '视频'}
                        {item.categoryId && ' · 已分类'}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* 快速操作 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="glass-card rounded-2xl p-5 border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Settings size={16} className="text-brand-accent" />
              <h2 className="text-sm font-semibold text-white">快速操作</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: '添加图片',
                  icon: Images,
                  color: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/20',
                  path: '/gallery',
                },
                {
                  label: '管理分类',
                  icon: FileText,
                  color: 'bg-green-500/15 text-green-400 hover:bg-green-500/20',
                  path: '/gallery/categories',
                },
                {
                  label: 'API 秘钥',
                  icon: Shield,
                  color: 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/20',
                  path: '/settings',
                },
                {
                  label: '帮助中心',
                  icon: Clock,
                  color: 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/20',
                  path: '/help',
                },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.path}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                    action.color
                  )}
                >
                  <action.icon size={20} />
                  <span className="text-xs font-medium">{action.label}</span>
                </a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 系统信息 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="glass-card rounded-2xl p-5 border border-white/[0.06] mt-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-brand-accent" />
            <h2 className="text-sm font-semibold text-white">系统信息</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-surface-card/40 border border-white/[0.04]">
              <div className="text-[10px] text-slate-500 mb-1">管理员邮箱</div>
              <div className="text-xs text-white font-mono">dashuaishizhimao@qq.com</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-card/40 border border-white/[0.04]">
              <div className="text-[10px] text-slate-500 mb-1">服务端口</div>
              <div className="text-xs text-white font-mono">3001</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-card/40 border border-white/[0.04]">
              <div className="text-[10px] text-slate-500 mb-1">前端端口</div>
              <div className="text-xs text-white font-mono">5173</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-card/40 border border-white/[0.04]">
              <div className="text-[10px] text-slate-500 mb-1">数据库</div>
              <div className="text-xs text-white font-mono">SQLite</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
