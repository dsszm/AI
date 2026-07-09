/**
 * 首页 / AI 对话页
 * 居中聚焦式布局:顶部模型选择 + 中部对话流 + 底部输入区
 */
import { useEffect, useRef, useState } from 'react';
import { Plus, History, Sparkles, MessageSquare, Zap, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import ModelSelector from '@/components/ModelSelector';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import ImageGenPanel from '@/components/ImageGenPanel';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    messages,
    loading,
    sending,
    currentSessionId,
    sessions,
    loadModels,
    loadSessions,
    selectSession,
    newChat,
    currentModel,
  } = useChatStore();

  const { user } = useAuthStore();
  const isAdmin = user?.isAdmin;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadModels();
    loadSessions();
  }, [loadModels, loadSessions]);

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-full">
      {/* 主对话区 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* 顶部栏 */}
        <header className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-surface-card/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <ModelSelector />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                newChat();
                setShowHistory(false);
              }}
              className="btn-ghost"
              title="新对话"
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-sm">新对话</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn('btn-ghost', showHistory && 'text-brand-accent bg-brand-accent/10')}
                title="历史记录"
              >
                <History size={18} />
              </button>
            )}
          </div>
        </header>

        {/* 对话区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin">
          {messages.length === 0 && !loading ? (
            <WelcomeScreen />
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              加载历史记录…
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {sending && messages[messages.length - 1]?.role === 'user' && (
                <div className="text-center text-xs text-slate-600 animate-pulse-soft">
                  等待 AI 响应…
                </div>
              )}
            </div>
          )}
        </div>

        {/* 图像生成面板 */}
        <ImageGenPanel />

        {/* 输入区 */}
        <ChatInput />
      </div>

      {/* 历史记录面板 */}
      {showHistory && (
        <aside className="hidden md:flex w-72 flex-col border-l border-white/[0.06] bg-surface-card/30 backdrop-blur-xl animate-slide-in">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History size={16} className="text-brand-accent" />
              对话历史
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">点击恢复历史会话</p>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-600">暂无历史会话</div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    selectSession(s.id);
                    setShowHistory(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group',
                    currentSessionId === s.id
                      ? 'bg-brand-accent/15 border border-brand-accent/30'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare
                      size={14}
                      className={cn(
                        'shrink-0',
                        currentSessionId === s.id ? 'text-brand-accent' : 'text-slate-600'
                      )}
                    />
                    <span className="text-sm text-slate-200 truncate flex-1">{s.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1 pl-5">
                    {formatTime(s.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function WelcomeScreen() {
  const examples = [
    {
      icon: Sparkles,
      title: '创意写作',
      desc: '让 AI 协助撰写文案、故事或脚本',
    },
    {
      icon: Zap,
      title: '多模型对比',
      desc: '切换不同模型,对比回答质量与风格',
    },
    {
      icon: ImageIcon,
      title: '图像理解',
      desc: '上传或从相册引用图片,让 AI 分析内容',
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-primary shadow-glow-lg mb-5 animate-slide-up">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 animate-slide-up" style={{ animationDelay: '50ms' }}>
          多模型 AI,一键调用
        </h1>
        <p className="text-slate-400 text-sm mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          支持通义千问、OpenAI、DeepSeek、Claude 切换对比 · 可引用相册图片进行图像理解
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          {examples.map((ex, i) => {
            const Icon = ex.icon;
            return (
              <div
                key={ex.title}
                className="glass-card rounded-2xl p-4 text-left animate-slide-up"
                style={{ animationDelay: `${150 + i * 50}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-brand-accent/15 flex items-center justify-center mb-2.5">
                  <Icon size={16} className="text-brand-accent" />
                </div>
                <div className="text-sm font-medium text-white mb-1">{ex.title}</div>
                <div className="text-[11px] text-slate-500 leading-snug">{ex.desc}</div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[11px] text-slate-600 animate-fade-in" style={{ animationDelay: '350ms' }}>
          通义千问默认可用 · 其他模型请在「秘钥管理」配置 API Key
        </p>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
}
