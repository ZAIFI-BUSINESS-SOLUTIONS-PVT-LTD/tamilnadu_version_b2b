import { useCallback } from 'react';
import { ChatService } from '../ChatService';
import { useChatState } from './useChatState';
import { useChatHistory } from './useChatHistory';
import { CHAT_STATES, MESSAGE_TYPES } from '../constants';

export const useChatAPI = () => {
  const chatState = useChatState();
  const chatHistory = useChatHistory();
  
  const sendMessage = useCallback(async (messageText) => {
    try {
      // Validate message
      const validation = ChatService.validateMessage(messageText);
      if (!validation.valid) {
        chatState.setError(validation.error);
        return { success: false, error: validation.error };
      }
      
      // Clear any existing errors
      chatState.clearError();
      
      // Add user message
      const userMessage = chatState.addMessage({
        text: messageText.trim(),
        sender: MESSAGE_TYPES.USER
      });
      
      // Set loading state and typing indicator
      chatState.setStatus(CHAT_STATES.LOADING);
      chatState.setTyping(true);
      
      // Create or update chat history if this is the first message
      let currentChatId = chatState.currentChatId;
      if (!currentChatId && chatState.messages.length === 1) {
        const historyItem = chatHistory.createChatFromMessage(messageText);
        currentChatId = historyItem.id;
        chatState.setChatId(currentChatId);
      }
      
      // Send message to API
      const response = await ChatService.sendMessage(messageText, currentChatId);
      
      if (response.success) {
        // Add bot response
        chatState.addMessage({
          ...response.data,
          sender: MESSAGE_TYPES.BOT
        });
        
        // Update history with latest interaction
        if (currentChatId) {
          chatHistory.updateHistoryItem(currentChatId, {
            summary: `Last message: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
            timestamp: new Date()
          });
        }
        
        chatState.setStatus(CHAT_STATES.IDLE);
        return { success: true, data: response.data };
      } else {
        chatState.setError(response.error);
        return { success: false, error: response.error };
      }
      
    } catch (error) {
      console.error('Send message error:', error);
      chatState.setError('Failed to send message. Please try again.');
      return { success: false, error: error.message };
    } finally {
      chatState.setTyping(false);
    }
  }, [chatState, chatHistory]);
  
  const loadChatHistory = useCallback(async (chatId) => {
    try {
      chatHistory.setIsLoading(true);
      chatState.setStatus(CHAT_STATES.LOADING);
      
      const response = await ChatService.loadChatHistory(chatId);
      
      if (response.success) {
        chatState.setMessages(response.data);
        chatState.setChatId(chatId);
        chatHistory.selectHistoryItem({ id: chatId });
        chatState.setStatus(CHAT_STATES.IDLE);
        return { success: true };
      } else {
        chatHistory.setError(response.error);
        return { success: false, error: response.error };
      }
      
    } catch (error) {
      console.error('Load chat history error:', error);
      chatHistory.setError('Failed to load chat history.');
      return { success: false, error: error.message };
    } finally {
      chatHistory.setIsLoading(false);
    }
  }, [chatState, chatHistory]);
  
  const startNewChat = useCallback(() => {
    chatState.resetChat();
    chatHistory.setActiveHistoryId?.(null);
  }, [chatState, chatHistory]);
  
  const retryLastMessage = useCallback(async () => {
    const messages = chatState.messages;
    if (messages.length === 0) return;
    
    // Find the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find(msg => msg.sender === MESSAGE_TYPES.USER);
      
    if (lastUserMessage) {
      // Remove any bot messages after the last user message
      const lastUserIndex = messages.lastIndexOf(lastUserMessage);
      const filteredMessages = messages.slice(0, lastUserIndex + 1);
      chatState.setMessages(filteredMessages);
      
      // Retry sending the message
      return await sendMessage(lastUserMessage.text);
    }
  }, [chatState, sendMessage]);
  
  const regenerateResponse = useCallback(async () => {
    const messages = chatState.messages;
    if (messages.length < 2) return;
    
    // Remove the last bot message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender === MESSAGE_TYPES.BOT) {
      const withoutLastBot = messages.slice(0, -1);
      chatState.setMessages(withoutLastBot);
      
      // Get the user message before the bot response
      const lastUserMessage = withoutLastBot[withoutLastBot.length - 1];
      if (lastUserMessage && lastUserMessage.sender === MESSAGE_TYPES.USER) {
        return await sendMessage(lastUserMessage.text);
      }
    }
  }, [chatState, sendMessage]);
  
  return {
    // Core actions
    sendMessage,
    loadChatHistory,
    startNewChat,
    retryLastMessage,
    regenerateResponse,
    
    // State from hooks
    ...chatState,
    history: chatHistory.history,
    activeHistoryId: chatHistory.activeHistoryId,
    activeHistoryItem: chatHistory.activeHistoryItem,
    
    // History actions
    selectHistoryItem: chatHistory.selectHistoryItem,
    deleteHistoryItem: chatHistory.deleteHistoryItem,
    clearHistory: chatHistory.clearHistory
  };
};
