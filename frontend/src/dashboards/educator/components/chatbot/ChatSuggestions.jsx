import React, { memo } from 'react';
import { Lightbulb, TrendUp, Users, FileText } from '@phosphor-icons/react';

const suggestionIcons = {
  'Student Performance': TrendUp,
  'Attendance': Users,
  'Assignment': FileText,
  'Learning': Lightbulb
};

const getSuggestionIcon = (text) => {
  const key = Object.keys(suggestionIcons).find(k => 
    text.toLowerCase().includes(k.toLowerCase())
  );
  return suggestionIcons[key] || Lightbulb;
};

const ChatSuggestions = memo(({ suggestions, onSuggestionClick, className = "" }) => {
  if (!suggestions || suggestions.length === 0) return null;
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full ${className}`}>
      {suggestions.map((suggestion, index) => {
        const [title, description] = suggestion.split('\n');
        return (
          <div
            key={index}
            className="flex items-start bg-white rounded-xl border border-gray-200 p-4 text-base cursor-pointer hover:bg-gray-50 hover:border-blue-200 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
            onClick={() => onSuggestionClick(suggestion)}
            role="button"
            tabIndex={0}
            aria-label={`Suggestion: ${title}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSuggestionClick(suggestion);
              }
            }}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors duration-200">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

ChatSuggestions.displayName = 'ChatSuggestions';

export default ChatSuggestions;
