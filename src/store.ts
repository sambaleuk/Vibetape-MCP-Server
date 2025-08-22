import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Moment, RetexCard, Relation, Comment } from './types.js';

const HOME = process.env.VIBETAPE_HOME?.replace('~', os.homedir()) || path.join(os.homedir(), '.vibetape');
const FILE = path.join(HOME, 'state.json');
const TEAM_DIR = process.env.VIBETAPE_TEAM_DIR?.replace('~', os.homedir());
const TEAM_FILE = TEAM_DIR ? path.join(TEAM_DIR, 'team_state.json') : undefined;

type State = { moments: Moment[]; retex: RetexCard[] };

async function loadFile(file: string): Promise<State> {
  await fs.ensureDir(path.dirname(file));
  if (!(await fs.pathExists(file))) return { moments: [], retex: [] };
  return fs.readJSON(file);
}

async function saveFile(file: string, state: State) { 
  await fs.writeJSON(file, state, { spaces: 2 }); 
}

async function load(): Promise<State> {
  const s = await loadFile(FILE);
  if (TEAM_FILE && (await fs.pathExists(TEAM_FILE))) {
    // naive merge (team moments first, then local uniques)
    const t = await loadFile(TEAM_FILE);
    const seen = new Set(t.moments.map(m => m.id));
    const merged: State = {
      moments: [...t.moments, ...s.moments.filter(m => !seen.has(m.id))],
      retex: [...t.retex, ...s.retex.filter(r => !t.retex.find(x => x.id === r.id))]
    };
    return merged;
  }
  return s;
}

async function save(state: State) {
  await saveFile(FILE, state);
  if (TEAM_FILE) {
    // write team mirror (best effort)
    const existing = await loadFile(TEAM_FILE).catch(() => ({ moments: [], retex: [] } as State));
    const seen = new Set<string>();
    const merged: State = {
      moments: [...state.moments, ...existing.moments].filter(m => { const ok = !seen.has(m.id); seen.add(m.id); return ok; }),
      retex: [...state.retex, ...existing.retex].filter(r => { const ok = !seen.has(r.id); seen.add(r.id); return ok; })
    };
    await fs.ensureDir(path.dirname(TEAM_FILE));
    await saveFile(TEAM_FILE, merged);
  }
}

export const Store = {
  async addMoment(m: Moment) {
    const s = await load();
    s.moments.unshift(m);
    await save(s);
    return m;
  },
  
  async updateMoment(id: string, patch: Partial<Moment>) {
    const s = await load();
    const i = s.moments.findIndex(x => x.id === id);
    if (i >= 0) { 
      s.moments[i] = { ...s.moments[i], ...patch }; 
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
    await save(s);
    return s.moments[i];
  },

  async addComment(onId: string, c: Comment) {
    const s = await load();
    const i = s.moments.findIndex(x => x.id === onId);
    if (i < 0) throw new Error('moment not found');
    s.moments[i].comments = [...(s.moments[i].comments || []), c];
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
