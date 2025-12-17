import React from 'react';
import { Subject } from '../types';
import { SUBJECT_ICONS, SUBJECT_COLORS } from '../constants';

interface SidebarProps {
  activeSubject: Subject;
  onSelectSubject: (s: Subject) => void;
  isOpen: boolean;
  onToggle: () => void;
  showInstallButton: boolean;
  onInstallClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSubject, 
  onSelectSubject, 
  isOpen, 
  onToggle,
  showInstallButton,
  onInstallClick
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed md:relative z-30
        h-full w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col flex-shrink-0
      `}>
        <div className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
          <div className="w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg bg-slate-800">
            <img 
              src="./logo.png" 
              alt="Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                const parent = img.parentElement;
                if (parent) {
                  img.style.display = 'none';
                  parent.innerText = '🧠';
                  parent.className = "w-20 h-20 mb-3 rounded-full border-2 border-slate-700 shadow-lg bg-slate-800 flex items-center justify-center text-4xl";
                }
              }}
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            চুদলিংপং স্যার
          </h1>
          <p className="text-xs text-slate-500 mt-1">AI-Powered Learning</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Object.values(Subject).map((subject) => (
            <button
              key={subject}
              onClick={() => {
                onSelectSubject(subject);
                if (window.innerWidth < 768) onToggle();
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${activeSubject === subject 
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
              `}
            >
              <span className="text-xl">{SUBJECT_ICONS[subject]}</span>
              <span className="capitalize">{subject.toLowerCase()}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          {/* Install App Button */}
          {showInstallButton && (
            <button
              onClick={onInstallClick}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-3 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Install App</span>
            </button>
          )}

          <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
            <p className="font-semibold mb-1">Capabilities:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Handwriting Reader</li>
              <li>Bangla & Banglish</li>
              <li>Deep Reasoning</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};