'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What's today's avalanche forecast?",
  "Should I go skiing today?",
  "What are the major risks right now?",
  "What are the trends over the past week?",
];

const DAILY_PROMPT = "What's today's avalanche forecast for both zones?";
const LS_SESSION = 'bcc_session_id';
const LS_MESSAGES = 'bcc_chat_messages';
const LS_DATE = 'bcc_chat_date';

function today() {
  return new Date().toISOString().split('T')[0];
}

// Render **bold** inline
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

// Render full assistant message: bullets, bold, spacing
function renderMarkdown(text: string): ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }
    const bullet = trimmed.match(/^[-•]\s+(.+)/);
    if (bullet) {
      const indented = line.startsWith('  ') || line.startsWith('\t');
      elements.push(
        <div key={i} className={`flex gap-2 ${indented ? 'ml-4' : ''}`}>
          <span className="text-blue-400 flex-none select-none mt-0.5 text-xs">•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      );
      return;
    }
    elements.push(<div key={i}>{renderInline(trimmed)}</div>);
  });

  return <div className="space-y-0.5">{elements}</div>;
}

export function ForecastChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef('');
  const isLoadingRef = useRef(false);
  const currentMsgsRef = useRef<Message[]>([]);
  const autoLoadedRef = useRef(false);
  const sendMsgRef = useRef<((text: string) => void) | undefined>(undefined);

  // Keep refs in sync
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { currentMsgsRef.current = messages; }, [messages]);

  // Init: session ID + restore today's conversation
  useEffect(() => {
    let sid = localStorage.getItem(LS_SESSION);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(LS_SESSION, sid);
    }
    sessionIdRef.current = sid;

    const savedDate = localStorage.getItem(LS_DATE);
    if (savedDate === today()) {
      try {
        const raw = localStorage.getItem(LS_MESSAGES);
        if (raw) {
          const saved = JSON.parse(raw) as Message[];
          if (saved.length > 0) {
            setMessages(saved);
            autoLoadedRef.current = true; // already have today's data
          }
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem(LS_DATE, today());
    localStorage.setItem(LS_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingRef.current) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const prevMsgs = currentMsgsRef.current;
    const withUser = [...prevMsgs, userMsg];

    setMessages([...withUser, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: withUser, sessionId: sessionIdRef.current }),
      });

      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep sendMsgRef up to date for the auto-load effect
  useEffect(() => { sendMsgRef.current = sendMessage; }, [sendMessage]);

  // Auto-load daily forecast on first open with no messages
  useEffect(() => {
    if (!isOpen) return;
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    sendMsgRef.current?.(DAILY_PROMPT);
  }, [isOpen]);

  const clearChat = () => {
    setMessages([]);
    autoLoadedRef.current = false;
    localStorage.removeItem(LS_MESSAGES);
    localStorage.removeItem(LS_DATE);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const lastIsEmpty =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].content === '';

  const panelClass = isExpanded
    ? 'fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[680px] sm:h-[80vh] sm:max-h-[760px]'
    : 'fixed bottom-24 right-6 w-96 max-w-[calc(100vw-1.5rem)] h-[500px] max-h-[calc(100vh-8rem)]';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label={isOpen ? 'Close forecast assistant' : 'Open forecast assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className={`${panelClass} z-50 flex flex-col bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700`}>

          {/* Header */}
          <div className="flex-none px-4 py-3 border-b border-gray-700 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full flex-none" />
            <span className="font-semibold text-sm">Forecast Assistant</span>
            <div className="ml-auto flex items-center gap-3">
              {messages.length > 0 && (
                <button onClick={clearChat} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
                  New chat
                </button>
              )}
              <button
                onClick={() => setIsExpanded(p => !p)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && !isLoading ? (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">
                  Ask me about avalanche conditions, risks, and forecasts for Crested Butte backcountry.
                </p>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)} disabled={isLoading}
                      className="block w-full text-left text-sm bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-gray-300 transition-colors disabled:opacity-50">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-3 py-2.5 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : msg.content ? (
                      renderMarkdown(msg.content)
                    ) : lastIsEmpty && i === messages.length - 1 ? (
                      <span className="flex gap-1 items-center text-gray-400 px-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-none p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about conditions..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 text-white placeholder-gray-500 text-sm px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 min-w-0"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
