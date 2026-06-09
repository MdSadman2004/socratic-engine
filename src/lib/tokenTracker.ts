// Token budget enforcement with estimation heuristic

export interface TokenUsage {
  used: number;
  limit: number;
}

class TokenTracker {
  private static instance: TokenTracker;
  private usedTokens: number = 0;
  private readonly DAILY_LIMIT = 1000000;
  private readonly SAFETY_BUFFER = 50000;

  private constructor() {}

  public static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  public trackUsage(tokens: number) {
    this.usedTokens += tokens;
  }

  public getUsage(): TokenUsage {
    return {
      used: this.usedTokens,
      limit: this.DAILY_LIMIT,
    };
  }

  public hasSufficientBudget(): boolean {
    return this.usedTokens + this.SAFETY_BUFFER < this.DAILY_LIMIT;
  }

  // Simple heuristic for estimation (1 token ≈ 4 characters)
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const tokenTracker = TokenTracker.getInstance();
