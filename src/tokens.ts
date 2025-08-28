import { encoding_for_model } from "@dqbd/tiktoken";

let enc: any = null;

// Lazy initialization to handle potential errors
function getEncoder() {
  if (!enc) {
    try {
      enc = encoding_for_model("gpt-4o");
    } catch (error) {
      console.warn('Failed to initialize tiktoken encoder, using fallback:', error);
      // Fallback: rough estimation (4 chars = 1 token)
      enc = {
        encode: (text: string) => new Array(Math.ceil(text.length / 4))
      };
    }
  }
  return enc;
}

export function tokensOf(text: string): number {
  try {
    return getEncoder().encode(text).length;
  } catch (error) {
    // Fallback estimation
    return Math.ceil(text.length / 4);
  }
}

export function fitLines(lines: string[], maxTokens: number): string[] {
  const out: string[] = [];
  let budget = maxTokens;
  
  for (const line of lines) {
    const tokens = tokensOf(line);
    if (tokens <= budget) {
      out.push(line);
      budget -= tokens;
    } else {
      break;
    }
  }
  
  return out;
}

export function truncateToTokens(text: string, maxTokens: number): string {
  if (tokensOf(text) <= maxTokens) {
    return text;
  }
  
  // Binary search for optimal truncation point
  let low = 0;
  let high = text.length;
  let result = '';
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.substring(0, mid);
    const tokens = tokensOf(candidate);
    
    if (tokens <= maxTokens) {
      result = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return result + (result.length < text.length ? '...' : '');
}

