'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, Bot, User, Plus, MessageCircleQuestion } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Como está a distribuição de complexidade da carteira?',
  'Quem está sobrecarregado na equipe?',
  'Quais clientes estão em C5?',
  'Por que esse cliente ficou C3?',
];

export default function AssistentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = React.use(params);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const result = await apiRequest('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ tenantId, messages: nextMessages }),
      });
      setMessages([...nextMessages, { role: 'assistant', content: result.reply }]);
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar o assistente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Não há histórico persistido (V1) — "Nova conversa" só reseta o estado
  // local. Nada de fingir uma lista de conversas antigas que não existe.
  const handleNewConversation = () => {
    setMessages([]);
    setInput('');
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[75vh] gap-6">
      {/* Barra lateral */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-[#0A1A1E] rounded-[2rem] p-6 text-white relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-30%] w-[100%] h-[60%] bg-gradient-to-bl from-teal-500/20 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">Assistente</p>
            <p className="text-[11px] text-slate-400 font-medium">Escritório</p>
          </div>
        </div>

        <button
          onClick={handleNewConversation}
          className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-900 text-sm font-bold hover:bg-teal-50 transition-colors shadow-lg mb-8"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </button>

        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> Sugestões
          </p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={isSending}
                className="w-full text-left px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 leading-snug"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-5 mt-5 border-t border-white/10">
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            As respostas vêm sempre dos dados reais deste escritório — nunca de números inventados.
          </p>
        </div>
      </aside>

      {/* Coluna principal do chat */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] p-6 sm:p-8 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-1">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Olá! Como posso ajudar?</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm">
                Pergunte sobre carteira, complexidade ou capacidade da equipe deste escritório.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2 lg:hidden">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-2xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-[1.5rem] px-5 py-3.5 text-sm font-medium whitespace-pre-wrap leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-md'
                      : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-md'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-4.5 h-4.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isSending && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] rounded-tl-md px-5 py-3.5 flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold">Consultando os dados...</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2 bg-white border border-slate-200 rounded-[1.75rem] p-2 pl-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo sobre este escritório..."
            disabled={isSending}
            className="flex-1 bg-transparent text-slate-700 focus:outline-none text-sm font-medium disabled:opacity-50 py-2.5"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="w-11 h-11 shrink-0 rounded-2xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
