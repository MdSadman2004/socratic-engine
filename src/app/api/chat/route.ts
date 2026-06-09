import { NextRequest, NextResponse } from 'next/server';
import { socraticGraph } from '@/lib/langgraph';
import { summarizeHistory } from '@/lib/summarizer';
import { getAgentContext } from '@/lib/agentContext';
import { StreamChunk } from '@/lib/types';
import { tokenTracker } from '@/lib/tokenTracker';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (chunk: StreamChunk) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } catch (e) {
            console.warn("Attempted to write to closed stream controller:", e);
          }
        };

        try {
          const systemContext = getAgentContext();
          const optimizedMessages = await summarizeHistory(messages, systemContext);

          // Execute LangGraph and pass SSE stream handler
          await socraticGraph.invoke(
            { messages: optimizedMessages },
            {
              configurable: {
                onChunk: (chunk: StreamChunk) => {
                  sendSSE(chunk);
                },
              },
            }
          );

          sendSSE({ type: 'done', tokensUsed: tokenTracker.getUsage().used });
          controller.close();
        } catch (error: any) {
          console.error("LangGraph execution error:", error);
          sendSSE({ type: 'error', content: error.message || 'Error occurred during execution.' });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("Chat route POST error:", error);
    return NextResponse.json({ error: 'Failed to process request: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  const usage = tokenTracker.getUsage();
  return NextResponse.json({ tokens_used: usage.used, daily_limit: usage.limit });
}
