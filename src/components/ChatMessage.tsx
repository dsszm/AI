/**
 * 对话消息气泡
 */
import { motion } from 'framer-motion';
import { Sparkles, User, AlertCircle, RotateCw } from 'lucide-react';
import type { UIMessage } from '@/store/chatStore';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import GenImageActions from './GenImageActions';

export default function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const { retryLast, sending } = useChatStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* 头像 */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          isUser
            ? 'bg-brand-accent text-white shadow-glow'
            : 'bg-surface-raised text-brand-accent border border-white/[0.08]'
        )}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      {/* 气泡 */}
      <div className={cn('max-w-[78%] min-w-0', isUser && 'flex flex-col items-end')}>
        {message.images && message.images.length > 0 && (
          <div className={cn('flex flex-wrap gap-2 mb-2', isUser && 'justify-end')}>
            {message.images.map((url, i) => (
              <div key={i} className="inline-block">
                <img
                  src={url}
                  alt={`附件 ${i + 1}`}
                  className={cn(
                    'object-cover rounded-lg border border-white/[0.08]',
                    message.isGenImage ? 'w-full max-w-sm h-auto' : 'w-28 h-28'
                  )}
                  loading="lazy"
                />
                {message.isGenImage && !isUser && (
                  <GenImageActions
                    imageUrl={url}
                    prompt={message.genPrompt}
                    savedToGallery={message.genSaved}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {message.content || message.streaming ? (
          <div
            className={cn(
              'px-4 py-3 rounded-2xl text-sm leading-relaxed break-words',
              isUser
                ? 'bg-brand-accent text-white rounded-tr-sm shadow-glow'
                : 'bg-surface-card text-slate-100 border border-white/[0.06] rounded-tl-sm'
            )}
          >
            {message.content ? (
              <span className={message.streaming ? 'typing-cursor' : ''}>{message.content}</span>
            ) : message.streaming ? (
              <ThinkingDots />
            ) : null}
          </div>
        ) : null}

        {/* 错误 + 重试 */}
        {message.error && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle size={14} />
              <span>{message.error}</span>
            </div>
            {!isUser && (
              <button
                onClick={() => retryLast()}
                disabled={sending}
                className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-white transition-colors disabled:opacity-50"
              >
                <RotateCw size={12} /> 重试
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <span className="text-xs">AI 思考中</span>
      <span className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-brand-accent animate-pulse-soft"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </span>
  );
}
