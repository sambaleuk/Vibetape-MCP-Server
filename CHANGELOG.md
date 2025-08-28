# Changelog

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
