import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { cerebras, MODELS } from './cerebras';
import { tokenTracker } from './tokenTracker';
import { Message, CognitiveTrack, DictionaryEntry, AgentType } from './types';
import { ROUTER_PROMPT } from './prompts/router';
import { PROTOTYPER_PROMPT } from './prompts/prototyper';
import { INTERROGATOR_PROMPT } from './prompts/interrogator';
import { SENTIMENT_PROMPT } from './prompts/sentimentMonitor';
import { RESONANCE_PROMPT } from './prompts/resonanceEngine';
import { SYNTHESIZER_PROMPT } from './prompts/synthesizer';
import { VISUALIZER_PROMPT } from './prompts/visualizer';

// Define the state of our agent graph using modern Annotation.Root
export const GraphState = Annotation.Root({
  messages: Annotation<Message[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  route: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'prototype',
  }),
  sentiment: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  tracks: Annotation<CognitiveTrack[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  dictionary: Annotation<DictionaryEntry[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentOutput: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  tokensUsed: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
});

type StateType = typeof GraphState.State;

// 1. Router Node: Classifies intent and overrides based on keywords
async function routerNode(state: StateType, config?: RunnableConfig) {
  const onChunk = config?.configurable?.onChunk;
  const lastMessage = state.messages[state.messages.length - 1]?.content || "";

  // Dynamic Override Heuristic
  const lowercaseInput = lastMessage.toLowerCase();
  const visualKeywords = ["show", "draw", "render", "simulate", "animate", "visualize", "canvas", "graph"];
  const containsVisualKeyword = visualKeywords.some(keyword => lowercaseInput.includes(keyword));

  if (containsVisualKeyword) {
    if (onChunk) {
      onChunk({ type: 'agent', agent: 'router' });
      onChunk({ 
        type: 'track', 
        track: {
          id: 'route-' + Date.now(),
          agent: 'Router Agent',
          content: 'Override: Visual request detected. Direct routing to Visualizer.',
          status: 'success',
          timestamp: new Date().toISOString()
        } 
      });
    }
    return { route: 'visualize' };
  }

  try {
    const response = (await cerebras.chat.completions.create({
      model: MODELS.PRIMARY,
      messages: [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: lastMessage },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })) as any;

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const classification = parsed.classification || 'prototype';

    // Track tokens
    const promptTokens = tokenTracker.estimateTokens(ROUTER_PROMPT + lastMessage);
    const completionTokens = tokenTracker.estimateTokens(content);
    tokenTracker.trackUsage(promptTokens + completionTokens);

    if (onChunk) {
      onChunk({ type: 'agent', agent: 'router' });
      onChunk({ 
        type: 'track', 
        track: {
          id: 'route-' + Date.now(),
          agent: 'Router Agent',
          content: `Classified user query as: ${classification.toUpperCase()} (${parsed.rationale || ''})`,
          status: 'success',
          timestamp: new Date().toISOString()
        } 
      });
    }

    return { route: classification, tokensUsed: promptTokens + completionTokens };
  } catch (error) {
    console.error("Router classification failed, defaulting to prototype:", error);
    return { route: 'prototype' };
  }
}

// 2. Sentiment Node: Momentum Monitor
async function sentimentNode(state: StateType, config?: RunnableConfig) {
  const onChunk = config?.configurable?.onChunk;
  
  // Only execute when user messages count is >= 3
  const userMessages = state.messages.filter(m => m.role === 'user');
  if (userMessages.length < 3) {
    return {};
  }

  const historyText = state.messages
    .map(m => `${m.role === 'user' ? 'User' : m.agent || m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const response = (await cerebras.chat.completions.create({
      model: MODELS.PRIMARY,
      messages: [
        { role: 'system', content: SENTIMENT_PROMPT },
        { role: 'user', content: `Analyze the sentiment state of the following session:\n\n${historyText}` }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })) as any;

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const promptTokens = tokenTracker.estimateTokens(SENTIMENT_PROMPT + historyText);
    const completionTokens = tokenTracker.estimateTokens(content);
    tokenTracker.trackUsage(promptTokens + completionTokens);

    const isFrictionHigh = (parsed.friction || 0) > 0.6;

    if (onChunk) {
      onChunk({ 
        type: 'track', 
        track: {
          id: 'sentiment-' + Date.now(),
          agent: 'Sentiment Monitor',
          content: `Alignment: ${parsed.alignment}, Friction: ${parsed.friction}. Recommendation: ${parsed.feedback}`,
          status: isFrictionHigh ? 'friction' : 'success',
          timestamp: new Date().toISOString()
        } 
      });
    }

    return { 
      sentiment: `alignment: ${parsed.alignment}, friction: ${parsed.friction}`,
      tokensUsed: promptTokens + completionTokens
    };
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    return {};
  }
}

// 3. Agent Execution Node: Prototyper or Interrogator or Synthesizer or Visualizer
async function agentNode(state: StateType, config?: RunnableConfig) {
  const onChunk = config?.configurable?.onChunk;
  const route = state.route;
  
  let systemPrompt = PROTOTYPER_PROMPT;
  let activeAgent: AgentType = 'prototyper';

  if (route === 'interrogate') {
    systemPrompt = INTERROGATOR_PROMPT;
    activeAgent = 'interrogator';
  } else if (route === 'synthesize') {
    systemPrompt = SYNTHESIZER_PROMPT;
    activeAgent = 'synthesizer';
  } else if (route === 'visualize') {
    systemPrompt = VISUALIZER_PROMPT;
    activeAgent = 'resonance'; // using resonance as a proxy or just assistant
  }

  if (onChunk) {
    onChunk({ type: 'agent', agent: activeAgent });
    onChunk({ 
      type: 'track', 
      track: {
        id: 'agent-run-' + Date.now(),
        agent: activeAgent.toUpperCase() + ' Agent',
        content: `Initializing core logic for ${route.toUpperCase()} path...`,
        status: 'pending',
        timestamp: new Date().toISOString()
      } 
    });
  }

  // Build message sequence for LLM
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...state.messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }))
  ];

  try {
    const stream = (await cerebras.chat.completions.create({
      model: MODELS.PRIMARY,
      messages: apiMessages,
      temperature: route === 'visualize' ? 0.35 : (route === 'interrogate' ? 0.5 : 0.2),
      stream: true,
    })) as any;

    let fullOutput = "";
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullOutput += text;
        if (onChunk) {
          onChunk({ type: 'token', content: text });
        }
      }
    }

    const promptTokens = tokenTracker.estimateTokens(systemPrompt + state.messages.map(m => m.content).join(""));
    const completionTokens = tokenTracker.estimateTokens(fullOutput);
    tokenTracker.trackUsage(promptTokens + completionTokens);

    if (onChunk) {
      onChunk({ 
        type: 'track', 
        track: {
          id: 'agent-done-' + Date.now(),
          agent: activeAgent.toUpperCase() + ' Agent',
          content: `Response stream completed. Generated ${completionTokens} tokens.`,
          status: 'success',
          timestamp: new Date().toISOString()
        } 
      });
    }

    return { 
      currentOutput: fullOutput,
      tokensUsed: promptTokens + completionTokens
    };
  } catch (error) {
    console.error("Agent completion failed:", error);
    if (onChunk) {
      onChunk({ type: 'error', content: 'Inference pipeline failure.' });
    }
    throw error;
  }
}

// 4. Resonance Node: Analogy Detector & Dictionary Builder
async function resonanceNode(state: StateType, config?: RunnableConfig) {
  const onChunk = config?.configurable?.onChunk;
  const lastUserMsg = state.messages[state.messages.length - 1]?.content || "";
  const lastAssistantMsg = state.currentOutput;

  if (!lastAssistantMsg || state.route === 'synthesize') {
    return {};
  }

  try {
    const response = (await cerebras.chat.completions.create({
      model: MODELS.PRIMARY,
      messages: [
        { role: 'system', content: RESONANCE_PROMPT },
        { role: 'user', content: `Evaluate this recent exchange for conceptual dictionary entries:\n\nUser: ${lastUserMsg}\n\nAssistant: ${lastAssistantMsg}` }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })) as any;

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const newEntries: DictionaryEntry[] = (parsed.entries || []).map((e: any) => ({
      id: 'dict-' + Math.random().toString(36).substr(2, 9),
      term: e.term,
      definition: e.definition,
      domain: e.domain,
      analogy: e.analogy,
      timestamp: new Date().toISOString()
    }));

    const promptTokens = tokenTracker.estimateTokens(RESONANCE_PROMPT + lastUserMsg + lastAssistantMsg);
    const completionTokens = tokenTracker.estimateTokens(content);
    tokenTracker.trackUsage(promptTokens + completionTokens);

    if (newEntries.length > 0 && onChunk) {
      newEntries.forEach(entry => {
        onChunk({ type: 'dictionary', dictionary: entry });
        onChunk({ 
          type: 'track', 
          track: {
            id: 'resonance-' + Date.now(),
            agent: 'Resonance Engine',
            content: `Discovered interdisciplinary analogy: "${entry.term}" mapping ${entry.domain}.`,
            status: 'success',
            timestamp: new Date().toISOString()
          } 
        });
      });
    }

    return { 
      dictionary: newEntries,
      tokensUsed: promptTokens + completionTokens
    };
  } catch (error) {
    console.error("Resonance detection failed:", error);
    return {};
  }
}

// Build the LangGraph StateGraph
const workflow = new StateGraph(GraphState)
  .addNode('router', routerNode)
  .addNode('sentiment_monitor', sentimentNode)
  .addNode('agent', agentNode)
  .addNode('resonance', resonanceNode);

// Define graph control flows
workflow.addEdge('router', 'sentiment_monitor');
workflow.addEdge('sentiment_monitor', 'agent');
workflow.addEdge('agent', 'resonance');
workflow.addEdge('resonance', END);

workflow.setEntryPoint('router');

export const socraticGraph = workflow.compile();
export type SocraticGraphType = typeof socraticGraph;
