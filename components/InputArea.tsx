import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from './Button';

interface InputAreaProps {
  onSend: (text: string, image?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Extract the raw base64 data (remove "data:image/xyz;base64," prefix)
      const base64Data = base64String.split(',')[1];
      
      setSelectedImage({
        data: base64Data,
        mimeType: file.type,
        preview: base64String
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || isLoading) return;
    
    onSend(text, selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined);
    setText('');
    setSelectedImage(null);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Image Preview */}
      {selectedImage && (
        <div className="mb-2 relative inline-block group">
          <img 
            src={selectedImage.preview} 
            alt="Preview" 
            className="h-20 w-20 object-cover rounded-lg border border-slate-600 shadow-lg"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            title="Remove image"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="relative flex items-end gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
        
        {/* Camera/Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
          title="Snap a photo or upload"
          disabled={isLoading}
        >
          {/* Camera Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type or snap a photo of your handwritten notes..."
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 resize-none outline-none py-2 px-1 max-h-[150px] min-h-[44px]"
          rows={1}
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && !selectedImage)}
          className={`
            p-2 rounded-lg transition-all duration-200 mb-0.5
            ${(!text.trim() && !selectedImage) || isLoading 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}
          `}
        >
          {isLoading ? (
            <div className="w-6 h-6 flex items-center justify-center">
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          )}
        </button>
      </div>
    </div>
  );
};