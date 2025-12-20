import React, { useState, useRef, useEffect } from 'react';
import { Microphone, ArrowUp } from '@phosphor-icons/react';
import { CHAT_CONFIG } from './constants';

const ChatInput = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Ask anything...",
  showMicrophone = true,
  autoFocus = false 
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const formRef = useRef(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);
  
  // Auto-focus when enabled
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!input.trim() || disabled) return;
    
    if (input.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      alert(`Message too long. Please keep it under ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    
    onSend(input.trim());
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleMicrophoneClick = () => {
    // TODO: Implement speech-to-text functionality
    setIsRecording(!isRecording);
    console.log('Microphone clicked - implement speech-to-text');
  };
  
  const canSend = input.trim() && !disabled;
  const characterCount = input.length;
  const isNearLimit = characterCount > CHAT_CONFIG.MAX_MESSAGE_LENGTH * 0.8;
  const isOverLimit = characterCount > CHAT_CONFIG.MAX_MESSAGE_LENGTH;
  
  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="w-full bg-gray-100 rounded-2xl border border-gray-200 px-6 py-4 shadow-sm transition-all duration-200 focus-within:border-blue-300 focus-within:shadow-md"
      style={{ boxShadow: '0 -2px 16px 0 rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full text-base border-none outline-none bg-transparent resize-none overflow-hidden"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            maxLength={CHAT_CONFIG.MAX_MESSAGE_LENGTH}
            aria-label="Chat message input"
          />
          
          {/* Character count */}
          {isNearLimit && (
            <div className={`absolute -bottom-6 right-0 text-xs ${
              isOverLimit ? 'text-red-500' : 'text-orange-500'
            }`}>
              {characterCount}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Microphone button */}
          {showMicrophone && (
            <button 
              type="button" 
              onClick={handleMicrophoneClick}
              className={`p-2 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-100 hover:bg-red-200' 
                  : 'hover:bg-blue-50'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              disabled={disabled}
            >
              <Microphone 
                size={18} 
                weight="duotone" 
                className={isRecording ? 'text-red-500' : 'text-blue-500'} 
              />
            </button>
          )}
          
          {/* Send button */}
          <button
            type="submit"
            className={`rounded-full w-10 h-10 flex items-center justify-center text-base font-semibold shadow-sm transition-all duration-200 ${
              canSend 
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md transform hover:scale-105' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!canSend}
            title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
            aria-label="Send message"
          >
            {disabled ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ArrowUp size={20} weight={canSend ? 'bold' : 'light'} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
