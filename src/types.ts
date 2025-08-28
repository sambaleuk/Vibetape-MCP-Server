export type MomentKind = 'win'|'fail'|'decision'|'note';
export type RelationKind = 'causes'|'solves'|'relates';

export type Relation = { 
  to: string; 
  kind: RelationKind; 
  note?: string; 
};

export type Comment = { 
  ts: number; 
  author?: string; 
  text: string; 
};

export type Moment = {
  id: string;
  ts: number;
  title: string;
  kind: MomentKind;
  tags: string[];
  details?: string;
  cwd?: string;
  git?: { 
    branch?: string; 
    sha?: string; 
  };
  snapshot?: { 
    diff?: string; 
    tests?: string; 
    deps?: string; 
  };
  text: string; // concatenated searchable text
  embedding?: number[]; // optional
  relations?: Relation[]; // NEW: relations to other moments
  comments?: Comment[]; // NEW: comments on this moment
  origin?: 'local' | 'team'; // NEW: track data origin
  modified_ts?: number; // NEW: for conflict resolution
  // Context Handoff & Denoising fields
  signal_score?: number; // NEW: quality score 0-1
  is_noise?: boolean; // NEW: mark as noise/trivial
  merged_into?: string; // NEW: if merged into another moment
};

export type RetexCard = {
  id: string;
  momentId: string;
  title: string;
  type: 'pitfall'|'pattern'|'decision';
  rule_short: string;
  bullets: [string, string, string];
  dont?: string;
  tags: string[];
};

// Context Handoff types
export type HandoffRecord = {
  id: string;
  ts: number;
  session_id?: string;
  budget_tokens: number;
  current_state: string;
  stack: string;
  decisions: string[];
  solved: string[];
  next_steps: string[];
  refs: string[];
};
