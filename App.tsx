import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { InputArea } from './components/InputArea';
import { TypingIndicator } from './components/TypingIndicator';
import { generateResponse } from './services/geminiService';
import { Subject, Message, ThinkingLevel } from './types';
import { SUBJECT_ICONS, SUBJECT_COLORS } from './constants';

const STORAGE_KEY = 'chudlingpong_chat_history_v1';

// --- PERFORMANCE OPTIMIZATION: ISOLATED POPUP COMPONENT ---
// Moving this outside App prevents the main chat from re-rendering every second
const RateLimitPopup: React.FC<{ resetTime: number; onClose: () => void }> = ({ resetTime, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(Math.ceil((resetTime - Date.now()) / 1000));
  
  // Calculate the actual wall-clock time for "Try after (actual time)"
  const availableAt = useMemo(() => {
    return new Date(resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [resetTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.ceil((resetTime - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [resetTime]);

  // If time is up, we can automatically close or let user close
  const isReady = timeLeft <= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 px-4">
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
        
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-700 shadow-inner">
          <span className="text-3xl animate-pulse">⏳</span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">High Traffic Limit</h3>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          The AI is currently at maximum capacity.<br/>
          Please wait for the cooldown.
        </p>

        {/* Display Actual Time as requested */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-6 border border-slate-700/50">
             <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1">Try again at</span>
             <span className="text-2xl font-mono text-white font-bold">{availableAt}</span>
        </div>
        
        <div className="text-4xl font-mono font-bold text-blue-400 mb-8 tracking-wider tabular-nums">
          {isReady ? 0 : timeLeft}
          <span className="text-lg text-slate-600 ml-1">seconds left</span>
        </div>

        <button 
          onClick={onClose}
          disabled={!isReady}
          className={`
            w-full py-3 rounded-xl font-semibold transition-all duration-200 border
            ${isReady
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-900/20 cursor-pointer' 
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'}
          `}
        >
          {isReady ? "Try Again Now" : "Please Wait..."}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Load initial history
  const [histories, setHistories] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load chat history:", e);
      return {};
    }
  });

  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.MATH);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('moderate');
  const [useSearch, setUseSearch] = useState(false);
  
  // Changed from "countdown number" to "target timestamp" to avoid re-renders
  const [limitResetTime, setLimitResetTime] = useState<number | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize messages list to prevent unnecessary calculations
  const messages = useMemo(() => histories[activeSubject] || [], [histories, activeSubject]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [histories]);

  // Scroll to bottom handling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeSubject, isLoading]);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    setInstallPrompt(null);
  };

  const handleClearHistory = () => {
    if (messages.length > 0 && window.confirm("Clear history for this subject?")) {
      setHistories(prev => ({ ...prev, [activeSubject]: [] }));
    }
  };

  const handleSend = async (text: string, image?: { data: string; mimeType: string }) => {
    if ((!text.trim() && !image) || isLoading) return;

    // Create user message
    const userMessage: Message = {
      role: 'user',
      parts: [
        ...(image ? [{ inlineData: image }] : []),
        ...(text ? [{ text }] : [])
      ],
      timestamp: Date.now()
    };

    const updatedSubjectHistory = [...messages, userMessage];
    
    setHistories(prev => ({
      ...prev,
      [activeSubject]: updatedSubjectHistory
    }));
    
    setIsLoading(true);

    try {
      // Pass the API key implicitly via the service (process.env.API_KEY)
      const responseText = await generateResponse(updatedSubjectHistory, activeSubject, thinkingLevel, useSearch);

      const botMessage: Message = {
        role: 'model',
        parts: [{ text: responseText }],
        timestamp: Date.now()
      };

      setHistories(prev => ({
        ...prev,
        [activeSubject]: [...(prev[activeSubject] || []), botMessage]
      }));
    } catch (error: any) {
      console.error("App Error:", error);

      if (error.message && error.message.includes("RATE_LIMIT")) {
         // Set a target time 60 seconds in the future
         setLimitResetTime(Date.now() + 60000);
      } else {
        const errorMessage: Message = {
          role: 'model',
          parts: [{ text: "⚠️ Connection unstable. Switching to offline backup mode... please try again." }],
          timestamp: Date.now(),
          isError: true
        };
        
        setHistories(prev => ({
          ...prev,
          [activeSubject]: [...(prev[activeSubject] || []), errorMessage]
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-200 overflow-hidden flex font-sans">
      
      {/* Optimized Popup - Renders independently */}
      {limitResetTime !== null && (
        <RateLimitPopup 
          resetTime={limitResetTime} 
          onClose={() => setLimitResetTime(null)} 
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeSubject={activeSubject} 
        onSelectSubject={setActiveSubject}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        showInstallButton={!!installPrompt}
        onInstallClick={handleInstallClick}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="h-14 md:h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="./logo.png" 
                alt="Mini Logo" 
                className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-800"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
              <span className="text-xl md:text-2xl">{SUBJECT_ICONS[activeSubject]}</span>
              <h2 className={`font-semibold text-base md:text-lg capitalize hidden sm:block ${SUBJECT_COLORS[activeSubject]}`}>
                {activeSubject.toLowerCase()} Tutor
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             {/* Controls */}
             <div className="flex items-center gap-1 md:gap-2 bg-slate-800 rounded-lg p-1 text-[10px] md:text-xs">
              <button 
                onClick={() => setThinkingLevel('none')}
                className={`px-2 md:px-3 py-1 rounded transition-colors ${thinkingLevel === 'none' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Fast
              </button>
              <button 
                onClick={() => setThinkingLevel('moderate')}
                className={`px-2 md:px-3 py-1 rounded transition-colors ${thinkingLevel === 'moderate' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Think
              </button>
               <button 
                onClick={() => setThinkingLevel('deep')}
                className={`px-2 md:px-3 py-1 rounded transition-colors ${thinkingLevel === 'deep' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Deep
              </button>
            </div>

            <button
              onClick={() => setUseSearch(!useSearch)}
              className={`p-2 rounded-lg transition-colors border flex items-center gap-2 ${useSearch ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </button>

            <button
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              className={`p-2 rounded-lg transition-colors border border-transparent ${messages.length === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 hover:bg-slate-800 hover:border-red-900/30'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </header>

        {/* Chat Scroll Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 scroll-smooth w-full">
          <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-0 pb-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center text-slate-500 space-y-4">
                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg bg-slate-800">
                   <img src="./logo.png" className="w-full h-full object-cover" alt="App Logo" onError={(e) => { e.currentTarget.style.display='none' }} />
                </div>
                <h3 className="text-xl font-medium text-slate-300">
                  Start your {activeSubject.toLowerCase()} session
                </h3>
                <p className="max-w-md px-4 text-sm md:text-base">
                  Upload an image or type your question. I understand English, Bangla, and Banglish.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} subject={activeSubject} />
              ))
            )}
            
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-slate-950 pb-6 px-2 flex-shrink-0 border-t border-slate-800/50">
          <InputArea onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default App;