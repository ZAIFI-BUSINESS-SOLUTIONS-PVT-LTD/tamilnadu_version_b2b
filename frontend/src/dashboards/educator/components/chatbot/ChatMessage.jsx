import React, { memo, useState } from 'react';
import { Copy, ArrowClockwise, Trash } from '@phosphor-icons/react';
import { MESSAGE_TYPES } from './constants';

const ChatMessage = memo(({ 
  message, 
  onRetry, 
  onDelete, 
  showTimestamp = false,
  isLatest = false 
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.sender === MESSAGE_TYPES.USER;
  const isBot = message.sender === MESSAGE_TYPES.BOT;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const renderMessageActions = () => {
    if (!isBot && !isUser) return null;
    
    return (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
          title={isCopied ? 'Copied!' : 'Copy message'}
          aria-label="Copy message"
        >
          <Copy size={14} className={isCopied ? 'text-green-500' : 'text-gray-500'} />
        </button>
        
        {isBot && onRetry && (
          <button
            onClick={() => onRetry(message)}
            className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <ArrowClockwise size={14} className="text-gray-500" />
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 rounded hover:bg-red-50 transition-colors duration-200"
            title="Delete message"
            aria-label="Delete message"
          >
            <Trash size={14} className="text-red-500" />
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className={`group flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
        <div className={`relative px-4 py-3 rounded-lg shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.text}
          </p>
          
          {/* Message actions */}
          <div className={`absolute ${
            isUser ? '-left-20' : '-right-20'
          } top-1/2 transform -translate-y-1/2`}>
            {renderMessageActions()}
          </div>
        </div>
        
        {/* Timestamp */}
        {showTimestamp && message.timestamp && (
          <span className={`text-xs text-gray-500 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTimestamp(message.timestamp)}
          </span>
        )}
        
        {/* Copy feedback */}
        {isCopied && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
