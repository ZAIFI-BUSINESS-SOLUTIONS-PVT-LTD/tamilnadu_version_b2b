import React, { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHistory from './ChatHistory';
import Modal from '../../../../components/modal.jsx';
import { Plus, WarningCircle, ArrowClockwise, Clock } from '@phosphor-icons/react';

const ChatInterface = ({
    messages,
    onSend,
    onNewChat,
    onRetry,
    onDeleteMessage,
    onRegenerateResponse,
    isLoading = false,
    isTyping = false,
    error = null,
    onClearError
}) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Modal state for chat history
    const [showHistory, setShowHistory] = useState(false);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            });
        }
    }, [messages, isTyping]);

    // Handle retry for failed messages
    const handleRetryMessage = (message) => {
        if (onRetry) {
            onRetry(message);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full relative bg-gray-50">
            {/* Messages Container */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-auto pt-4 pb-4 px-4"
            >
                <div className="max-w-4xl mx-auto w-full py-6">
                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                            <WarningCircle size={20} className="text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-700 text-sm">{error}</p>
                                {onClearError && (
                                    <button
                                        onClick={onClearError}
                                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                    title="Retry"
                                >
                                    <ArrowClockwise size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                        <ChatMessage
                            key={message.id || index}
                            message={message}
                            onRetry={handleRetryMessage}
                            onDelete={onDeleteMessage}
                            showTimestamp={index === 0 ||
                                Math.abs(new Date(message.timestamp) - new Date(messages[index - 1]?.timestamp)) > 300000
                            }
                            isLatest={index === messages.length - 1}
                        />
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                                <div className="flex items-center space-x-1">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-xs text-gray-500 ml-2">Assistant is typing...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Bottom Input Section */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto w-full">

                    {/* Input */}
                    <ChatInput
                        onSend={onSend}
                        disabled={isLoading || isTyping}
                        placeholder="Continue the conversation..."
                    />

                    {/* New Chat & Chat History Buttons (side by side) */}
                    <div className="flex items-center gap-2 justify-start mt-4" style={{ minHeight: '48px' }}>
                        {onNewChat && (
                            <button
                                onClick={onNewChat}
                                className="inline-flex items-center px-5 py-2 bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shadow-sm hover:bg-gray-200 hover:text-blue-700 transition-colors duration-200 text-sm font-normal"
                            >
                                <Plus size={16} className="mr-1" />
                                New Chat
                            </button>
                        )}
                        <button
                            onClick={() => setShowHistory(true)}
                            className="inline-flex items-center px-5 py-2 bg-gray-100 text-gray-700 rounded-xl border border-gray-300 shadow-sm hover:bg-gray-200 hover:text-blue-700 transition-colors duration-200 text-sm font-normal"
                        >
                            <Clock size={16} className="mr-1" />
                            Chat History
                        </button>
                    </div>
            {/* Chat History Modal using Modal component */}
            <Modal
                open={showHistory}
                onClose={() => setShowHistory(false)}
                title="Chat History"
                maxWidth="max-w-lg"
            >
                <ChatHistory
                    // You may need to pass these props from parent or context
                    history={[]}
                    activeHistoryId={null}
                    onHistoryClick={() => setShowHistory(false)}
                    onDeleteHistory={null}
                />
            </Modal>

                    {/* Additional Actions (reserve space to prevent layout shift) */}
                    <div style={{ minHeight: '36px' }}>
                      {onRegenerateResponse && messages.length > 0 && messages[messages.length - 1].sender === 'bot' && (
                        <div className="flex justify-center mt-2">
                            <button
                                onClick={onRegenerateResponse}
                                className="inline-flex items-center px-4 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200"
                                disabled={isLoading || isTyping}
                            >
                                <ArrowClockwise size={14} className="mr-1" />
                                Regenerate Response
                            </button>
                        </div>
                      )}
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && !isTyping && (
                <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 shadow-lg flex items-center space-x-3">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-700">Processing...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
