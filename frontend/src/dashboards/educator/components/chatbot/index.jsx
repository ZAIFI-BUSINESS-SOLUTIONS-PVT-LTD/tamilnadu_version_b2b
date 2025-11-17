import React, { useState } from 'react';
import { useChatAPI } from './hooks/useChatAPI';
import { MESSAGE_TYPES } from './constants';

export function ChatbotContainer() {
  const chat = useChatAPI();
  const [input, setInput] = useState('');

  const send = async () => {
    if (!input || !input.trim()) return;
    await chat.sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="p-4 rounded-lg shadow bg-white max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-3">Chatbot</h3>
      <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
        {chat.messages.map(msg => (
          <div key={msg.id} className={msg.sender === MESSAGE_TYPES.USER ? 'text-right' : 'text-left'}>
            <div className={`inline-block p-2 rounded ${msg.sender === MESSAGE_TYPES.USER ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}`}>
              {msg.text || msg.content || JSON.stringify(msg)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          className="input input-bordered flex-1"
          placeholder="Type your question..."
        />
        <button className="btn btn-primary" onClick={send} disabled={chat.isLoading}>Send</button>
      </div>
    </div>
  );
}

export default ChatbotContainer;
