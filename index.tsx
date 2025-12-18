import React, { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Content, Tool } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// --- TYPES & ENUMS ---
enum Subject {
  MATH = 'MATH',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  ENGLISH = 'ENGLISH',
  GENERAL = 'GENERAL'
}

type ThinkingLevel = 'none' | 'moderate' | 'deep';

interface Message {
  role: 'user' | 'model';
  parts: {
    text?: string;
    inlineData?: { mimeType: string; data: string; };
  }[];
  timestamp: number;
}

// --- CONSTANTS ---
const SUBJECT_ICONS: Record<Subject, string> = {
  [Subject.MATH]: '📐', [Subject.PHYSICS]: '⚛️', [Subject.CHEMISTRY]: '🧪', [Subject.ENGLISH]: '📚', [Subject.GENERAL]: '🧠'
};

const SUBJECT_COLORS: Record<Subject, string> = {
  [Subject.MATH]: 'text-blue-400', [Subject.PHYSICS]: 'text-purple-400', [Subject.CHEMISTRY]: 'text-green-400', [Subject.ENGLISH]: 'text-yellow-400', [Subject.GENERAL]: 'text-slate-400'
};

const BASE_INSTRUCTION = `
The user may provide text or an image containing ONE or MULTIPLE questions.
Subjects: Math, Physics, Chemistry, English.

CRITICAL INSTRUCTIONS:
1. Analyze input carefully. If an image is provided, EXTRACT ALL questions.
2. If there are multiple problems (1, 2, 3 or a, b, c), solve EACH sequentially.
3. For EACH question:
   a. Rewrite the question clearly (Use LaTeX).
   b. Solve with a HIGHLY STRUCTURED format.
      - Use Bullet Points (-) for steps.
      - Use Bold (**text**) for key terms/formulas.
      - Leave empty lines between steps.
   c. State final answer clearly in BOLD.

LANGUAGE RULES (STRICT):
- MATCH THE USER'S LANGUAGE EXACTLY.
- If the user uses Bangla or Banglish, the response MUST be 100% Bangla/Banglish (except Math symbols).
- ZERO English sentences allowed in Bangla responses.

FORMAT:
## Extracted Question [Index]
[Question in LaTeX]
## Solution
[Bullet points + Bold text]
## Final Answer
[Bold result]
---`;

const SYSTEM_INSTRUCTIONS: Record<Subject, string> = {
  [Subject.MATH]: `Expert Math AI. ${BASE_INSTRUCTION}`,
  [Subject.PHYSICS]: `Expert Physics AI. ${BASE_INSTRUCTION}`,
  [Subject.CHEMISTRY]: `Expert Chemistry AI. ${BASE_INSTRUCTION}`,
  [Subject.ENGLISH]: `Expert English Tutor. ${BASE_INSTRUCTION}`,
  [Subject.GENERAL]: `Helpful AI assistant 'চুদলিংপং স্যার'. ${BASE_INSTRUCTION}`
};

// --- SERVICE ---
const generateResponse = async (history: Message[], subject: Subject, thinking: ThinkingLevel, search: boolean): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "API Key Missing.";
  const ai = new GoogleGenAI({ apiKey });
  
  let modelName = 'gemini-3-flash-preview';
  let thinkingBudget = 0;
  if (thinking === 'deep') { modelName = 'gemini-3-pro-preview'; thinkingBudget = 32768; }
  else if (thinking === 'moderate') { thinkingBudget = 16000; }

  const contents: Content[] = history.map(msg => ({
    role: msg.role,
    parts: msg.parts.map(p => p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' })
  }));

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[subject],
        thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
        tools: search ? [{ googleSearch: {} }] : undefined,
      }
    });

    let text = response.text || "No response generated.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      const sources = chunks.map((c: any) => c.web ? `- [${c.web.title}](${c.web.uri})` : null).filter(Boolean);
      if (sources.length > 0) text += "\n\n---\n### 🌐 Sources\n" + [...new Set(sources)].join("\n");
    }
    return text;
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("503")) throw new Error("RATE_LIMIT");
    throw error;
  }
};

// --- COMPONENTS ---
const ChatMessage = React.memo(({ message, subject }: { message: Message, subject: Subject }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);
  const textContent = React.useMemo(() => message.parts.map(p => p.text).filter(Boolean).join('\n'), [message.parts]);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 animate-in fade-in slide-in-from-bottom-2`}>
      <div className="max-w-[95%] md:max-w-[85%] flex flex-col gap-1.5">
        <div className={`text-[10px] font-bold px-2 uppercase tracking-tighter ${isUser ? 'text-right text-slate-500' : SUBJECT_COLORS[subject]}`}>
          {isUser ? 'You' : 'চুদলিংপং স্যার'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className={`p-4 rounded-2xl shadow-xl transition-all ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'}`}>
          {message.parts.map((part, i) => (
            <div key={i}>
              {part.inlineData && <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-h-96 rounded-xl mb-4 w-full object-contain bg-black/40" />}
              {part.text && (
                <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed break-words">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h2: (p) => <h2 className="text-blue-400 font-bold text-lg border-b border-white/10 pb-1 mt-6 mb-3" {...p} />,
                      strong: (p) => <strong className="text-blue-300 font-bold" {...p} />,
                      code: (p) => <code className="bg-slate-900 px-1.5 rounded text-pink-400 font-mono text-xs" {...p} />
                    }}
                  >
                    {part.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {!isUser && textContent && (
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
              <button 
                onClick={() => { navigator.clipboard.writeText(textContent); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-[10px] bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [histories, setHistories] = useState<Record<string, Message[]>>(() => JSON.parse(localStorage.getItem('sir_v_final') || '{}'));
  const [subject, setSubject] = useState<Subject>(Subject.MATH);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [thinking, setThinking] = useState<ThinkingLevel>('moderate');
  const [search, setSearch] = useState(false);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [img, setImg] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = histories[subject] || [];
  useEffect(() => localStorage.setItem('sir_v_final', JSON.stringify(histories)), [histories]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length, isLoading]);

  const handleSend = async () => {
    if ((!inputText.trim() && !img) || isLoading) return;
    const userMsg: Message = { role: 'user', parts: [...(img ? [{ inlineData: { mimeType: img.type, data: img.data } }] : []), ...(inputText ? [{ text: inputText }] : [])], timestamp: Date.now() };
    const newHistory = [...messages, userMsg];
    setHistories(prev => ({ ...prev, [subject]: newHistory }));
    setInputText(''); setImg(null); setIsLoading(true);

    try {
      const resp = await generateResponse(newHistory, subject, thinking, search);
      setHistories(prev => ({ ...prev, [subject]: [...(prev[subject] || []), { role: 'model', parts: [{ text: resp }], timestamp: Date.now() }] }));
    } catch (e: any) {
      if (e.message === "RATE_LIMIT") setResetTime(Date.now() + 60000);
      else setHistories(prev => ({ ...prev, [subject]: [...(prev[subject] || []), { role: 'model', parts: [{ text: "⚠️ Server busy. Try again." }], timestamp: Date.now() }] }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 flex overflow-hidden font-sans">
      {/* Sidebar */}
      <div className={`fixed md:relative z-40 h-full w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ${sidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        <div className="p-8 border-b border-slate-800 text-center flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-3xl shadow-lg">🧠</div>
          <h1 className="text-xl font-black text-white tracking-tight">চুদলিংপং স্যার</h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Advanced AI Tutor</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Object.values(Subject).map(s => (
            <button key={s} onClick={() => { setSubject(s); setSidebar(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${subject === s ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
              <span className="text-2xl">{SUBJECT_ICONS[s]}</span> <span className="capitalize">{s.toLowerCase()}</span>
            </button>
          ))}
        </nav>
      </div>
      {sidebar && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebar(false)} />}

      {/* Main View */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-6 z-20">
          <button onClick={() => setSidebar(true)} className="md:hidden text-2xl text-slate-400">☰</button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SUBJECT_ICONS[subject]}</span>
            <h2 className={`font-black uppercase text-xs tracking-widest ${SUBJECT_COLORS[subject]}`}>{subject} MODE</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex bg-slate-900 border border-slate-800 rounded-full p-1 text-[10px]">
                {(['none', 'moderate', 'deep'] as ThinkingLevel[]).map(l => (
                  <button key={l} onClick={() => setThinking(l)} className={`px-4 py-1.5 rounded-full capitalize font-bold transition-all ${thinking === l ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{l}</button>
                ))}
             </div>
             <button onClick={() => setSearch(!search)} className={`p-2.5 rounded-xl border transition-all ${search ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>🌐</button>
             <button onClick={() => messages.length > 0 && confirm('Clear history?') && setHistories(p => ({...p, [subject]: []}))} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400">🗑️</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
          <div className="max-w-4xl mx-auto flex flex-col min-h-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 mt-[-10vh]">
                <div className="text-7xl mb-6">✨</div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">READY TO LEARN?</h3>
                <p className="max-w-xs text-sm">Ask চুদলিংপং স্যার anything or snap a photo of your problem.</p>
              </div>
            ) : messages.map((m, i) => <ChatMessage key={i} message={m} subject={subject} />)}
            {isLoading && <div className="p-4 text-blue-400 italic text-xs font-black uppercase tracking-widest animate-pulse">Sir is analyzing...</div>}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            {img && <div className="mb-4 relative inline-block"><img src={img.preview} className="h-24 w-24 object-cover rounded-2xl border-2 border-blue-500/50" /><button onClick={() => setImg(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg">✕</button></div>}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-[2rem] p-3 pl-5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
              <label className="p-2 cursor-pointer text-slate-400 hover:text-blue-400 transition-colors">
                <span className="text-2xl">📷</span> 
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const r = new FileReader(); r.onload = () => setImg({ data: (r.result as string).split(',')[1], preview: r.result, type: file.type }); r.readAsDataURL(file);
                }} />
              </label>
              <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask চুদলিংপং স্যার..." className="flex-1 bg-transparent py-4 outline-none text-sm md:text-base" />
              <button onClick={handleSend} disabled={isLoading || (!inputText.trim() && !img)} className={`p-4 rounded-full transition-all transform active:scale-95 ${isLoading || (!inputText.trim() && !img) ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow-xl hover:bg-blue-500'}`}>
                {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="text-xl">🚀</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {resetTime && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-6">🛑</div>
            <h2 className="text-2xl font-black mb-4 tracking-tight">QUIET TIME</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">The AI brain needs a quick breather. We'll be back in about 60 seconds.</p>
            <button onClick={() => setResetTime(null)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">GOT IT</button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
