# VibeTape MCP v0.2 (Hybrid Active Memory)

> **VibeTape** — "record the vibe of your build". Un serveur MCP qui capture les moments clés de votre développement (victoires, échecs, décisions), génère des cartes RETEX compactes, et permet à votre IA IDE de les rappeler/rechercher/rejouer à la demande.

## 🆕 Nouveautés v0.2

- **Relations entre moments** : Liez vos moments (`causes`, `solves`, `relates`)
- **Commentaires** : Ajoutez des commentaires sur les moments
- **Recherche avancée** : Filtres combinés (tags, dates, regex, sémantique)
- **Analyses** : Stats, patterns récurrents, graphiques de relations
- **Team Vault** : Partage optionnel avec l'équipe via fichier Git
- **Export** : JSON et Markdown complets

## 🎯 Qu'est-ce que c'est ?

**VibeTape** est un serveur MCP (Model Context Protocol) qui expose :

- **Outils** : `mark_moment`, `list_moments`, `search_moments`, `make_retex`, `export_timeline`
- **Ressources** : `moment://{id}`, `timeline://{day}`, `retex://{id}`
- **Prompts** : `induce-retex`, `commit-msg`

**Stockage local** : Store JSON dans `~/.vibetape/state.json` (simple & portable). Embeddings OpenAI optionnels (fallback vers TF-IDF cosine).

**Sécurité** : lecture seule sur les fichiers projet (pas d'exécution shell), écrit uniquement dans `~/.vibetape/`.

## 🚀 Installation et configuration

### 1. Cloner et installer les dépendances

```bash
git clone <votre-repo>
cd vibetape-mcp
npm install
```

### 2. Configuration de l'environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
cp .env.example .env
```

Éditez `.env` :
```env
OPENAI_API_KEY=sk-your-openai-key-here
# Optionnel : où stocker l'état
VIBETAPE_HOME=~/.vibetape
```

> **Note** : La clé OpenAI est optionnelle. Sans elle, VibeTape utilisera un fallback TF-IDF pour les embeddings.

### 3. Lancer le serveur

```bash
# Mode développement
npm run dev

# Ou compiler et lancer
npm run build
npm start
```

## 🔌 Connexion avec Claude Desktop (macOS)

Éditez `~/Library/Application Support/Claude/claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "vibetape": {
      "command": "node",
      "args": ["/Users/birahimmbow/Projets/VibeTapeMCP/dist/server.js"],
      "cwd": "/Users/birahimmbow/Projets/VibeTapeMCP",
      "env": { 
        "OPENAI_API_KEY": "votre-clé-openai-ici"
      }
    }
  }
}
```

Redémarrez Claude Desktop → ouvrez l'icône marteau → vous verrez les outils VibeTape.

## 🔌 Connexion avec Claude Code (VS Code)

### 1. Installer l'extension Claude Code

Installez l'extension [Claude Code](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code) depuis le marketplace VS Code.

### 2. Configuration MCP

Ouvrez les paramètres VS Code (`Cmd+,` sur macOS ou `Ctrl+,` sur Windows/Linux) et cherchez "claude".

Ou éditez directement votre `settings.json` :

```json
{
  "claude.mcpServers": {
    "vibetape": {
      "command": "node",
      "args": ["/Users/birahimmbow/Projets/VibeTapeMCP/dist/server.js"],
      "cwd": "/Users/birahimmbow/Projets/VibeTapeMCP",
      "env": {
        "OPENAI_API_KEY": "votre-clé-openai-ici"
      }
    }
  }
}
```

### 3. Utilisation dans VS Code

- Ouvrez la palette de commandes (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Tapez "Claude" pour voir les commandes disponibles
- Ou utilisez le panneau Claude dans la barre latérale
- Les outils VibeTape seront automatiquement disponibles dans vos conversations

## 🔌 Autres clients MCP

VibeTape fonctionne avec n'importe quel client MCP compatible. La configuration de base est toujours :

```json
{
  "command": "node",
  "args": ["/chemin/absolu/vers/VibeTapeMCP/dist/server.js"],
  "cwd": "/chemin/absolu/vers/VibeTapeMCP",
  "env": {
    "OPENAI_API_KEY": "votre-clé-openai-ici"
  }
}
```

## 💡 Conseils de configuration

### Chemin absolu requis
⚠️ **Important** : Utilisez toujours des **chemins absolus** dans la configuration. Les chemins relatifs ne fonctionnent pas de manière fiable avec les clients MCP.

### Variable d'environnement optionnelle
Si vous préférez ne pas mettre votre clé OpenAI dans la config, créez un fichier `.env` dans le dossier du projet :

```bash
# Dans /Users/birahimmbow/Projets/VibeTapeMCP/.env
OPENAI_API_KEY=votre-clé-openai-ici
VIBETAPE_HOME=~/.vibetape
```

Puis utilisez cette configuration simplifiée :
```json
{
  "command": "node",
  "args": ["/Users/birahimmbow/Projets/VibeTapeMCP/dist/server.js"],
  "cwd": "/Users/birahimmbow/Projets/VibeTapeMCP"
}
```

### Fallback sans OpenAI
VibeTape fonctionne même **sans clé OpenAI** ! Il utilisera alors :
- ✅ Embeddings TF-IDF pour la recherche sémantique
- ❌ Pas de génération de cartes RETEX (outil `make_retex` indisponible)

## 📖 Utilisation typique

### 1. Marquer un moment

Pendant votre développement, quand quelque chose d'important se passe :

```
Outil: mark_moment
{
  "title": "API cache Redis implémentée avec succès",
  "kind": "win",
  "tags": ["api", "cache", "redis"],
  "details": "Réduction du temps de réponse de 200ms à 50ms"
}
```

### 2. Rechercher des moments similaires

Plus tard, face à un problème similaire :

```
Outil: search_moments
{
  "query": "problème performance API",
  "k": 5
}
```

### 3. Générer une carte RETEX

Pour créer une carte de retour d'expérience prescriptive :

```
Outil: make_retex
{
  "momentId": "01HXX..."
}
```

### 4. Exporter la timeline du jour

Pour partager votre journée :

```
Outil: export_timeline
{
  "day": "2025-01-15"
}
```

## 🛠️ Outils disponibles

### Outils v0.1 (Base)

#### `mark_moment`
Capture un moment clé avec snapshot de contexte sécurisé.

**Paramètres :**
- `title` (requis) : Titre du moment
- `kind` (requis) : Type - `'win'|'fail'|'decision'|'note'`
- `tags` (optionnel) : Tags pour catégorisation
- `details` (optionnel) : Détails supplémentaires
- `cwd` (optionnel) : Répertoire de travail

### `list_moments`
Liste les moments récents.

**Paramètres :**
- `limit` (optionnel) : Nombre de moments à retourner (défaut: 10)

### `search_moments`
Recherche sémantique dans les moments.

**Paramètres :**
- `query` (requis) : Requête de recherche
- `k` (optionnel) : Nombre de résultats (défaut: 5)

### `make_retex`
Génère une carte RETEX à partir d'un moment.

**Paramètres :**
- `momentId` (requis) : ID du moment source

#### `export_timeline`
Exporte une timeline Markdown pour un jour donné.

**Paramètres :**
- `day` (requis) : Jour au format YYYY-MM-DD

### 🆕 Nouveaux outils v0.2

#### `link_moments`
Crée une relation entre deux moments.

**Paramètres :**
- `from` (requis) : ID du moment source
- `to` (requis) : ID du moment cible  
- `kind` (requis) : Type de relation - `'causes'|'solves'|'relates'`
- `note` (optionnel) : Note sur la relation

#### `comment_moment`
Ajoute un commentaire à un moment.

**Paramètres :**
- `id` (requis) : ID du moment à commenter
- `text` (requis) : Texte du commentaire
- `author` (optionnel) : Auteur du commentaire

#### `search_moments_advanced`
Recherche avancée combinant filtres et sémantique.

**Paramètres :**
- `query` (optionnel) : Requête sémantique
- `tags` (optionnel) : Tags requis
- `kinds` (optionnel) : Types de moments
- `from` (optionnel) : Date de début (ISO)
- `to` (optionnel) : Date de fin (ISO)
- `regex` (optionnel) : Pattern regex pour le texte
- `k` (optionnel) : Nombre max de résultats

#### `stats_overview`
Statistiques et tendances.

**Paramètres :**
- `window` (optionnel) : Fenêtre temporelle - `'7d'|'30d'|'all'`

#### `recurrent_patterns`
Identifie les patterns récurrents dans les titres.

**Paramètres :** Aucun

#### `export_json` / `export_md`
Exporte tout l'état en JSON ou Markdown.

**Paramètres :**
- `q` (optionnel) : Paramètre de requête

## 📋 Ressources disponibles

### `moment://{id}`
Moment capturé au format JSON.

### `timeline://{day}`
Timeline Markdown d'un jour spécifique.

### `retex://{id}`
Carte RETEX prescriptive au format JSON.

### 🆕 Nouvelles ressources v0.2

#### `graph://{id}`
Graphique de relations pour un moment (nœuds + arêtes JSON).

#### `export://json?{q}`
Export JSON complet de l'état.

#### `export://md?{q}`
Export Markdown complet des moments.

## 🔗 Team Vault (Collaboration)

Pour partager VibeTape avec votre équipe, configurez :

```bash
# Dans votre .env
VIBETAPE_TEAM_DIR=~/votre/repo/equipe
```

VibeTape créera automatiquement `team_state.json` dans ce dossier. Commitez/pushez ce fichier dans un repo Git privé pour partager :
- Moments de l'équipe
- Relations entre moments  
- Commentaires collaboratifs
- Recherche partagée

## 🎯 Prompts disponibles

### `induce-retex`
Template réutilisable pour l'induction de règles RETEX.

### `commit-msg`
Aide pour créer des messages de commit conventionnels.

## 🔒 Sécurité et portée

- **Aucune écriture shell, aucun appel réseau** sauf embeddings OpenAI optionnels
- Écrit uniquement dans `~/.vibetape/state.json`
- Lecture seule sur les fichiers du projet
- Capture de contexte git sécurisée (pas d'exécution de tests)

## 🗂️ Structure des données

### Moment
```typescript
type Moment = {
  id: string;
  ts: number;
  title: string;
  kind: 'win'|'fail'|'decision'|'note';
  tags: string[];
  details?: string;
  cwd?: string;
  git?: { branch?: string; sha?: string };
  snapshot?: { diff?: string; tests?: string; deps?: string };
  text: string; // texte searchable concaténé
  embedding?: number[]; // optionnel
  relations?: Relation[]; // 🆕 relations vers autres moments
  comments?: Comment[]; // 🆕 commentaires
};

// 🆕 Nouveaux types v0.2
type Relation = {
  to: string;
  kind: 'causes'|'solves'|'relates';
  note?: string;
};

type Comment = {
  ts: number;
  author?: string;
  text: string;
};
```

### Carte RETEX
```typescript
type RetexCard = {
  id: string;
  momentId: string;
  title: string;
  type: 'pitfall'|'pattern'|'decision';
  rule_short: string;
  bullets: [string, string, string]; // Situation, Action, Résultat
  dont?: string;
  tags: string[];
};
```

## 🚧 Roadmap (post-MVP)

- SQLite + HNSW pour recherche sémantique scalable
- Hooks automatiques : snippet Git post-commit pour appeler `mark_moment`
- Fusion de conflits/moments → règle généralisée (RETEX Flash merge)
- Export PR/CHANGELOG directement comme ressources

## 🎞️ Philosophie

VibeTape vous donne une interface MCP simple et élégante pour la **Mémoire Active Hybride** pendant le codage. Branchez-le dans Claude Desktop / Claude Code et commencez à enregistrer l'ambiance de votre build.

---

**C'est tout !** VibeTape capture l'essence de votre processus de développement. 🎞️✨
