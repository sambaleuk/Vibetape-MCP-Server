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
import type { RelationKind, ActorType, TaskStatus, TaskOutcome, AgentHandoffPayload } from './types.js';
import { generateContextHandoff } from './handoff.js';
import { suggestTransitionCard } from './suggest.js';
import { sweepNoise } from './denoise.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const server = new Server({ name: 'vibetape', version: '0.4.0' }, {
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
    },
    // V0.4 AGENTIC RESOURCES
    {
      uri: 'actor://{id}',
      name: 'Actor profile',
      description: 'Actor with stats (JSON)',
      mimeType: 'application/json'
    },
    {
      uri: 'task://{id}',
      name: 'Task details',
      description: 'Task with related moments (JSON)',
      mimeType: 'application/json'
    },
    {
      uri: 'task://{id}/context',
      name: 'Task context',
      description: 'Optimized context for task injection (Markdown)',
      mimeType: 'text/markdown'
    },
    {
      uri: 'discovery://capabilities',
      name: 'VibeTape capabilities',
      description: 'List of VibeTape features for agent discovery (JSON)',
      mimeType: 'application/json'
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
  
  // V0.4 AGENTIC RESOURCES
  if (uri.startsWith('actor://')) {
    const id = uri.replace('actor://', '');
    try {
      const actor = await Store.getActor(id);
      const stats = await Store.getActorStats(id);
      return {
        contents: [{
          uri: uri,
          text: JSON.stringify({ ...actor, stats }, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      throw new Error(`Actor not found: ${id}`);
    }
  }

  if (uri.startsWith('task://') && uri.includes('/context')) {
    const id = uri.replace('task://', '').replace('/context', '');
    try {
      const task = await Store.getTask(id);
      const moments = await Store.getTaskMoments(id);

      // Generate optimized context markdown
      const lines = [
        `# Task Context: ${task.title}`,
        '',
        `**Status:** ${task.status}`,
        `**Priority:** ${task.priority || 'medium'}`,
        task.description ? `\n${task.description}` : '',
        '',
        '## Key Moments',
        ''
      ];

      // Sort moments by signal_score and recency
      const sortedMoments = moments
        .filter(m => !m.is_noise)
        .sort((a, b) => {
          const scoreA = (a.signal_score || 0.5) + (a.ts / Date.now());
          const scoreB = (b.signal_score || 0.5) + (b.ts / Date.now());
          return scoreB - scoreA;
        })
        .slice(0, 10);

      for (const m of sortedMoments) {
        const icon = m.kind === 'win' ? '✅' : m.kind === 'fail' ? '❌' : m.kind === 'decision' ? '🎯' : '📝';
        lines.push(`- ${icon} **${m.title}** (${m.kind}) ${m.tags.map(t => `\`${t}\``).join(' ')}`);
      }

      return {
        contents: [{
          uri: uri,
          text: lines.join('\n'),
          mimeType: 'text/markdown'
        }]
      };
    } catch (error) {
      throw new Error(`Task not found: ${id}`);
    }
  }

  if (uri.startsWith('task://')) {
    const id = uri.replace('task://', '');
    try {
      const task = await Store.getTask(id);
      const moments = await Store.getTaskMoments(id);
      return {
        contents: [{
          uri: uri,
          text: JSON.stringify({ ...task, moments: moments.map(m => ({ id: m.id, title: m.title, kind: m.kind, ts: m.ts })) }, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      throw new Error(`Task not found: ${id}`);
    }
  }

  if (uri === 'discovery://capabilities') {
    const capabilities = {
      name: 'VibeTape',
      version: '0.4.0',
      description: 'Agentic memory for development teams - captures moments, generates RETEX, enables context handoff',
      features: {
        moment_capture: {
          description: 'Capture wins, fails, decisions, and notes with git context',
          tools: ['mark_moment', 'list_moments', 'search_moments', 'search_moments_advanced']
        },
        relations: {
          description: 'Link moments with causal relationships',
          tools: ['link_moments', 'comment_moment'],
          relation_types: ['causes', 'solves', 'relates', 'supersedes', 'depends_on']
        },
        retex: {
          description: 'Generate prescriptive RETEX cards from moments',
          tools: ['make_retex', 'get_retex_for_task']
        },
        context_handoff: {
          description: 'Create compact transition cards for session continuity',
          tools: ['generate_context_handoff', 'suggest_transition_card', 'create_handoff_for_agent']
        },
        actors: {
          description: 'Track agents and humans with success rate analytics',
          tools: ['register_actor', 'get_actor_stats', 'list_actors']
        },
        tasks: {
          description: 'Manage tasks with agent assignment and handoff',
          tools: ['create_task', 'update_task', 'list_tasks', 'assign_task']
        },
        analytics: {
          description: 'Pattern detection and statistics',
          tools: ['stats_overview', 'recurrent_patterns']
        },
        denoising: {
          description: 'Intelligent noise filtering and duplicate merging',
          tools: ['sweep_noise']
        }
      },
      orchestrator_compatible: ['LangGraph', 'CrewAI', 'AutoGen', 'OpenAI Agents SDK'],
      handoff_format: 'LangGraph Command compatible'
    };

    return {
      contents: [{
        uri: uri,
        text: JSON.stringify(capabilities, null, 2),
        mimeType: 'application/json'
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
          cwd: { type: 'string', description: 'Working directory' },
          actor_id: { type: 'string', description: 'Actor ID who creates this moment (v0.4)' },
          task_id: { type: 'string', description: 'Associated task ID (v0.4)' }
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
    },
    // ============================================
    // V0.4 AGENTIC TOOLS
    // ============================================
    {
      name: 'register_actor',
      description: 'Register a new agent or human actor for traceability',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique actor ID (e.g., "agent_code_reviewer", "user_sam")' },
          type: { type: 'string', enum: ['human', 'agent'], description: 'Actor type' },
          name: { type: 'string', description: 'Display name' },
          description: { type: 'string', description: 'What this actor does' },
          capabilities: { type: 'array', items: { type: 'string' }, description: 'List of capabilities (e.g., ["review", "test", "deploy"])' }
        },
        required: ['id', 'type', 'name']
      }
    },
    {
      name: 'get_actor_stats',
      description: 'Get statistics for an actor (success rate, moment counts, top tags)',
      inputSchema: {
        type: 'object',
        properties: {
          actor_id: { type: 'string', description: 'Actor ID' },
          window: { type: 'string', enum: ['7d', '30d', 'all'], description: 'Time window (default: all)' }
        },
        required: ['actor_id']
      }
    },
    {
      name: 'list_actors',
      description: 'List all registered actors',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'create_task',
      description: 'Create a new task for tracking and agent assignment',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Detailed description' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
          created_by: { type: 'string', description: 'Actor ID who creates the task' },
          assigned_to: { type: 'string', description: 'Actor ID to assign (optional)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level' },
          parent_task: { type: 'string', description: 'Parent task ID for hierarchy' }
        },
        required: ['title', 'created_by']
      }
    },
    {
      name: 'update_task',
      description: 'Update a task status, assignment, or outcome',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'handed_off', 'blocked'], description: 'New status' },
          assigned_to: { type: 'string', description: 'New assignee actor ID' },
          outcome: { type: 'string', enum: ['success', 'partial', 'failure'], description: 'Task outcome (when completing)' },
          outcome_summary: { type: 'string', description: 'Summary of what was achieved' }
        },
        required: ['task_id']
      }
    },
    {
      name: 'list_tasks',
      description: 'List tasks with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'handed_off', 'blocked'], description: 'Filter by status' },
          assigned_to: { type: 'string', description: 'Filter by assigned actor' },
          created_by: { type: 'string', description: 'Filter by creator' },
          limit: { type: 'number', description: 'Max results (default: 20)' }
        }
      }
    },
    {
      name: 'assign_task',
      description: 'Assign or handoff a task to another actor',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' },
          to_actor: { type: 'string', description: 'Actor ID to assign to' },
          from_actor: { type: 'string', description: 'Current actor (for handoff tracking)' },
          handoff_note: { type: 'string', description: 'Note about the handoff' }
        },
        required: ['task_id', 'to_actor']
      }
    },
    {
      name: 'link_moment_to_task',
      description: 'Associate a moment with a task',
      inputSchema: {
        type: 'object',
        properties: {
          moment_id: { type: 'string', description: 'Moment ID' },
          task_id: { type: 'string', description: 'Task ID' }
        },
        required: ['moment_id', 'task_id']
      }
    },
    {
      name: 'supersede_moment',
      description: 'Mark a moment as superseded by a newer one (temporal tracking)',
      inputSchema: {
        type: 'object',
        properties: {
          old_moment_id: { type: 'string', description: 'Moment being superseded' },
          new_moment_id: { type: 'string', description: 'Moment that supersedes' },
          reason: { type: 'string', description: 'Why this supersedes the old moment' }
        },
        required: ['old_moment_id', 'new_moment_id']
      }
    },
    // ============================================
    // V0.4 SPRINT 2: RETEX & HANDOFF FOR AGENTS
    // ============================================
    {
      name: 'get_retex_for_task',
      description: 'Get relevant RETEX cards for a task based on tag overlap and moment relations',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to find relevant RETEX for' },
          limit: { type: 'number', description: 'Max RETEX to return (default: 5)' },
          include_scores: { type: 'boolean', description: 'Include relevance scores in output' }
        },
        required: ['task_id']
      }
    },
    {
      name: 'create_handoff_for_agent',
      description: 'Create a LangGraph-compatible handoff payload for agent-to-agent transfer',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID being handed off' },
          from_agent: { type: 'string', description: 'Actor ID of source agent' },
          to_agent: { type: 'string', description: 'Actor ID of target agent' },
          budget_tokens: { type: 'number', description: 'Token budget for context (default: 500)' },
          include_retex: { type: 'boolean', description: 'Include relevant RETEX (default: true)' },
          include_failures: { type: 'boolean', description: 'Include recent failures (default: true)' }
        },
        required: ['task_id', 'from_agent', 'to_agent']
      }
    },
    // ============================================
    // V0.4 SPRINT 3: CONTEXT INTELLIGENCE
    // ============================================
    {
      name: 'context_relevance_score',
      description: 'Calculate RankRAG-style relevance score for a moment given a task context',
      inputSchema: {
        type: 'object',
        properties: {
          moment_id: { type: 'string', description: 'Moment to score' },
          task_id: { type: 'string', description: 'Task context for relevance calculation' },
          query: { type: 'string', description: 'Optional semantic query for additional relevance weighting' }
        },
        required: ['moment_id', 'task_id']
      }
    },
    {
      name: 'evaluate_context_window',
      description: 'Evaluate and rank moments for optimal context injection within token budget',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task to build context for' },
          budget_tokens: { type: 'number', description: 'Token budget (default: 2000)' },
          strategy: { type: 'string', enum: ['relevance', 'recency', 'balanced'], description: 'Ranking strategy (default: balanced)' },
          include_retex: { type: 'boolean', description: 'Include RETEX in context (default: true)' },
          exclude_noise: { type: 'boolean', description: 'Exclude noisy moments (default: true)' }
        },
        required: ['task_id']
      }
    },
    {
      name: 'predict_agent_needs',
      description: 'Predict what context an agent will need based on task type and actor capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task to analyze' },
          actor_id: { type: 'string', description: 'Actor who will work on the task' }
        },
        required: ['task_id', 'actor_id']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'mark_moment': {
      const { title, kind, tags = [], details = '', cwd = process.cwd(), actor_id, task_id } = args as any;
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
        embedding: vec,
        // V0.4 agentic fields
        actor_id: actor_id || undefined,
        task_id: task_id || undefined,
        valid_from: now  // Temporal tracking: moment is valid from creation
      });

      // If task_id provided, link moment to task
      if (task_id) {
        try {
          await Store.linkMomentToTask(id, task_id);
        } catch (e) {
          // Task might not exist, that's ok
        }
      }

      const actorInfo = actor_id ? ` by ${actor_id}` : '';
      const taskInfo = task_id ? ` for task ${task_id}` : '';

      return {
        content: [
          { type: 'text', text: `✅ moment saved: ${id}${actorInfo}${taskInfo}` },
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

    // ============================================
    // V0.4 AGENTIC TOOL HANDLERS
    // ============================================

    case 'register_actor': {
      const { id, type, name: actorName, description, capabilities = [] } = args as any;
      try {
        const actor = await Store.addActor({
          id,
          type: type as ActorType,
          name: actorName,
          description,
          capabilities,
          created_at: Date.now()
        });
        return {
          content: [
            { type: 'text', text: `✅ Actor registered: ${id} (${type})` },
            { type: 'resource', resource: { uri: `actor://${id}`, text: actorName } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to register actor: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'get_actor_stats': {
      const { actor_id, window = 'all' } = args as any;
      try {
        const actor = await Store.getActor(actor_id);
        const stats = await Store.getActorStats(actor_id, window);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              actor: { id: actor.id, type: actor.type, name: actor.name },
              window,
              stats
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Actor not found: ${actor_id}` }],
          isError: true
        };
      }
    }

    case 'list_actors': {
      const actors = await Store.listActors();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(actors.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            capabilities: a.capabilities,
            created_at: a.created_at
          })), null, 2)
        }]
      };
    }

    case 'create_task': {
      const { title, description, tags = [], created_by, assigned_to, priority, parent_task } = args as any;
      const id = ulid();
      const now = Date.now();
      try {
        const task = await Store.addTask({
          id,
          title,
          description,
          status: 'pending',
          created_at: now,
          updated_at: now,
          created_by,
          assigned_to,
          tags,
          related_moments: [],
          parent_task,
          priority: priority || 'medium'
        });

        const assignInfo = assigned_to ? ` → assigned to ${assigned_to}` : '';
        return {
          content: [
            { type: 'text', text: `✅ Task created: ${id}${assignInfo}` },
            { type: 'resource', resource: { uri: `task://${id}`, text: title } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to create task: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'update_task': {
      const { task_id, status, assigned_to, outcome, outcome_summary } = args as any;
      try {
        const patch: any = {};
        if (status) patch.status = status;
        if (assigned_to !== undefined) patch.assigned_to = assigned_to;
        if (outcome) patch.outcome = outcome;
        if (outcome_summary) patch.outcome_summary = outcome_summary;
        if (status === 'completed') patch.completed_at = Date.now();

        const task = await Store.updateTask(task_id, patch);
        return {
          content: [
            { type: 'text', text: `✅ Task updated: ${task_id} → ${task.status}` },
            { type: 'resource', resource: { uri: `task://${task_id}`, text: task.title } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to update task: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'list_tasks': {
      const { status, assigned_to, created_by, limit = 20 } = args as any;
      try {
        const tasks = await Store.listTasks({ status, assignedTo: assigned_to, createdBy: created_by, limit });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(tasks.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              assigned_to: t.assigned_to,
              priority: t.priority,
              updated_at: t.updated_at
            })), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to list tasks: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'assign_task': {
      const { task_id, to_actor, from_actor, handoff_note } = args as any;
      try {
        const task = await Store.getTask(task_id);
        const patch: any = {
          assigned_to: to_actor,
          status: 'handed_off' as TaskStatus
        };

        if (from_actor) {
          patch.handed_off_from = from_actor;
        }
        patch.handed_off_to = to_actor;

        const updated = await Store.updateTask(task_id, patch);

        // Create a moment to track the handoff
        const handoffMomentId = ulid();
        await Store.addMoment({
          id: handoffMomentId,
          ts: Date.now(),
          title: `Task handoff: ${task.title}`,
          kind: 'note',
          tags: ['handoff', 'task'],
          details: handoff_note || `Handed off from ${from_actor || 'unknown'} to ${to_actor}`,
          text: `Task ${task_id} handed off to ${to_actor}. ${handoff_note || ''}`,
          actor_id: from_actor,
          task_id: task_id
        });

        return {
          content: [
            { type: 'text', text: `✅ Task ${task_id} assigned to ${to_actor}${from_actor ? ` (from ${from_actor})` : ''}` },
            { type: 'resource', resource: { uri: `task://${task_id}`, text: updated.title } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to assign task: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'link_moment_to_task': {
      const { moment_id, task_id } = args as any;
      try {
        await Store.linkMomentToTask(moment_id, task_id);
        return {
          content: [
            { type: 'text', text: `✅ Moment ${moment_id} linked to task ${task_id}` }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to link moment: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'supersede_moment': {
      const { old_moment_id, new_moment_id, reason } = args as any;
      try {
        await Store.supersedeMoment(old_moment_id, new_moment_id, reason);
        return {
          content: [
            { type: 'text', text: `✅ Moment ${old_moment_id} superseded by ${new_moment_id}` },
            { type: 'resource', resource: { uri: `moment://${new_moment_id}`, text: 'New moment' } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to supersede moment: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    // ============================================
    // V0.4 SPRINT 2: RETEX & HANDOFF FOR AGENTS
    // ============================================

    case 'get_retex_for_task': {
      const { task_id, limit = 5, include_scores = false } = args as any;
      try {
        const task = await Store.getTask(task_id);
        const state = await Store.getState();
        const taskMoments = await Store.getTaskMoments(task_id);

        // Calculate relevance scores for each RETEX
        const scoredRetex = state.retex.map(retex => {
          let score = 0;

          // 1. Tag overlap (0.4 weight)
          const tagOverlap = retex.tags.filter(t => task.tags.includes(t)).length;
          const tagScore = task.tags.length > 0 ? tagOverlap / task.tags.length : 0;
          score += tagScore * 0.4;

          // 2. Related to task moments (0.4 weight)
          const isRelatedToTaskMoment = taskMoments.some(m => m.id === retex.momentId);
          if (isRelatedToTaskMoment) score += 0.4;

          // 3. Type weighting (0.2 weight) - pitfalls are most valuable for new tasks
          const typeWeights = { pitfall: 1.0, pattern: 0.7, decision: 0.5 };
          score += (typeWeights[retex.type] || 0.5) * 0.2;

          return { retex, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

        const result = scoredRetex.map(r => {
          const base = {
            id: r.retex.id,
            title: r.retex.title,
            type: r.retex.type,
            rule_short: r.retex.rule_short,
            bullets: r.retex.bullets,
            dont: r.retex.dont,
            tags: r.retex.tags
          };
          return include_scores ? { ...base, relevance_score: Math.round(r.score * 100) / 100 } : base;
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task_id,
              task_title: task.title,
              retex_count: result.length,
              retex: result
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to get RETEX for task: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'create_handoff_for_agent': {
      const { task_id, from_agent, to_agent, budget_tokens = 500, include_retex = true, include_failures = true } = args as any;
      try {
        const task = await Store.getTask(task_id);
        const state = await Store.getState();
        const taskMoments = await Store.getTaskMoments(task_id);

        // Filter usable moments (not noise, not merged)
        const usableMoments = taskMoments.filter(m => !m.is_noise && !m.merged_into);

        // Extract key decisions
        const keyDecisions = usableMoments
          .filter(m => m.kind === 'decision')
          .slice(0, 5)
          .map(m => m.title || m.text.split('\n')[0]);

        // Extract recent failures (if requested)
        const recentFailures = include_failures
          ? usableMoments
              .filter(m => m.kind === 'fail')
              .slice(0, 3)
              .map(m => m.title || m.text.split('\n')[0])
          : [];

        // Build stack info from moments
        const stackKeywords = ['nginx', 'traefik', 'ssl', 'docker', 'node', 'typescript', 'react', 'postgres', 'redis'];
        const stackMoments = usableMoments.filter(m => {
          const text = (m.title + ' ' + m.text).toLowerCase();
          return stackKeywords.some(kw => text.includes(kw));
        });
        const stackInfo = stackMoments.slice(0, 3).map(m => m.title).join('; ');

        // Get next steps from notes
        const nextSteps = usableMoments
          .filter(m => m.kind === 'note' && /next|todo|plan|should|need/i.test(m.text))
          .slice(0, 3)
          .map(m => m.text.split('\n')[0]);

        // Get relevant RETEX if requested
        let recommendedRetex: string[] = [];
        let riskWarnings: string[] = [];

        if (include_retex) {
          const scoredRetex = state.retex
            .map(retex => {
              const tagOverlap = retex.tags.filter(t => task.tags.includes(t)).length;
              return { retex, score: tagOverlap };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          recommendedRetex = scoredRetex.map(r => r.retex.id);

          // Extract risk warnings from pitfall RETEX
          riskWarnings = scoredRetex
            .filter(r => r.retex.type === 'pitfall' && r.retex.dont)
            .map(r => r.retex.dont!)
            .slice(0, 3);
        }

        // Build the LangGraph-compatible handoff payload
        const handoffId = ulid();
        const handoffPayload: AgentHandoffPayload = {
          handoff_id: handoffId,
          from_agent,
          to_agent,
          task_id,
          context: {
            current_state: `Task "${task.title}" - Status: ${task.status}`,
            key_decisions: keyDecisions,
            recent_failures: recentFailures,
            stack_info: stackInfo || 'Not specified',
            next_steps: nextSteps.length > 0 ? nextSteps : ['Continue task execution']
          },
          refs: {
            moments: usableMoments.slice(0, 10).map(m => m.id),
            retex: recommendedRetex,
            handoffs: []
          },
          token_count: budget_tokens,
          created_at: Date.now(),
          recommended_actions: nextSteps,
          risk_warnings: riskWarnings
        };

        // Store the handoff record
        await Store.addHandoff({
          id: handoffId,
          ts: Date.now(),
          budget_tokens,
          current_state: handoffPayload.context.current_state,
          stack: stackInfo,
          decisions: keyDecisions,
          solved: usableMoments.filter(m => m.kind === 'win').slice(0, 5).map(m => m.title || m.text.split('\n')[0]),
          next_steps: nextSteps,
          refs: [...handoffPayload.refs.moments.map(id => `moment://${id}`), ...recommendedRetex.map(id => `retex://${id}`)],
          from_actor: from_agent,
          to_actor: to_agent,
          task_id,
          recommended_retex: recommendedRetex,
          risk_warnings: riskWarnings
        });

        // Update task to track handoff
        await Store.updateTask(task_id, {
          status: 'handed_off',
          handed_off_from: from_agent,
          handed_off_to: to_agent,
          assigned_to: to_agent
        });

        return {
          content: [
            { type: 'text', text: `✅ Agent handoff created: ${from_agent} → ${to_agent}` },
            { type: 'resource', resource: { uri: `handoff://${handoffId}`, text: 'Handoff Card' } },
            { type: 'text', text: JSON.stringify(handoffPayload, null, 2) }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to create agent handoff: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    // ============================================
    // V0.4 SPRINT 3: CONTEXT INTELLIGENCE
    // ============================================

    case 'context_relevance_score': {
      const { moment_id, task_id, query } = args as any;
      try {
        const moment = await Store.getMoment(moment_id);
        const task = await Store.getTask(task_id);
        const now = Date.now();

        // Calculate RankRAG-style relevance score
        // Score = weighted combination of multiple factors

        // 1. Tag overlap (0.25 weight)
        const tagOverlap = moment.tags.filter(t => task.tags.includes(t)).length;
        const tagScore = task.tags.length > 0 ? tagOverlap / task.tags.length : 0;

        // 2. Recency score (0.20 weight) - exponential decay over 30 days
        const ageMs = now - moment.ts;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const recencyScore = Math.exp(-ageMs / thirtyDaysMs);

        // 3. Type weight (0.15 weight) - decisions and fails are more important
        const typeWeights: Record<string, number> = {
          decision: 1.0,
          fail: 0.9,
          win: 0.7,
          note: 0.4
        };
        const typeScore = typeWeights[moment.kind] || 0.4;

        // 4. Signal score (0.15 weight) - existing quality score
        const signalScore = moment.signal_score ?? 0.5;

        // 5. Task relation (0.15 weight) - directly linked to task
        const taskRelationScore = moment.task_id === task_id ? 1.0 : 0.0;

        // 6. Semantic similarity (0.10 weight) - if query provided
        let semanticScore = 0.5; // default neutral
        if (query && moment.embedding) {
          const qvec = await embed(query);
          semanticScore = cos(qvec, moment.embedding);
        }

        // Weighted sum
        const relevanceScore =
          tagScore * 0.25 +
          recencyScore * 0.20 +
          typeScore * 0.15 +
          signalScore * 0.15 +
          taskRelationScore * 0.15 +
          semanticScore * 0.10;

        // Compute factors breakdown
        const factors = {
          semantic: Math.round(semanticScore * 100) / 100,
          tag_overlap: Math.round(tagScore * 100) / 100,
          recency: Math.round(recencyScore * 100) / 100,
          type_weight: Math.round(typeScore * 100) / 100,
          signal: Math.round(signalScore * 100) / 100,
          task_relation: taskRelationScore
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              moment_id,
              task_id,
              relevance_score: Math.round(relevanceScore * 1000) / 1000,
              factors,
              recommendation: relevanceScore > 0.6 ? 'include' : relevanceScore > 0.3 ? 'consider' : 'skip'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to calculate relevance: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'evaluate_context_window': {
      const { task_id, budget_tokens = 2000, strategy = 'balanced', include_retex = true, exclude_noise = true } = args as any;
      try {
        const task = await Store.getTask(task_id);
        const state = await Store.getState();
        const now = Date.now();

        // Get all candidate moments
        let candidates = state.moments;

        // Exclude noise if requested
        if (exclude_noise) {
          candidates = candidates.filter(m => !m.is_noise && !m.merged_into);
        }

        // Exclude superseded moments (temporal validity)
        candidates = candidates.filter(m => !m.valid_until || m.valid_until > now);

        // Score each moment based on strategy
        const scored = candidates.map(m => {
          let score = 0;

          // Tag overlap
          const tagOverlap = m.tags.filter(t => task.tags.includes(t)).length;
          const tagScore = task.tags.length > 0 ? tagOverlap / task.tags.length : 0;

          // Recency
          const ageMs = now - m.ts;
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          const recencyScore = Math.exp(-ageMs / thirtyDaysMs);

          // Type importance
          const typeWeights: Record<string, number> = { decision: 1.0, fail: 0.9, win: 0.7, note: 0.4 };
          const typeScore = typeWeights[m.kind] || 0.4;

          // Signal score
          const signalScore = m.signal_score ?? 0.5;

          // Task direct relation bonus
          const taskBonus = m.task_id === task_id ? 0.3 : 0;

          switch (strategy) {
            case 'relevance':
              score = tagScore * 0.4 + typeScore * 0.25 + signalScore * 0.2 + recencyScore * 0.15 + taskBonus;
              break;
            case 'recency':
              score = recencyScore * 0.5 + tagScore * 0.2 + typeScore * 0.15 + signalScore * 0.15 + taskBonus;
              break;
            case 'balanced':
            default:
              score = tagScore * 0.25 + recencyScore * 0.25 + typeScore * 0.2 + signalScore * 0.15 + taskBonus + 0.15;
          }

          // Estimate tokens (rough: ~1 token per 4 chars)
          const estimatedTokens = Math.ceil((m.title.length + (m.details?.length || 0)) / 4);

          return { moment: m, score, estimatedTokens };
        });

        // Sort by score and select within budget
        scored.sort((a, b) => b.score - a.score);

        const selected: typeof scored = [];
        let usedTokens = 0;

        for (const item of scored) {
          if (usedTokens + item.estimatedTokens <= budget_tokens) {
            selected.push(item);
            usedTokens += item.estimatedTokens;
          }
        }

        // Include RETEX if requested
        let retexContext: any[] = [];
        if (include_retex) {
          const scoredRetex = state.retex
            .map(r => ({
              retex: r,
              score: r.tags.filter(t => task.tags.includes(t)).length
            }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          retexContext = scoredRetex.map(r => ({
            id: r.retex.id,
            type: r.retex.type,
            rule_short: r.retex.rule_short,
            dont: r.retex.dont
          }));
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task_id,
              task_title: task.title,
              strategy,
              budget_tokens,
              used_tokens: usedTokens,
              context: {
                moments: selected.map(s => ({
                  id: s.moment.id,
                  title: s.moment.title,
                  kind: s.moment.kind,
                  score: Math.round(s.score * 100) / 100,
                  estimated_tokens: s.estimatedTokens
                })),
                retex: retexContext
              },
              stats: {
                total_candidates: candidates.length,
                selected_moments: selected.length,
                average_score: selected.length > 0
                  ? Math.round(selected.reduce((sum, s) => sum + s.score, 0) / selected.length * 100) / 100
                  : 0
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to evaluate context: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }

    case 'predict_agent_needs': {
      const { task_id, actor_id } = args as any;
      try {
        const task = await Store.getTask(task_id);
        const actor = await Store.getActor(actor_id);
        const state = await Store.getState();
        const actorStats = await Store.getActorStats(actor_id);

        // Analyze task type based on tags and title
        const taskKeywords = [...task.tags, ...task.title.toLowerCase().split(/\s+/)];

        // Infer task domains
        const domains: Record<string, string[]> = {
          deployment: ['deploy', 'production', 'staging', 'release', 'ci', 'cd', 'docker', 'k8s'],
          debugging: ['fix', 'bug', 'error', 'crash', 'debug', 'issue', 'fail'],
          security: ['security', 'auth', 'ssl', 'encryption', 'vulnerability', 'xss', 'csrf'],
          testing: ['test', 'spec', 'coverage', 'e2e', 'unit', 'integration'],
          architecture: ['refactor', 'architecture', 'design', 'pattern', 'structure'],
          feature: ['feature', 'add', 'implement', 'new', 'create']
        };

        const detectedDomains = Object.entries(domains)
          .filter(([_, keywords]) => keywords.some(kw => taskKeywords.includes(kw)))
          .map(([domain]) => domain);

        // Predict what context the actor will need
        const predictions: {
          category: string;
          priority: 'high' | 'medium' | 'low';
          reason: string;
          suggested_moments: string[];
          suggested_retex: string[];
        }[] = [];

        // 1. Previous failures in similar domains (high priority for debugging)
        if (detectedDomains.includes('debugging') || detectedDomains.includes('deployment')) {
          const relatedFails = state.moments
            .filter(m => m.kind === 'fail' && m.tags.some(t => task.tags.includes(t)))
            .slice(0, 5);

          if (relatedFails.length > 0) {
            predictions.push({
              category: 'Previous Failures',
              priority: 'high',
              reason: 'Understanding past failures prevents repeating mistakes',
              suggested_moments: relatedFails.map(m => m.id),
              suggested_retex: []
            });
          }
        }

        // 2. Key decisions in domain (high priority)
        const relatedDecisions = state.moments
          .filter(m => m.kind === 'decision' && m.tags.some(t => task.tags.includes(t)))
          .slice(0, 5);

        if (relatedDecisions.length > 0) {
          predictions.push({
            category: 'Architectural Decisions',
            priority: 'high',
            reason: 'Decisions define constraints and patterns to follow',
            suggested_moments: relatedDecisions.map(m => m.id),
            suggested_retex: []
          });
        }

        // 3. Relevant RETEX (medium priority)
        const relatedRetex = state.retex
          .filter(r => r.tags.some(t => task.tags.includes(t)))
          .slice(0, 3);

        if (relatedRetex.length > 0) {
          predictions.push({
            category: 'Applicable Patterns/Pitfalls',
            priority: 'medium',
            reason: 'RETEX cards encode learned best practices',
            suggested_moments: [],
            suggested_retex: relatedRetex.map(r => r.id)
          });
        }

        // 4. Actor's past success patterns (if actor has history)
        if (actorStats.total_moments > 0) {
          const actorWins = state.moments
            .filter(m => m.actor_id === actor_id && m.kind === 'win' && m.tags.some(t => task.tags.includes(t)))
            .slice(0, 3);

          if (actorWins.length > 0) {
            predictions.push({
              category: 'Actor Success Patterns',
              priority: 'medium',
              reason: `${actor.name} has previous successes in this domain`,
              suggested_moments: actorWins.map(m => m.id),
              suggested_retex: []
            });
          }
        }

        // 5. Stack-specific moments
        const stackKeywords = ['nginx', 'traefik', 'docker', 'postgres', 'redis', 'node', 'react'];
        const taskStack = stackKeywords.filter(kw => taskKeywords.includes(kw));

        if (taskStack.length > 0) {
          const stackMoments = state.moments
            .filter(m => taskStack.some(s => m.text.toLowerCase().includes(s)))
            .slice(0, 3);

          if (stackMoments.length > 0) {
            predictions.push({
              category: 'Stack Context',
              priority: 'low',
              reason: `Task involves ${taskStack.join(', ')}`,
              suggested_moments: stackMoments.map(m => m.id),
              suggested_retex: []
            });
          }
        }

        // Calculate recommended token budget based on complexity
        const complexityMultipliers: Record<string, number> = {
          trivial: 0.5, simple: 0.75, medium: 1.0, complex: 1.5, epic: 2.0
        };
        const multiplier = complexityMultipliers[task.estimated_complexity || 'medium'] || 1.0;
        const recommendedBudget = Math.round(500 * multiplier);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task_id,
              task_title: task.title,
              actor_id,
              actor_name: actor.name,
              detected_domains: detectedDomains,
              actor_stats: {
                success_rate: actorStats.success_rate,
                total_moments: actorStats.total_moments,
                top_tags: actorStats.top_tags
              },
              predictions,
              recommendations: {
                token_budget: recommendedBudget,
                include_retex: relatedRetex.length > 0,
                include_failures: detectedDomains.includes('debugging'),
                strategy: detectedDomains.includes('architecture') ? 'relevance' : 'balanced'
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `❌ Failed to predict agent needs: ${error instanceof Error ? error.message : String(error)}` }],
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
console.error('🎞️  VibeTape MCP v0.4.0 ready (stdio) - Agentic Memory for Development Teams');
