# Bugs Found in CTI Confidence Parser

## 1. Session Notes Lost When Loading History (Critical)

**Location**: `src/App.tsx:264` and `src/components/WorkspaceView.tsx:259-262`

When loading an analysis from history, a new `sessionId` is generated (`session-history-${Date.now()}`). However, the saved notes retain their original `sessionId`. This causes `sessionNotes` filtering to return empty, so previously saved notes never appear for loaded history.

```tsx
// App.tsx:264
setSessionId(`session-history-${Date.now()}`);
```

---

## 2. Global Mutable State for ID Generation

**Location**: `src/App.tsx:20-21`

`matchCounter` and `nextId()` are module-level mutable globals. They persist across re-renders but reset on page reload, potentially causing ID collisions in long-running sessions.

```tsx
let matchCounter = 0;
const nextId = () => `match-${++matchCounter}`;
```

---

## 3. Sequential API Calls - Poor Performance

**Location**: `src/App.tsx:223-243`

Matches are analyzed sequentially with `await` in a loop. This is slow when there are many matches. Should use `Promise.all` or batching for parallel processing.

```tsx
for (let i = 0; i < initial.length; i++) {
  // ...
  const result = await analyzeWEL(config, m.matchedPhrase, m.sentence);
  // ...
}
```

---

## 4. Dead Code in Ollama Response Parsing

**Location**: `src/lib/modelClient.ts:62`

The fallback `data.response` is unreachable. Ollama's `/api/chat` endpoint returns `data.message.content`, not `data.response`.

```tsx
const content: string = data.message?.content ?? data.response ?? '';
```

---

## 5. No Error Handling in dbClient

**Location**: `src/lib/dbClient.ts:25-45`

All API functions assume success - no `response.ok` checks or JSON parsing error handling. Failed requests will throw unhandled errors.

```tsx
export async function saveAnalysis(payload: {...}): Promise<{ id: number }> {
  const res = await fetch('/api/db/save', {...});
  return res.json(); // No error handling
}
```

---

## 6. Case Mismatch Between Regex and Lookup

**Location**: `src/lib/welDatabase.ts:194` and `src/lib/welDatabase.ts:197-204`

The regex uses case-insensitive matching (`gi` flags), but `findWELEntry` performs case-sensitive comparison. This could cause aliases to be missed.

```tsx
// welDatabase.ts:194
return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

// welDatabase.ts:197-204
export function findWELEntry(phrase: string): WELEntry | undefined {
  const lower = phrase.toLowerCase();
  return WEL_DATABASE.find(
    (entry) =>
      entry.phrase.toLowerCase() === lower ||  // Only checks phrase, not aliases
      entry.aliases.some((a) => a.toLowerCase() === lower),
  );
}
```

---

## 7. Enter Key Only Works for URL Tab

**Location**: `src/components/InputPanel.tsx:146`

`onKeyDown` only handles Enter for URL input, not for the text textarea or PDF upload.

```tsx
onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleAnalyze()}
```

---

## 8. Unused Import

**Location**: `src/components/WorkspaceView.tsx:4`

`AlertCircle` is imported from `lucide-react` but never used in the component.

---

## 9. Note ID Collision Risk

**Location**: `src/components/WorkspaceView.tsx:127`

Using `Date.now().toString()` as note ID can collide if notes are saved rapidly (within the same millisecond).

```tsx
id: Date.now().toString(),
```

---

## Summary

| Bug | Severity | File |
|-----|----------|------|
| Session notes lost on history load | Critical | App.tsx, WorkspaceView.tsx |
| Global mutable state | Low | App.tsx |
| Sequential API calls | Medium | App.tsx |
| Dead code in Ollama parsing | Low | modelClient.ts |
| No error handling in dbClient | Medium | dbClient.ts |
| Case mismatch in lookup | Medium | welDatabase.ts |
| Enter key not working | Low | InputPanel.tsx |
| Unused import | Low | WorkspaceView.tsx |
| Note ID collision | Low | WorkspaceView.tsx |
