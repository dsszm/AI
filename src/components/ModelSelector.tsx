/**
 * 模型选择下拉框
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Shield, Zap } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export default function ModelSelector() {
  const { models, currentModel, setModel } = useChatStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = models.find((m) => m.id === currentModel);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-raised/70 border border-white/[0.08] hover:border-brand-accent/40 transition-all duration-200 ease-smooth min-w-[180px]"
      >
        {current && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: current.color, boxShadow: `0 0 8px ${current.color}` }}
          />
        )}
        <span className="text-sm font-medium text-white flex-1 text-left">
          {current?.name || '选择模型'}
        </span>
        <ChevronDown
          size={16}
          className={cn('text-slate-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 glass-card rounded-2xl p-2 z-50 animate-slide-up max-h-[70vh] overflow-y-auto scroll-thin shadow-glow">
          <div className="sticky top-0 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-600 font-medium bg-surface-card/80 backdrop-blur-sm">
            选择 AI 模型 · {models.length} 个
          </div>
          {models.map((m) => {
            const active = m.id === currentModel;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setModel(m.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left',
                  active ? 'bg-brand-accent/15' : 'hover:bg-white/[0.04]'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{m.name}</span>
                    {m.defaultEnabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">
                        <Shield size={10} /> 默认
                      </span>
                    )}
                    {m.supportsVision && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/15 text-brand-accent">
                        <Zap size={10} /> 视觉
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.provider}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{m.description}</div>
                </div>
                {active && <Check size={16} className="text-brand-accent mt-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
