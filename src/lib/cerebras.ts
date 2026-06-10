import Cerebras from '@cerebras/cerebras_cloud_sdk';

// Cerebras client singleton with TCP warming optimization as per ledger.md
class CerebrasClient {
  private static instance: Cerebras;

  private constructor() {}

  public static getInstance(): Cerebras {
    if (!CerebrasClient.instance) {
      const apiKey = process.env.CEREBRAS_API_KEY;
      if (!apiKey) {
        throw new Error("Missing CEREBRAS_API_KEY environment variable");
      }
      CerebrasClient.instance = new Cerebras({
        apiKey,
      });
    }
    return CerebrasClient.instance;
  }
}

// Lazy-loaded Proxy to prevent build-time crashes when env vars are missing
export const cerebras = new Proxy({} as Cerebras, {
  get(target, prop, receiver) {
    const instance = CerebrasClient.getInstance();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

// Available models per the free tier config in ledger
export const MODELS = {
  PRIMARY: 'zai-glm-4.7',
};
