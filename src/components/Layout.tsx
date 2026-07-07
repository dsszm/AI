/**
 * 应用布局:侧边栏 + 主内容区
 * 桌面端固定侧边栏,移动端可折叠抽屉
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Image,
  FolderTree,
  KeyRound,
  HelpCircle,
  Menu,
  X,
  Terminal,
  LogOut,
  Crown,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  { to: '/', label: 'AI 对话', icon: MessageSquare, desc: '多模型对话' },
  { to: '/gallery', label: '相册', icon: Image, desc: '点播内容' },
  { to: '/gallery/categories', label: '相册分类', icon: FolderTree, desc: '分类管理' },
  { to: '/settings', label: '秘钥管理', icon: KeyRound, desc: 'API Key 配置' },
  { to: '/help', label: '帮助中心', icon: HelpCircle, desc: '使用说明' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-mesh">
      {/* 桌面侧边栏 */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.06] bg-surface-card/40 backdrop-blur-xl">
        <SidebarContent currentPath={location.pathname} />
      </aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex w-64 flex-col bg-surface-card border-r border-white/[0.06] animate-slide-in">
            <button
              className="absolute top-4 right-4 btn-ghost"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭菜单"
            >
              <X size={20} />
            </button>
            <SidebarContent currentPath={location.pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶栏 */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-white/[0.06] bg-surface-card/40 backdrop-blur-xl">
          <button className="btn-ghost" onClick={() => setMobileOpen(true)} aria-label="打开菜单">
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Terminal size={18} className="text-brand-accent" />
            <span className="font-display font-semibold tracking-wide">控制台</span>
          </Link>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate?: () => void;
}) {
  const { user } = useAuthStore();
  
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shadow-glow">
          <Terminal size={18} className="text-white" />
        </div>
        <div>
          <div className="font-display font-semibold text-base tracking-wide text-white">控制台</div>
          <div className="text-[11px] text-slate-500 leading-none mt-0.5">多模型 AI 工具</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scroll-thin">
        <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-slate-600 font-medium">
          导航
        </div>
        {NAV_ITEMS.map((item) => {
          const active =
            item.to === '/'
              ? currentPath === '/'
              : currentPath === item.to || currentPath.startsWith(item.to + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-smooth',
                active
                  ? 'bg-brand-accent/15 text-white border border-brand-accent/30 shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'transition-colors',
                  active ? 'text-brand-accent' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{item.label}</div>
                <div className="text-[11px] text-slate-600 leading-tight mt-0.5">{item.desc}</div>
              </div>
              {active && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-glow" />}
            </Link>
          );
        })}
        
        {user?.isAdmin && (
          <>
            <div className="px-3 mt-4 mb-2 text-[11px] uppercase tracking-wider text-slate-600 font-medium">
              管理
            </div>
            <Link
              to="/admin"
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-smooth',
                currentPath === '/admin'
                  ? 'bg-warning/15 text-white border border-warning/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Crown
                size={18}
                className={cn(
                  'transition-colors',
                  currentPath === '/admin' ? 'text-warning' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">管理员后台</div>
                <div className="text-[11px] text-slate-600 leading-tight mt-0.5">系统管理</div>
              </div>
              {currentPath === '/admin' && <div className="w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_12px_rgba(245,158,11,0.4)]" />}
            </Link>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/[0.06]">
        <UserPanel />
      </div>
    </>
  );
}

function UserPanel() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const initial = user.nickname.slice(0, 1).toUpperCase();

  return (
    <div className="glass-raised rounded-xl p-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0',
            user.isAdmin
              ? 'bg-gradient-to-br from-warning to-warning/70 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-brand-accent/20 text-brand-accent'
          )}
        >
          {user.isAdmin ? <Crown size={16} /> : initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white truncate">{user.nickname}</span>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-warning/15 text-warning shrink-0">
                <Crown size={9} /> 管理员
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</div>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-danger hover:bg-danger/10 transition-all duration-150"
      >
        <LogOut size={13} />
        退出登录
      </button>
    </div>
  );
}
