import { useReducer, useCallback } from 'react';
import { CHAT_STATES, MESSAGE_TYPES } from '../constants';

const initialState = {
  messages: [],
  status: CHAT_STATES.IDLE,
  error: null,
  currentChatId: null,
  isTyping: false
};

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
        error: null
      };
      
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null
      };
      
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        status: CHAT_STATES.ERROR,
        isTyping: false
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        status: CHAT_STATES.IDLE
      };
      
    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload
      };
      
    case 'SET_CHAT_ID':
      return {
        ...state,
        currentChatId: action.payload
      };
      
    case 'RESET_CHAT':
      return {
        ...initialState,
        currentChatId: null
      };
      
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        )
      };
      
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload)
      };
      
    default:
      return state;
  }
};

export const useChatState = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  
  const setMessages = useCallback((messages) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  }, []);
  
  const addMessage = useCallback((message) => {
    const messageWithId = {
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: message.timestamp || new Date()
    };
    dispatch({ type: 'ADD_MESSAGE', payload: messageWithId });
    return messageWithId;
  }, []);
  
  const setStatus = useCallback((status) => {
    dispatch({ type: 'SET_STATUS', payload: status });
  }, []);
  
  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);
  
  const setTyping = useCallback((isTyping) => {
    dispatch({ type: 'SET_TYPING', payload: isTyping });
  }, []);
  
  const setChatId = useCallback((chatId) => {
    dispatch({ type: 'SET_CHAT_ID', payload: chatId });
  }, []);
  
  const resetChat = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);
  
  const updateMessage = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
  }, []);
  
  const deleteMessage = useCallback((id) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  }, []);
  
  const hasMessages = state.messages.length > 0;
  const isLoading = state.status === CHAT_STATES.LOADING;
  const hasError = state.status === CHAT_STATES.ERROR;
  
  return {
    // State
    messages: state.messages,
    status: state.status,
    error: state.error,
    currentChatId: state.currentChatId,
    isTyping: state.isTyping,
    
    // Computed
    hasMessages,
    isLoading,
    hasError,
    
    // Actions
    setMessages,
    addMessage,
    setStatus,
    setError,
    clearError,
    setTyping,
    setChatId,
    resetChat,
    updateMessage,
    deleteMessage
  };
};
