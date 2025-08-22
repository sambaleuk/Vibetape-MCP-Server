# 🎞️ VibeTape MCP Roadmap

Based on comprehensive technical audit and user feedback.

## 🚨 Critical Fixes (v0.2.1) - Ship ASAP

### 1. State Corruption Prevention
- **Issue**: Concurrent writes can overwrite team/local changes
- **Fix**: Atomic writes + deterministic merge + timestamped conflict resolution
- **Implementation**: `fs-extra.writeFileSync` → `write-file-atomic` + merge strategy
- **Priority**: P0 (blocks team usage)

### 2. Team Vault Robustness  
- **Issue**: JSON merge creates duplicates/orphaned relations
- **Fix**: Schema validation + garbage collection + origin tracking
- **Implementation**: Add `state.version`, `origin: 'local'|'team'`, `modified_ts`
- **Priority**: P0 (data integrity)

### 3. Search Performance
- **Issue**: 5k+ moments will cause scan performance issues
- **Fix**: In-memory index for common queries + pagination
- **Implementation**: Title n-grams index, tag lookup table, date ranges
- **Priority**: P1 (scalability)

## 🛡️ Reliability & UX (v0.2.2)

### 4. RETEX Fallback UX
- **Issue**: No `make_retex` without OpenAI, poor UX
- **Fix**: Graceful degradation with helpful alternatives
- **Implementation**: Suggest `export_md`/`timeline` when OpenAI unavailable
- **Priority**: P1 (user experience)

### 5. Security Hardening
- **Issue**: Need E2E test ensuring no project writes
- **Fix**: Automated security test in CI
- **Implementation**: Spawn server, run tools, verify no project file changes
- **Priority**: P1 (trust)

## 🚀 High-Impact Features (v0.3.0)

### 6. Auto-Link Fail→Win
- **Issue**: Manual linking is tedious
- **Fix**: Heuristic suggestion for fail→win patterns
- **Implementation**: Cosine similarity + time window + kind analysis
- **Priority**: P2 (productivity boost)

### 7. One-Click Sharing
- **Issue**: Export workflow is multi-step
- **Fix**: Direct clipboard/markdown output for PR/issues
- **Implementation**: New tool `share_moment` with formatted output
- **Priority**: P2 (workflow integration)

## 🏗️ Infrastructure (v0.3.x)

### 8. SQLite Backend Option
- **Issue**: JSON won't scale to enterprise usage
- **Fix**: Optional SQLite with FTS5 + WAL mode
- **Implementation**: Keep MCP API unchanged, swap storage layer
- **Priority**: P3 (enterprise readiness)

### 9. Advanced Analytics
- **Issue**: Basic stats aren't actionable enough  
- **Fix**: Mini-dashboard with actionable insights
- **Implementation**: Time-to-solve median, fail→win chains, hourly patterns
- **Priority**: P3 (insights)

## 🔧 Developer Experience

### 10. CI/CD Pipeline
- **Status**: Missing
- **Fix**: GitHub Actions with build + smoke tests
- **Implementation**: Node 20, npm ci, tsc check, MCP spawn test
- **Priority**: P2 (quality gates)

### 11. Troubleshooting Docs
- **Status**: Basic setup only
- **Fix**: Common issues section in README
- **Implementation**: Absolute paths, Node versions, environment debugging
- **Priority**: P2 (support reduction)

---

## 📊 Success Metrics

### v0.2.1 Goals
- ✅ Zero data corruption reports
- ✅ Team Vault works reliably for 5+ person teams
- ✅ Performance acceptable up to 1k moments

### v0.3.0 Goals  
- ✅ 50% reduction in manual linking via auto-suggestions
- ✅ Direct integration with PR workflows
- ✅ Enterprise pilot ready (10k+ moments)

---

## 🎯 Next Actions

1. **Create GitHub Issues** for P0/P1 items
2. **Implement v0.2.1 hardening** (atomic writes, validation, tests)
3. **Add CI pipeline** with security/smoke tests
4. **Gather user feedback** on auto-linking heuristics
5. **Plan SQLite migration** for v0.3.0

**Current Status: 7.5/10 → Target: 9/10 with v0.2.1 hardening**
