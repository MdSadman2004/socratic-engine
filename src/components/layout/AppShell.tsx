"use client";

import React, { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import Sidebar from './Sidebar';
import Arena from './Arena';
import MirrorPanel from './MirrorPanel';

export default function AppShell() {
  const { sidebarOpen, mirrorOpen, toggleSidebar, toggleMirror } = useSessionStore();

  // Keyboard shortcuts from ledger.md: Ctrl+B sidebar, Ctrl+M mirror
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleSidebar();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMirror();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleMirror]);

  return (
    <div className="flex h-screen w-full overflow-hidden p-4" style={{ gap: 'var(--panel-gap)' }}>
      {/* Sidebar Panel */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 h-full">
          <Sidebar />
        </div>
      )}

      {/* Main Arena (Chat/Visualizer) */}
      <div className="flex-1 h-full min-w-0">
        <Arena />
      </div>

      {/* Mirror Panel (Tracks/Dictionary) */}
      {mirrorOpen && (
        <div className="w-80 flex-shrink-0 h-full">
          <MirrorPanel />
        </div>
      )}
    </div>
  );
}
