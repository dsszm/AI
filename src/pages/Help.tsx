/**
 * 帮助中心页:使用说明 + 常见问题 FAQ
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  ChevronDown,
  MessageSquare,
  KeyRound,
  Image as ImageIcon,
  Zap,
  Shield,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GUIDES = [
  {
    icon: MessageSquare,
    title: '如何开始对话',
    steps: [
      '在首页顶部通过模型选择下拉框选择 AI 模型',
      '在底部输入框输入问题,Enter 发送 / Shift+Enter 换行',
      'AI 回复会以打字机效果逐字显示,可继续追问',
      '点击右上角「历史」可查看与恢复过往会话',
    ],
  },
  {
    icon: KeyRound,
    title: '如何配置 API Key',
    steps: [
      '进入「秘钥管理」页面',
      '在对应模型卡片中输入 API Key',
      '选择「加密存储」(持久化)或「不存储」(仅当前会话)',
      '点击保存,返回对话页即可使用该模型',
      '通义千问默认启用,无需配置',
    ],
  },
  {
    icon: ImageIcon,
    title: '如何引用相册图片',
    steps: [
      '在对话输入区点击「相册」图标',
      '从弹窗中选择一张或多张图片',
      '点击「引用」,图片将作为附件显示',
      '发送后,AI 会结合图片内容进行理解和回答',
      '也可点击「上传」图标直接上传本地图片',
    ],
  },
];

const FAQ = [
  {
    q: '通义千问为什么默认可用?',
    a: '通义千问通过服务端代理使用管理员 Key 调用阿里云百炼平台,用户无需自行配置。为防止滥用,使用管理员 Key 时有 5 秒冷却限制;若你配置了自有 Key 则不受此限制。',
  },
  {
    q: 'API Key 是否安全?',
    a: '安全。选择「加密存储」时,Key 经 AES 加密后写入数据库,仅服务端在调用时解密;选择「不存储」时仅存于服务端内存。前端界面永不持有明文 Key,所有调用经服务端转发。',
  },
  {
    q: '为什么切换模型后无法对话?',
    a: 'OpenAI、DeepSeek、Claude 需先在「秘钥管理」配置对应 API Key。若未配置,系统会提示并引导前往配置页;通义千问无需配置即可使用。',
  },
  {
    q: '相册内容从哪里来?',
    a: '相册内容来自阿里云视频点播服务,支持图片预览与视频播放。可在「相册分类」页对内容进行分类管理,便于查找与组织。',
  },
  {
    q: '对话历史会保存吗?',
    a: '会。每次对话会自动创建会话并保存到数据库,可在首页右上角「历史」面板中恢复。点击「新对话」可开始全新的对话会话。',
  },
  {
    q: '支持哪些模型的能力差异?',
    a: '通义千问、OpenAI GPT、Claude 支持图像理解(视觉);DeepSeek 擅长推理与代码。各模型回答风格与质量不同,建议多模型对比以选择最适合的。',
  },
];

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-8 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center">
            <HelpCircle size={20} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">帮助中心</h1>
            <p className="text-xs text-slate-500">使用说明、模型指引与常见问题</p>
          </div>
        </div>

        {/* 使用指引 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-brand-accent" />
            <h2 className="text-sm font-semibold text-white">使用指引</h2>
          </div>
          <div className="space-y-3">
            {GUIDES.map((guide, gi) => {
              const Icon = guide.icon;
              return (
                <motion.div
                  key={guide.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: gi * 0.05 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center">
                      <Icon size={15} className="text-brand-accent" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                  </div>
                  <ol className="space-y-2 pl-3">
                    {guide.steps.map((step, si) => (
                      <li key={si} className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-surface-raised border border-white/[0.08] text-[11px] text-brand-accent font-medium flex items-center justify-center mt-0.5">
                          {si + 1}
                        </span>
                        <span className="text-xs text-slate-400 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* 特性说明 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-brand-accent" />
            <h2 className="text-sm font-semibold text-white">核心特性</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: MessageSquare, title: '多模型对比', desc: '统一入口切换 4 大模型' },
              { icon: Shield, title: '安全代理', desc: 'Key 加密存储,服务端转发' },
              { icon: ImageIcon, title: '相册联动', desc: '引用图片让 AI 理解图像' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="glass-card rounded-2xl p-4 animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center mb-2.5">
                    <Icon size={15} className="text-brand-accent" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{f.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-brand-accent" />
            <h2 className="text-sm font-semibold text-white">常见问题</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className={cn(
                    'glass-card rounded-xl overflow-hidden transition-all duration-200',
                    open && 'border-brand-accent/30'
                  )}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="text-sm font-medium text-white">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        'text-slate-400 shrink-0 transition-transform duration-200',
                        open && 'rotate-180 text-brand-accent'
                      )}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-xs text-slate-400 leading-relaxed">{item.a}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 底部说明 */}
        <div className="mt-10 text-center text-[11px] text-slate-600">
          控制台 · 多模型 AI 调用工具 · 文案遵循广告法合规
        </div>
      </div>
    </div>
  );
}
