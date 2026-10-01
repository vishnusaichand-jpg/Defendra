
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatState, User, PlanType } from './types';
import { gemini } from './services/geminiService';
import { dbService } from './services/dbService';
import { Icons } from './constants';
import ChatMessage from './components/ChatMessage';
import ChatInput, { InputMode } from './components/ChatInput';
import AuthModal from './components/AuthModal';
import PlanSelection from './components/PlanSelection';
import UserProfile from './components/UserProfile';
import { LiveServerMessage } from '@google/genai';

const App: React.FC = () => {
  useEffect(() => { 
    dbService.init(); 
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState<number>(0);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [{ 
      id: '1', 
      role: 'assistant', 
      content: "[SYSTEM_INITIALIZATION]: DEFENDRA GATEWAY SECURED.\n\nWelcome to your neural security assistant. Please authenticate to establish a persistent session node or continue with a temporary ephemeral access buffer.", 
      timestamp: Date.now() 
    }],
    isLoading: false,
    error: null,
  });

  const [isLive, setIsLive] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [loadingAudioMsgId, setLoadingAudioMsgId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const restoreSession = async ( ) => {
      const stored = localStorage.getItem('defendra_session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        const dbRecord = await dbService.findUserByEmail(sessionData.email);
        if (dbRecord) {
          const { password_hash, ...clean } = dbRecord;
          setUser(clean);
          const history = await dbService.getChatHistory(clean.id);
          if (history.length > 0) {
            setChatState(prev => ({ ...prev, messages: history }));
          }
        } else {
          setShowAuth(true);
        }
      } else {
        setShowAuth(true);
      }
    };
    restoreSession();
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  useEffect(() => { scrollToBottom(); }, [chatState.messages, scrollToBottom]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const stopAllAudio = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setSpeakingMsgId(null);
  };

  const handleSpeak = async (message: Message) => {
    if (speakingMsgId === message.id) {
      stopAllAudio();
      return;
    }
    stopAllAudio();
    setLoadingAudioMsgId(message.id);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const base64Audio = await gemini.generateSpeech(message.content);
      if (!base64Audio) throw new Error("Audio buffer generation failed.");
      const audioData = gemini.decodeBase64(base64Audio);
      const audioBuffer = await gemini.decodeAudioData(audioData, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => { if (speakingMsgId === message.id) setSpeakingMsgId(null); };
      setLoadingAudioMsgId(null);
      setSpeakingMsgId(message.id);
      currentSourceRef.current = source;
      source.start();
    } catch (err) {
      setLoadingAudioMsgId(null);
      setSpeakingMsgId(null);
    }
  };

  const handleAuthSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('defendra_session', JSON.stringify(authenticatedUser));
    setShowAuth(false);
    setGuestMessageCount(0);
    
    const history = await dbService.getChatHistory(authenticatedUser.id);
    if (history.length > 0) {
      setChatState(prev => ({ ...prev, messages: history }));
    } else {
      setChatState({
        messages: [{ 
          id: `AUTH-${Date.now()}`, 
          role: 'assistant', 
          content: `[IDENTITY_VERIFIED]: Welcome back, @${authenticatedUser.username}.\n\nSecure neural pathways established. Your session logs and personalized protection protocols are now active.`, 
          timestamp: Date.now() 
        }],
        isLoading: false,
        error: null
      });
    }
  };

  const handleGuestChoice = () => {
    setShowAuth(false);
    setUser(null);
    setGuestMessageCount(0);
    setChatState({
      messages: [{ 
        id: '1', 
        role: 'assistant', 
        content: "[EPHEMERAL_MODE_ACTIVE]: Temporary session buffer initialized. Please note that access is limited to 3 queries to ensure gateway stability.", 
        timestamp: Date.now() 
      }],
      isLoading: false,
      error: null,
    });
  };

  const handleSendMessage = async (content: string, mode: InputMode, file?: File, imageSize?: '1K' | '2K' | '4K') => {
    if (!user && guestMessageCount >= 3) {
      setShowAuth(true);
      return;
    }

    const currentPlan = user?.plan || 'FREE';
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: content || (file ? `Analyze ${file.name}` : ''), 
      timestamp: Date.now() 
    };
    
    setChatState(prev => ({ ...prev, messages: [...prev.messages, userMsg], isLoading: true }));
    
    if (user) {
      await dbService.saveMessage(user.id, userMsg);
    }

    try {
      const assistantId = (Date.now() + 1).toString();
      let responseContent = "";
      let mediaUrl = "";
      let mediaType: 'image' | 'video' | undefined = undefined;
      let groundingLinks: any[] = [];

      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: "",
        timestamp: Date.now()
      };

      if (mode === 'image') {
        mediaUrl = await gemini.generateImage(content, imageSize || '1K');
        mediaType = 'image';
        responseContent = `[SYSTEM_REPORT]: High-fidelity visual reconstruction complete.\n\nGenerated at ${imageSize} resolution within secure buffer.`;
      } else if (mode === 'video') {
        const base64 = file ? await fileToBase64(file) : undefined;
        mediaUrl = await gemini.generateVideo(content, base64);
        mediaType = 'video';
        responseContent = `[SYSTEM_REPORT]: Temporal video buffer compilation successful.`;
      } else if (mode === 'edit' && file) {
        const base64 = await fileToBase64(file);
        mediaUrl = await gemini.editImage(content, base64);
        mediaType = 'image';
        responseContent = `[SYSTEM_REPORT]: Neural edit protocol applied to visual asset.`;
      } else if (file) {
        const base64 = await fileToBase64(file);
        responseContent = await gemini.analyzeMedia(content || "Provide a detailed security assessment of the provided asset.", base64, file.type, currentPlan);
      } else if (mode === 'search' || mode === 'maps') {
        const result = await gemini.generateGroundedContent(content, mode === 'search' ? 'googleSearch' : 'googleMaps', currentPlan);
        responseContent = result.text;
        groundingLinks = result.links;
      } else if (mode === 'thinking') {
        responseContent = await gemini.generateWithThinking(content, currentPlan);
      } else {
        setChatState(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], isLoading: false }));
        const stream = mode === 'lite' ? gemini.streamMessageLite(content, currentPlan) : gemini.streamMessage(content, currentPlan);
        for await (const chunk of stream) {
          responseContent += chunk;
          setChatState(prev => {
            const last = prev.messages[prev.messages.length - 1];
            if (last.id === assistantId) {
              const updatedMsg = { ...last, content: responseContent };
              return { ...prev, messages: [...prev.messages.slice(0, -1), updatedMsg] };
            }
            return prev;
          });
        }
      }

      if (!user) {
        const newCount = guestMessageCount + 1;
        setGuestMessageCount(newCount);
        if (newCount === 3) {
          responseContent += "\n\n[PROTOCOL_NOTICE]: Ephemeral session limit reached. To continue your session and access advanced features, please register your identity node.";
        }
      }

      const finalAssistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: responseContent,
        mediaUrl,
        mediaType,
        groundingLinks,
        timestamp: Date.now()
      };

      if (mode !== 'lite' && mode !== 'default') {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, finalAssistantMsg],
          isLoading: false
        }));
      } else {
        setChatState(prev => {
           const idx = prev.messages.findIndex(m => m.id === assistantId);
           if (idx !== -1) {
             const newMessages = [...prev.messages];
             newMessages[idx] = finalAssistantMsg;
             return { ...prev, messages: newMessages, isLoading: false };
           }
           return { ...prev, isLoading: false };
        });
      }
      
      if (user) {
        await dbService.saveMessage(user.id, finalAssistantMsg);
      }

    } catch (err: any) {
      setChatState(prev => ({ ...prev, error: `[SYSTEM_FAULT]: ${err.message}`, isLoading: false }));
    }
  };

  const handleUpgrade = async (newPlan: PlanType) => {
    if (!user) return;
    setChatState(prev => ({ ...prev, isLoading: true }));
    const success = await dbService.updateUserPlan(user.id, newPlan);
    if (success) {
      const updatedUser = { ...user, plan: newPlan };
      setUser(updatedUser);
      localStorage.setItem('defendra_session', JSON.stringify(updatedUser));
      setShowPlans(false);
      const logMsg: Message = {
        id: `PLAN-${Date.now()}`,
        role: 'assistant',
        content: `[CLEARANCE_LEVEL_ELEVATED]: Protocol profile upgraded to ${newPlan}.\n\nYour neural processing priority has been increased and advanced security layers are now accessible.`,
        timestamp: Date.now(),
      };
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, logMsg],
        isLoading: false
      }));
      await dbService.saveMessage(user.id, logMsg);
    }
  };

  const handleLiveToggle = async () => {
    if (!user) { setShowAuth(true); return; }
    if (isLive) { liveSessionRef.current?.close(); setIsLive(false); return; }
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let nextStartTime = 0;
      const sessionPromise = gemini.connectLive({
        onopen: () => {
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
            sessionPromise.then(s => s.sendRealtimeInput({ 
              media: { data: gemini.encodeBase64(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
            }));
          };
          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
          setIsLive(true);
        },
        onmessage: async (msg: LiveServerMessage) => {
          const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio) {
            const buffer = await gemini.decodeAudioData(gemini.decodeBase64(audio), audioContextRef.current!);
            const source = audioContextRef.current!.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current!.destination);
            nextStartTime = Math.max(nextStartTime, audioContextRef.current!.currentTime);
            source.start(nextStartTime);
            nextStartTime += buffer.duration;
            sourcesRef.current.add(source);
          }
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
          }
        },
        onclose: () => setIsLive(false),
        onerror: () => setIsLive(false),
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-screen max-w-[1440px] mx-auto relative bg-slate-950 shadow-2xl overflow-hidden transition-all duration-700">
      
      {/* Dynamic Status Bar */}
      <div className={`text-[10px] font-bold py-2 px-8 flex items-center justify-between uppercase tracking-[0.3em] font-mono border-b border-white/[0.03] ${
        !user 
          ? 'bg-amber-500/5 text-amber-500/80' 
          : 'bg-emerald-500/5 text-emerald-500/80'
      }`}>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-amber-500 shadow-amber-500/40'} animate-pulse shadow-sm`} />
            GATEWAY_ONLINE
          </span>
          <span className="opacity-20">|</span>
          <span className="flex items-center gap-2">
            {user ? (
              <>OPERATIVE: <span className="text-white">@{user.username}</span></>
            ) : (
              <>EPHEMERAL_BUFFER: <span className="text-amber-400">SESSION_LIMITED ({3 - guestMessageCount} CYCLES)</span></>
            )}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-6 opacity-40">
          <span>LATENCY: 8ms</span>
          <span>NEURAL_LOAD: STABLE</span>
          <span>VAULT_PROTOCOLS: ENCRYPTED</span>
        </div>
      </div>

      {/* Enterprise Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/[0.03] bg-slate-950/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-6 group cursor-default">
          <div className="w-14 h-14 bg-slate-900 border border-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/5 group-hover:border-emerald-500/40 transition-all duration-500">
            <div className="scale-125"><Icons.Shield /></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-[0.15em] font-mono text-white mb-1">DEFENDRA</h1>
            <p className="text-[10px] text-emerald-500/30 uppercase tracking-[0.5em] font-mono">Cognitive Defense</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {user && (
            <button 
              onClick={() => setShowProfile(true)} 
              className="group flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-900/50 border border-white/[0.05] hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all duration-500"
            >
              <div className="text-emerald-400 group-hover:scale-110 transition-transform"><Icons.User /></div>
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest hidden sm:inline group-hover:text-emerald-400 transition-colors">Identity Dashboard</span>
            </button>
          )}
          {!user && (
            <button 
              onClick={() => setShowAuth(true)} 
              className="relative px-8 py-3.5 rounded-2xl text-[11px] font-bold font-mono tracking-widest uppercase transition-all duration-500 bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-emerald-500/20"
            >
              Initialize Node
            </button>
          )}
        </div>
      </header>

      {/* Main Interaction Surface */}
      <main className="flex-1 overflow-y-auto p-8 md:p-14 space-y-6 scrollbar-hide bg-gradient-to-b from-slate-950 via-slate-950 to-[#020617]">
        <div className="max-w-4xl mx-auto w-full">
          {chatState.messages.map(m => (
            <ChatMessage 
              key={m.id} 
              message={m} 
              onSpeak={() => handleSpeak(m)}
              isSpeaking={speakingMsgId === m.id}
              isLoadingAudio={loadingAudioMsgId === m.id}
            />
          ))}
          {chatState.isLoading && (
            <div className="flex items-center gap-4 text-[11px] font-mono text-emerald-500/40 uppercase tracking-[0.4em] py-6 animate-in fade-in">
              <div className="w-6 h-px bg-emerald-500/20 animate-pulse" />
              PROCESSOR_EXECUTING_COMMAND
              <div className="flex gap-1.5">
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-225">.</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="max-w-5xl mx-auto w-full px-8 mb-4">
        <ChatInput 
          onSend={handleSendMessage} 
          onLiveToggle={handleLiveToggle} 
          disabled={chatState.isLoading} 
          placeholder={!user ? `Ephemeral Buffer Remaining: ${3 - guestMessageCount} Cycles...` : "Ask about cyber safety, scams, or protection..."}
        />
      </div>

      {/* Overlay Layers */}
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onGuestChoice={handleGuestChoice} />}
      {showProfile && user && <UserProfile user={user} onClose={() => setShowProfile(false)} onManageSubscription={() => { setShowProfile(false); setShowPlans(true); }} />}
      {showPlans && <PlanSelection currentPlan={user?.plan || 'FREE'} onUpgrade={handleUpgrade} onClose={() => setShowPlans(false)} />}
    </div>
  );
};

export default App;
