"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, PanelRightClose, StopCircle, RefreshCw, BrainCircuit } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useChat } from '@/hooks/useChat';
import { AgentType } from '@/lib/types';

export default function Arena() {
  const { 
    sessions, 
    activeSessionId, 
    mirrorOpen, 
    toggleMirror, 
    isStreaming, 
    activeAgent 
  } = useSessionStore();
  
  const { sendMessage, abortStreaming } = useChat();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Suggestions for research prompts
  const suggestions = [
    { text: "Design a cyclic consensus graph for multi-agent workflows", icon: "🌐" },
    { text: "Spar with me on the ethics of recursive token boundaries", icon: "⚖️" },
    { text: "Synthesize our research on local Xenova embeddings", icon: "🧠" },
    { text: "Show me a simulation of a neural network energy grid", icon: "⚡" }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAgentColorClass = (agent?: AgentType) => {
    switch (agent) {
      case 'router': return 'text-slate-400 border-slate-400 bg-slate-500/10';
      case 'prototyper': return 'text-emerald-400 border-emerald-400 bg-emerald-500/10';
      case 'interrogator': return 'text-teal-400 border-teal-400 bg-teal-500/10';
      case 'synthesizer': return 'text-cyan-400 border-cyan-400 bg-cyan-500/10';
      case 'sentiment': return 'text-pink-400 border-pink-400 bg-pink-500/10';
      case 'resonance': return 'text-purple-400 border-purple-400 bg-purple-500/10';
      default: return 'text-white border-[var(--border-color)] bg-[var(--bg-tertiary)]';
    }
  };

  const getAgentBorderClass = (agent?: AgentType) => {
    switch (agent) {
      case 'router': return 'border-agent-router';
      case 'prototyper': return 'border-agent-prototyper';
      case 'interrogator': return 'border-agent-interrogator';
      case 'synthesizer': return 'border-agent-synthesizer';
      case 'sentiment': return 'border-agent-sentiment';
      case 'resonance': return 'border-agent-resonance';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="ambient-mesh pointer-events-none" />
      {/* Header */}
      <div className="glass-panel py-3 px-6 flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-[var(--accent)]'}`} />
          <span className="font-mono text-xs text-white tracking-widest uppercase">
            {isStreaming ? `Thinking: ${activeAgent?.toUpperCase() || 'ROUTING'}` : 'System Standby'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Streaming...</span>
            </div>
          )}
          {!mirrorOpen && (
            <button onClick={toggleMirror} className="hover:text-[var(--accent)] text-gray-400 transition-colors">
              <PanelRightClose className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="glass-card flex-1 overflow-y-auto p-6 mb-4 flex flex-col gap-6">
        {messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center justify-center text-center opacity-90 animate-fade-in-up">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border border-[var(--accent-muted)] rounded-full animate-orbit border-dashed"></div>
              <div className="absolute inset-4 border border-[var(--agent-interrogator)] rounded-full animate-orbit border-dotted" style={{ animationDirection: 'reverse', animationDuration: '15s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-[var(--accent)] font-outfit">S</span>
              </div>
            </div>
            <h2 className="text-2xl font-outfit font-medium text-white mb-2">Socratic Research Engine</h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-md mb-8">
              Scaffold ideas, spars with a Socratic partner, detect analogies, and synthesize cognitive paths.
            </p>

            {/* Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-3 text-left p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all group"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => {
              if (m.role === 'system') return null; // do not render system context messages
              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  {/* Metadata Header */}
                  {!isUser && m.agent && (
                    <div className={`flex items-center gap-2 mb-1 text-[10px] px-2 py-0.5 rounded-full border ${getAgentColorClass(m.agent)} font-mono uppercase tracking-widest`}>
                      <BrainCircuit className="w-3 h-3" />
                      <span>{m.agent}</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                    isUser 
                      ? 'bg-[var(--bg-tertiary)] border-[var(--accent-muted)] text-white rounded-br-none' 
                      : `bg-[var(--bg-secondary)] border-[var(--border-color)] text-gray-100 rounded-bl-none border-l-4 ${getAgentBorderClass(m.agent)}`
                  }`}>
                    {/* Render Content */}
                    <div className="whitespace-pre-wrap font-sans">
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="shrink-0 relative">
        <div className={`input-bar flex items-center p-2 relative z-10 ${isStreaming ? 'streaming' : ''}`}>
          <button className="p-3 text-[var(--text-muted)] hover:text-white transition-colors">
            <Upload className="w-5 h-5" />
          </button>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "System analyzing..." : "Initialize cognitive sequence..."}
            className="flex-1 bg-transparent border-none outline-none resize-none h-12 py-3 px-2 text-white font-mono text-sm placeholder:text-[var(--text-muted)]"
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button 
              onClick={abortStreaming}
              className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors ml-2 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={handleSend}
              className="p-3 bg-[var(--accent-muted)] hover:bg-[var(--accent)] text-black rounded-xl transition-colors ml-2 shadow-[0_0_10px_rgba(145,218,115,0.3)]"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Spacer for bottom */}
        <div className="h-2"></div>
      </div>
    </div>
  );
}
