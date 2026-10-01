
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { X } from 'lucide-react';

export type InputMode = 'default' | 'lite' | 'thinking' | 'search' | 'maps' | 'image' | 'video' | 'edit';

interface ChatInputProps {
  onSend: (message: string, mode: InputMode, file?: File, imageSize?: '1K' | '2K' | '4K') => void;
  onLiveToggle: () => void;
  disabled: boolean;
  placeholder?: string;
  isLight?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onLiveToggle, disabled, placeholder = "Ask about cyber safety, scams, or digital protection...", isLight }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InputMode>('default');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedFile) && !disabled) {
      onSend(input.trim(), mode, selectedFile || undefined, mode === 'image' ? imageSize : undefined);
      setInput('');
      setSelectedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="bg-slate-950/80 border-t border-slate-900/50 backdrop-blur-2xl p-6 relative">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        
        {/* Mode Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'default', label: 'Pro', icon: <Icons.Shield /> },
            { id: 'lite', label: 'Lite', icon: <Icons.Zap /> },
            { id: 'thinking', label: 'Think', icon: <Icons.Bot /> },
            { id: 'search', label: 'Search', icon: <Icons.Search /> },
            { id: 'maps', label: 'Maps', icon: <Icons.Map /> },
            { id: 'image', label: 'Gen', icon: <Icons.Image /> },
            { id: 'video', label: 'Veo', icon: <Icons.Movie /> },
            { id: 'edit', label: 'Edit', icon: <Icons.Image /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as InputMode)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl border text-[10px] font-bold uppercase tracking-[0.25em] flex items-center gap-3 transition-all duration-300 ${
                mode === m.id 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="scale-90">{m.icon}</div>
              {m.label}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-800/50 mx-2 flex-shrink-0" />
          <button
            onClick={onLiveToggle}
            className="flex-shrink-0 px-5 py-2.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-[0.25em] flex items-center gap-3 transition-all hover:bg-red-500/10 hover:border-red-500/40"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE_AUDIO
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-4 group">
          <div className="relative flex-1 bg-slate-900/30 border border-slate-800/60 rounded-[2rem] p-2 focus-within:border-emerald-500/30 transition-all duration-500">
            {selectedFile && (
              <div className="flex items-center gap-4 p-3 mb-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 animate-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Icons.Lock /></div>
                <span className="text-[12px] text-emerald-300 font-mono truncate flex-1">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-red-400 p-2 transition-colors">
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            )}
            
            <div className="flex items-center px-5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'image' ? "Describe your vision for generation..." : placeholder}
                disabled={disabled}
                className="w-full py-4 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-mono text-slate-200 placeholder:text-slate-700 resize-none scrollbar-hide leading-relaxed"
                rows={1}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-600 hover:text-emerald-400 transition-all hover:scale-110"
                title="Attach Document/Media"
              >
                <Icons.Lock />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*,video/*,application/pdf" />
            </div>
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && !selectedFile) || disabled}
            className={`p-5 rounded-[2rem] border transition-all duration-500 h-[64px] w-[64px] flex items-center justify-center ${
              (input.trim() || selectedFile) && !disabled 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xl shadow-emerald-500/20 active:scale-95' 
                : 'bg-slate-900 border-slate-800 text-slate-700 opacity-40'
            }`}
          >
            <div className="scale-125"><Icons.Send /></div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
