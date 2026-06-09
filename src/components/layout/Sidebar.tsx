"use client";

import React from 'react';
import { Settings, Zap, Search, PlusCircle, LayoutPanelLeft, Trash2, BookOpen } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export default function Sidebar() {
  const store = useSessionStore();

  const handleNewSession = () => {
    store.createSession();
  };

  const handleSelectSession = (id: string) => {
    store.selectSession(id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.deleteSession(id);
  };

  return (
    <div className="glass-panel h-full flex flex-col p-4 text-sm text-gray-300">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-[var(--accent)] font-bold">
          <LayoutPanelLeft className="w-5 h-5" />
          <span className="font-outfit uppercase tracking-wider text-white">Socratic Engine</span>
        </div>
        <button onClick={store.toggleSidebar} className="hover:text-white transition-colors">
          <LayoutPanelLeft className="w-4 h-4 opacity-50" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {/* New Session Button */}
        <button 
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-muted)] hover:text-white border border-[var(--border-color)] transition-all cursor-pointer font-mono"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Session</span>
        </button>

        {/* Tools Section */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-semibold font-mono">Tools</h3>
          <ul className="space-y-2">
            <li>
              <button 
                onClick={store.toggleResearchMode}
                className={`w-full flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer ${store.researchMode ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]' : 'hover:bg-[var(--bg-secondary)]'}`}
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4" />
                  <span className="font-mono text-xs">Research Mode</span>
                </div>
                {store.researchMode && <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />}
              </button>
            </li>
          </ul>
        </div>

        {/* Sessions Section */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-semibold font-mono">Recent Sessions</h3>
          <ul className="space-y-2">
            {store.sessions.map((s) => (
              <li key={s.id}>
                <div 
                  onClick={() => handleSelectSession(s.id)}
                  role="button"
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-all text-left cursor-pointer group ${store.activeSessionId === s.id ? 'bg-[var(--bg-tertiary)] text-[var(--accent)] font-semibold border-l-2 border-[var(--accent)]' : 'hover:bg-[var(--bg-secondary)] border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-xs font-mono">{s.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 text-gray-500 hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ opacity: store.activeSessionId === s.id ? 0.6 : 0 }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {store.sessions.length === 0 && (
              <div className="text-xs text-[var(--text-muted)] italic text-center font-mono">
                No active sessions.
              </div>
            )}
          </ul>
        </div>
      </div>

      {/* Telemetry Footer */}
      <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[var(--accent-muted)]">
            <Zap className="w-3.5 h-3.5" />
            <span>{(store.totalTokensUsed / 1000).toFixed(1)}k / 1M Tokens</span>
          </div>
          <Settings className="w-4 h-4 opacity-50 hover:opacity-100 cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
