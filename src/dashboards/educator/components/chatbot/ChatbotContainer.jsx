import React, { useCallback, useEffect } from 'react';
import ChatWelcome from './ChatWelcome';
import ChatInterface from './ChatInterface';
import { useChatAPI } from './hooks/useChatAPI';
import { DEFAULT_SUGGESTIONS, CHAT_STATES } from './constants';

const ChatbotContainer = () => {
  const {
    // State
    messages,
    hasMessages,
    isLoading,
    isTyping,
    error,
    history,
    activeHistoryId,
    
    // Actions
    sendMessage,
    startNewChat,
    loadChatHistory,
    retryLastMessage,
    regenerateResponse,
    clearError,
    selectHistoryItem,
    deleteHistoryItem
  } = useChatAPI();
  
  // Handle sending a message
  const handleSend = useCallback(async (messageText) => {
    try {
      await sendMessage(messageText);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [sendMessage]);
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    // Extract just the title part (before the newline)
    const message = suggestion.split('\n')[0];
    handleSend(message);
  }, [handleSend]);
  
  // Handle history item click
  const handleHistoryClick = useCallback(async (item) => {
    try {
      await loadChatHistory(item.id);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [loadChatHistory]);
  
  // Handle new chat
  const handleNewChat = useCallback(() => {
    startNewChat();
  }, [startNewChat]);
  
  // Handle retry
  const handleRetry = useCallback(async () => {
    try {
      await retryLastMessage();
    } catch (err) {
      console.error('Failed to retry message:', err);
    }
  }, [retryLastMessage]);
  
  // Handle regenerate response
  const handleRegenerateResponse = useCallback(async () => {
    try {
      await regenerateResponse();
    } catch (err) {
      console.error('Failed to regenerate response:', err);
    }
  }, [regenerateResponse]);
  
  // Handle delete message (placeholder - implement as needed)
  const handleDeleteMessage = useCallback((messageId) => {
    // TODO: Implement message deletion if needed
    console.log('Delete message:', messageId);
  }, []);
  
  // Handle delete history item
  const handleDeleteHistory = useCallback((historyId) => {
    deleteHistoryItem(historyId);
  }, [deleteHistoryItem]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl/Cmd + K for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      
      // Escape to clear error
      if (e.key === 'Escape' && error) {
        clearError();
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [error, clearError, handleNewChat]);
  
  // Error boundary effect
  useEffect(() => {
    const handleError = (event) => {
      console.error('Unhandled error in chatbot:', event.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return (
    <div className="w-full h-full bg-gray-50">
      {!hasMessages ? (
        <ChatWelcome
          suggestions={DEFAULT_SUGGESTIONS}
          onSuggestionClick={handleSuggestionClick}
          onSend={handleSend}
          history={history}
          activeHistoryId={activeHistoryId}
          onHistoryClick={handleHistoryClick}
          onDeleteHistory={handleDeleteHistory}
          isLoading={isLoading}
        />
      ) : (
        <ChatInterface
          messages={messages}
          onSend={handleSend}
          onNewChat={handleNewChat}
          onRetry={handleRetry}
          onDeleteMessage={handleDeleteMessage}
          onRegenerateResponse={handleRegenerateResponse}
          isLoading={isLoading}
          isTyping={isTyping}
          error={error}
          onClearError={clearError}
        />
      )}
      
      {/* Global styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          } 
          to { 
            opacity: 1; 
            transform: none; 
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in { 
          animation: fade-in 0.7s cubic-bezier(.4,0,.2,1); 
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        /* Custom scrollbar */
        .overflow-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ChatbotContainer;
