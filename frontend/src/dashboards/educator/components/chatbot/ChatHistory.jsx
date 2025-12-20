import React, { memo, useState } from 'react';
import { Trash, Clock, CaretDown, CaretUp } from '@phosphor-icons/react';

const ChatHistory = memo(({ 
  history, 
  activeHistoryId, 
  onHistoryClick, 
  onDeleteHistory,
  className = "",
  maxVisible = 5,
  showTitle = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!history || history.length === 0) {
    return (
      <div className={`border border-gray-200 rounded-xl p-4 w-full ${className}`}>
        {showTitle && (
          <h2 className="text-lg font-bold mb-2 text-gray-900">Chat History</h2>
        )}
        <div className="text-sm text-gray-500 text-center py-4">
          No previous conversations
        </div>
      </div>
    );
  }
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  const visibleHistory = isExpanded ? history : history.slice(0, maxVisible);
  const hasMore = history.length > maxVisible;
  
  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <h2 className="text-lg font-bold mb-2 text-gray-900">Chat History</h2>
      )}
      {/* History List */}
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '300px' }}>
        {visibleHistory.map((item) => (
          <div
            key={item.id}
            className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              activeHistoryId === item.id 
                ? 'bg-blue-50 border border-blue-200' 
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            onClick={() => onHistoryClick(item)}
            role="button"
            tabIndex={0}
            aria-label={`Load conversation: ${item.title}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onHistoryClick(item);
              }
            }}
          >
            {/* Content */}
            <div className="pr-8">
              <div className={`font-semibold text-sm mb-1 ${
                activeHistoryId === item.id ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {item.title}
              </div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                {item.summary}
              </div>
              <div className="text-xs text-gray-500">
                {formatTimestamp(item.timestamp)}
              </div>
            </div>
            
            {/* Delete button */}
            {onDeleteHistory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this conversation?')) {
                    onDeleteHistory(item.id);
                  }
                }}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all duration-200"
                title="Delete conversation"
                aria-label="Delete conversation"
              >
                <Trash size={14} className="text-red-500" />
              </button>
            )}
            
            {/* Active indicator */}
            {activeHistoryId === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r"></div>
            )}
          </div>
        ))}
      </div>
      {/* Expand/Collapse button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isExpanded ? (
            <>
              <CaretUp size={16} className="mr-1" />
              Show Less
            </>
          ) : (
            <>
              <CaretDown size={16} className="mr-1" />
              Show {history.length - maxVisible} More
            </>
          )}
        </button>
      )}
    </div>
  );
});

ChatHistory.displayName = 'ChatHistory';

export default ChatHistory;
