import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, Subject } from '../types';
import { SUBJECT_COLORS } from '../constants';

interface ChatMessageProps {
  message: Message;
  subject: Subject;
}

// Define Markdown components outside the render function to prevent
// unnecessary re-mounting/re-calculating on every render.
const MARKDOWN_COMPONENTS: any = {
  // Custom code block styling
  code: ({node, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '');
    return !match ? (
      <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs md:text-sm font-mono text-pink-300" {...props}>
        {children}
      </code>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre: ({node, children, ...props}: any) => {
    return (
      <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-700 my-4 shadow-inner" {...props}>
        {children}
      </pre>
    );
  },
  // Style for Markdown Headers (##)
  h2: ({node, children, ...props}: any) => {
    return (
      <h2 className="text-lg md:text-xl font-bold text-blue-400 mt-6 mb-3 border-b border-white/10 pb-2" {...props}>
        {children}
      </h2>
    );
  },
  // Style for Markdown Headers (###)
  h3: ({node, children, ...props}: any) => {
    return (
      <h3 className="text-base md:text-lg font-semibold text-slate-300 mt-4 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  // Styling for Lists to ensure readability
  ul: ({node, children, ...props}: any) => (
    <ul className="list-disc list-outside ml-5 space-y-2 mb-4 text-slate-300" {...props}>{children}</ul>
  ),
  ol: ({node, children, ...props}: any) => (
    <ol className="list-decimal list-outside ml-5 space-y-2 mb-4 text-slate-300" {...props}>{children}</ol>
  ),
  li: ({node, children, ...props}: any) => (
    <li className="pl-1 leading-relaxed" {...props}>{children}</li>
  ),
  // Strong/Bold text styling
  strong: ({node, children, ...props}: any) => (
    <strong className="font-bold text-blue-300" {...props}>{children}</strong>
  ),
  // Blockquote styling for additional emphasis
  blockquote: ({node, children, ...props}: any) => (
    <blockquote className="border-l-4 border-slate-600 pl-4 italic text-slate-400 my-4" {...props}>{children}</blockquote>
  ),
  // INCREASED SPACING for separate questions
  hr: ({node, ...props}: any) => {
    return (
      <hr className="my-10 border-t-2 border-slate-600/50" {...props} />
    );
  },
  p: ({node, children, ...props}: any) => {
      return <p className="mb-4 last:mb-0" {...props}>{children}</p>
  }
};

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, subject }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  
  // Combine all text parts for copy/share
  const fullText = useMemo(() => message.parts.map(p => p.text).filter(Boolean).join('\n'), [message.parts]);

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    if (!fullText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Answer from চুদলিংপং স্যার',
          text: fullText,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      handleCopy();
      alert("Sharing is not supported on this device/browser. Text copied to clipboard instead.");
    }
  };

  return (
    // Outer container with padding-bottom for separation between messages
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-12 group`}>
      <div className={`
        max-w-[95%] md:max-w-[85%] 
        flex flex-col gap-2
      `}>
        {/* Header (Role Name) */}
        <div className={`text-xs font-medium px-2 flex items-center gap-2 ${isUser ? 'justify-end text-slate-400' : SUBJECT_COLORS[subject]}`}>
          <span>{isUser ? 'You' : 'চুদলিংপং স্যার'}</span>
          <span className="text-[10px] text-slate-600">
             {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Bubble */}
        <div className={`
          p-4 md:p-6 rounded-2xl shadow-lg relative
          ${isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm' 
            : 'bg-slate-800/90 text-slate-200 border border-slate-700/50 rounded-tl-sm'}
        `}>
          {message.parts.map((part, index) => (
            <div key={index} className="space-y-4">
              {/* Image Rendering */}
              {part.inlineData && (
                <div className="relative rounded-lg overflow-hidden border border-white/10 mb-4 bg-black/40">
                  <img 
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="User uploaded content"
                    className="max-h-96 object-contain w-full"
                    loading="lazy"
                  />
                </div>
              )}
              
              {/* Text Rendering */}
              {part.text && (
                <div className={`prose ${isUser ? 'prose-invert' : 'prose-invert'} max-w-none text-sm md:text-base leading-relaxed break-words`}>
                   <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={MARKDOWN_COMPONENTS}
                   >
                     {part.text}
                   </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {/* Action Toolbar (Only for AI messages) */}
          {!isUser && fullText && (
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-end gap-3 opacity-80 hover:opacity-100 transition-opacity">
              <button 
                onClick={handleCopy} 
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-slate-700/30 hover:bg-slate-700 px-2 py-1.5 rounded-md"
                title="Copy to clipboard"
              >
                {isCopied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
              
              <button 
                onClick={handleShare} 
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-300 transition-colors bg-slate-700/30 hover:bg-slate-700 px-2 py-1.5 rounded-md"
                title="Share answer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// CRITICAL PERFORMANCE FIX:
// React.memo ensures this component ONLY re-renders if props actually change.
// This prevents the heavy Markdown parser from running for every message 
// whenever the parent App component updates (e.g. typing, timer ticks).
export const ChatMessage = React.memo(ChatMessageComponent, (prev, next) => {
  return (
    prev.message.timestamp === next.message.timestamp && 
    prev.message.role === next.message.role &&
    prev.subject === next.subject
  );
});