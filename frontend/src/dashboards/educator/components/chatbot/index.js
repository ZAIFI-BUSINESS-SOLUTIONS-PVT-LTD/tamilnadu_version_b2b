// Main container component
export { default as ChatbotContainer } from './ChatbotContainer';

// Individual components
export { default as ChatInterface } from './ChatInterface';
export { default as ChatWelcome } from './ChatWelcome';
export { default as ChatMessage } from './ChatMessage';
export { default as ChatInput } from './ChatInput';
export { default as ChatSuggestions } from './ChatSuggestions';
export { default as ChatHistory } from './ChatHistory';

// Hooks
export { useChatState } from './hooks/useChatState';
export { useChatHistory } from './hooks/useChatHistory';
export { useChatAPI } from './hooks/useChatAPI';

// Services and utilities
export { ChatService } from './ChatService';
export * from './constants';
