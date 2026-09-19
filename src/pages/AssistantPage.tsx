import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic } from 'lucide-react';
import { getInitialAssistantMessages, queryAssistant } from '@/services/api';
import type { AssistantMessage } from '@/types';
import { ASSISTANT_SUGGESTIONS } from '@/data/mockData';
import VoiceButton from '@/components/VoiceButton';
import type { VoiceState } from '@/types';
import { formatTime } from '@/utils';

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getInitialAssistantMessages().then(setMessages);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: AssistantMessage = {
      id: `msg${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const reply = await queryAssistant(text, messages);
      setMessages((m) => [...m, reply]);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceMock = () => {
    if (voiceState !== 'idle') return;
    setVoiceState('listening');
    setTimeout(() => {
      setVoiceState('processing');
      setTimeout(() => {
        setVoiceState('idle');
        send('What is running low?');
      }, 800);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[--color-bg] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[--color-bg]/95 backdrop-blur-sm border-b border-[--color-border] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Mic size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[--color-text]">Ask Vyapari Voice</h1>
            <p className="text-xs text-[--color-text-secondary]">Ask anything about your shop</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-36">
        {/* Welcome */}
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
              <Mic size={28} className="text-orange-500" />
            </div>
            <p className="font-semibold text-[--color-text]">Ask anything about your shop</p>
            <p className="text-sm text-[--color-text-secondary] mt-1">
              Try speaking or typing a question
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-orange-500 text-white rounded-tr-md'
                    : 'bg-white border border-[--color-border] text-[--color-text] rounded-tl-md'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isUser ? 'text-orange-100' : 'text-[--color-text-secondary]'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {sending && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[--color-border] rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 bg-gray-300 rounded-full"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="fixed bottom-[4.5rem] left-0 right-0 px-4 pb-2 lg:static lg:px-0 lg:pb-0">
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-2xl mx-auto">
          {ASSISTANT_SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="chip flex-shrink-0 text-xs"
              aria-label={`Ask: ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[--color-border] px-4 py-3 lg:static lg:border-t lg:bottom-auto">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <VoiceButton state={voiceState} onClick={handleVoiceMock} size="md" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about your stock..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            className="input flex-1"
            aria-label="Ask a question"
            id="assistant-input"
            disabled={sending}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending}
            className="btn btn-primary p-3 rounded-xl disabled:opacity-40"
            aria-label="Send message"
            id="assistant-send-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
