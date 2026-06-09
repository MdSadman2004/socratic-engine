import fs from 'fs';
import path from 'path';

let cachedContext = "";
let lastLoaded = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getAgentContext(): string {
  const now = Date.now();
  if (cachedContext && (now - lastLoaded < CACHE_TTL_MS)) {
    return cachedContext;
  }

  try {
    // Attempt to locate files in parent directory
    const workspaceRoot = path.resolve(process.cwd(), '..');
    const contextPath = path.join(workspaceRoot, 'agent-context.md');
    const ledgerPath = path.join(workspaceRoot, 'ledger.md');
    const planPath = path.join(workspaceRoot, 'plan.md');

    let context = "";
    if (fs.existsSync(contextPath)) {
      context += `\n### Agent Rules & Constraints:\n${fs.readFileSync(contextPath, 'utf8')}\n`;
    }
    if (fs.existsSync(ledgerPath)) {
      // Just take the first few hundred lines of ledger to save tokens
      const ledgerContent = fs.readFileSync(ledgerPath, 'utf8').substring(0, 2000);
      context += `\n### Architectural Changelog (Recent):\n${ledgerContent}\n`;
    }
    if (fs.existsSync(planPath)) {
      context += `\n### Project Plan Context:\n${fs.readFileSync(planPath, 'utf8')}\n`;
    }

    cachedContext = context;
    lastLoaded = now;
    return cachedContext;
  } catch (error) {
    console.error("Failed to load agent context from files:", error);
    return "Socratic Research Engine context loaded with default parameters.";
  }
}
