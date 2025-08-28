import { generateContextHandoff } from './handoff.js';

export interface SuggestTransitionCardOptions {
  remainingTokens: number;
  sessionId?: string;
  threshold?: number;
}

export interface SuggestTransitionCardResult {
  suggested: boolean;
  message?: string;
  handoffId?: string;
  preview?: string;
  link?: string;
  tokensSaved?: number;
}

/**
 * Suggest generating a transition card when context is near capacity
 */
export async function suggestTransitionCard(
  options: SuggestTransitionCardOptions
): Promise<SuggestTransitionCardResult> {
  const { remainingTokens, sessionId, threshold = 1000 } = options;
  
  // If we have plenty of tokens left, no suggestion needed
  if (remainingTokens > threshold) {
    return { suggested: false };
  }
  
  // Calculate optimal handoff budget based on remaining tokens
  // Leave some room for the response and user interaction
  const handoffBudget = Math.min(350, Math.floor(remainingTokens * 0.6));
  
  if (handoffBudget < 120) {
    return {
      suggested: true,
      message: "Context critically low. Consider starting a new session.",
      tokensSaved: 0
    };
  }
  
  try {
    // Generate the handoff
    const handoff = await generateContextHandoff({
      budgetTokens: handoffBudget,
      sessionId
    });
    
    // Create preview (first 200 chars)
    const preview = handoff.text.length > 200 
      ? handoff.text.substring(0, 200) + '...'
      : handoff.text;
    
    return {
      suggested: true,
      message: `Context nearing limit (${remainingTokens} tokens remaining). Generated compact transition card.`,
      handoffId: handoff.id,
      preview,
      link: `handoff://${handoff.id}`,
      tokensSaved: remainingTokens - handoffBudget
    };
    
  } catch (error) {
    return {
      suggested: true,
      message: `Context low but failed to generate handoff: ${error instanceof Error ? error.message : String(error)}`,
      tokensSaved: 0
    };
  }
}

/**
 * Check if a handoff suggestion should be made based on context usage
 */
export function shouldSuggestHandoff(
  remainingTokens: number, 
  totalTokens: number = 8000,
  threshold: number = 1000
): boolean {
  const usedTokens = totalTokens - remainingTokens;
  const usageRatio = usedTokens / totalTokens;
  
  // Suggest if:
  // 1. Remaining tokens below threshold, OR
  // 2. Usage ratio above 75%
  return remainingTokens < threshold || usageRatio > 0.75;
}

/**
 * Get recommended handoff budget based on remaining tokens
 */
export function getRecommendedHandoffBudget(remainingTokens: number): number {
  if (remainingTokens < 200) return 120; // Minimum viable
  if (remainingTokens < 500) return 200; // Compact
  if (remainingTokens < 1000) return 300; // Standard
  return 350; // Full featured
}

