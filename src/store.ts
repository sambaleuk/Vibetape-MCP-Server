import fs from 'fs-extra';
import writeFileAtomic from 'write-file-atomic';
import path from 'path';
import os from 'os';
import {
  Moment,
  RetexCard,
  Relation,
  Comment,
  HandoffRecord,
  Actor,
  Task,
  ActorStats,
  VibeTapeState
} from './types.js';

const HOME = process.env.VIBETAPE_HOME?.replace('~', os.homedir()) || path.join(os.homedir(), '.vibetape');
const FILE = path.join(HOME, 'state.json');
const TEAM_DIR = process.env.VIBETAPE_TEAM_DIR?.replace('~', os.homedir());
const TEAM_FILE = TEAM_DIR ? path.join(TEAM_DIR, 'team_state.json') : undefined;

// Current state version - v3 adds actors and tasks
const CURRENT_VERSION = 3;

type State = VibeTapeState;

async function loadFile(file: string): Promise<State> {
  await fs.ensureDir(path.dirname(file));
  if (!(await fs.pathExists(file))) {
    return {
      version: CURRENT_VERSION,
      moments: [],
      retex: [],
      handoffs: [],
      actors: [],
      tasks: []
    };
  }
  const state = await fs.readJSON(file);

  // Migration pipeline
  return migrateState(state);
}

/**
 * Migrate state through versions
 * v1 -> v2: Add origin and modified_ts
 * v2 -> v3: Add actors and tasks arrays
 */
function migrateState(state: any): State {
  // v1 -> v2: Add origin and modified_ts
  if (!state.version || state.version < 2) {
    state.version = 2;
    state.moments = state.moments?.map((m: Moment) => ({
      ...m,
      origin: 'local',
      modified_ts: m.ts || Date.now()
    })) || [];
    state.handoffs = state.handoffs || [];
  }

  // v2 -> v3: Add actors and tasks
  if (state.version < 3) {
    state.version = 3;
    state.actors = state.actors || [];
    state.tasks = state.tasks || [];

    // Create a default "system" actor for moments without actor_id
    if (state.moments?.length > 0 && !state.actors.find((a: Actor) => a.id === 'system')) {
      state.actors.push({
        id: 'system',
        type: 'agent',
        name: 'System',
        description: 'Default actor for legacy moments',
        capabilities: ['capture'],
        created_at: Date.now()
      });
    }
  }

  return state as State;
}

async function saveFile(file: string, state: State) { 
  await writeFileAtomic(file, JSON.stringify(state, null, 2), 'utf8');
}

function mergeStates(local: State, team: State): State {
  const merged: State = {
    version: Math.max(local.version || CURRENT_VERSION, team.version || CURRENT_VERSION),
    moments: [],
    retex: [],
    handoffs: [],
    actors: [],
    tasks: []
  };

  // Merge moments with last-write-wins based on modified_ts
  const momentMap = new Map<string, Moment>();

  // Add team moments first
  for (const m of team.moments) {
    momentMap.set(m.id, { ...m, origin: 'team' });
  }

  // Add local moments, overwriting if newer
  for (const m of local.moments) {
    const existing = momentMap.get(m.id);
    const localMoment = { ...m, origin: 'local' as const };

    if (!existing || (localMoment.modified_ts || localMoment.ts) > (existing.modified_ts || existing.ts)) {
      momentMap.set(m.id, localMoment);
    }
  }

  merged.moments = Array.from(momentMap.values());

  // Merge retex (simple deduplication by ID)
  const retexMap = new Map<string, RetexCard>();
  for (const r of [...team.retex, ...local.retex]) {
    retexMap.set(r.id, r);
  }
  merged.retex = Array.from(retexMap.values());

  // Merge handoffs (simple deduplication by ID)
  const handoffMap = new Map<string, HandoffRecord>();
  for (const h of [...(team.handoffs || []), ...(local.handoffs || [])]) {
    handoffMap.set(h.id, h);
  }
  merged.handoffs = Array.from(handoffMap.values());

  // Merge actors (simple deduplication by ID)
  const actorMap = new Map<string, Actor>();
  for (const a of [...(team.actors || []), ...(local.actors || [])]) {
    actorMap.set(a.id, a);
  }
  merged.actors = Array.from(actorMap.values());

  // Merge tasks (last-write-wins based on updated_at)
  const taskMap = new Map<string, Task>();
  for (const t of (team.tasks || [])) {
    taskMap.set(t.id, t);
  }
  for (const t of (local.tasks || [])) {
    const existing = taskMap.get(t.id);
    if (!existing || t.updated_at > existing.updated_at) {
      taskMap.set(t.id, t);
    }
  }
  merged.tasks = Array.from(taskMap.values());

  // Garbage collect orphaned relations
  const validMomentIds = new Set(merged.moments.map(m => m.id));
  for (const moment of merged.moments) {
    if (moment.relations) {
      moment.relations = moment.relations.filter(rel => validMomentIds.has(rel.to));
    }
  }

  return merged;
}

async function load(): Promise<State> {
  const s = await loadFile(FILE);
  if (TEAM_FILE && (await fs.pathExists(TEAM_FILE))) {
    const t = await loadFile(TEAM_FILE);
    return mergeStates(s, t);
  }
  return s;
}

async function save(state: State) {
  // Atomic write to local file
  await saveFile(FILE, state);
  
  if (TEAM_FILE) {
    // Atomic write to team file with merge
    await fs.ensureDir(path.dirname(TEAM_FILE));
    const existing = await loadFile(TEAM_FILE).catch(() => ({
      version: CURRENT_VERSION,
      moments: [],
      retex: [],
      handoffs: [],
      actors: [],
      tasks: []
    } as State));
    const merged = mergeStates(existing, state);
    await saveFile(TEAM_FILE, merged);
  }
}

export const Store = {
  async addMoment(m: Moment) {
    const s = await load();
    const enrichedMoment = {
      ...m,
      origin: 'local' as const,
      modified_ts: Date.now()
    };
    s.moments.unshift(enrichedMoment);
    await save(s);
    return enrichedMoment;
  },
  
  async updateMoment(id: string, patch: Partial<Moment>) {
    const s = await load();
    const i = s.moments.findIndex(x => x.id === id);
    if (i >= 0) { 
      s.moments[i] = { 
        ...s.moments[i], 
        ...patch, 
        modified_ts: Date.now() 
      }; 
      await save(s); 
      return s.moments[i]; 
    }
    throw new Error('moment not found');
  },

  async addRelation(from: string, rel: Relation) {
    const s = await load();
    const i = s.moments.findIndex(x => x.id === from);
    if (i < 0) throw new Error('moment not found');
    s.moments[i].relations = [...(s.moments[i].relations || []), rel];
    s.moments[i].modified_ts = Date.now();
    await save(s);
    return s.moments[i];
  },

  async addComment(onId: string, c: Comment) {
    const s = await load();
    const i = s.moments.findIndex(x => x.id === onId);
    if (i < 0) throw new Error('moment not found');
    s.moments[i].comments = [...(s.moments[i].comments || []), c];
    s.moments[i].modified_ts = Date.now();
    await save(s);
    return s.moments[i];
  },
  
  async listMoments(limit = 20) {
    const s = await load();
    return s.moments.slice(0, limit);
  },
  
  async getMoment(id: string) {
    const s = await load();
    const m = s.moments.find(x => x.id === id);
    if (!m) throw new Error('moment not found');
    return m;
  },
  
  async addRetex(r: RetexCard) {
    const s = await load();
    s.retex.unshift(r);
    await save(s);
    return r;
  },
  
  async listRetex(limit = 50) {
    const s = await load();
    return s.retex.slice(0, limit);
  },
  
  async getState() { 
    return load(); 
  },

  // NEW: Handoff management
  async addHandoff(h: HandoffRecord) {
    const s = await load();
    s.handoffs = s.handoffs || [];
    s.handoffs.unshift(h);
    await save(s);
    return h;
  },

  async listHandoffs(limit = 20) {
    const s = await load();
    return (s.handoffs || []).slice(0, limit);
  },

  async getHandoff(id: string) {
    const s = await load();
    const h = (s.handoffs || []).find(x => x.id === id);
    if (!h) throw new Error('handoff not found');
    return h;
  },

  // Direct state save (for handoff.ts)
  async save(state: State) {
    await save(state);
  },

  // ============================================
  // V0.4 ACTOR MANAGEMENT
  // ============================================

  async addActor(actor: Actor): Promise<Actor> {
    const s = await load();
    // Check for duplicate ID
    if (s.actors.find(a => a.id === actor.id)) {
      throw new Error(`Actor with id "${actor.id}" already exists`);
    }
    s.actors.push(actor);
    await save(s);
    return actor;
  },

  async getActor(id: string): Promise<Actor> {
    const s = await load();
    const actor = s.actors.find(a => a.id === id);
    if (!actor) throw new Error(`Actor "${id}" not found`);
    return actor;
  },

  async updateActor(id: string, patch: Partial<Actor>): Promise<Actor> {
    const s = await load();
    const i = s.actors.findIndex(a => a.id === id);
    if (i < 0) throw new Error(`Actor "${id}" not found`);
    s.actors[i] = { ...s.actors[i], ...patch };
    await save(s);
    return s.actors[i];
  },

  async listActors(): Promise<Actor[]> {
    const s = await load();
    return s.actors;
  },

  /**
   * Compute statistics for an actor based on their moments
   */
  async getActorStats(actorId: string, window: '7d' | '30d' | 'all' = 'all'): Promise<ActorStats> {
    const s = await load();
    const actor = s.actors.find(a => a.id === actorId);
    if (!actor) throw new Error(`Actor "${actorId}" not found`);

    const now = Date.now();
    const horizon = window === '7d' ? 7 : window === '30d' ? 30 : 36500;
    const cutoff = now - horizon * 86400000;

    // Filter moments by actor and time window
    const moments = s.moments.filter(m =>
      m.actor_id === actorId && m.ts >= cutoff
    );

    const wins = moments.filter(m => m.kind === 'win').length;
    const fails = moments.filter(m => m.kind === 'fail').length;
    const decisions = moments.filter(m => m.kind === 'decision').length;
    const notes = moments.filter(m => m.kind === 'note').length;

    // Calculate success rate (wins / (wins + fails))
    const successRate = (wins + fails) > 0 ? wins / (wins + fails) : 0;

    // Calculate average signal score
    const signalScores = moments.filter(m => m.signal_score !== undefined).map(m => m.signal_score!);
    const avgSignalScore = signalScores.length > 0
      ? signalScores.reduce((a, b) => a + b, 0) / signalScores.length
      : 0;

    // Find top tags
    const tagCount: Record<string, number> = {};
    for (const m of moments) {
      for (const t of m.tags) {
        tagCount[t] = (tagCount[t] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Find last active timestamp
    const lastActive = moments.length > 0
      ? Math.max(...moments.map(m => m.ts))
      : actor.created_at;

    return {
      total_moments: moments.length,
      wins,
      fails,
      decisions,
      notes,
      success_rate: Math.round(successRate * 100) / 100,
      avg_signal_score: Math.round(avgSignalScore * 100) / 100,
      top_tags: topTags,
      last_active: lastActive
    };
  },

  // ============================================
  // V0.4 TASK MANAGEMENT
  // ============================================

  async addTask(task: Task): Promise<Task> {
    const s = await load();
    s.tasks.push(task);
    await save(s);
    return task;
  },

  async getTask(id: string): Promise<Task> {
    const s = await load();
    const task = s.tasks.find(t => t.id === id);
    if (!task) throw new Error(`Task "${id}" not found`);
    return task;
  },

  async updateTask(id: string, patch: Partial<Task>): Promise<Task> {
    const s = await load();
    const i = s.tasks.findIndex(t => t.id === id);
    if (i < 0) throw new Error(`Task "${id}" not found`);
    s.tasks[i] = {
      ...s.tasks[i],
      ...patch,
      updated_at: Date.now()
    };
    await save(s);
    return s.tasks[i];
  },

  async listTasks(options: {
    status?: Task['status'];
    assignedTo?: string;
    createdBy?: string;
    limit?: number;
  } = {}): Promise<Task[]> {
    const s = await load();
    let tasks = s.tasks;

    if (options.status) {
      tasks = tasks.filter(t => t.status === options.status);
    }
    if (options.assignedTo) {
      tasks = tasks.filter(t => t.assigned_to === options.assignedTo);
    }
    if (options.createdBy) {
      tasks = tasks.filter(t => t.created_by === options.createdBy);
    }

    // Sort by updated_at descending
    tasks = tasks.sort((a, b) => b.updated_at - a.updated_at);

    if (options.limit) {
      tasks = tasks.slice(0, options.limit);
    }

    return tasks;
  },

  /**
   * Get moments related to a task
   */
  async getTaskMoments(taskId: string): Promise<Moment[]> {
    const s = await load();
    return s.moments.filter(m => m.task_id === taskId);
  },

  /**
   * Link a moment to a task
   */
  async linkMomentToTask(momentId: string, taskId: string): Promise<void> {
    const s = await load();
    const mIdx = s.moments.findIndex(m => m.id === momentId);
    if (mIdx < 0) throw new Error(`Moment "${momentId}" not found`);

    const tIdx = s.tasks.findIndex(t => t.id === taskId);
    if (tIdx < 0) throw new Error(`Task "${taskId}" not found`);

    // Update moment with task_id
    s.moments[mIdx].task_id = taskId;
    s.moments[mIdx].modified_ts = Date.now();

    // Add moment to task's related_moments if not already there
    if (!s.tasks[tIdx].related_moments.includes(momentId)) {
      s.tasks[tIdx].related_moments.push(momentId);
      s.tasks[tIdx].updated_at = Date.now();
    }

    await save(s);
  },

  /**
   * Supersede a moment with a new one (temporal tracking)
   */
  async supersedeMoment(oldMomentId: string, newMomentId: string, reason?: string): Promise<void> {
    const s = await load();

    const oldIdx = s.moments.findIndex(m => m.id === oldMomentId);
    if (oldIdx < 0) throw new Error(`Moment "${oldMomentId}" not found`);

    const newIdx = s.moments.findIndex(m => m.id === newMomentId);
    if (newIdx < 0) throw new Error(`Moment "${newMomentId}" not found`);

    // Mark old moment as superseded
    s.moments[oldIdx].valid_until = Date.now();
    s.moments[oldIdx].superseded_by = newMomentId;
    s.moments[oldIdx].modified_ts = Date.now();

    // Add supersedes relation to new moment
    s.moments[newIdx].relations = s.moments[newIdx].relations || [];
    s.moments[newIdx].relations.push({
      to: oldMomentId,
      kind: 'supersedes',
      note: reason
    });
    s.moments[newIdx].modified_ts = Date.now();

    await save(s);
  }
};
