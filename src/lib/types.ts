export type AgentType = 
  | 'router' 
  | 'prototyper' 
  | 'interrogator' 
  | 'synthesizer' 
  | 'sentiment' 
  | 'resonance';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: AgentType;
  timestamp: string;
}

export interface CognitiveTrack {
  id: string;
  agent: string;
  content: string;
  status: 'pending' | 'success' | 'friction';
  timestamp: string;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  definition: string;
  domain: string;
  analogy: string;
  timestamp: string;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  tracks: CognitiveTrack[];
  dictionary: DictionaryEntry[];
  tokensUsed: number;
  timestamp: string;
}

export interface StreamChunk {
  type: 'token' | 'agent' | 'track' | 'dictionary' | 'done' | 'error';
  content?: string;
  agent?: AgentType;
  track?: CognitiveTrack;
  dictionary?: DictionaryEntry;
  tokensUsed?: number;
}
