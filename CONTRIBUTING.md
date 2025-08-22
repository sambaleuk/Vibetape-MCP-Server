# Contributing to VibeTape MCP Server

🎉 **Thank you for considering contributing to VibeTape!** 

VibeTape is built by developers, for developers. Every contribution makes the developer experience better for everyone.

## 🚀 Quick Start for Contributors

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/Vibetape-MCP-Server.git`
3. **Install** dependencies: `npm install`
4. **Build** the project: `npm run build`
5. **Test** your changes: `npm test` (when available)

## 🎯 Ways to Contribute

### 🐛 Bug Reports
Found a bug? Help us fix it!

- **Search existing issues** first to avoid duplicates
- **Use the bug report template** when creating new issues
- **Include reproduction steps** and environment details
- **Add logs** and error messages when possible

### ✨ Feature Requests
Have an idea to make VibeTape better?

- **Check the roadmap** to see if it's already planned
- **Describe the use case** — why is this feature needed?
- **Provide examples** of how it would work
- **Consider the scope** — start small, iterate big

### 📝 Documentation
Documentation is code too!

- **Fix typos** and unclear explanations
- **Add examples** for complex features
- **Improve setup instructions** for different environments
- **Create tutorials** for common use cases

### 💻 Code Contributions
Ready to dive into the code?

#### Small Changes
- **Fix typos** in comments or documentation
- **Improve error messages** for better UX
- **Add input validation** for edge cases
- **Optimize performance** in hot paths

#### Medium Changes  
- **Add new MCP tools** following existing patterns
- **Improve search algorithms** (TF-IDF, semantic matching)
- **Add new export formats** (CSV, XML, etc.)
- **Enhance team collaboration** features

#### Large Changes
- **Database backends** (SQLite, PostgreSQL)
- **Web dashboard** for visualization
- **Git hooks integration** for automatic capture
- **VS Code extension** for native IDE support

## 🛠️ Development Setup

### Prerequisites
- **Node.js 18+** (we recommend using nvm)
- **npm 8+** 
- **Git**
- **TypeScript knowledge** (we use strict mode)

### Environment Setup
```bash
# Clone and setup
git clone https://github.com/your-username/Vibetape-MCP-Server.git
cd Vibetape-MCP-Server
npm install

# Create environment file
cp .env.example .env
# Add your OpenAI API key (optional for development)

# Build and test
npm run build
npm run dev  # Start development server
```

### Project Structure
```
src/
├── server.ts      # Main MCP server
├── store.ts       # Data storage layer  
├── embed.ts       # Embedding/search logic
├── snapshot.ts    # Git context capture
├── prompts.ts     # AI prompt templates
└── types.ts       # TypeScript definitions
```

## 📋 Development Guidelines

### Code Style
- **TypeScript strict mode** — No `any` types unless absolutely necessary
- **Consistent naming** — Use descriptive names for functions and variables  
- **Error handling** — Always handle errors gracefully
- **Comments** — Explain complex logic, not obvious code

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add amazing new feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new search_moments_advanced tool
fix: handle edge case in git snapshot capture  
docs: improve installation instructions
refactor: simplify store.ts error handling
test: add unit tests for embedding functions
```

### Pull Request Process

1. **Update documentation** if you've changed APIs
2. **Add tests** for new functionality (when test suite exists)
3. **Ensure builds pass** — `npm run build` should succeed
4. **Update CHANGELOG.md** for user-facing changes
5. **Request review** from maintainers

## 🧪 Testing (Coming Soon)

We're working on a comprehensive test suite. For now:

- **Manual testing** — Test your changes with Claude Desktop
- **Edge cases** — Try invalid inputs and error conditions
- **Performance** — Test with large datasets when possible

## 📚 Resources

### MCP Documentation
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP SDK Reference](https://github.com/modelcontextprotocol/typescript-sdk)

### Project-Specific
- [Architecture Overview](docs/architecture.md) (coming soon)
- [API Reference](docs/api.md) (coming soon)  
- [Deployment Guide](docs/deployment.md) (coming soon)

## 🎨 Design Principles

VibeTape follows these core principles:

1. **Developer-First** — Built by developers, for developers
2. **Security by Design** — Never compromise on security
3. **Privacy Focused** — Local-first, optional cloud
4. **Simple but Powerful** — Easy to start, scales with needs
5. **Open and Extensible** — Plugin architecture, open APIs

## 🏆 Recognition

Contributors get recognized in:
- **CHANGELOG.md** — Major contributions noted in releases
- **README.md** — Top contributors listed  
- **GitHub** — Contributor graphs and commit history
- **Community** — Shoutouts in discussions and social media

## ❓ Questions?

- **General questions** — [GitHub Discussions](https://github.com/sambaleuk/Vibetape-MCP-Server/discussions)
- **Bug reports** — [GitHub Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues)
- **Feature requests** — [GitHub Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues) with `enhancement` label
- **Security issues** — See [SECURITY.md](SECURITY.md)

## 📜 Code of Conduct

We're committed to providing a welcoming and inclusive experience for everyone. We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/).

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community

**Unacceptable behavior:**
- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing private information without permission
- Other conduct inappropriate for a professional setting

---

**Ready to contribute?** 🚀 Pick an issue, fork the repo, and let's build something amazing together!

[View Open Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues) • [Join Discussions](https://github.com/sambaleuk/Vibetape-MCP-Server/discussions)
