'use client';

import React, { useState, useRef, useEffect } from 'react';
import { streamQuery } from '../../lib/rag-client';
import { ChatMessage } from './ChatMessage';
import { useToast } from '../ui/ToastContext';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: userQuery },
    ]);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);

    let fullResponse = '';

    try {
      await streamQuery(
        userQuery,
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        },
        () => {
          setIsLoading(false);
        },
        (error) => {
          console.error('Chat error:', error);
          showToast('Failed to get response', 'error');
          setIsLoading(false);
          if (!fullResponse) {
             setMessages(prev => prev.filter(msg => msg.id !== assistantMsgId));
          }
        }
      );
    } catch (err) {
      console.error('Unexpected chat error:', err);
      showToast('An unexpected error occurred', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md border rounded-xl overflow-hidden bg-background shadow-lg">
      <div className="bg-card p-4 border-b">
        <h3 className="font-semibold text-card-foreground">PlaneShift RAG</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <p>Ask about the universe...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
           <div className="flex justify-start w-full mb-4">
               <div className="bg-muted text-muted-foreground border border-border rounded-lg px-4 py-2">
                   <Loader2 className="h-4 w-4 animate-spin" />
               </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-card border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
