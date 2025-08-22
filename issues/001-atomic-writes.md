# [CRITICAL] Atomic writes + merge policy for team_state.json

## 🚨 Problem
Current implementation has race condition risks:
- Concurrent writes can overwrite team/local changes
- JSON merge can create duplicates and orphaned relations
- No conflict resolution strategy

## 💥 Impact
- **Data loss** in team environments
- **Corruption** of moment relationships  
- **Unusable** for teams > 2 people

## ✅ Solution

### 1. Atomic Writes
```typescript
import writeFileAtomic from 'write-file-atomic';

async function save(state: State) {
  await writeFileAtomic(FILE, JSON.stringify(state, null, 2));
  if (TEAM_FILE) {
    // Atomic team file write too
    await writeFileAtomic(TEAM_FILE, JSON.stringify(mergedState, null, 2));
  }
}
```

### 2. State Versioning
```typescript
type State = { 
  version: number; // Start at 2
  moments: Moment[]; 
  retex: RetexCard[] 
};

type Moment = {
  // ... existing fields
  origin: 'local' | 'team';
  modified_ts: number; // For conflict resolution
}
```

### 3. Deterministic Merge
```typescript
function mergeStates(local: State, team: State): State {
  // Last-write-wins based on modified_ts
  // Deduplicate by ID
  // Garbage collect orphaned relations
}
```

## 🧪 Test Cases
- [ ] Concurrent writes don't corrupt state
- [ ] Team merge preserves all unique moments
- [ ] Orphaned relations are cleaned up
- [ ] Modified timestamps resolve conflicts correctly

## 📋 Implementation Checklist
- [ ] Add `write-file-atomic` dependency
- [ ] Extend State and Moment types
- [ ] Implement deterministic merge function
- [ ] Add state validation with ajv
- [ ] Write comprehensive tests
- [ ] Update documentation

## 🎯 Success Criteria
- Zero data corruption in team environments
- Deterministic merge results
- Performance impact < 10ms per operation

**Priority: P0 - Ship in v0.2.1**
