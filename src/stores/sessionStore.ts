import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, Message, CognitiveTrack, DictionaryEntry, AgentType } from '@/lib/types';

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  researchMode: boolean;
  sidebarOpen: boolean;
  mirrorOpen: boolean;
  isStreaming: boolean;
  activeAgent: AgentType | null;
  totalTokensUsed: number;

  toggleResearchMode: () => void;
  toggleSidebar: () => void;
  toggleMirror: () => void;
  setStreaming: (streaming: boolean) => void;
  setActiveAgent: (agent: AgentType | null) => void;
  setTotalTokensUsed: (tokens: number) => void;

  createSession: (title?: string) => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateLastMessageContent: (sessionId: string, content: string) => void;
  addTrack: (sessionId: string, track: CognitiveTrack) => void;
  addDictionaryEntry: (sessionId: string, entry: DictionaryEntry) => void;
  updateSessionTokens: (sessionId: string, tokens: number) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      researchMode: false,
      sidebarOpen: true,
      mirrorOpen: true, // Default to true to show telemetry initially
      isStreaming: false,
      activeAgent: null,
      totalTokensUsed: 0,

      toggleResearchMode: () => set((state) => ({ researchMode: !state.researchMode })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleMirror: () => set((state) => ({ mirrorOpen: !state.mirrorOpen })),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setActiveAgent: (agent) => set({ activeAgent: agent }),
      setTotalTokensUsed: (tokens) => set({ totalTokensUsed: tokens }),

      createSession: (title = "New Cognitive Session") => {
        const id = 'session-' + Math.random().toString(36).substr(2, 9);
        const newSession: Session = {
          id,
          title,
          messages: [],
          tracks: [],
          dictionary: [],
          tokensUsed: 0,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      selectSession: (id) => set({ activeSessionId: id }),

      deleteSession: (id) => set((state) => {
        const remaining = state.sessions.filter((s) => s.id !== id);
        let nextActive = state.activeSessionId;
        if (state.activeSessionId === id) {
          nextActive = remaining.length > 0 ? remaining[0].id : null;
        }
        return {
          sessions: remaining,
          activeSessionId: nextActive,
        };
      }),

      addMessage: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            return { ...s, messages: [...s.messages, message] };
          }
          return s;
        }),
      })),

      updateLastMessageContent: (sessionId, content) => set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0) {
              const last = msgs[msgs.length - 1];
              msgs[msgs.length - 1] = { ...last, content: last.content + content };
            }
            return { ...s, messages: msgs };
          }
          return s;
        }),
      })),

      addTrack: (sessionId, track) => set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            // Check if track already exists by content or ID to avoid duplicates
            if (s.tracks.some(t => t.id === track.id)) return s;
            return { ...s, tracks: [...s.tracks, track] };
          }
          return s;
        }),
      })),

      addDictionaryEntry: (sessionId, entry) => set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            if (s.dictionary.some(d => d.term === entry.term)) return s;
            return { ...s, dictionary: [...s.dictionary, entry] };
          }
          return s;
        }),
      })),

      updateSessionTokens: (sessionId, tokens) => set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            return { ...s, tokensUsed: s.tokensUsed + tokens };
          }
          return s;
        }),
      })),
    }),
    {
      name: 'socratic-session-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        researchMode: state.researchMode,
        totalTokensUsed: state.totalTokensUsed,
      }),
    }
  )
);
