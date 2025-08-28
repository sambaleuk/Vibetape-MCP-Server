import { tokensOf, fitLines } from './tokens.js';
import { Store } from './store.js';
import { Moment, HandoffRecord } from './types.js';
import { ulid } from 'ulid';

// Type weights for ranking algorithm
const TYPE_WEIGHTS = {
  decision: 1.0,
  win: 0.8,
  fail: 0.7,
  note: 0.4
} as const;

// Tag boost scores
const TAG_BOOSTS = {
  security: 0.3,
  deploy: 0.2,
  production: 0.2,
  critical: 0.3,
  fix: 0.15,
  architecture: 0.15
} as const;

/**
 * Calculate ranking score for a moment
 * Score = 0.5*recency + 0.3*typeWeight + 0.2*tagBoost
 */
function rankMoment(moment: Moment, now: number): number {
  // Recency score (0-1 over 7 days)
  const ageMs = now - moment.ts;
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recency = Math.max(0, 1 - (ageMs / weekMs));
  
  // Type weight
  const typeWeight = TYPE_WEIGHTS[moment.kind] ?? 0.4;
  
  // Tag boost
  let tagBoost = 0;
  for (const tag of moment.tags) {
    const boost = TAG_BOOSTS[tag.toLowerCase() as keyof typeof TAG_BOOSTS];
    if (boost) tagBoost = Math.max(tagBoost, boost);
  }
  
  return 0.5 * recency + 0.3 * typeWeight + 0.2 * tagBoost;
}

/**
 * Filter out noise and merged moments
 */
function filterUsableMoments(moments: Moment[]): Moment[] {
  return moments.filter(m => !m.is_noise && !m.merged_into);
}

/**
 * Summarize lines to fit within token budget
 */
function summarizeLines(lines: string[], budget: number): string[] {
  if (lines.length === 0) return [];
  
  const fitted = fitLines(lines, budget);
  
  // If we couldn't fit anything, try to truncate the first line
  if (fitted.length === 0 && lines.length > 0) {
    const firstLine = lines[0];
    const truncated = firstLine.substring(0, Math.floor(budget * 4)) + '...';
    return tokensOf(truncated) <= budget ? [truncated] : [];
  }
  
  return fitted;
}

/**
 * Extract stack information from moments
 */
function extractStack(moments: Moment[]): string[] {
  const stackKeywords = [
    'nginx', 'traefik', 'ssl', 'letsencrypt', 'github actions',
    'ufw', 'fail2ban', 'hostinger', 'dns', 'k8s', 'postgres',
    'redis', 'docker', 'node', 'typescript', 'react', 'nextjs'
  ];
  
  const stackMoments = moments.filter(m => {
    const text = (m.title + ' ' + m.text).toLowerCase();
    return stackKeywords.some(keyword => text.includes(keyword));
  });
  
  return stackMoments
    .slice(0, 6)
    .map(m => `- ${m.title || m.text.split('\n')[0]}`);
}

export interface GenerateHandoffOptions {
  budgetTokens?: number;
  includeCurrentState?: boolean;
  includeKeyDecisions?: boolean;
  includeNextSteps?: boolean;
  includeSolved?: boolean;
  sessionId?: string;
}

export async function generateContextHandoff(options: GenerateHandoffOptions = {}): Promise<{
  id: string;
  text: string;
  refs: string[];
  record: HandoffRecord;
}> {
  const {
    budgetTokens = 350,
    includeCurrentState = true,
    includeKeyDecisions = true,
    includeNextSteps = true,
    includeSolved = true,
    sessionId
  } = options;
  
  const now = Date.now();
  
  // 1. Get recent moments and filter out noise
  const state = await Store.getState();
  const usableMoments = filterUsableMoments(state.moments)
    .slice(0, 200) // Limit for performance
    .map(m => ({ moment: m, score: rankMoment(m, now) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.moment);
  
  // 2. Budget allocation
  const budgets = {
    state: Math.floor(budgetTokens * 0.17), // ~60 tokens
    stack: Math.floor(budgetTokens * 0.23), // ~80 tokens  
    decisions: Math.floor(budgetTokens * 0.29), // ~100 tokens
    solved: Math.floor(budgetTokens * 0.20), // ~70 tokens
    next: Math.floor(budgetTokens * 0.11) // ~40 tokens
  };
  
  // 3. Extract different types of moments
  const currentStateMoment = usableMoments.find(m => 
    m.kind === 'note' && /state|status|live|deploy|current/i.test(m.text)
  );
  
  const decisions = usableMoments
    .filter(m => m.kind === 'decision')
    .slice(0, 8);
  
  const solved = usableMoments
    .filter(m => m.kind === 'win' || /fixed|solved|resolved|success/i.test(m.text))
    .slice(0, 6);
  
  const nextSteps = usableMoments
    .filter(m => m.kind === 'note' && /next|todo|plan|should|need/i.test(m.text))
    .slice(0, 6);
  
  // 4. Generate content sections
  const sections: string[] = ['# Transition – VibeTape', ''];
  
  // Current State
  if (includeCurrentState) {
    sections.push('ÉTAT ACTUEL');
    const stateLines = currentStateMoment 
      ? [`- ${currentStateMoment.text.split('\n')[0]}`]
      : ['- (à préciser)'];
    sections.push(...summarizeLines(stateLines, budgets.state));
    sections.push('');
  }
  
  // Stack
  sections.push('STACK');
  const stackLines = extractStack(usableMoments);
  sections.push(...summarizeLines(stackLines, budgets.stack));
  sections.push('');
  
  // Key Decisions
  if (includeKeyDecisions) {
    sections.push('DÉCISIONS CLÉS');
    const decisionLines = decisions.map(m => `- ${m.title || m.text.split('\n')[0]}`);
    sections.push(...summarizeLines(decisionLines, budgets.decisions));
    sections.push('');
  }
  
  // Problems Solved
  if (includeSolved) {
    sections.push('PROBLÈMES RÉSOLUS');
    const solvedLines = solved.map(m => `- ${m.title || m.text.split('\n')[0]}`);
    sections.push(...summarizeLines(solvedLines, budgets.solved));
    sections.push('');
  }
  
  // Next Steps
  if (includeNextSteps) {
    sections.push('NEXT STEPS (48h)');
    const nextLines = nextSteps.map(m => `- ${m.text.split('\n')[0]}`);
    sections.push(...summarizeLines(nextLines, budgets.next));
    sections.push('');
  }
  
  // 5. Generate refs
  const refs: string[] = [];
  if (currentStateMoment) refs.push(`moment://${currentStateMoment.id}`);
  refs.push(...decisions.map(m => `moment://${m.id}`));
  refs.push(...solved.map(m => `moment://${m.id}`));
  refs.push(...nextSteps.map(m => `moment://${m.id}`));
  
  // 6. Create handoff record
  const id = ulid();
  const text = sections.join('\n');
  
  const record: HandoffRecord = {
    id,
    ts: now,
    session_id: sessionId,
    budget_tokens: budgetTokens,
    current_state: currentStateMoment?.text.split('\n')[0] || '',
    stack: stackLines.join('\n'),
    decisions: decisions.map(m => m.title || m.text.split('\n')[0]),
    solved: solved.map(m => m.title || m.text.split('\n')[0]),
    next_steps: nextSteps.map(m => m.text.split('\n')[0]),
    refs
  };
  
  // 7. Store handoff (extend state with handoffs array)
  const newState = {
    ...state,
    handoffs: [...(state.handoffs || []), record]
  };
  await Store.save(newState);
  
  return { id, text, refs, record };
}

