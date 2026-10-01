
import React from 'react';
import Markdown from 'react-markdown';
import { Message } from '../types';
import { Icons } from '../constants';

interface ChatMessageProps {
  message: Message;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isLoadingAudio?: boolean;
  isLight?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSpeak, isSpeaking, isLoadingAudio, isLight }) => {
  const isUser = message.role === 'user';
  
  // Extract confidence score if present at the end of content
  const confidenceMatch = message.content.match(/Confidence Score:\s*([\d.]+)/);
  const displayContent = confidenceMatch ? message.content.replace(confidenceMatch[0], '').trim() : message.content;
  const confidence = confidenceMatch ? confidenceMatch[1] : null;

  return (
    <div className={`flex w-full mb-10 ${isUser ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-5 duration-700`}>
      <div className={`flex max-w-[88%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-6`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
          isUser 
            ? 'bg-slate-900 border-slate-800 text-emerald-500/80'
            : 'bg-slate-900 border-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-500/5'
        }`}>
          <div className="scale-110">{isUser ? <Icons.User /> : <Icons.Shield />}</div>
        </div>
        
        {/* Message Bubble Container */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`relative px-7 py-5 rounded-[2rem] text-[14px] leading-relaxed shadow-2xl border backdrop-blur-xl transition-all duration-500 ${
            isUser 
              ? 'bg-slate-800/30 text-slate-100 border-slate-700/40 rounded-tr-none' 
              : 'bg-slate-900/40 text-slate-200 border-emerald-500/10 rounded-tl-none font-mono'
          }`}>
            <div className="markdown-body">
              <Markdown>{displayContent}</Markdown>
            </div>
            
            {message.mediaUrl && (
              <div className="mt-5 rounded-2xl overflow-hidden border border-emerald-500/10 shadow-2xl bg-black/40 group/media relative">
                {message.mediaType === 'image' ? (
                  <img src={message.mediaUrl} alt="Secure Visual Cache" className="max-w-full h-auto opacity-90 hover:opacity-100 transition-opacity duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <video src={message.mediaUrl} controls className="max-w-full h-auto" />
                )}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[9px] font-mono text-white/60 tracking-widest uppercase opacity-0 group-hover/media:opacity-100 transition-opacity">
                  Verified Output
                </div>
              </div>
            )}

            {message.groundingLinks && message.groundingLinks.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-emerald-500/10 pt-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/50 font-bold mb-4 font-mono">Verification Nodes:</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {message.groundingLinks.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.web?.uri || link.maps?.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 text-[11px] hover:bg-emerald-500/[0.07] hover:border-emerald-500/30 text-emerald-400 font-mono transition-all group/link"
                    >
                      <div className="opacity-60 group-hover/link:opacity-100 transition-opacity">
                        {link.web ? <Icons.Search /> : <Icons.Map />}
                      </div>
                      <span className="truncate flex-1">{link.web?.title || link.maps?.title || "Secure Protocol Source"}</span>
                      <svg className="w-3.5 h-3.5 opacity-40 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-label inside bubble for confidence */}
            {confidence && !isUser && (
              <div className="mt-4 flex items-center gap-3 justify-end opacity-50">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-500/20" />
                <span className="text-[9px] font-mono tracking-widest text-emerald-500 uppercase">Confidence Score: {confidence}</span>
              </div>
            )}
          </div>
          
          {/* Metadata Footer */}
          <div className={`flex items-center gap-5 mt-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {!isUser && onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className={`transition-all duration-300 p-2 rounded-xl flex items-center gap-2 ${
                  isLoadingAudio 
                    ? 'text-emerald-500 animate-pulse' 
                    : isSpeaking 
                      ? 'text-emerald-400 bg-emerald-500/10 scale-105 neon-glow' 
                      : 'text-slate-700 hover:text-emerald-500 hover:bg-emerald-500/5 opacity-0 group-hover:opacity-100'
                }`}
                title={isSpeaking ? "Deactivate Neural Audio" : "Activate Neural Audio"}
                disabled={isLoadingAudio}
              >
                <div className="scale-90"><Icons.Speaker /></div>
                {isSpeaking && <span className="text-[9px] font-mono font-bold tracking-widest animate-pulse">STREAMING</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
