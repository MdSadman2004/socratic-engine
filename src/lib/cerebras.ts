import Cerebras from '@cerebras/cerebras_cloud_sdk';

if (!process.env.CEREBRAS_API_KEY) {
  throw new Error("Missing CEREBRAS_API_KEY environment variable");
}

// Cerebras client singleton with TCP warming optimization as per ledger.md
class CerebrasClient {
  private static instance: Cerebras;

  private constructor() {}

  public static getInstance(): Cerebras {
    if (!CerebrasClient.instance) {
      CerebrasClient.instance = new Cerebras({
        apiKey: process.env.CEREBRAS_API_KEY,
      });
    }
    return CerebrasClient.instance;
  }
}

export const cerebras = CerebrasClient.getInstance();

// Available models per the free tier config in ledger
export const MODELS = {
  PRIMARY: 'zai-glm-4.7',
};
