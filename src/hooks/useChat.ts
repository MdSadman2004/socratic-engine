import { useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { Message, StreamChunk } from '@/lib/types';

export function useChat() {
  const store = useSessionStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || store.isStreaming) return;

    let sessionId = store.activeSessionId;
    if (!sessionId) {
      sessionId = store.createSession();
    }

    const currentSession = store.sessions.find(s => s.id === sessionId);
    if (!currentSession) return;

    // 1. Create and add user message
    const userMessage: Message = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    store.addMessage(sessionId, userMessage);
    store.setStreaming(true);

    // 2. Create blank assistant message for streaming
    const assistantMessageId = 'msg-' + Math.random().toString(36).substr(2, 9);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: "",
      timestamp: new Date().toISOString()
    };
    store.addMessage(sessionId, assistantMessage);

    // Get updated history to send
    const history = [...currentSession.messages, userMessage];

    // 3. Initiate fetch with AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Save the last partial line back to buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;

          try {
            const rawJson = cleanLine.substring(6);
            const chunk: StreamChunk = JSON.parse(rawJson);

            switch (chunk.type) {
              case 'agent':
                if (chunk.agent) {
                  store.setActiveAgent(chunk.agent);
                }
                break;
              case 'token':
                if (chunk.content) {
                  store.updateLastMessageContent(sessionId, chunk.content);
                }
                break;
              case 'track':
                if (chunk.track) {
                  store.addTrack(sessionId, chunk.track);
                }
                break;
              case 'dictionary':
                if (chunk.dictionary) {
                  store.addDictionaryEntry(sessionId, chunk.dictionary);
                }
                break;
              case 'done':
                if (chunk.tokensUsed) {
                  store.setTotalTokensUsed(chunk.tokensUsed);
                  store.updateSessionTokens(sessionId, chunk.tokensUsed);
                }
                break;
              case 'error':
                store.updateLastMessageContent(sessionId, `\n\n[Error: ${chunk.content || 'Unknown Error'}]`);
                break;
            }
          } catch (err) {
            console.error("Failed to parse SSE JSON chunk:", err, "Line content:", cleanLine);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        store.updateLastMessageContent(sessionId, "\n\n[Generation stopped by user]");
      } else {
        console.error("Stream fetch failure:", err);
        store.updateLastMessageContent(sessionId, `\n\n[Stream Error: ${err.message || 'Server connection failed'}]`);
      }
    } finally {
      store.setStreaming(false);
      store.setActiveAgent(null);
      abortControllerRef.current = null;
    }
  };

  const abortStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    sendMessage,
    abortStreaming,
    isStreaming: store.isStreaming,
    activeAgent: store.activeAgent
  };
}
