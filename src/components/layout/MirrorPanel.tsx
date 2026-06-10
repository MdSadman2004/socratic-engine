"use client";

import React, { useState } from 'react';
import { PanelRightOpen, BrainCircuit, BookA, Workflow } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export default function MirrorPanel() {
  const { toggleMirror, sessions, activeSessionId } = useSessionStore();
  const [activeTab, setActiveTab] = useState<'tracks' | 'dictionary'>('tracks');

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const tracks = activeSession?.tracks || [];
  const dictionary = activeSession?.dictionary || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
      case 'pending': return 'border-amber-500 bg-amber-500/10 text-amber-400';
      case 'friction': return 'border-pink-500 bg-pink-500/10 text-pink-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getAgentTagColor = (agent: string) => {
    const lowercase = agent.toLowerCase();
    if (lowercase.includes('router')) return 'text-slate-400';
    if (lowercase.includes('prototyper')) return 'text-emerald-400';
    if (lowercase.includes('interrogator')) return 'text-teal-400';
    if (lowercase.includes('synthesizer')) return 'text-cyan-400';
    if (lowercase.includes('sentiment')) return 'text-pink-400';
    if (lowercase.includes('resonance')) return 'text-purple-400';
    return 'text-white';
  };

  return (
    <div className="glass-panel h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-outfit font-medium text-lg text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-[var(--accent)]" />
          Telemetry
        </h3>
        <button onClick={toggleMirror} className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer">
          <PanelRightOpen className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg mb-6 shrink-0 border border-[var(--border-color)]">
        <button 
          onClick={() => setActiveTab('tracks')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'tracks' ? 'bg-[var(--bg-primary)] shadow text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
        >
          <Workflow className="w-3.5 h-3.5" />
          Tracks
        </button>
        <button 
          onClick={() => setActiveTab('dictionary')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'dictionary' ? 'bg-[var(--bg-primary)] shadow text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
        >
          <BookA className="w-3.5 h-3.5" />
          Dictionary
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === 'tracks' ? (
          <div className="space-y-4">
            {tracks.map((t) => (
              <div 
                key={t.id} 
                className={`glass-card p-4 border-l-2 transition-all hover:scale-[1.01] ${getStatusColor(t.status)}`}
              >
                <div className={`text-[10px] mb-1 font-mono uppercase tracking-widest flex justify-between items-center ${getAgentTagColor(t.agent)}`}>
                  <span>{t.agent}</span>
                  <span className="opacity-60 text-[9px]">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                </div>
                <div className="text-xs text-gray-200 leading-relaxed font-mono">{t.content}</div>
              </div>
            ))}
            {tracks.length === 0 && (
              <div className="text-center text-xs text-[var(--text-muted)] py-12 font-mono">
                No active tracks recorded.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {dictionary.map((d) => (
              <div key={d.id} className="glass-card p-4 relative overflow-hidden group border border-[var(--border-color)]">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--accent)] opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="text-[10px] text-[var(--accent)] mb-1 font-mono uppercase tracking-widest flex justify-between">
                  <span>{d.domain}</span>
                </div>
                <div className="font-outfit font-semibold text-base text-white mb-2">{d.term}</div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 font-mono">{d.definition}</div>
                
                {d.analogy && (
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] text-[var(--accent-muted)] font-mono italic">
                    Analogy: {d.analogy}
                  </div>
                )}
              </div>
            ))}
            {dictionary.length === 0 && (
              <div className="text-center text-xs text-[var(--text-muted)] py-12 font-mono">
                No dictionary entries discovered yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
