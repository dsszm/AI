/**
 * 对话输入区:文本输入 + 图片上传 + 从相册选择 + 发送
 */
import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Images, X, CornerDownLeft } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import GalleryPicker from './GalleryPicker';

export default function ChatInput() {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { sendMessage, sending, currentModel } = useChatStore();

  // 自适应高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [text]);

  const handleSend = async () => {
    if (sending) return;
    if (!text.trim() && images.length === 0) return;
    const t = text;
    const imgs = images;
    setText('');
    setImages([]);
    await sendMessage(t, imgs.length > 0 ? imgs : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* 已选图片预览 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`预览 ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-white/[0.1]"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="移除图片"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'glass-card rounded-2xl p-2 flex items-end gap-2 transition-all duration-200',
            sending && 'opacity-70'
          )}
        >
          {/* 上传按钮 */}
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost shrink-0"
            disabled={sending}
            aria-label="上传图片"
            title="上传本地图片"
          >
            <ImagePlus size={20} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* 从相册选择 */}
          <button
            onClick={() => setPickerOpen(true)}
            className="btn-ghost shrink-0"
            disabled={sending}
            aria-label="从相册选择"
            title="从相册选择图片"
          >
            <Images size={20} />
          </button>

          {/* 文本输入 */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`向 ${currentModel} 提问…  (Enter 发送,Shift+Enter 换行)`}
            className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none px-2 py-2.5 max-h-[200px] scroll-thin"
            disabled={sending}
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && images.length === 0)}
            className="btn-primary shrink-0 !px-3.5"
            aria-label="发送"
          >
            <Send size={18} className={sending ? 'animate-pulse' : ''} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-2">
          <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <CornerDownLeft size={11} />
            Enter 发送 · Shift+Enter 换行
          </p>
          <p className="text-[11px] text-slate-600">
            {currentModel === 'qwen' ? '通义千问 · 默认启用' : `${currentModel} · 需配置 Key`}
          </p>
        </div>
      </div>

      <GalleryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(urls) => setImages((prev) => [...prev, ...urls])}
      />
    </div>
  );
}
