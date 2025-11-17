import { useState, useCallback, useEffect } from 'react';
import { MOCK_HISTORY, CHAT_CONFIG } from '../constants';

export const useChatHistory = () => {
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.length > 0 ? parsed : MOCK_HISTORY);
      }
    } catch (err) {
      console.error('Error loading chat history from localStorage:', err);
      setHistory(MOCK_HISTORY);
    }
  }, []);
  
  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(history));
    } catch (err) {
      console.error('Error saving chat history to localStorage:', err);
    }
  }, [history]);
  
  const addHistoryItem = useCallback((item) => {
    const newItem = {
      ...item,
      id: item.id || Date.now(),
      timestamp: item.timestamp || new Date()
    };
    
    setHistory(prev => {
      const updated = [newItem, ...prev];
      // Keep only the most recent items
      return updated.slice(0, CHAT_CONFIG.MAX_HISTORY_ITEMS);
    });
    
    return newItem;
  }, []);
  
  const updateHistoryItem = useCallback((id, updates) => {
    setHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);
  
  const deleteHistoryItem = useCallback((id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  }, [activeHistoryId]);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    setActiveHistoryId(null);
    localStorage.removeItem('chatHistory');
  }, []);
  
  const selectHistoryItem = useCallback((item) => {
    setActiveHistoryId(item.id);
  }, []);
  
  const getHistoryItem = useCallback((id) => {
    return history.find(item => item.id === id);
  }, [history]);
  
  const createChatFromMessage = useCallback((userMessage) => {
    const title = userMessage.length > 30 
      ? userMessage.substring(0, 30) + '...' 
      : userMessage;
    
    const summary = `Conversation about: ${title}`;
    
    return addHistoryItem({
      title,
      summary,
      lastMessage: userMessage
    });
  }, [addHistoryItem]);
  
  const getActiveHistoryItem = useCallback(() => {
    return activeHistoryId ? getHistoryItem(activeHistoryId) : null;
  }, [activeHistoryId, getHistoryItem]);
  
  const sortedHistory = history.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  return {
    // State
    history: sortedHistory,
    activeHistoryId,
    isLoading,
    error,
    
    // Computed
    activeHistoryItem: getActiveHistoryItem(),
    hasHistory: history.length > 0,
    
    // Actions
    addHistoryItem,
    updateHistoryItem,
    deleteHistoryItem,
    clearHistory,
    selectHistoryItem,
    getHistoryItem,
    createChatFromMessage,
    setIsLoading,
    setError
  };
};
