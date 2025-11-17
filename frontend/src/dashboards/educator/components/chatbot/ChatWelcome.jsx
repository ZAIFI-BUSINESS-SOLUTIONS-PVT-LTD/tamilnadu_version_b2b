import React from 'react';
import ChatSuggestions from './ChatSuggestions';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import { DEFAULT_SUGGESTIONS } from './constants';

const ChatWelcome = ({
  suggestions = DEFAULT_SUGGESTIONS,
  onSuggestionClick,
  onSend,
  history,
  onHistoryClick,
  onDeleteHistory,
  isLoading = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-4">
      <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-6">
        {/* Welcome Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            InzightEd AI Assistant
          </h1>
          <p className="text-lg text-gray-600">
            I'm here to help you with student insights, performance analysis, and educational guidance.
          </p>
        </div>
        
        {/* Suggestions */}
        <ChatSuggestions
          suggestions={suggestions}
          onSuggestionClick={onSuggestionClick}
        />
        
        {/* Input */}
        <div className="w-full">
          <ChatInput
            onSend={onSend}
            disabled={isLoading}
            placeholder="Ask me about student performance, attendance, or anything else..."
            autoFocus={true}
          />
        </div>
        
        {/* Chat History */}
        {history && history.length > 0 && (
          <div className="w-full border border-gray-200 rounded-xl p-4 bg-white">
            <ChatHistory
              history={history}
              activeHistoryId={null}
              onHistoryClick={onHistoryClick}
              onDeleteHistory={onDeleteHistory}
              className="w-full"
              showTitle={true}
            />
          </div>
        )}
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Getting ready...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWelcome;
