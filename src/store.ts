import fs from 'fs-extra';
import writeFileAtomic from 'write-file-atomic';
import path from 'path';
import os from 'os';
import { Moment, RetexCard, Relation, Comment } from './types.js';

const HOME = process.env.VIBETAPE_HOME?.replace('~', os.homedir()) || path.join(os.homedir(), '.vibetape');
const FILE = path.join(HOME, 'state.json');
const TEAM_DIR = process.env.VIBETAPE_TEAM_DIR?.replace('~', os.homedir());
const TEAM_FILE = TEAM_DIR ? path.join(TEAM_DIR, 'team_state.json') : undefined;

type State = { 
  version: number; // State schema version
  moments: Moment[]; 
  retex: RetexCard[] 
};

async function loadFile(file: string): Promise<State> {
  await fs.ensureDir(path.dirname(file));
  if (!(await fs.pathExists(file))) return { version: 2, moments: [], retex: [] };
  const state = await fs.readJSON(file);
  
  // Migrate legacy state (v1 -> v2)
  if (!state.version) {
    state.version = 2;
    // Add origin and modified_ts to existing moments
    state.moments = state.moments?.map((m: Moment) => ({
      ...m,
      origin: 'local',
      modified_ts: m.ts || Date.now()
    })) || [];
  }
  
  return state;
}

async function saveFile(file: string, state: State) { 
  await writeFileAtomic(file, JSON.stringify(state, null, 2), 'utf8');
}

function mergeStates(local: State, team: State): State {
  const merged: State = {
    version: Math.max(local.version || 2, team.version || 2),
    moments: [],
    retex: []
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
    const existing = await loadFile(TEAM_FILE).catch(() => ({ version: 2, moments: [], retex: [] } as State));
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
  }
};
