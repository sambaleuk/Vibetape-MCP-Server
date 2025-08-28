import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ulid } from 'ulid';
import { Store } from './store.js';
import { snapshotContext } from './snapshot.js';
import { embed, cos } from './embed.js';
import OpenAI from 'openai';
import { INDUCE_RETEX } from './prompts.js';
import type { RelationKind } from './types.js';
import { generateContextHandoff } from './handoff.js';
import { suggestTransitionCard } from './suggest.js';
import { sweepNoise } from './denoise.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const server = new Server({ name: 'vibetape', version: '0.3.0' }, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  }
});

// ---------- Resources ----------
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'moment://{id}',
      name: 'Build moment',
      description: 'Captured key build moment (JSON)',
      mimeType: 'application/json'
    },
    {
      uri: 'timeline://{day}',
      name: 'Timeline Markdown',
      description: 'Day timeline from captured moments',
      mimeType: 'text/markdown'
    },
    {
      uri: 'retex://{id}',
      name: 'RETEX card',
      description: 'Induced prescriptive card (JSON)',
      mimeType: 'application/json'
    },
    {
      uri: 'graph://{id}',
      name: 'Moment subgraph',
      description: 'Relations for a moment',
      mimeType: 'application/json'
    },
    {
      uri: 'handoff://{id}',
      name: 'Context Handoff',
      description: 'Compact transition card for session continuity',
      mimeType: 'text/markdown'
    },
    {
      uri: 'export://json?{q}',
      name: 'JSON export',
      description: 'Filtered JSON export',
      mimeType: 'application/json'
    },
    {
      uri: 'export://md?{q}',
      name: 'Markdown export',
      description: 'Markdown dump of moments',
      mimeType: 'text/markdown'
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri.startsWith('moment://')) {
    const id = uri.replace('moment://', '');
    const m = await Store.getMoment(id);
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(m, null, 2),
        mimeType: 'application/json'
      }]
    };
  }
  
  if (uri.startsWith('timeline://')) {
    const day = uri.replace('timeline://', '');
    const list = await Store.listMoments(200);
    const dayStr = new Date(day).toDateString();
    const md = ['# Timeline ' + new Date(day).toISOString().slice(0, 10), ''];
    
    for (const m of list.filter(x => new Date(x.ts).toDateString() === dayStr)) {
      const relInfo = (m.relations?.length ? ` ↔︎ rel:${m.relations.length}` : '');
      md.push(`- ${new Date(m.ts).toLocaleTimeString()} — *${m.kind}* — **${m.title}** ${m.tags.map(t => `\`${t}\``).join(' ')}${relInfo}`);
    }
    
    return {
      contents: [{
        uri: uri,
        text: md.join('\n'),
        mimeType: 'text/markdown'
      }]
    };
  }
  
  if (uri.startsWith('retex://')) {
    const id = uri.replace('retex://', '');
    const state = await Store.getState();
    const r = state.retex.find(x => x.id === id);
    if (!r) throw new Error('retex not found');
    
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(r, null, 2),
        mimeType: 'application/json'
      }]
    };
  }

  if (uri.startsWith('handoff://')) {
    const id = uri.replace('handoff://', '');
    const handoff = await Store.getHandoff(id);
    
    // Generate the markdown content from the handoff record
    const content = [
      '# Transition – VibeTape',
      '',
      'ÉTAT ACTUEL',
      handoff.current_state || '- (à préciser)',
      '',
      'STACK',
      handoff.stack || '- (à préciser)',
      '',
      'DÉCISIONS CLÉS',
      ...handoff.decisions.map(d => `- ${d}`),
      '',
      'PROBLÈMES RÉSOLUS',
      ...handoff.solved.map(s => `- ${s}`),
      '',
      'NEXT STEPS (48h)',
      ...handoff.next_steps.map(n => `- ${n}`),
      '',
      'Refs: ' + handoff.refs.join(' ')
    ].join('\n');
    
    return {
      contents: [{
        uri: uri,
        text: content,
        mimeType: 'text/markdown'
      }]
    };
  }

  if (uri.startsWith('graph://')) {
    const id = uri.replace('graph://', '');
    const center = await Store.getMoment(id);
    const state = await Store.getState();
    const edges = (center.relations || []).map(r => ({ from: id, to: r.to, kind: r.kind, note: r.note }));
    const nodes = [center, ...state.moments.filter(m => edges.some(e => e.to === m.id))].map(m => ({ id: m.id, title: m.title, kind: m.kind, ts: m.ts, tags: m.tags }));
    
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify({ nodes, edges }, null, 2),
        mimeType: 'application/json'
      }]
    };
  }

  if (uri.startsWith('export://json?')) {
    const q = uri.replace('export://json?', '');
    const state = await Store.getState();
    
    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(state, null, 2),
        mimeType: 'application/json'
      }]
    };
  }

  if (uri.startsWith('export://md?')) {
    const q = uri.replace('export://md?', '');
    const state = await Store.getState();
    const lines = ['# VibeTape Export', ''];
    
    for (const m of state.moments) {
      lines.push(`## ${m.title} (${m.kind}) — ${new Date(m.ts).toISOString()}`);
      lines.push(m.tags.map(t => `\`${t}\``).join(' '));
      if (m.details) lines.push('\n' + m.details);
      if (m.relations?.length) lines.push(`Relations: ${m.relations.map(r => `${r.kind}->${r.to}`).join(', ')}`);
      if (m.comments?.length) lines.push(`Comments: ${m.comments.length}`);
      lines.push('');
    }
    
    return {
      contents: [{
        uri: uri,
        text: lines.join('\n'),
        mimeType: 'text/markdown'
      }]
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// ---------- Tools ----------
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'mark_moment',
      description: 'Capture a build moment with safe context snapshot',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the moment' },
          kind: { type: 'string', enum: ['win', 'fail', 'decision', 'note'], description: 'Type of moment' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
          details: { type: 'string', description: 'Additional details' },
          cwd: { type: 'string', description: 'Working directory' }
        },
        required: ['title', 'kind']
      }
    },
    {
      name: 'link_moments',
      description: 'Create a relation between moments',
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Source moment ID' },
          to: { type: 'string', description: 'Target moment ID' },
          kind: { type: 'string', enum: ['causes', 'solves', 'relates'], description: 'Relation type' },
          note: { type: 'string', description: 'Optional note about the relation' }
        },
        required: ['from', 'to', 'kind']
      }
    },
    {
      name: 'comment_moment',
      description: 'Append a comment to a moment',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Moment ID to comment on' },
          author: { type: 'string', description: 'Comment author' },
          text: { type: 'string', description: 'Comment text' }
        },
        required: ['id', 'text']
      }
    },
    {
      name: 'list_moments',
      description: 'Return latest captured moments',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of moments to return' }
        }
      }
    },
    {
      name: 'search_moments',
      description: 'Find similar moments using semantic search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          k: { type: 'number', description: 'Number of results to return' }
        },
        required: ['query']
      }
    },
    {
      name: 'search_moments_advanced',
      description: 'Combine semantic, filters and regex search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Semantic search query' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Required tags' },
          kinds: { type: 'array', items: { type: 'string', enum: ['win', 'fail', 'decision', 'note'] }, description: 'Moment kinds' },
          from: { type: 'string', description: 'Start date (ISO string)' },
          to: { type: 'string', description: 'End date (ISO string)' },
          regex: { type: 'string', description: 'Regex pattern for text search' },
          k: { type: 'number', description: 'Max results' }
        }
      }
    },
    {
      name: 'stats_overview',
      description: 'Basic counts and trends',
      inputSchema: {
        type: 'object',
        properties: {
          window: { type: 'string', enum: ['7d', '30d', 'all'], description: 'Time window' }
        }
      }
    },
    {
      name: 'recurrent_patterns',
      description: 'Group similar titles to find patterns',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'make_retex',
      description: 'Generate rule + bullets + dont from a captured moment',
      inputSchema: {
        type: 'object',
        properties: {
          momentId: { type: 'string', description: 'ID of the moment to create RETEX from' }
        },
        required: ['momentId']
      }
    },
    {
      name: 'export_timeline',
      description: 'Render Markdown timeline for a given day (YYYY-MM-DD)',
      inputSchema: {
        type: 'object',
        properties: {
          day: { type: 'string', description: 'Day in YYYY-MM-DD format' }
        },
        required: ['day']
      }
    },
    {
      name: 'export_json',
      description: 'Return whole state as JSON resource',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Query parameter' }
        }
      }
    },
    {
      name: 'export_md',
      description: 'Return Markdown dump resource',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Query parameter' }
        }
      }
    },
    {
      name: 'generate_context_handoff',
      description: 'Create a compact transition card (state/stack/decisions/solved/next) under a token budget',
      inputSchema: {
        type: 'object',
        properties: {
          budgetTokens: { type: 'number', minimum: 120, maximum: 2000, description: 'Token budget for the handoff (default: 350)' },
          includeCurrentState: { type: 'boolean', description: 'Include current state section (default: true)' },
          includeKeyDecisions: { type: 'boolean', description: 'Include key decisions section (default: true)' },
          includeNextSteps: { type: 'boolean', description: 'Include next steps section (default: true)' },
          includeSolved: { type: 'boolean', description: 'Include problems solved section (default: true)' },
          sessionId: { type: 'string', description: 'Optional session identifier' }
        }
      }
    },
    {
      name: 'suggest_transition_card',
      description: 'Suggest generating a transition card when context is near capacity',
      inputSchema: {
        type: 'object',
        properties: {
          remainingTokens: { type: 'number', minimum: 0, description: 'Number of tokens remaining in context' },
          sessionId: { type: 'string', description: 'Optional session identifier' },
          threshold: { type: 'number', minimum: 100, maximum: 5000, description: 'Token threshold for suggestion (default: 1000)' }
        },
        required: ['remainingTokens']
      }
    },
    {
      name: 'sweep_noise',
      description: 'Denoise auto-marked moments: trivial, duplicates, cooldown; updates signal_score',
      inputSchema: {
        type: 'object',
        properties: {
          windowDays: { type: 'number', minimum: 1, maximum: 90, description: 'Days to look back for denoising (default: 7)' },
          similarityThreshold: { type: 'number', minimum: 0, maximum: 1, description: 'Similarity threshold for duplicates (default: 0.8)' },
          cooldownMinutes: { type: 'number', minimum: 1, maximum: 1440, description: 'Cooldown period in minutes (default: 10)' }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'mark_moment': {
      const { title, kind, tags = [], details = '', cwd = process.cwd() } = args as any;
      const id = ulid();
      const now = Date.now();
      const ctx = await snapshotContext(cwd);
      const text = [title, kind, tags.join(' '), details, JSON.stringify(ctx)].join('\n');
      const vec = await embed(text);
      const m = await Store.addMoment({ 
        id, 
        ts: now, 
        title, 
        kind, 
        tags, 
        details, 
        cwd, 
        git: ctx.git ? { 
          branch: ctx.git.branch || undefined, 
          sha: ctx.git.sha 
        } : undefined,
        snapshot: ctx.snapshot,
        text, 
        embedding: vec 
      });
      
      return {
        content: [
          { type: 'text', text: `✅ moment saved: ${id}` },
          { type: 'resource', resource: { uri: `moment://${id}`, text: title } }
        ]
      };
    }

    case 'link_moments': {
      const { from, to, kind, note } = args as any;
      const updated = await Store.addRelation(from, { to, kind: kind as RelationKind, note });
      return {
        content: [
          { type: 'text', text: `🔗 linked: ${from} ${kind} ${to}` },
          { type: 'resource', resource: { uri: `graph://${from}`, text: 'graph' } }
        ]
      };
    }

    case 'comment_moment': {
      const { id, author, text } = args as any;
      const r = await Store.addComment(id, { ts: Date.now(), author, text });
      return {
        content: [
          { type: 'text', text: `💬 comment added (${r.comments?.length || 1} total)` },
          { type: 'resource', resource: { uri: `moment://${id}`, text: r.title } }
        ]
      };
    }
    
    case 'list_moments': {
      const { limit = 10 } = args as any;
      const rows = await Store.listMoments(limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(rows.map(r => ({
            id: r.id,
            ts: r.ts,
            title: r.title,
            kind: r.kind,
            tags: r.tags
          })), null, 2)
        }]
      };
    }
    
    case 'search_moments': {
      const { query, k = 5 } = args as any;
      const qvec = await embed(query);
      const state = await Store.getState();
      const scored = state.moments
        .map(m => ({
          id: m.id,
          title: m.title,
          kind: m.kind,
          score: cos(qvec, m.embedding || [])
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(scored, null, 2)
        }]
      };
    }

    case 'search_moments_advanced': {
      const { query, tags, kinds, from, to, regex, k = 50 } = args as any;
      const state = await Store.getState();
      let cand = state.moments;
      
      if (tags?.length) cand = cand.filter(m => tags.every((t: string) => m.tags.includes(t)));
      if (kinds?.length) cand = cand.filter(m => kinds.includes(m.kind as any));
      if (from) cand = cand.filter(m => m.ts >= Date.parse(from));
      if (to) cand = cand.filter(m => m.ts <= Date.parse(to));
      if (regex) {
        const re = new RegExp(regex, 'i');
        cand = cand.filter(m => re.test(m.text));
      }
      
      if (query) {
        const qv = await embed(query);
        cand = cand.map(m => ({ ...m, score: cos(qv, m.embedding || []) }))
                   .sort((a, b) => (b as any).score - (a as any).score)
                   .slice(0, k) as any;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(cand.map(({ id, title, kind, tags, ts, score }: any) => ({ id, title, kind, tags, ts, score })), null, 2)
        }]
      };
    }

    case 'stats_overview': {
      const { window = '30d' } = args as any;
      const state = await Store.getState();
      const now = Date.now();
      const horizon = window === '7d' ? 7 : window === '30d' ? 30 : 36500;
      const cut = now - horizon * 86400000;
      const rows = state.moments.filter(m => m.ts >= cut);
      
      const byKind = rows.reduce((acc: any, m) => { acc[m.kind] = (acc[m.kind] || 0) + 1; return acc; }, {});
      const tagCount: Record<string, number> = {};
      for (const m of rows) for (const t of m.tags) tagCount[t] = (tagCount[t] || 0) + 1;
      const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const solves = rows.reduce((n, m) => n + (m.relations?.filter(r => r.kind === 'solves').length || 0), 0);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ window, total: rows.length, byKind, solves, topTags }, null, 2)
        }]
      };
    }

    case 'recurrent_patterns': {
      const state = await Store.getState();
      // naive: group by normalized title prefix
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
      const map = new Map<string, any[]>();
      
      for (const m of state.moments) {
        const k = norm(m.title);
        const arr = map.get(k) || [];
        arr.push({ id: m.id, title: m.title, ts: m.ts, kind: m.kind, tags: m.tags });
        map.set(k, arr);
      }
      
      const clusters = Array.from(map.entries())
        .filter(([, arr]) => arr.length >= 2)
        .map(([k, arr]) => ({ key: k, count: arr.length, items: arr.slice(0, 10) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(clusters, null, 2)
        }]
      };
    }
    
    case 'make_retex': {
      const { momentId } = args as any;
      if (!openai) {
        return {
          content: [{ type: 'text', text: '❌ OPENAI_API_KEY missing for induction' }],
          isError: true
        };
      }
      
      const m = await Store.getMoment(momentId);
      const prompt = INDUCE_RETEX(m.text);
      
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        });
        
        let raw = res.choices[0]?.message?.content || '{}';
        // Nettoyer les blocs markdown si présents
        raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const json = JSON.parse(raw);
        const id = ulid();
        
        await Store.addRetex({
          id,
          momentId,
          title: json.title || m.title,
          type: json.type || 'pattern',
          rule_short: json.rule_short || '',
          bullets: json.bullets || ['', '', ''],
          dont: json.dont,
          tags: Array.from(new Set([...(json.tags || []), ...m.tags]))
        });
        
        return {
          content: [
            { type: 'text', text: `✅ RETEX saved: ${id}` },
            { type: 'resource', resource: { uri: `retex://${id}`, text: json.title || m.title } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to generate RETEX: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
    
    case 'export_timeline': {
      const { day } = args as any;
      return {
        content: [{
          type: 'resource',
          resource: { uri: `timeline://${day}`, text: `Timeline ${day}` }
        }]
      };
    }

    case 'export_json': {
      const { q = '' } = args as any;
      return {
        content: [{
          type: 'resource',
          resource: { uri: `export://json?${encodeURIComponent(q)}`, text: 'export.json' }
        }]
      };
    }

    case 'export_md': {
      const { q = '' } = args as any;
      return {
        content: [{
          type: 'resource',
          resource: { uri: `export://md?${encodeURIComponent(q)}`, text: 'export.md' }
        }]
      };
    }

    case 'generate_context_handoff': {
      try {
        const result = await generateContextHandoff(args as any);
        return {
          content: [
            { type: 'text', text: `✅ Context handoff generated (${result.record.budget_tokens} tokens)` },
            { type: 'resource', resource: { uri: `handoff://${result.id}`, text: 'Transition Card' } },
            { type: 'text', text: result.text }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to generate handoff: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'suggest_transition_card': {
      try {
        const result = await suggestTransitionCard(args as any);
        if (!result.suggested) {
          return { content: [{ type: 'text', text: '✅ Context healthy, no handoff needed' }] };
        }
        
        const content: any[] = [
          { type: 'text', text: result.message || 'Context handoff suggested' }
        ];
        
        if (result.handoffId) {
          content.push({ type: 'resource', resource: { uri: `handoff://${result.handoffId}`, text: 'Transition Card' } });
        }
        
        if (result.preview) {
          content.push({ type: 'text', text: `Preview:\n${result.preview}` });
        }
        
        return { content };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to suggest handoff: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'sweep_noise': {
      try {
        const result = await sweepNoise(args as any);
        return {
          content: [{
            type: 'text',
            text: `🧹 Noise sweep completed:
- Processed: ${result.processed} moments
- Marked as noise: ${result.markedAsNoise}
- Merged duplicates: ${result.merged}
- Total updates: ${result.updated}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to sweep noise: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ---------- Prompts ----------
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'induce-retex',
      description: 'Induce RETEX from moment text',
      arguments: [{
        name: 'blob',
        description: 'Text blob to analyze',
        required: true
      }]
    },
    {
      name: 'commit-msg',
      description: 'Conventional commit helper',
      arguments: [
        {
          name: 'title',
          description: 'Commit title',
          required: true
        },
        {
          name: 'details',
          description: 'Additional details',
          required: false
        }
      ]
    }
  ]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'induce-retex': {
      const { blob } = args as any;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: INDUCE_RETEX(blob)
          }
        }]
      };
    }
    
    case 'commit-msg': {
      const { title, details = '' } = args as any;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Write a concise conventional commit subject based on: ${title}. Details: ${details}`
          }
        }]
      };
    }
    
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ---------- Boot ----------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('🎞️  VibeTape MCP v0.2.1 ready (stdio)');
