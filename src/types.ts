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
