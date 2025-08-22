# 🎞️ VibeTape MCP Server

> **Record the vibe of your build** — A Model Context Protocol (MCP) server that captures key development moments, creates actionable RETEX cards, and enables your AI IDE to instantly recall and replay past solutions.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)

## 🚀 What is VibeTape?

VibeTape transforms your development workflow into a **hybrid active memory system**. Instead of losing track of solutions, decisions, and learnings, VibeTape captures your key moments and makes them instantly searchable and actionable.

**Perfect for:**
- 🎯 **Solo developers** who want to remember past solutions
- 👥 **Teams** who need shared knowledge and context
- 🔄 **Consultants** who work across multiple similar projects
- 📚 **Technical leads** building institutional knowledge

## ✨ Key Features

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

### 2. Configure Claude Desktop

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

### 3. Start Using

Restart Claude Desktop and start capturing moments:

```
Hey Claude, mark this moment: "Successfully implemented Redis caching - reduced API response time from 200ms to 50ms" as a win with tags: api, performance, redis
```

## 🛠️ Available Tools

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

## 🏗️ Architecture

VibeTape follows MCP (Model Context Protocol) standards:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude IDE    │◄──►│  VibeTape MCP   │◄──►│  Local Storage  │
│                 │    │     Server      │    │   ~/.vibetape   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │   (optional)    │
                       └─────────────────┘
```

## 📈 Roadmap

- [ ] **SQLite backend** — Better performance for large datasets
- [ ] **Web dashboard** — Visual relationship graphs and analytics
- [ ] **Git hooks** — Automatic moment capture on commits
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
