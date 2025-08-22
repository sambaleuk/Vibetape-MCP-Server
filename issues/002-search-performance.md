# [PERFORMANCE] In-memory index + pagination for advanced search

## 🐌 Problem
Current `search_moments_advanced` scans entire JSON:
- Linear O(n) search through all moments
- No pagination support
- Will become unusable at 5k+ moments
- Memory inefficient for large datasets

## 📊 Performance Impact
- **1k moments**: ~50ms search time
- **5k moments**: ~250ms search time  
- **10k moments**: ~500ms+ search time
- **Memory usage**: Loads entire state for each search

## ⚡ Solution

### 1. In-Memory Indexes
```typescript
class MomentIndex {
  private titleNgrams: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private dateRanges: Array<{start: number, end: number, ids: Set<string>}> = [];
  
  rebuild(moments: Moment[]) {
    // Build n-gram index for titles
    // Build tag lookup table  
    // Build date range buckets
  }
  
  search(query: AdvancedSearchQuery): string[] {
    // Fast intersection of indexes
    // Return moment IDs, not full objects
  }
}
```

### 2. Pagination Support
```typescript
type SearchResult = {
  moments: Moment[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

async function searchMomentsAdvanced({
  query, tags, kinds, from, to, regex, 
  limit = 20, cursor?: string 
}): Promise<SearchResult>
```

### 3. Lazy Loading
```typescript
// Only load full moment objects for results
function hydrateMoments(ids: string[]): Moment[] {
  return ids.map(id => Store.getMoment(id));
}
```

## 🧪 Benchmarks Target
- **1k moments**: < 10ms search time
- **5k moments**: < 25ms search time  
- **10k moments**: < 50ms search time
- **Memory**: Index ~10% of full state size

## 📋 Implementation Plan

### Phase 1: Basic Indexing
- [ ] Add MomentIndex class
- [ ] Implement title n-gram indexing
- [ ] Add tag lookup table
- [ ] Basic intersection logic

### Phase 2: Advanced Features  
- [ ] Date range buckets
- [ ] Regex pre-filtering
- [ ] Semantic search optimization
- [ ] Pagination support

### Phase 3: Persistence
- [ ] Persist indexes to disk
- [ ] Incremental index updates
- [ ] Index versioning

## 🎯 Success Criteria
- 10x performance improvement for large datasets
- Pagination works smoothly in Claude Desktop
- Memory usage scales sub-linearly
- Backward compatibility maintained

**Priority: P1 - Ship in v0.2.2**
