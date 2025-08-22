# Changelog

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
