[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sambaleuk-vibetape-mcp-server-badge.png)](https://mseep.ai/app/sambaleuk-vibetape-mcp-server)

# 🎞️ VibeTape MCP Server

> **Record the vibe of your build** — A revolutionary Model Context Protocol (MCP) server that captures key development moments, enables **multi-agent traceability**, provides **intelligent context curation**, and facilitates **seamless agent-to-agent handoffs**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/Version-v0.4.0-green)](https://github.com/sambaleuk/Vibetape-MCP-Server/releases)

## 🚀 What is VibeTape?

VibeTape transforms your development workflow into a **proactive context management system**. Beyond capturing moments, it provides **multi-agent coordination**, **intelligent context curation**, and **LangGraph-compatible handoffs** that work with any MCP-compatible AI client.

**Perfect for:**
- 🤖 **Multi-agent systems** that need shared context and traceability
- 🎯 **Solo developers** who want to remember past solutions
- 👥 **Teams** who need shared knowledge and context
- 🔄 **AI orchestration frameworks** (LangGraph, CrewAI, AutoGen)
- 📚 **Technical leads** building institutional knowledge

## ✨ Key Features

### 🤖 Multi-Agent Traceability (NEW v0.4.0)
- **Actor management** — Register and track humans and AI agents
- **Task lifecycle** — Create, assign, and hand off tasks between agents
- **Agent analytics** — Success rates, activity patterns, performance metrics
- **Temporal tracking** — Know when facts became true and when they were superseded

### 🧠 Intelligent Context Curation (NEW v0.4.0)
- **RankRAG-style scoring** — Relevance scoring with weighted factors
- **Context window optimization** — Fit the best context within token budgets
- **Agent needs prediction** — Anticipate what context an agent will need
- **Smart moment selection** — Balance relevance, recency, and signal quality

### 🔄 Agent-to-Agent Handoffs (NEW v0.4.0)
- **LangGraph-compatible payloads** — Direct integration with agent frameworks
- **RETEX-aware handoffs** — Include relevant lessons learned
- **Risk warnings** — Highlight potential issues for receiving agents
- **Task continuity** — Seamless work transfer between agents

### 🚀 Context Handoff System (v0.3.0)
- **Transition cards** — Generate compact context summaries (350 tokens)
- **Smart ranking** — Intelligent moment prioritization by recency, type, and impact
- **Cross-session continuity** — Never lose context between AI sessions
- **Proactive suggestions** — Auto-detect when context window is saturating

### 🧹 Intelligent Denoising (v0.3.0)
- **Noise filtering** — Auto-detect and filter trivial moments
- **Duplicate merging** — Consolidate similar entries intelligently
- **Signal scoring** — Quality metrics for moment relevance (0-1 scale)

### 🎯 Smart Moment Capture
- **Wins, fails, decisions, notes** — capture what matters
- **Git context** — automatic branch, commit, and diff tracking
- **Actor attribution** — Know who (human or AI) created each moment

### 🔍 Intelligent Search
- **Semantic search** with OpenAI embeddings (TF-IDF fallback)
- **Advanced filtering** by tags, dates, types, and regex
- **Relation mapping** — link related moments (`causes`, `solves`, `relates`, `supersedes`)

### 🧠 AI-Powered Insights
- **RETEX cards** — AI-generated prescriptive rules from your experiences
- **Task-aware RETEX** — Get relevant lessons for specific tasks
- **Pattern detection** — find recurring issues automatically

## 🏃‍♂️ Quick Start

### 1. Install

```bash
git clone https://github.com/sambaleuk/Vibetape-MCP-Server.git
cd Vibetape-MCP-Server
npm install
npm run build
```

### 2. Configure Your AI Client

VibeTape works with **any MCP-compatible AI client**:

#### 🤖 Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "vibetape": {
      "command": "node",
      "args": ["/absolute/path/to/Vibetape-MCP-Server/dist/server.js"],
      "cwd": "/absolute/path/to/Vibetape-MCP-Server",
      "env": {
        "OPENAI_API_KEY": "your-openai-key-here"
      }
    }
  }
}
```

#### 💻 Cursor IDE
Add to your `~/.cursor/mcp.json`:
```json
{
  "vibetape": {
    "command": "node",
    "args": ["--loader", "ts-node/esm", "src/server.ts"],
    "cwd": "/absolute/path/to/Vibetape-MCP-Server",
    "env": {
      "OPENAI_API_KEY": "your-openai-key-here"
    }
  }
}
```

#### 🔧 Continue.dev / Other MCP Clients
VibeTape implements the full MCP specification and works with any compliant client.

### 3. Start Using

Restart your AI client and start capturing moments:

```
Hey AI, mark this moment: "Successfully implemented Redis caching" as a win with tags: api, performance
```

### 4. Multi-Agent Example (v0.4.0)

```
# Register an agent
register_actor with id: "code_reviewer", type: "agent", name: "Code Reviewer"

# Create a task
create_task with title: "Review authentication module", assigned_to: "code_reviewer"

# Agent captures moments linked to the task
mark_moment with title: "Found SQL injection vulnerability", task_id: "task_xyz"

# Hand off to another agent
create_handoff_for_agent with task_id: "task_xyz", from_agent: "code_reviewer", to_agent: "security_fixer"
```

## 🛠️ Available Tools

### 🤖 Multi-Agent Tools (NEW v0.4.0)
- **`register_actor`** — Register a human or AI agent
- **`get_actor`** — Get actor details and capabilities
- **`list_actors`** — List all registered actors
- **`get_actor_stats`** — Get performance statistics for an actor
- **`create_task`** — Create a new task with assignment
- **`update_task`** — Update task status and outcome
- **`list_tasks`** — List tasks with filtering options
- **`get_task_context`** — Get all moments related to a task

### 🧠 Context Intelligence Tools (NEW v0.4.0)
- **`context_relevance_score`** — Calculate RankRAG-style relevance for moments
- **`evaluate_context_window`** — Optimize context selection within token budget
- **`predict_agent_needs`** — Predict what context an agent will need
- **`get_retex_for_task`** — Get relevant RETEX cards for a task
- **`create_handoff_for_agent`** — Create LangGraph-compatible handoff payload

### 🚀 Context Handoff Tools (v0.3.0)
- **`generate_context_handoff`** — Create compact transition cards (350 tokens)
- **`suggest_transition_card`** — Auto-suggest handoff when context saturates
- **`sweep_noise`** — Intelligent denoising of trivial/duplicate moments

### Core Tools
- **`mark_moment`** — Capture key development moments (now with actor_id, task_id)
- **`search_moments`** — Find similar past experiences
- **`list_moments`** — Browse recent captures
- **`make_retex`** — Generate AI prescriptive cards
- **`export_timeline`** — Day-by-day development timeline

### Advanced Tools
- **`link_moments`** — Create relationships between moments
- **`supersede_moment`** — Mark a moment as superseded by another (temporal tracking)
- **`comment_moment`** — Add collaborative annotations
- **`search_moments_advanced`** — Multi-criteria search
- **`stats_overview`** — Development pattern analytics

## 📋 Resources

### 🤖 Agent Resources (NEW v0.4.0)
- **`actor://{id}`** — Actor details with stats (JSON)
- **`task://{id}`** — Task details with related moments (JSON)

### 🚀 Context Handoff Resources
- **`handoff://{id}`** — Transition card for cross-session continuity (Markdown)

### Core Resources
- **`moment://{id}`** — Individual moment details (JSON)
- **`timeline://{day}`** — Daily timeline (Markdown)
- **`retex://{id}`** — AI-generated prescriptive card (JSON)
- **`graph://{id}`** — Moment relationship graph (JSON)

## 🔧 Configuration

### Environment Variables

```bash
# Optional: OpenAI for semantic search and RETEX generation
OPENAI_API_KEY=sk-your-key-here

# Optional: Custom storage location (default: ~/.vibetape)
VIBETAPE_HOME=~/.vibetape

# Optional: Team collaboration directory
VIBETAPE_TEAM_DIR=~/your-team-repo
```

### Works Without OpenAI
VibeTape gracefully degrades without OpenAI:
- ✅ TF-IDF semantic search (good for most cases)
- ✅ All multi-agent features work fully
- ❌ No AI-generated RETEX cards

## 🏗️ Architecture

VibeTape follows MCP (Model Context Protocol) standards and is designed for **multi-agent orchestration**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MCP Clients    │◄──►│  VibeTape MCP   │◄──►│  Local Storage  │
│ Claude/Cursor/  │    │     Server      │    │   ~/.vibetape   │
│ LangGraph/CrewAI│    │    (v0.4.0)     │    │ + Team Vault    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                     │
         │                     ▼
         │            ┌─────────────────┐
         │            │   OpenAI API    │
         │            │   (optional)    │
         │            └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Multi-Agent Orchestration        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Agent A │─►│ Handoff │─►│ Agent B │  │
│  │(reviewer)│  │ Payload │  │ (fixer) │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────┘
```

### Agent Handoff Flow (v0.4.0)
```
Agent A (Code Reviewer)     VibeTape           Agent B (Security Fixer)
     │                          │                       │
     ├─► create_task ──────────►│                       │
     ├─► mark_moment (findings)─►│                       │
     │                          │                       │
     ├─► create_handoff_for_agent─►│                    │
     │   (LangGraph payload)    │                       │
     │                          │                       │
     │                          │   ◄── read handoff ──┤
     │                          │                       │
     │                          └─► Full context ──────►│
     │                              + RETEX cards       │
     │                              + Risk warnings     │
```

## 📊 Use Cases

### Multi-Agent Development Pipeline
```
# Code reviewer agent finds issues
register_actor id: "reviewer", type: "agent"
create_task title: "Security audit of auth module"
mark_moment title: "Found 3 SQL injection vulnerabilities"

# Hand off to security agent
create_handoff_for_agent from: "reviewer", to: "security_fixer"
→ Includes context, RETEX cards, risk warnings

# Security agent fixes and reports
update_task status: "completed", outcome: "success"
```

### Context-Aware Agent Routing
```
# Predict what context an agent needs
predict_agent_needs task_id: "xxx", actor_id: "debugger"
→ Returns recommended moments, RETEX cards, warnings

# Evaluate optimal context window
evaluate_context_window task_id: "xxx", budget_tokens: 2000
→ Returns ranked moments that fit the budget
```

### Cross-Session Continuity
```
# End of day in Claude Desktop
Generate handoff → Get compact transition card

# Next morning in Cursor IDE
Read handoff://{id} → Instantly resume with full context
```

## 🔒 Security & Privacy

- **🔐 Local storage only** — Data stays in `~/.vibetape/` by default
- **👀 Read-only project access** — Never modifies your code
- **🚫 No shell execution** — Only safe Git read operations
- **🌐 Minimal network** — Only OpenAI API (optional)
- **🔑 Environment variables** — API keys never hardcoded

## 📈 Roadmap

### 🚀 Future Features
- [ ] **SQLite backend** — Better performance for large datasets
- [ ] **Web dashboard** — Visual relationship graphs and analytics
- [ ] **Native LangGraph integration** — Direct Command pattern support
- [ ] **VS Code extension** — Native IDE integration
- [ ] **Export integrations** — Notion, Obsidian, etc.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) by Anthropic
- Inspired by multi-agent orchestration frameworks (LangGraph, CrewAI)
- Thanks to the open source community for amazing tools and libraries

---

**Ready to orchestrate your AI agents?** ⭐ Star this repo and start building!

[Get Started](#quick-start) • [Join Discussions](https://github.com/sambaleuk/Vibetape-MCP-Server/discussions) • [Report Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues)
