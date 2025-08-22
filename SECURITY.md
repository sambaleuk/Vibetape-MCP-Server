# Security Policy

## 🔒 Security Overview

VibeTape MCP Server is designed with security as a core principle. This document outlines our security practices and how to report vulnerabilities.

## 🛡️ Security Features

### Data Privacy
- **Local storage only** — All data stored in `~/.vibetape/` by default
- **No telemetry** — Zero data collection or phone-home functionality  
- **Optional cloud** — OpenAI API is optional, works fully offline with TF-IDF
- **User control** — You control where data is stored via `VIBETAPE_HOME`

### File System Access
- **Read-only project access** — Never modifies your source code
- **Restricted writes** — Only writes to designated VibeTape directories
- **No system files** — Cannot access system configuration or sensitive files
- **Sandboxed operation** — Runs in isolated MCP server context

### Command Execution
- **No shell execution** — No arbitrary command execution capabilities
- **Safe Git operations** — Only read-only Git commands (`git status`, `git log`, `git diff`)
- **Error handling** — All external commands wrapped in try/catch blocks
- **No user input execution** — User data never executed as commands

### Network Security
- **Minimal network usage** — Only OpenAI API when configured
- **HTTPS only** — All API calls use secure HTTPS
- **API key protection** — Keys loaded from environment variables only
- **Graceful degradation** — Works fully offline without API keys

### Code Security
- **TypeScript** — Type safety prevents many runtime errors
- **Input validation** — All inputs validated with Zod schemas
- **Error boundaries** — Comprehensive error handling prevents crashes
- **Dependency security** — Regular dependency updates and security audits

## 📋 Security Audit Checklist

We regularly audit VibeTape for security issues:

- [x] No hardcoded secrets or API keys
- [x] No arbitrary code execution paths
- [x] Restricted file system access
- [x] Input validation on all endpoints
- [x] Secure dependency management
- [x] Error handling prevents information leakage
- [x] Network requests limited to essential services
- [x] Local storage properly sandboxed

## 🚨 Reporting Security Vulnerabilities

We take security vulnerabilities seriously. If you discover a security issue:

### Please DO:
- Email security issues to: [your-security-email@domain.com]
- Provide detailed reproduction steps
- Include the affected version numbers
- Give us reasonable time to fix before public disclosure

### Please DON'T:
- Open public GitHub issues for security vulnerabilities
- Share vulnerabilities on social media before we can fix them
- Attempt to access data that doesn't belong to you

## 🔄 Security Update Process

1. **Report received** — We acknowledge within 24 hours
2. **Investigation** — We investigate and confirm the issue
3. **Fix development** — We develop and test a fix
4. **Release** — We release a patch version with the fix
5. **Disclosure** — We publicly disclose after users have time to update

## 📚 Security Best Practices for Users

### Installation
```bash
# Always verify the source
git clone https://github.com/sambaleuk/Vibetape-MCP-Server.git
cd Vibetape-MCP-Server

# Check for any suspicious files
ls -la

# Install dependencies (review package.json first)
npm install
```

### Configuration
```bash
# Use environment variables for API keys
export OPENAI_API_KEY="your-key-here"

# Never commit API keys to Git
echo ".env" >> .gitignore
```

### Team Sharing
```bash
# For team collaboration, use a private repository
# Never share team_state.json in public repositories
# Review team_state.json before committing (no sensitive data)
```

## 🔍 Security Monitoring

We monitor for security issues through:

- **Dependency scanning** — Automated checks for vulnerable dependencies
- **Code analysis** — Static analysis for security anti-patterns
- **Community reports** — User and security researcher reports
- **Regular audits** — Periodic security reviews

## 📞 Contact

For security-related questions or concerns:
- **Security issues**: [your-security-email@domain.com]
- **General questions**: [GitHub Issues](https://github.com/sambaleuk/Vibetape-MCP-Server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sambaleuk/Vibetape-MCP-Server/discussions)

## 📄 Supported Versions

We provide security updates for:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | ✅ Full support    |
| 0.1.x   | ⚠️ Critical fixes only |
| < 0.1   | ❌ Not supported   |

---

**Security is a shared responsibility.** Help us keep VibeTape secure by following best practices and reporting issues responsibly.
