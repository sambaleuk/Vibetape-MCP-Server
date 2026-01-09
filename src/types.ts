export type MomentKind = 'win'|'fail'|'decision'|'note';
export type RelationKind = 'causes'|'solves'|'relates'|'supersedes'|'depends_on';

// ============================================
// V0.4 AGENTIC TYPES
// ============================================

/**
 * Actor - Represents an agent or human that can create moments
 * Enables multi-agent traceability and success rate analytics
 */
export type ActorType = 'human' | 'agent';

export type ActorStats = {
  total_moments: number;
  wins: number;
  fails: number;
  decisions: number;
  notes: number;
  success_rate: number;        // wins / (wins + fails), 0-1
  avg_signal_score: number;    // average signal_score of moments
  top_tags: string[];          // most used tags
  last_active: number;         // timestamp of last moment
};

export type Actor = {
  id: string;                    // unique identifier, e.g. "user_sam", "agent_code_reviewer"
  type: ActorType;
  name: string;                  // display name, e.g. "Code Reviewer", "Sam"
  description?: string;          // what this actor does
  capabilities?: string[];       // e.g. ["review", "test", "deploy", "debug"]
  created_at: number;
  metadata?: Record<string, string | number | boolean>;
};

/**
 * Task - Represents a unit of work that can be tracked and handed off
 * Enables task-based context curation and agent coordination
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'handed_off' | 'blocked';
export type TaskOutcome = 'success' | 'partial' | 'failure';

export type Task = {
  id: string;                    // ULID
  title: string;
  description?: string;
  status: TaskStatus;
  created_at: number;
  updated_at: number;

  // Traçabilité agent
  created_by: string;            // actor_id who created the task
  assigned_to?: string;          // actor_id currently assigned
  handed_off_from?: string;      // actor_id who handed off (if any)
  handed_off_to?: string;        // actor_id who received handoff

  // Contexte
  tags: string[];
  related_moments: string[];     // moment IDs linked to this task
  parent_task?: string;          // for task hierarchy
  subtasks?: string[];           // child task IDs

  // Résultat
  outcome?: TaskOutcome;
  outcome_summary?: string;
  completed_at?: number;

  // Métadonnées
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimated_complexity?: 'trivial' | 'simple' | 'medium' | 'complex' | 'epic';
  metadata?: Record<string, string | number | boolean>;
};

/**
 * Context Relevance Score - For task-based context curation
 * Inspired by RankRAG re-ranking approach
 */
export type ContextRelevance = {
  task_id: string;
  score: number;               // 0-1, relevance for this task
  computed_at: number;
  factors?: {
    semantic: number;          // embedding similarity
    tag_overlap: number;       // shared tags
    recency: number;           // time-based decay
    type_weight: number;       // moment kind importance
    signal: number;            // existing signal_score
  };
};

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
  relations?: Relation[]; // relations to other moments
  comments?: Comment[]; // comments on this moment
  origin?: 'local' | 'team'; // track data origin
  modified_ts?: number; // for conflict resolution

  // Context Handoff & Denoising fields
  signal_score?: number; // quality score 0-1
  is_noise?: boolean; // mark as noise/trivial
  merged_into?: string; // if merged into another moment

  // V0.4 AGENTIC FIELDS
  actor_id?: string;             // who created this moment (Actor.id)
  task_id?: string;              // associated task (Task.id)

  // Temporal tracking (Zep-style)
  valid_from?: number;           // when this fact became true
  valid_until?: number;          // when this fact was invalidated
  superseded_by?: string;        // ID of moment that supersedes this

  // Context relevance cache (for task-based curation)
  context_relevance?: ContextRelevance[];
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

  // V0.4 AGENTIC HANDOFF FIELDS
  from_actor?: string;           // actor_id who created the handoff
  to_actor?: string;             // actor_id who will receive
  task_id?: string;              // associated task
  recommended_retex?: string[];  // retex IDs to consult
  risk_warnings?: string[];      // potential issues to watch
};

/**
 * AgentHandoffPayload - LangGraph/CrewAI compatible handoff format
 * Can be converted to LangGraph Command pattern
 */
export type AgentHandoffPayload = {
  handoff_id: string;
  from_agent: string;
  to_agent: string;
  task_id: string;

  context: {
    current_state: string;
    key_decisions: string[];
    recent_failures: string[];
    stack_info: string;
    next_steps: string[];
  };

  refs: {
    moments: string[];
    retex: string[];
    handoffs: string[];
  };

  token_count: number;
  created_at: number;

  recommended_actions: string[];
  risk_warnings: string[];
};

// ============================================
// V0.4 STATE TYPE
// ============================================

export type VibeTapeState = {
  version: number;
  moments: Moment[];
  retex: RetexCard[];
  handoffs: HandoffRecord[];
  actors: Actor[];
  tasks: Task[];
};
