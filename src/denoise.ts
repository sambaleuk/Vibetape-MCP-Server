import { Store } from './store.js';
import { Moment } from './types.js';
import { cos } from './embed.js';

// Patterns for trivial moments
const TRIVIAL_PATTERNS = [
  /^(ok|done|thanks?|test|tmp|wip|fix|good|yes|no)$/i,
  /^(\.|\.\.\.|…)$/,
  /^(👍|✅|❌|🎉|🔧|🚀)$/,
  /^(saving|saved|loading|loaded)$/i
];

// Patterns for noise detection
const NOISE_PATTERNS = [
  /^(checking|running|testing|building)\.{3}$/i,
  /^(starting|stopping|restarting)$/i,
  /^(updating|installing|downloading)$/i
];

export interface SweepNoiseOptions {
  windowDays?: number;
  similarityThreshold?: number;
  cooldownMinutes?: number;
}

export interface SweepNoiseResult {
  processed: number;
  markedAsNoise: number;
  merged: number;
  updated: number;
}

/**
 * Detect if a moment is trivial based on content
 */
function isTrivialMoment(moment: Moment): boolean {
  const title = (moment.title || '').trim();
  const text = (moment.text || '').trim();
  
  // Very short content
  if (title.length < 3 && text.length < 10) return true;
  
  // Matches trivial patterns
  if (TRIVIAL_PATTERNS.some(pattern => pattern.test(title) || pattern.test(text))) {
    return true;
  }
  
  // Matches noise patterns
  if (NOISE_PATTERNS.some(pattern => pattern.test(title) || pattern.test(text))) {
    return true;
  }
  
  return false;
}

/**
 * Calculate similarity between two moments using embeddings or text similarity
 */
function calculateSimilarity(moment1: Moment, moment2: Moment): number {
  // If both have embeddings, use cosine similarity
  if (moment1.embedding && moment2.embedding) {
    return cos(moment1.embedding, moment2.embedding);
  }
  
  // Fallback: simple text similarity
  const text1 = (moment1.title + ' ' + moment1.text).toLowerCase();
  const text2 = (moment2.title + ' ' + moment2.text).toLowerCase();
  
  // Jaccard similarity on words
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Find duplicate moments within a time window
 */
function findDuplicates(
  moments: Moment[], 
  similarityThreshold: number = 0.8,
  timeWindowMs: number = 15 * 60 * 1000 // 15 minutes
): Array<{ parent: Moment; duplicates: Moment[] }> {
  const groups: Array<{ parent: Moment; duplicates: Moment[] }> = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    if (processed.has(moment.id)) continue;
    
    const duplicates: Moment[] = [];
    
    // Look for similar moments within time window
    for (let j = i + 1; j < moments.length; j++) {
      const candidate = moments[j];
      if (processed.has(candidate.id)) continue;
      
      // Check time proximity
      const timeDiff = Math.abs(moment.ts - candidate.ts);
      if (timeDiff > timeWindowMs) continue;
      
      // Check similarity
      const similarity = calculateSimilarity(moment, candidate);
      if (similarity >= similarityThreshold) {
        duplicates.push(candidate);
        processed.add(candidate.id);
      }
    }
    
    if (duplicates.length > 0) {
      groups.push({ parent: moment, duplicates });
      processed.add(moment.id);
    }
  }
  
  return groups;
}

/**
 * Detect moments that violate cooldown (too frequent similar actions)
 */
function detectCooldownViolations(
  moments: Moment[],
  cooldownMinutes: number = 10
): Moment[] {
  const violations: Moment[] = [];
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  // Group by similar tags/content
  const tagGroups = new Map<string, Moment[]>();
  
  for (const moment of moments) {
    const key = moment.tags.slice().sort().join(',') || 'notags';
    if (!tagGroups.has(key)) tagGroups.set(key, []);
    tagGroups.get(key)!.push(moment);
  }
  
  // Check each group for cooldown violations
  for (const [_, groupMoments] of tagGroups) {
    if (groupMoments.length < 3) continue; // Need at least 3 to consider spam
    
    groupMoments.sort((a, b) => a.ts - b.ts);
    
    for (let i = 1; i < groupMoments.length; i++) {
      const current = groupMoments[i];
      const previous = groupMoments[i - 1];
      
      if (current.ts - previous.ts < cooldownMs) {
        violations.push(current);
      }
    }
  }
  
  return violations;
}

/**
 * Update signal scores based on moment quality
 */
function updateSignalScores(moments: Moment[]): void {
  for (const moment of moments) {
    let score = 0.5; // Base score
    
    // Type bonuses
    switch (moment.kind) {
      case 'decision': score += 0.3; break;
      case 'win': score += 0.2; break;
      case 'fail': score += 0.1; break;
      case 'note': score += 0.0; break;
    }
    
    // Content quality
    const contentLength = (moment.title + moment.text).length;
    if (contentLength > 100) score += 0.1;
    if (contentLength > 300) score += 0.1;
    
    // Tag quality
    if (moment.tags.length > 2) score += 0.1;
    if (moment.tags.some(tag => ['security', 'critical', 'production'].includes(tag))) {
      score += 0.2;
    }
    
    // Git context bonus
    if (moment.git?.sha) score += 0.1;
    if (moment.snapshot?.diff) score += 0.1;
    
    moment.signal_score = Math.min(1.0, Math.max(0.0, score));
  }
}

/**
 * Main denoising function
 */
export async function sweepNoise(options: SweepNoiseOptions = {}): Promise<SweepNoiseResult> {
  const {
    windowDays = 7,
    similarityThreshold = 0.8,
    cooldownMinutes = 10
  } = options;
  
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - windowMs;
  
  // Get recent moments
  const state = await Store.getState();
  const recentMoments = state.moments.filter(m => m.ts > cutoffTime);
  
  let markedAsNoise = 0;
  let merged = 0;
  let updated = 0;
  
  // 1. Mark trivial moments as noise
  for (const moment of recentMoments) {
    if (isTrivialMoment(moment)) {
      await Store.updateMoment(moment.id, { 
        is_noise: true, 
        signal_score: 0.05 
      });
      markedAsNoise++;
      updated++;
    }
  }
  
  // 2. Find and merge duplicates
  const usableMoments = recentMoments.filter(m => !m.is_noise && !m.merged_into);
  const duplicateGroups = findDuplicates(usableMoments, similarityThreshold);
  
  for (const group of duplicateGroups) {
    // Merge duplicates into parent
    for (const duplicate of group.duplicates) {
      await Store.updateMoment(duplicate.id, {
        merged_into: group.parent.id
      });
      merged++;
      updated++;
    }
    
    // Boost parent's signal score
    const currentScore = group.parent.signal_score || 0.5;
    await Store.updateMoment(group.parent.id, {
      signal_score: Math.min(1.0, currentScore + (group.duplicates.length * 0.1))
    });
    updated++;
  }
  
  // 3. Mark cooldown violations as noise
  const cooldownViolations = detectCooldownViolations(usableMoments, cooldownMinutes);
  for (const violation of cooldownViolations) {
    await Store.updateMoment(violation.id, {
      is_noise: true,
      signal_score: 0.1
    });
    markedAsNoise++;
    updated++;
  }
  
  // 4. Update signal scores for all recent moments
  updateSignalScores(recentMoments);
  for (const moment of recentMoments) {
    if (!moment.is_noise && !moment.merged_into) {
      await Store.updateMoment(moment.id, {
        signal_score: moment.signal_score
      });
      updated++;
    }
  }
  
  return {
    processed: recentMoments.length,
    markedAsNoise,
    merged,
    updated
  };
}

