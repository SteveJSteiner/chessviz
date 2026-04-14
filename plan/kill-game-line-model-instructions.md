# Instructions: Kill the game-line model

## Context

Repository: `https://github.com/SteveJSteiner/chessviz.git`
Branch: `main`
HEAD: `6d6d56e` ("viewer: remove occurrence-line UI and review artifacts")

The previous commit removed `RuntimeOccurrenceLine` and `describeOccurrenceLine` from the viewer. But the underlying game-line model - `IngestedGame`, `game_id`, `root_game_id`, `rootGameId`, `formatGameName`, and the `game:` path prefix - remains throughout both builder and viewer. This entire model must be replaced with tree-structural identifiers.

## What "game-line model" means

The fixture corpus defines named games ("scholars-mate-white", "qgd-bogo-a", etc.), each a specific sequence of moves. Ingestion creates one `IngestedGame` per named game. Each game becomes a linear chain of `OccurrenceRecord` entries. The DAG then deduplicates shared positions across chains. The embedding assigns angular sectors by `game_id`. The viewer displays `rootGameId` as a label.

This is wrong. The visualization represents the game tree - the space of calculable positions - not a collection of named games. The fixture should be treated as test data for topology/identity mechanics. The game names should not leak into the geometry, the manifest, or the viewer display.

## Replacement concept: `subtreeKey`

Replace `rootGameId` / `root_game_id` / `game_id` (when used as a structural or display identifier) with `subtreeKey`: the UCI of the first move from root that this position descends from. For the initial position itself, `subtreeKey` is `"root"`. For a position reached via 1.e4 e5 2.Nf3, `subtreeKey` is `"e2e4"`. This is tree-structural, not fixture-specific.

For display, format `subtreeKey` as the first move in SAN: `"1. e4 subtree"` or `"1. d4 subtree"`. The initial position displays as `"Initial position"`.

## PHASE 1: Builder changes

### 1.1 `contracts.py` - Replace `root_game_id` with `subtree_key`

**File:** `tools/builder/src/chessviz_builder/contracts.py`

- **`EmbeddingRecord` (line ~673):** Rename field `root_game_id: str` -> `subtree_key: str`. This is the UCI of the first move from root in this occurrence's path, or `"root"` for the initial position.

- **`SharedAnchorRecord` (line ~112):** Rename field `root_game_id: str | None` -> `subtree_key: str | None`. Same semantics.

- **`IngestedGame` (line ~280):** Keep this type as-is FOR NOW. It is used by the fixture ingestion path and by downstream pipeline stages that iterate `corpus.games`. The fixture tests need it. But `game_id` must not leak into embedding or manifest output.

- **`IngestedCorpus` (line ~291):** Keep as-is. The `.occurrences` and `.transitions` flat-access properties are already the right interface for downstream consumers.

### 1.2 `embedding.py` - Angular sectors from subtree, not game_id

**File:** `tools/builder/src/chessviz_builder/embedding.py`

- **`_root_angles()`** (line ~113): Replace the game_id grouping with subtree_key grouping. Extract the first move UCI from each occurrence's path (the second path component, after `game:...`, stripped to just the UCI part). Group occurrences by first-move-UCI. Assign one angular sector per unique first move. The initial position (ply 0) gets the sector of its first child or a default.

- **`_embedding_record()`** (line ~83): Replace `game_id` parameter with `subtree_key: str`. Pass the extracted first-move-UCI. Set `subtree_key=subtree_key` on the `EmbeddingRecord` instead of `root_game_id=game_id`.

- **`build()`** (line ~42): Replace the `occurrence_to_game` mapping with a `occurrence_to_subtree_key` mapping. For each occurrence, extract the subtree key from its path. Pass it to `_embedding_record`.

- **`_elevation()`** (line ~161): Currently takes `game` parameter for `game.declared_terminal_outcome` and `game.transitions`. Replace with explicit `declared_terminal_outcome: str | None` and `terminal_transition_count: int` parameters. The caller (`_embedding_record`) must look these up from the `IngestedCorpus` or pass them explicitly.

**Subtree key extraction logic:**

```python
def _subtree_key_for_occurrence(occurrence: OccurrenceRecord) -> str:
    """Extract the first-move-from-root UCI as the subtree key."""
    # Path format: ("game:xxx", "1:e2e4", "2:e7e5", ...)
    # or just ("1:e2e4", "2:e7e5", ...) after path prefix cleanup
    for component in occurrence.path:
        if component.startswith("game:"):
            continue
        # Format is "ply:uci", extract the uci part
        parts = component.split(":", 1)
        if len(parts) == 2:
            return parts[1]  # e.g. "e2e4"
    return "root"
```

### 1.3 `artifact_manifest.py` - Replace `rootGameId` with `subtreeKey` on the wire

**File:** `tools/builder/src/chessviz_builder/artifact_manifest.py`

Every place that writes `"rootGameId": embedding_record.root_game_id` to JSON must change to `"subtreeKey": embedding_record.subtree_key`. There are ~7 sites (lines 719, 779, 1005, 1147, 1163, 1174, 1326 approximately). Find them all with `grep -n "root_game_id\|rootGameId"` in this file.

Also update any string formatting that uses `root_game_id` for labels (line ~719).

### 1.4 `corpus_ingest.py` - Path prefix cleanup (optional but recommended)

**File:** `tools/builder/src/chessviz_builder/corpus_ingest.py`

The `game:` path prefix (line ~65: `root_path = (f"game:{game.game_id}",)`) bakes the game name into occurrence identity. This is harmless for fixture tests but conceptually wrong. For now, leave it - changing it would change all occurrence IDs in the fixture, which cascades into every test assertion. Flag it with a `# TODO: remove game: prefix when fixture is retired` comment.

## PHASE 2: Viewer changes

### 2.1 `contracts.ts` - Replace `rootGameId` with `subtreeKey`

**File:** `apps/viewer/src/viewer/contracts.ts`

Four interfaces have `rootGameId: string` or `rootGameId: string | null`. Rename all to `subtreeKey: string` / `subtreeKey: string | null`. The interfaces are approximately at lines 43, 121, 160, 508.

### 2.2 `chessContext.ts` - Kill `formatGameName`, add `formatSubtreeLabel`

**File:** `apps/viewer/src/viewer/chessContext.ts`

- **Delete** `formatGameName()` entirely (lines ~115-132). It has hardcoded fixture game names.

- **Add** a replacement:

```typescript
export function formatSubtreeLabel(subtreeKey: string): string {
  if (subtreeKey === 'root') return 'Initial position';
  // subtreeKey is a UCI like "e2e4", "d2d4", etc.
  // Format as "1. e4" / "1. d4" etc. using algebraic shorthand
  const from = subtreeKey.slice(0, 2);
  const to = subtreeKey.slice(2, 4);
  // Simple pawn move: just show destination
  return `1. ${to} subtree`;
}
```

(The formatting can be improved later. The point is: no hardcoded game names.)

### 2.3 `ViewerShell.tsx` - Replace all `rootGameId` references

**File:** `apps/viewer/src/viewer/ViewerShell.tsx` (~5 sites)

- Replace `import { formatGameName, ... }` with `import { formatSubtreeLabel, ... }`
- Replace sorting by `rootGameId` (lines ~340-341) with sorting by `subtreeKey`
- Replace display of `rootGameId` (line ~751, ~796) with `formatSubtreeLabel(occurrence.subtreeKey)` or equivalent
- Replace any `occurrence.embedding.rootGameId` with `occurrence.embedding.subtreeKey`

### 2.4 `SmokeCanvas.tsx` - Replace all `rootGameId` references

**File:** `apps/viewer/src/viewer/SmokeCanvas.tsx` (~4 sites)

- Replace `import { formatGameName, ... }` with `import { formatSubtreeLabel, ... }`
- Replace sorting by `rootGameId` (lines ~164-165)
- Replace label display (line ~807)

### 2.5 `navigation.ts` - Replace `rootGameId` in entrypoint construction

**File:** `apps/viewer/src/viewer/navigation.ts` (~7 sites)

- Replace `rootGameId` field assignment (line ~148) with `subtreeKey`
- Replace `formatGameName(...)` calls in description strings (lines ~49, 62, 75) with `formatSubtreeLabel(...)` or plain regime-based descriptions
- Replace the `rootGameId` null/mismatch checks (lines ~203, 217) with `subtreeKey` equivalents

### 2.6 `reviewArtifactDocuments.ts` - Replace all `rootGameId` references

**File:** `apps/viewer/src/viewer/reviewArtifactDocuments.ts` (~23 sites, the biggest concentration)

Bulk replace:
- `focusContext.focusOccurrence.embedding.rootGameId` -> `focusContext.focusOccurrence.embedding.subtreeKey`
- `entryPoint.rootGameId` -> `entryPoint.subtreeKey`
- `formatGameName(rootGameId)` -> `formatSubtreeLabel(subtreeKey)`
- All local `const rootGameId = ...` -> `const subtreeKey = ...`

### 2.7 `transpositionSurface.ts` - Replace `rootGameId` (1 site)

**File:** `apps/viewer/src/viewer/transpositionSurface.ts` (line ~170)

Replace `rootGameId: occurrence.embedding.rootGameId` with `subtreeKey: occurrence.embedding.subtreeKey`.

### 2.8 `bootstrap.ts` - Check for `rootGameId` (1 site)

**File:** `apps/viewer/src/viewer/bootstrap.ts`

If it references `rootGameId` in its parsing of the builder manifest, update to `subtreeKey`.

## PHASE 3: Test changes

### 3.1 Builder tests that assert game_id values

**`test_corpus_ingest.py`:** The assertions about game_id and per-game occurrence counts are FINE as fixture tests. They verify the fixture ingestion path works. Do NOT change these. But ensure nothing in these tests references `root_game_id` - they should only reference `game_id` on `IngestedGame`.

**`test_embedding.py`:** Currently indexes `leaf_records` by `game.game_id` and asserts terminal separation by game name. Rewrite to index by terminal outcome instead:

```python
# Instead of leaf_records["scholars-mate-white"]
# Use: terminal occurrences grouped by declared_terminal_outcome
white_win_leaf = ...  # find the occurrence in a game with declared_terminal_outcome == "white-win"
draw_leaf = ...
black_win_leaf = ...
```

**`test_departure_rules.py`** and **`test_transition_facts.py`:** These use inline `DeclaredGameFixture` objects as minimal edge-property test inputs. They're testing per-edge classification, not lines. Keep them. But rename `game_id` usage in these tests to make clear it's a test label, not a structural identifier. (Low priority - cosmetic.)

**`test_labeling.py`** and **`test_salience.py`:** Reference `game.game_id` for filtering fixture data in assertions. Keep them as fixture tests. They don't leak into geometry.

### 3.2 Viewer tests that assert rootGameId

**`navigation.test.ts` (line 33):** `assert.equal(entryPoints[2]?.rootGameId, 'endgame-simplification-lab')` - Change to `assert.equal(entryPoints[2]?.subtreeKey, ...)` with the expected subtree key value (will be `"b1c3"` since the endgame-simplification-lab game starts with `Nc3`).

**`runtimeKernel.test.ts` (line 69):** `occurrence.embedding.rootGameId === 'qgd-bogo-a'` - Replace with a filter by state key or ply instead of game name.

**`carrierPresentation.test.ts` (line ~120):** `rootGameId: 'test'` in a synthetic fixture - Rename to `subtreeKey: 'test'`.

**`cameraGrammar.test.ts` (line ~196):** `rootGameId: 'fixture'` - Rename to `subtreeKey: 'fixture'`.

**`labelPolicy.test.ts`:** Check for `rootGameId` references and rename.

**`bootstrap.test.ts`:** Check for `rootGameId` references and rename.

**`cameraOrbit.test.ts`:** Check for `rootGameId` references and rename.

## PHASE 4: Regenerate artifacts

After all code changes, regenerate all builder artifacts:

```bash
cd tools/builder
uv run chessviz-builder export-fixture-artifacts
uv run chessviz-builder build-web-corpus \
  --opening-source fixtures/imports/opening/fixture-opening-slice.json \
  --endgame-source fixtures/imports/endgame/fixture-endgame-slice.json
```

Then verify:
1. `grep -r "rootGameId" artifacts/` returns ZERO hits
2. `grep -r "subtreeKey" artifacts/builder/bootstrap.json` shows the new field
3. `cd tools/builder && uv run python -m unittest discover -s tests` passes
4. `cd apps/viewer && npx vitest run` passes (or the equivalent test command)

## Verification checklist

- [ ] `grep -rn "rootGameId" apps/ tools/` returns ZERO hits outside of `git` history
- [ ] `grep -rn "root_game_id" tools/` returns ZERO hits outside `IngestedGame` fixture path
- [ ] `grep -rn "formatGameName" apps/` returns ZERO hits
- [ ] `grep -rn "scholars-mate-white\|fools-mate-black\|qgd-bogo\|repetition-draw\|italian-branch\|endgame-simplification" apps/viewer/src/` returns ZERO hits (fixture names must not appear in the viewer)
- [ ] `subtreeKey` appears in `bootstrap.json` on every embedding record
- [ ] All builder tests pass
- [ ] All viewer tests pass
- [ ] The viewer builds without errors

## What NOT to change

- `IngestedGame` type and `DeclaredGameFixture` type - these are the fixture ingestion path used by unit tests. They stay.
- `initial_corpus.json` fixture file - stays as-is. It's test data.
- The `game:` prefix in occurrence paths - stays for now (changing it cascades all fixture test occurrence IDs). Add a TODO comment.
- `DeclaredCorpusIngestor._ingest_game` - stays. It's the fixture path.
- Builder test files that assert fixture-specific `game_id` values - they're testing fixture ingestion, not geometry.