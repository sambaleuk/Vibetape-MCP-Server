# Changelog

## v0.4.0 - 2025-01-09

### 🤖 Multi-Agent Traceability & Intelligent Context Curation

This release transforms VibeTape into a full **multi-agent orchestration platform** with LangGraph-compatible handoffs, RankRAG-style context scoring, and comprehensive agent analytics.

#### Multi-Agent Management
- **NEW**: `register_actor` tool — Register humans or AI agents with capabilities
- **NEW**: `get_actor` / `list_actors` tools — Query actor information
- **NEW**: `get_actor_stats` tool — Performance analytics (success rate, activity, top tags)
- **NEW**: `Actor` type with id, type, name, description, capabilities, metadata
- **NEW**: State migration v2→v3 with actors and tasks arrays

#### Task Lifecycle Management
- **NEW**: `create_task` tool — Create tasks with assignment and priority
- **NEW**: `update_task` tool — Update status, outcome, and assignment
- **NEW**: `list_tasks` tool — Filter by status, assignee, creator
- **NEW**: `get_task_context` tool — Get all moments related to a task
- **NEW**: `Task` type with full lifecycle tracking (pending → in_progress → completed/failed/handed_off)
- **NEW**: `link_moment_to_task` — Bidirectional moment-task linking
- **NEW**: `supersede_moment` — Temporal tracking (Zep-style valid_from/valid_until)

#### Context Intelligence (RankRAG-style)
- **NEW**: `context_relevance_score` tool — Calculate weighted relevance scores
  - Factors: tag overlap, recency, type weight, signal score, task relation, semantic similarity
- **NEW**: `evaluate_context_window` tool — Optimize context selection within token budget
  - Strategies: `relevance`, `recency`, `balanced`
  - Automatic RETEX inclusion option
- **NEW**: `predict_agent_needs` tool — Anticipate what context an agent will need
  - Domain detection (deployment, debugging, security, testing, architecture, feature)
  - Recommended moments, RETEX cards, and risk warnings

#### Agent-to-Agent Handoffs
- **NEW**: `get_retex_for_task` tool — Find relevant RETEX cards for a task
  - Tag overlap scoring and moment relation analysis
- **NEW**: `create_handoff_for_agent` tool — LangGraph-compatible handoff payloads
  - `AgentHandoffPayload` type with full context, refs, and recommendations
  - Includes recent failures, key decisions, and risk warnings
  - Direct integration with LangGraph Command pattern

#### Enhanced Moment Types
- **Extended**: Moment type with `actor_id`, `task_id` fields
- **Extended**: Moment type with temporal tracking (`valid_from`, `valid_until`, `superseded_by`)
- **Extended**: Moment type with `context_relevance` cache for task-based curation
- **Extended**: HandoffRecord with `from_actor`, `to_actor`, `task_id`, `recommended_retex`, `risk_warnings`

#### New Resources
- **NEW**: `actor://{id}` — Actor details with computed stats (JSON)
- **NEW**: `task://{id}` — Task details with related moments (JSON)

#### Technical Improvements
- **Store**: Added actor CRUD operations and stats computation
- **Store**: Added task CRUD operations with filtering
- **Store**: Added moment-task linking and supersession
- **Types**: Added `ActorType`, `ActorStats`, `TaskStatus`, `TaskOutcome`, `ContextRelevance`
- **Types**: Added `AgentHandoffPayload` for framework interoperability
- **Migration**: Automatic v2→v3 state migration with system actor creation

### 📊 Statistics
- **Tools**: 13 → 18 (+38%)
- **Resources**: 7 → 9 (+29%)
- **Types**: 8 → 15 (+87%)

### 🎯 Impact
This release positions VibeTape as a core infrastructure component for multi-agent AI systems. The RankRAG-style context curation ensures agents receive optimal context within token budgets, while the handoff system enables seamless work transfer between specialized agents.

---

## v0.3.0 - 2025-01-27

### 🚀 Revolutionary Context Handoff & Denoising

#### Context Handoff System
- **NEW**: `generate_context_handoff` tool - Creates compact transition cards (350 tokens)
- **NEW**: Smart ranking algorithm (0.5×recency + 0.3×type + 0.2×boost)
- **NEW**: Structured handoff format (État/Stack/Décisions/Résolu/Next Steps)
- **NEW**: `handoff://{id}` resources for cross-session continuity
- **NEW**: Token-aware content budgeting with tiktoken integration

#### Context-Aware Suggestions
- **NEW**: `suggest_transition_card` tool - Proactive handoff suggestions
- **NEW**: Automatic detection of context window saturation (< 1000 tokens)
- **NEW**: Smart budget allocation based on remaining tokens
- **NEW**: Session continuity across IDE restarts

#### Intelligent Denoising
- **NEW**: `sweep_noise` tool - Filters trivial and duplicate moments
- **NEW**: `signal_score` field (0-1) for moment quality scoring
- **NEW**: `is_noise` and `merged_into` fields for cleanup tracking
- **NEW**: Cooldown violation detection (spam prevention)
- **NEW**: Similarity-based duplicate merging (cosine + Jaccard)

#### Architecture Enhancements
- **Added**: `@dqbd/tiktoken` for precise GPT-4o token counting
- **Added**: `HandoffRecord` type with full handoff metadata
- **Extended**: Moment type with denoising fields
- **Enhanced**: Store with handoff management and merge support
- **Updated**: Server to v0.3.0 with new tools and resources

#### Technical Improvements
- **Performance**: In-memory ranking for 200+ moments
- **Reliability**: Fallback token estimation when tiktoken fails
- **Flexibility**: Configurable similarity thresholds and time windows
- **Compatibility**: Maintains full backward compatibility with v0.2.x

### 🎯 Impact
This release transforms VibeTape from a passive journal into a proactive context management system. The handoff feature solves the critical problem of context loss between sessions, while denoising ensures signal clarity in high-activity development environments.

---

## v0.2.1 - 2025-01-15

### 🔒 Critical Security & Reliability Fixes

#### Atomic Writes & Data Integrity
- **Fixed**: Race conditions in concurrent team/local writes
- **Added**: Atomic file writes using `write-file-atomic`
- **Added**: Deterministic merge strategy with last-write-wins
- **Added**: State versioning system (v2) with automatic migration
- **Added**: Orphaned relation garbage collection

#### Enhanced Team Collaboration
- **Added**: `origin` field tracking ('local' vs 'team')
- **Added**: `modified_ts` timestamp for conflict resolution
- **Fixed**: Team Vault merge creating duplicates
- **Fixed**: JSON corruption in high-concurrency scenarios

#### Developer Experience
- **Added**: Comprehensive test suite for atomic operations
- **Added**: State validation and migration system
- **Improved**: Error handling with detailed messages
- **Added**: Automated testing scripts

### 📊 Impact
- **Zero data corruption** in team environments ✅
- **Deterministic merges** across all scenarios ✅
- **Backward compatibility** with v0.2.0 states ✅

---

## v0.2.0 - 2025-01-15

### 🆕 Nouvelles fonctionnalités

#### Relations entre moments
- **Nouvel outil** `link_moments` : Créer des relations `causes`, `solves`, `relates` entre moments
- **Nouvelle ressource** `graph://{id}` : Visualiser le graphe de relations d'un moment
- Relations affichées dans les timelines

#### Commentaires collaboratifs
- **Nouvel outil** `comment_moment` : Ajouter des commentaires horodatés aux moments
- Support auteur optionnel pour les commentaires
- Compteur de commentaires dans les exports

#### Recherche et analyse avancées
- **Nouvel outil** `search_moments_advanced` : Recherche combinée (sémantique + filtres + regex)
- **Nouvel outil** `stats_overview` : Statistiques et tendances (7j/30j/all)
- **Nouvel outil** `recurrent_patterns` : Détection de patterns récurrents dans les titres
- Filtres par tags, types, dates, regex

#### Export et partage
- **Nouveaux outils** `export_json` et `export_md` : Export complet de l'état
- **Nouvelles ressources** `export://json?{q}` et `export://md?{q}`
- Support Team Vault via `VIBETAPE_TEAM_DIR` pour collaboration Git

#### Améliorations techniques
- Types étendus avec `Relation` et `Comment`
- Store amélioré avec fusion intelligente team/local
- Gestion robuste des erreurs et valeurs par défaut
- Timeline enrichie avec indicateurs de relations

### 🔧 Corrections
- API OpenAI corrigée (`chat.completions.create` au lieu de `responses.create`)
- Nettoyage automatique des blocs markdown dans les réponses JSON
- Messages de démarrage redirigés vers stderr (protocole MCP propre)
- Gestion d'erreurs améliorée avec messages explicites

### 📊 Statistiques
- **Outils** : 5 → 12 (+140%)
- **Ressources** : 3 → 6 (+100%)
- **Types** : 2 → 4 (+100%)

---

## v0.1.0 - 2025-01-15

### 🚀 Version initiale

#### Fonctionnalités de base
- Capture de moments avec contexte git sécurisé
- Recherche sémantique avec embeddings OpenAI/TF-IDF
- Génération de cartes RETEX prescriptives
- Timeline par jour
- Stockage JSON local portable

#### Outils MCP
- `mark_moment` : Capturer un moment clé
- `list_moments` : Lister les moments récents
- `search_moments` : Recherche sémantique
- `make_retex` : Générer une carte RETEX
- `export_timeline` : Timeline Markdown

#### Ressources MCP
- `moment://{id}` : Moment individuel JSON
- `timeline://{day}` : Timeline d'un jour
- `retex://{id}` : Carte RETEX JSON

#### Sécurité
- Lecture seule sur les fichiers projet
- Écriture uniquement dans `~/.vibetape/`
- Pas d'exécution shell dangereuse
- Fallback TF-IDF si pas d'OpenAI
