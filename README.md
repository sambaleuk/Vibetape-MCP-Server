# 🎞️ VibeTape MCP Server

> **Record the vibe of your build** — A revolutionary Model Context Protocol (MCP) server that captures key development moments, creates actionable RETEX cards, and provides **context handoff** between AI sessions to eliminate knowledge loss.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/Version-v0.3.0-green)](https://github.com/sambaleuk/Vibetape-MCP-Server/releases)

## 🚀 What is VibeTape?

VibeTape transforms your development workflow into a **proactive context management system**. Beyond capturing moments, it provides **intelligent context handoff** between sessions, **automatic denoising** of trivial entries, and **cross-session continuity** that works with any MCP-compatible AI client.

**Perfect for:**
- 🎯 **Solo developers** who want to remember past solutions
- 👥 **Teams** who need shared knowledge and context
- 🔄 **Consultants** who work across multiple similar projects
- 📚 **Technical leads** building institutional knowledge

## ✨ Key Features

### 🚀 Context Handoff System (NEW v0.3.0)
- **Transition cards** — Generate compact context summaries (350 tokens)
- **Smart ranking** — Intelligent moment prioritization by recency, type, and impact
- **Cross-session continuity** — Never lose context between AI sessions
- **Proactive suggestions** — Auto-detect when context window is saturating

### 🧹 Intelligent Denoising (NEW v0.3.0)
- **Noise filtering** — Auto-detect and filter trivial moments
- **Duplicate merging** — Consolidate similar entries intelligently
- **Signal scoring** — Quality metrics for moment relevance (0-1 scale)
- **Cooldown detection** — Prevent spam from repetitive actions

### 🎯 Smart Moment Capture
- **Wins, fails, decisions, notes** — capture what matters
- **Git context** — automatic branch, commit, and diff tracking
- **Zero overhead** — secure, read-only project file access

### 🔍 Intelligent Search
- **Semantic search** with OpenAI embeddings (TF-IDF fallback)
- **Advanced filtering** by tags, dates, types, and regex
- **Relation mapping** — link related moments (`causes`, `solves`, `relates`)

### 🧠 AI-Powered Insights
- **RETEX cards** — AI-generated prescriptive rules from your experiences
- **Pattern detection** — find recurring issues automatically  
- **Statistics dashboard** — track your development patterns

### 👥 Team Collaboration
- **Team Vault** — optional shared state via Git
- **Comments** — collaborative annotations on moments
- **Export tools** — JSON and Markdown for documentation

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

#### 🌟 Gemini CLI
```bash
# Install MCP support for Gemini CLI
pip install mcp-client

# Configure VibeTape
gemini-cli config add-mcp vibetape \
  --command "node" \
  --args "/absolute/path/to/Vibetape-MCP-Server/dist/server.js" \
  --env OPENAI_API_KEY=your-key-here
```

#### 🔧 Continue.dev
Add to your `.continue/config.json`:
```json
{
  "mcpServers": {
    "vibetape": {
      "command": "node",
      "args": ["/absolute/path/to/Vibetape-MCP-Server/dist/server.js"],
      "env": {
        "OPENAI_API_KEY": "your-openai-key-here"
      }
    }
  }
}
```

#### ⚡ Custom MCP Clients
VibeTape implements the full MCP specification and works with any compliant client:
- **GitHub Copilot Chat** (via MCP extensions)
- **Custom AI assistants** built with MCP SDK
- **Enterprise AI platforms** supporting MCP protocol

### 3. Start Using

Restart your AI client and start capturing moments:

```
Hey AI, mark this moment: "Successfully implemented Redis caching - reduced API response time from 200ms to 50ms" as a win with tags: api, performance, redis
```

### 4. Try Context Handoff (v0.3.0)

Experience the revolutionary context continuity:

```
# When your context window is getting full
AI: "I notice we're approaching context limits. Should I generate a transition card?"

# Generate handoff
generate_context_handoff with budgetTokens: 350

# Later, in a different AI client or session
AI: "Let me read your previous context..."
→ Instantly resume with full project state, decisions, and next steps
```

## 🛠️ Available Tools

### 🚀 Context Handoff Tools (NEW v0.3.0)
- **`generate_context_handoff`** — Create compact transition cards (350 tokens)
- **`suggest_transition_card`** — Auto-suggest handoff when context saturates
- **`sweep_noise`** — Intelligent denoising of trivial/duplicate moments

### Core Tools
- **`mark_moment`** — Capture key development moments
- **`search_moments`** — Find similar past experiences  
- **`list_moments`** — Browse recent captures
- **`make_retex`** — Generate AI prescriptive cards
- **`export_timeline`** — Day-by-day development timeline

### Advanced Tools (v0.2+)
- **`link_moments`** — Create relationships between moments
- **`comment_moment`** — Add collaborative annotations
- **`search_moments_advanced`** — Multi-criteria search
- **`stats_overview`** — Development pattern analytics
- **`recurrent_patterns`** — Automatic issue pattern detection
- **`export_json/md`** — Full state exports

## 📋 Resources

### 🚀 Context Handoff Resources (NEW v0.3.0)
- **`handoff://{id}`** — Transition card for cross-session continuity (Markdown)

### Core Resources
- **`moment://{id}`** — Individual moment details (JSON)
- **`timeline://{day}`** — Daily timeline (Markdown)
- **`retex://{id}`** — AI-generated prescriptive card (JSON)
- **`graph://{id}`** — Moment relationship graph (JSON)
- **`export://json?{q}`** — Full export (JSON)
- **`export://md?{q}`** — Full export (Markdown)

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
- ❌ No AI-generated RETEX cards

## 👥 Team Collaboration

Enable team sharing by setting `VIBETAPE_TEAM_DIR` to a Git repository:

1. Set `VIBETAPE_TEAM_DIR=~/your-team-repo` in your environment
2. VibeTape creates `team_state.json` in that directory
3. Commit and push the file to share with your team
4. Team members get shared moments, relations, and comments

## 🔒 Security & Privacy

VibeTape is designed with security in mind:

- **🔐 Local storage only** — Data stays in `~/.vibetape/` by default
- **👀 Read-only project access** — Never modifies your code
- **🚫 No shell execution** — Only safe Git read operations
- **🌐 Minimal network** — Only OpenAI API (optional)
- **🔑 Environment variables** — API keys never hardcoded

## 📊 Use Cases

### 🚀 Context Handoff (NEW v0.3.0)
```
# End of day in Claude Desktop
Generate handoff → Get compact transition card

# Next morning in Cursor IDE  
Read handoff://{id} → Instantly resume with full context
→ Never lose momentum between sessions
```

### Solo Development
```
Mark moment: "Fixed memory leak in React component by moving effect cleanup"
Search: "memory leak React"
→ Instantly find your past solution
```

### Team Knowledge Sharing  
```
Link moments: "Timeout error" solves "API performance issue"  
Comment: "This also works for the user service endpoints"
→ Build institutional knowledge
```

### Pattern Recognition
```
Run stats_overview → See you have 15 "timeout" related fails this month
Run recurrent_patterns → Discover common root causes
→ Proactively fix systemic issues
```

### Documentation Generation
```
Export timeline for sprint retrospective
Generate RETEX cards for post-mortem
→ Turn experience into actionable documentation
```

### 🧹 Intelligent Denoising (NEW v0.3.0)
```
Run sweep_noise → Auto-filter trivial moments
Signal scoring → Focus on high-value entries
→ Maintain clean, actionable development history
```

## 🏗️ Architecture

VibeTape follows MCP (Model Context Protocol) standards and works with **any MCP-compatible AI client**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Any MCP Client │◄──►│  VibeTape MCP   │◄──►│  Local Storage  │
│ Claude/Cursor/  │    │     Server      │    │   ~/.vibetape   │
│ Gemini/Custom   │    │    (v0.3.0)     │    │ + Team Vault    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   OpenAI API    │
                      │   (optional)    │
                      └─────────────────┘
```

### 🚀 Context Handoff Flow (v0.3.0)
```
Session A (Claude)        VibeTape           Session B (Cursor)
     │                       │                       │
     ├─► generate_handoff ───┤                       │
     │   (350 tokens)        │                       │
     │                       ├─► handoff://{id}      │
     │                       │                       │
     │                       │   ◄─── read handoff ─┤
     │                       │                       │
     │                       └─► Full context ──────►│
```

## 📈 Roadmap

### 🎯 Next Release (v0.4.0)
- [ ] **Enhanced handoff templates** — Customizable transition card formats
- [ ] **Multi-session analytics** — Cross-client usage patterns
- [ ] **Smart moment auto-capture** — Git hook integration with denoising

### 🚀 Future Features
- [ ] **SQLite backend** — Better performance for large datasets
- [ ] **Web dashboard** — Visual relationship graphs and analytics
- [ ] **Slack/Discord integration** — Share moments with team chat
- [ ] **VS Code extension** — Native IDE integration
- [ ] **Export integrations** — Notion, Obsidian, etc.

## 🤝 Contributing

We welcome contributions! VibeTape is built for the developer community.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) by Anthropic
- Inspired by the need for better developer knowledge management
- Thanks to the open source community for amazing tools and libraries

---

**Ready to record the vibe of your build?** ⭐ Star this repo and start capturing your development moments!

[Get Started](#quick-start) • [Join Discussions](https://github.com/sambaleuk/Vibetape-MCP-Server/discussions) • [Report Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues)
