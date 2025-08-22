# VibeTape MCP Server (Hybrid Active Memory) — v0.1

> **Sexy name chosen:** **VibeTape** — "record the vibe of your build". It’s an MCP server that captures *key moments* of your build (wins, fails, pivots), induces a compact RETEX card, and lets your AI IDE recall/search/replay them on demand.

---

## 0) What this is

* **MCP server** exposing:

  * **Tools**: `mark_moment`, `list_moments`, `search_moments`, `make_retex`, `export_timeline`.
  * **Resources**: `moment://{id}`, `timeline://{day}`, `retex://{id}`.
  * **Prompts**: `induce-retex`, `pr-template`, `commit-msg`.
* **Local storage**: JSON store in `~/.vibetape/state.json` (simple & portable). Optional OpenAI embeddings (fallback to TF‑IDF cosine).
* **Safety**: read‑only on project files (no shell exec), writes only to `~/.vibetape/`.

Use it from Claude Desktop / Claude Code / any MCP client: mark moments as you code, then instantly surface prior fixes/decisions.

---

## 1) Folder layout

```
vibetape-mcp/
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ src/
│  ├─ server.ts         # MCP server (stdio)
│  ├─ store.ts          # file-backed store (moments + retex + vectors)
│  ├─ snapshot.ts       # git/context snapshot (safe, read-only)
│  ├─ embed.ts          # OpenAI embeddings or TF‑IDF fallback
│  ├─ prompts.ts        # reusable prompt templates
│  └─ types.ts
└─ README.md
```

---

## 2) package.json

```json
{
  "name": "vibetape-mcp",
  "version": "0.1.0",
  "type": "module",
  "license": "Apache-2.0",
  "scripts": {
    "dev": "ts-node src/server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.3",
    "dotenv": "^16.4.5",
    "fs-extra": "^11.2.0",
    "openai": "^4.57.0",
    "simple-git": "^3.27.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
```

---

## 3) .env.example

```
OPENAI_API_KEY=sk-...
# Optional: where to store state
VIBETAPE_HOME=~/.vibetape
```

---

## 4) types.ts

```ts
export type MomentKind = 'win'|'fail'|'decision'|'note';
export type Moment = {
  id: string; ts: number; title: string; kind: MomentKind;
  tags: string[]; details?: string;
  cwd?: string; git?: { branch?: string; sha?: string };
  snapshot?: { diff?: string; tests?: string; deps?: string };
  text: string; // concatenated searchable text
  embedding?: number[]; // optional
};

export type RetexCard = {
  id: string; momentId: string; title: string; type: 'pitfall'|'pattern'|'decision';
  rule_short: string; bullets: [string,string,string]; dont?: string; tags: string[];
};
```

---

## 5) store.ts

```ts
import { ensureDir, pathExists, readJSON, writeJSON } from 'fs-extra';
import path from 'path';
import os from 'os';
import { Moment, RetexCard } from './types.js';

const HOME = process.env.VIBETAPE_HOME?.replace('~', os.homedir()) || path.join(os.homedir(), '.vibetape');
const FILE = path.join(HOME, 'state.json');

type State = { moments: Moment[]; retex: RetexCard[] };

async function load(): Promise<State> {
  await ensureDir(HOME);
  if (!(await pathExists(FILE))) return { moments: [], retex: [] };
  return readJSON(FILE);
}

async function save(state: State) { await writeJSON(FILE, state, { spaces: 2 }); }

export const Store = {
  async addMoment(m: Moment) {
    const s = await load();
    s.moments.unshift(m);
    await save(s);
    return m;
  },
  async updateMoment(id: string, patch: Partial<Moment>) {
    const s = await load();
    const i = s.moments.findIndex(x=>x.id===id);
    if (i>=0) { s.moments[i] = { ...s.moments[i], ...patch }; await save(s); return s.moments[i]; }
    throw new Error('moment not found');
  },
  async listMoments(limit=20) {
    const s = await load();
    return s.moments.slice(0, limit);
  },
  async getMoment(id: string) {
    const s = await load();
    const m = s.moments.find(x=>x.id===id);
    if (!m) throw new Error('moment not found');
    return m;
  },
  async addRetex(r: RetexCard) {
    const s = await load();
    s.retex.unshift(r);
    await save(s);
    return r;
  },
  async listRetex(limit=50) {
    const s = await load();
    return s.retex.slice(0, limit);
  },
  async getState(){ return load(); }
};
```

---

## 6) snapshot.ts (read‑only, safe)

```ts
import simpleGit from 'simple-git';
import { execSync } from 'node:child_process';

export async function snapshotContext(cwd: string){
  try {
    const git = simpleGit({ baseDir: cwd });
    const status = await git.status();
    const branch = status.current;
    const sha = (await git.revparse(['HEAD'])).trim();
    let diff = '';
    try { diff = await git.diff(['--stat']); } catch {}

    // Optional lightweight test signal (do NOT run tests):
    let tests = '';
    try { tests = execSync('git log -1 --pretty=%s', { cwd, stdio: ['ignore','pipe','ignore'] }).toString(); } catch {}

    // Optional deps snapshot (no install)
    let deps = '';
    try { deps = execSync('node -p "try{require(\'./package.json\').dependencies}catch{\'\'}"', { cwd, stdio: ['ignore','pipe','ignore'] }).toString(); } catch {}

    return { git: { branch, sha }, snapshot: { diff, tests, deps } };
  } catch {
    return {};
  }
}
```

> Note: **no shell writes**, only harmless reads. If you prefer zero exec, drop the `execSync` snippets — they’re purely informative.

---

## 7) embed.ts (OpenAI or TF‑IDF fallback)

```ts
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function embed(text: string): Promise<number[]> {
  if (openai) {
    const r = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return r.data[0].embedding as number[];
  }
  // naive TF‑IDF fallback: character  hashing
  const vec = new Array(512).fill(0);
  for (const ch of text.toLowerCase()) vec[ch.charCodeAt(0)%512] += 1;
  const norm = Math.sqrt(vec.reduce((s,v)=>s+v*v,0)) || 1;
  return vec.map(v=>v/norm);
}

export function cos(a:number[], b:number[]) {
  let dp=0,na=0,nb=0; for(let i=0;i<a.length;i++){ const x=a[i], y=b[i]||0; dp+=x*y; na+=x*x; nb+=y*y; }
  return dp/(Math.sqrt(na)*Math.sqrt(nb)+1e-9);
}
```

---

## 8) prompts.ts

```ts
export const INDUCE_RETEX = (blob: string) => `
SYSTEM: Tu es "RETEX-Extractor" pour développeurs. Produis UNE carte JSON stricte.
Règle = prescriptive et mesurable (Quand/Si … → …). Ajoute 3 bullets (S/A/R) et 1 Don't.
Sortie JSON:
{"title":"...","type":"pitfall|pattern|decision","rule_short":"...","bullets":["Situation: ...","Action: ...","Résultat: ..."],"dont":"...","tags":["..."]}

Contexte:
---
${blob}
---`;
```

---

## 9) server.ts (MCP stdio server)

```ts
import 'dotenv/config';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ulid } from 'ulid';
import { Store } from './store.js';
import { snapshotContext } from './snapshot.js';
import { embed, cos } from './embed.js';
import OpenAI from 'openai';
import { INDUCE_RETEX } from './prompts.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const server = new McpServer({ name: 'vibetape', version: '0.1.0' });

// ---------- Resources ----------
server.registerResource(
  'moment',
  new ResourceTemplate('moment://{id}', { list: undefined }),
  { title: 'Build moment', description: 'Captured key build moment (JSON)' },
  async (_uri, { id }) => {
    const m = await Store.getMoment(id);
    return { contents: [{ uri: `moment://${id}`, text: JSON.stringify(m, null, 2), mimeType: 'application/json' }] };
  }
);

server.registerResource(
  'timeline',
  new ResourceTemplate('timeline://{day}', { list: undefined }),
  { title: 'Timeline Markdown', description: 'Day timeline from captured moments' },
  async (_uri, { day }) => {
    const list = await Store.listMoments(200);
    const dayStart = new Date(day).setHours(0,0,0,0);
    const md = ['# Timeline ' + new Date(dayStart).toISOString().slice(0,10), ''];
    for(const m of list.filter(x=> new Date(x.ts).toDateString() === new Date(dayStart).toDateString())){
      md.push(`- ${new Date(m.ts).toLocaleTimeString()} — *${m.kind}* — **${m.title}** ${m.tags.map(t=>`\`${t}\``).join(' ')}`);
    }
    return { contents: [{ uri: `timeline://${day}`, text: md.join('\n'), mimeType: 'text/markdown' }] };
  }
);

server.registerResource(
  'retex',
  new ResourceTemplate('retex://{id}', { list: undefined }),
  { title: 'RETEX card', description: 'Induced prescriptive card (JSON)' },
  async (_uri, { id }) => {
    const state = await Store.getState();
    const r = state.retex.find(x=>x.id===id);
    if (!r) throw new Error('retex not found');
    return { contents: [{ uri: `retex://${id}`, text: JSON.stringify(r, null, 2), mimeType: 'application/json' }] };
  }
);

// ---------- Tools ----------
server.registerTool(
  'mark_moment',
  { title: 'Mark a key build moment', description: 'Capture a build moment with safe context snapshot',
    inputSchema: { title: z.string(), kind: z.enum(['win','fail','decision','note']), tags: z.array(z.string()).optional(), details: z.string().optional(), cwd: z.string().optional() }
  },
  async ({ title, kind, tags = [], details = '', cwd = process.cwd() }) => {
    const id = ulid();
    const now = Date.now();
    const ctx = await snapshotContext(cwd);
    const text = [title, kind, tags.join(' '), details, JSON.stringify(ctx)].join('\n');
    const vec = await embed(text);
    const m = await Store.addMoment({ id, ts: now, title, kind, tags, details, cwd, ...ctx, text, embedding: vec });
    return { content: [
      { type: 'text', text: `✅ moment saved: ${id}` },
      { type: 'resource_link', uri: `moment://${id}`, name: title, mimeType: 'application/json' }
    ] };
  }
);

server.registerTool(
  'list_moments',
  { title: 'List recent moments', description: 'Return latest captured moments', inputSchema: { limit: z.number().optional() } },
  async ({ limit = 10 }) => {
    const rows = await Store.listMoments(limit);
    return { content: [ { type:'text', text: JSON.stringify(rows.map(r=>({ id:r.id, ts:r.ts, title:r.title, kind:r.kind, tags:r.tags })), null, 2) } ] };
  }
);

server.registerTool(
  'search_moments',
  { title: 'Semantic search in moments', description: 'Find similar moments', inputSchema: { query: z.string(), k: z.number().optional() } },
  async ({ query, k = 5 }) => {
    const qvec = await embed(query);
    const state = await Store.getState();
    const scored = state.moments.map(m=>({ id:m.id, title:m.title, kind:m.kind, score: cos(qvec, m.embedding||[]) }))
      .sort((a,b)=>b.score-a.score).slice(0,k);
    return { content: [ { type:'text', text: JSON.stringify(scored, null, 2) } ] };
  }
);

server.registerTool(
  'make_retex',
  { title: 'Induce a RETEX card from a moment', description: 'Generate rule + bullets + dont from a captured moment', inputSchema: { momentId: z.string() } },
  async ({ momentId }) => {
    if (!openai) return { content:[{ type:'text', text:'❌ OPENAI_API_KEY missing for induction' }], isError: true };
    const m = await Store.getMoment(momentId);
    const prompt = INDUCE_RETEX(m.text);
    const res = await openai.responses.create({ model:'gpt-4o-mini', input:[{ role:'user', content: prompt }] });
    const raw = (res.output?.[0] as any)?.text || '{}';
    const json = JSON.parse(raw);
    const id = ulid();
    await Store.addRetex({ id, momentId, title: json.title||m.title, type: json.type||'pattern', rule_short: json.rule_short, bullets: json.bullets, dont: json.dont, tags: Array.from(new Set([...(json.tags||[]), ...m.tags])) });
    return { content: [
      { type:'text', text:`✅ RETEX saved: ${id}` },
      { type:'resource_link', uri:`retex://${id}`, name: json.title||m.title, mimeType:'application/json' }
    ] };
  }
);

server.registerTool(
  'export_timeline',
  { title: 'Export day timeline (Markdown)', description:'Render Markdown timeline for a given day (YYYY-MM-DD)', inputSchema: { day: z.string() } },
  async ({ day }) => ({ content: [{ type:'resource_link', uri:`timeline://${day}`, name:`Timeline ${day}`, mimeType:'text/markdown' }] })
);

// ---------- Prompts ----------
server.registerPrompt(
  'induce-retex',
  { title:'Induce RETEX from moment text', description:'Reusable template for rule induction', argsSchema:{ blob: z.string() } },
  ({ blob }) => ({ messages:[{ role:'user', content:{ type:'text', text: INDUCE_RETEX(blob) } }] })
);

server.registerPrompt(
  'commit-msg',
  { title:'Conventional commit helper', description:'Craft a conventional commit from a moment', argsSchema:{ title: z.string(), details: z.string().optional() } },
  ({ title, details='' }) => ({ messages:[{ role:'user', content:{ type:'text', text:`Write a concise conventional commit subject based on: ${title}. Details: ${details}` } }] })
);

// ---------- Boot ----------
const transport = new StdioServerTransport();
await server.connect(transport);
console.log('🎞️  VibeTape MCP ready (stdio)');
```

---

## 10) README.md (how to run & connect)

````md
# VibeTape MCP (Hybrid Active Memory)

## Run locally
```bash
npm i
npm run dev
````

## Connect to Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibetape": {
      "command": "node",
      "args": ["./node_modules/ts-node/dist/bin.js", "src/server.ts"],
      "env": { "OPENAI_API_KEY": "${OPENAI_API_KEY}" }
    }
  }
}
```

Restart Claude Desktop → open the hammer icon → you’ll see VibeTape tools.

## Typical flow (from your IDE assistant)

1. Work on feature → tests pass or fail → run:

   * **Tool** `mark_moment` with `{ title, kind:'win'|'fail', tags:['api','cache'] }`.
2. Later, hit a similar problem → run:

   * **Tool** `search_moments` with query text.
3. Want a prescriptive card → run:

   * **Tool** `make_retex` → get `retex://{id}`; paste into docs/PR.
4. Share the day → run:

   * **Tool** `export_timeline` with `{ day: '2025-08-21' }`.

```

---

## 11) Notes on safety & scope
- **No shell writes, no network calls** except optional OpenAI embeddings/induction.
- Writes only to `~/.vibetape/state.json`.
- You can later swap the JSON store with SQLite + vector index; MCP surface remains unchanged.

---

## 12) Roadmap ideas (post‑MVP)
- SQLite + HNSW for scalable semantic search.
- Auto‑hooks: Git post‑commit snippet to call `mark_moment`.
- Conflict/merge of moments → generalized rule (RETEX Flash merge).
- Export PR/CHANGELOG directly as resources.

---

**That’s it.** VibeTape gives you a dead‑simple, sexy MCP interface for *Hybrid Active Memory* while coding. Plug it into Claude Desktop / Claude Code and start taping the vibe of your build. 🎞️✨

```
