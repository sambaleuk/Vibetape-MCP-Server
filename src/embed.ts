import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function embed(text: string): Promise<number[]> {
  if (openai) {
    try {
      const r = await openai.embeddings.create({ 
        model: 'text-embedding-3-small', 
        input: text 
      });
      return r.data[0].embedding as number[];
    } catch (error) {
      console.warn('OpenAI embedding failed, falling back to TF-IDF:', error);
    }
  }
  
  // naive TF‑IDF fallback: character hashing
  const vec = new Array(512).fill(0);
  for (const ch of text.toLowerCase()) {
    vec[ch.charCodeAt(0) % 512] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

export function cos(a: number[], b: number[]): number {
  let dp = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i] || 0;
    dp += x * y;
    na += x * x;
    nb += y * y;
  }
  return dp / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
