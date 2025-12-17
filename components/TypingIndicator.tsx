import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex w-full justify-start mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%] flex flex-col gap-2">
         {/* Header */}
         <div className="text-xs font-medium px-2 flex items-center gap-2 text-blue-400">
          <span>চুদলিংপং স্যার</span>
          <span className="text-[10px] text-slate-500 font-normal">is thinking...</span>
        </div>
        
        {/* Bubble */}
        <div className="bg-slate-800/80 p-5 rounded-2xl rounded-tl-sm border border-slate-700/50 backdrop-blur-sm w-fit flex items-center gap-1.5 shadow-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};