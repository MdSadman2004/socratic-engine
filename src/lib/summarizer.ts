import { Message } from './types';
import { cerebras, MODELS } from './cerebras';
import { tokenTracker } from './tokenTracker';

/**
 * Summarize older messages to keep the request within the token limits
 */
export async function summarizeHistory(
  messages: Message[],
  systemPreamble: string = ""
): Promise<Message[]> {
  if (messages.length <= 5) {
    return messages;
  }

  // Keep the last 4 messages untouched
  const recentMessages = messages.slice(-4);
  const olderMessages = messages.slice(0, messages.length - 4);

  // Check total estimated tokens
  const estimatedRecentTokens = recentMessages.reduce(
    (acc, msg) => acc + tokenTracker.estimateTokens(msg.content),
    0
  );

  // If recent messages already exceed limit, we can only keep the most recent ones.
  // 6000 tokens threshold (out of 8192) for context safety.
  if (estimatedRecentTokens > 6000) {
    return recentMessages.slice(-2);
  }

  // Generate prompt for summarizing older history
  const olderHistoryString = olderMessages
    .map((m) => `${m.role === 'user' ? 'User' : m.agent || m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const response = (await cerebras.chat.completions.create({
      model: MODELS.PRIMARY,
      messages: [
        {
          role: 'system' as const,
          content: 'You are a context summarizer. Compile the discussion history into a dense, objective summary (under 200 words) capturing the main insights, decisions, and current direction. Do not lose critical technical details or formulas.',
        },
        {
          role: 'user' as const,
          content: `Summarize the following historical discussion:\n\n${olderHistoryString}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    })) as any;

    const summaryText = response.choices[0]?.message?.content || "Previous context summary unavailable.";
    
    // Track tokens used for summarization
    const promptTokens = tokenTracker.estimateTokens(olderHistoryString);
    const completionTokens = tokenTracker.estimateTokens(summaryText);
    tokenTracker.trackUsage(promptTokens + completionTokens);

    return [
      {
        id: 'summary-context',
        role: 'system',
        content: `Summary of previous discussion:\n${summaryText}\n\n${systemPreamble}`,
        timestamp: new Date().toISOString(),
      },
      ...recentMessages,
    ];
  } catch (error) {
    console.error("Summarization failed, falling back to sliding window:", error);
    // Fallback: just return the recent messages
    return recentMessages;
  }
}
