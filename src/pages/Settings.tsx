/**
 * 秘钥管理页:卡片式配置各模型 API Key
 */
import { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Check,
  Loader2,
  Lock,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import type { KeyStatus, ModelId, ModelInfo } from '../../shared/types';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { models, loadModels } = useChatStore();
  const [statuses, setStatuses] = useState<KeyStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getKeys();
      setStatuses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
    refresh();
  }, [loadModels]);

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center">
              <KeyRound size={20} className="text-brand-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">秘钥管理</h1>
              <p className="text-xs text-slate-500">配置各 AI 模型的 API Key,前端不暴露,经服务端代理调用</p>
            </div>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="glass-card rounded-2xl p-4 mb-6 flex items-start gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <Shield size={18} className="text-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-slate-200 font-medium mb-1">安全说明</div>
            <ul className="text-xs text-slate-400 space-y-1 leading-relaxed">
              <li>· 选择「加密存储」:Key 经 AES 加密后写入数据库,仅服务端解密使用</li>
              <li>· 选择「不存储」:Key 仅存于服务端会话内存,刷新后失效</li>
              <li>· 所有 AI 调用通过服务端代理转发,前端永不持有明文 Key</li>
              <li>· 通义千问默认启用(使用管理员 Key 时有 5 秒冷却)</li>
            </ul>
          </div>
        </div>

        {/* 模型卡片网格 */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 size={24} className="animate-spin text-brand-accent mr-2" />
            <span className="text-sm">加载配置…</span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {models.map((model, i) => {
              const status = statuses.find((s) => s.model === model.id);
              return (
                <KeyCard
                  key={model.id}
                  model={model}
                  status={status}
                  index={i}
                  onSaved={refresh}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyCard({
  model,
  status,
  index,
  onSaved,
}: {
  model: ModelInfo;
  status?: KeyStatus;
  index: number;
  onSaved: () => void;
}) {
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [persist, setPersist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const configured = status?.configured || model.defaultEnabled;

  const handleSave = async () => {
    if (!keyValue.trim()) {
      setError('请输入 API Key');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.saveKey(model.id as ModelId, keyValue.trim(), persist);
      setSaved(true);
      setKeyValue('');
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.deleteKey(model.id as ModelId);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="glass-card rounded-2xl p-5 animate-slide-up"
      style={{ animationDelay: `${100 + index * 50}ms` }}
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${model.color}20`, border: `1px solid ${model.color}40` }}
          >
            <span className="text-sm font-display font-bold" style={{ color: model.color }}>
              {model.name.slice(0, 1)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{model.name}</span>
              {model.supportsVision && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/15 text-brand-accent">
                  <Zap size={9} /> 视觉
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{model.provider}</div>
          </div>
        </div>
        {/* 状态指示灯 */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'status-dot',
              configured ? 'bg-success shadow-[0_0_6px_#10B981]' : 'bg-slate-600'
            )}
          />
          <span className={cn('text-[11px]', configured ? 'text-success' : 'text-slate-500')}>
            {configured ? '已配置' : '未配置'}
          </span>
        </div>
      </div>

      {/* 通义千问默认启用提示 */}
      {model.defaultEnabled ? (
        <div className="rounded-xl bg-success/10 border border-success/20 px-3 py-2.5 mb-3 flex items-center gap-2">
          <Check size={14} className="text-success shrink-0" />
          <span className="text-xs text-success">已启用(无需配置),使用管理员 Key 调用</span>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{model.description}</p>
      )}

      {/* Key 输入 */}
      <div className="space-y-2.5">
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={showKey ? 'text' : 'password'}
            value={keyValue}
            onChange={(e) => {
              setKeyValue(e.target.value);
              setError('');
            }}
            placeholder={configured ? '输入新 Key 以替换' : '输入 API Key'}
            className="input-base !pl-9 !pr-10 text-sm font-mono"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={showKey ? '隐藏' : '显示'}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* 持久化选项 */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <button
            type="button"
            onClick={() => setPersist((v) => !v)}
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative',
              persist ? 'bg-brand-accent' : 'bg-surface-raised'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                persist ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
          <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
            {persist ? '加密存储(持久化)' : '不存储(仅当前会话)'}
          </span>
        </label>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !keyValue.trim()}
            className="btn-primary flex-1 !py-2 text-sm"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={15} /> 已保存
              </>
            ) : (
              <>
                <Save size={15} /> 保存
              </>
            )}
          </button>
          {configured && !model.defaultEnabled && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="btn-secondary !py-2 !px-3"
              title="删除 Key"
            >
              <Trash2 size={15} className="text-danger" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
