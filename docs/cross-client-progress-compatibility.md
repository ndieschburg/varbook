# Cross-Client Reading Progress Compatibility

## Problem Statement

BookShelf supports two reading clients: the **PWA** (epub.js in browser) and **KOReader** (via the Varbook plugin). Each client uses a different internal position format:

- **PWA (epub.js)**: EPUB CFI (Canonical Fragment Identifier), e.g. `epubcfi(/6/86!/4[x9782207138595-44]/2/136/1:0)`
- **KOReader**: XPointer, e.g. `/body/DocFragment[5]/body/div/p[12]`

These formats are **mutually incompatible** -- a CFI means nothing to KOReader, and an XPointer means nothing to epub.js. When a user reads on one client and switches to the other, neither native position format can be used.

The current workaround is to **fall back to percentage-based navigation** when crossing clients. However, the two clients calculate percentage differently, resulting in a **~1% gap** (several dozen pages on a long book).

---

## How Each Client Calculates Percentage

### epub.js (PWA)

Location: [useEpubReader.ts:318-366](resources/js/hooks/useEpubReader.ts#L318-L366)

epub.js generates a **location map** by dividing the entire book text into chunks of N characters (default: 1024 chars per location). This is done asynchronously after the book loads:

```typescript
book.locations.generate(1024).then(() => { ... });
```

Percentage is then calculated as:
```typescript
progress = book.locations.percentageFromCfi(currentCfi) * 100;
```

This means:
- The percentage is based on **character count** across the entire EPUB content
- The granularity depends on the `generate()` parameter (1024 chars = ~170 words per location)
- The location map is **deterministic** for a given book + character count parameter
- Images, metadata, and non-text content contribute to spine item size but may be counted differently

### KOReader (Varbook plugin)

Location: [main.lua:80-91](koreader_plugin/varbook.koplugin/main.lua#L80-L91)

KOReader calculates percentage differently depending on document type:

```lua
function Varbook:getPercentage()
    local pct
    if self.ui.document.info.has_pages then
        pct = self.ui.paging:getLastPercent()   -- PDF/DJVU: page-based
    else
        pct = self.ui.rolling:getLastPercent()   -- EPUB: scroll position in rendered layout
    end
    return pct and math.floor(pct * 10000) / 100 or nil
end
```

For reflowable EPUBs (the common case):
- KOReader uses **CreDocument** (CREngine, a fork of CoolReader's engine) to render the EPUB
- `rolling:getLastPercent()` returns position as a ratio of **rendered document height** (vertical scroll position / total rendered height)
- This is based on the **fully laid-out document** with fonts, margins, line-height, etc.
- Different font sizes, screen sizes, and rendering engines all affect the total rendered height

### Why They Diverge

| Factor | epub.js | KOReader |
|--------|---------|---------|
| **Basis** | Character count in raw text | Rendered layout height |
| **Images** | Count as part of spine item but not as characters | Take up rendered space proportional to display |
| **CSS/Styling** | Ignored for location calculation | Affects rendered height (margins, padding, line-height) |
| **Font size** | No effect on percentage | Changes total rendered height, but percentage ratio stays ~stable |
| **Whitespace** | Counted as characters | Collapsed/expanded by CSS rendering |
| **Non-text content** | May be underweighted | Weighted by visual size |
| **Spine items** | All items weighted by raw text length | All items weighted by rendered height |

The core issue: **character count != rendered visual proportion**. A chapter with many images and little text will be "small" in epub.js (few characters) but "large" in KOReader (images take up rendered space). Conversely, a dense text-only chapter will be "large" in epub.js but may be relatively "small" in KOReader if font/margin settings compress it.

In practice, the gap is **~1% on average** but can vary:
- Books with uniform text density: gap < 0.5%
- Books with many images or variable formatting: gap can reach 2-3%
- The gap is not constant -- it can be positive or negative at different points in the book

---

## Current Implementation

### When Switching from KOReader to PWA

Location: [useEpubReader.ts:94-134](resources/js/hooks/useEpubReader.ts#L94-L134) and [usePositionSync.ts:96-122](resources/js/hooks/usePositionSync.ts#L96-L122)

1. PWA fetches server position via `GET /api/books/{id}/progress`
2. Server returns `{ progress: 45.67, position: <xpointer>, last_sync_client: "koreader" }`
3. PWA detects `last_sync_client !== 'web'` → falls back to percentage navigation
4. Converts percentage to CFI: `book.locations.cfiFromPercentage(progress / 100)`
5. Navigates to that CFI

The problem: KOReader's 45.67% maps to a different physical position than epub.js's 45.67%.

### When Switching from PWA to KOReader

Location: [main.lua:200-241](koreader_plugin/varbook.koplugin/main.lua#L200-L241)

1. KOReader fetches server position via `GET /api/varbook/progress/{hash}`
2. Server returns `{ progress: 45.67, position: <cfi>, last_sync_client: "web" }`
3. KOReader detects `last_sync_client ~= "koreader"` → falls back to percentage navigation
4. Calculates target page: `math.floor(page_count * server_progress / 100)`
5. Navigates to that page

Same problem in reverse: epub.js's 45.67% doesn't correspond to KOReader's 45.67%.

### Same-Client Sync (Works Fine)

- **Web → Web**: Uses CFI directly, precise to the character
- **KOReader → KOReader**: Uses XPointer directly, precise to the paragraph

---

## Database Schema (Relevant)

Location: migrations in [database/migrations/](database/migrations/)

```
books.progress              decimal(8,5)   -- Current progress 0-100, shared across clients
book_sync_identifiers:
  - client                  string(20)     -- 'web', 'koreader', 'moon'
  - last_progress           decimal(8,5)   -- Last progress from this client
  - raw_position            string         -- CFI (web) or XPointer (koreader)
```

The `books.progress` field stores a single percentage that gets overwritten by whichever client syncs last. This is where the semantic mismatch lives: a percentage written by KOReader is interpreted differently when read by the PWA, and vice versa.

---

## Possible Solutions to Investigate

### 1. Normalize Percentage via a Shared Reference

Build a **mapping table** at import time that creates a correspondence between character-based positions and layout-based positions. This would require:
- Extracting the raw text of each spine item during EPUB import (server-side)
- Storing character counts per spine item
- Having KOReader report which spine item + offset it's in (not just a global percentage)

Then the server could translate: "KOReader says 45% of rendered height" → "that's spine item 12, which starts at character offset X" → "epub.js equivalent is 43.2%".

**Pros**: Accurate, works with any book  
**Cons**: Complex, requires spine-level position reporting from both clients, import-time processing

### 2. Spine-Item-Level Sync

Instead of syncing a global percentage, sync **spine item index + local percentage within that item**:
- KOReader knows which spine item is being displayed and the offset within it
- epub.js knows which spine item is being displayed (from CFI or location)
- The local percentage within a single spine item will have less divergence

Both clients already have access to spine information:
- epub.js: `location.start.href` gives the spine item, `location.start.percentage` gives progress within the section
- KOReader: xpointer includes `DocFragment[N]` which maps to spine item index

**Pros**: Much more precise, especially for books with variable content density  
**Cons**: Requires protocol changes (both client and server), KOReader plugin needs to extract spine info

### 3. Character Offset Mapping

Have the server pre-compute a character-count-based percentage for each spine item boundary. When KOReader reports a percentage, map it to the nearest spine boundary + interpolate within the item.

**Pros**: Server-side only, no plugin changes  
**Cons**: Still approximate within spine items, requires import-time text extraction

### 4. Accept the Gap + Add Manual Adjustment

Document the ~1% tolerance. When syncing from another client, show a "synced from KOReader" indicator and let the user navigate forward/back a few pages. The current `syncingPositionFrom` state already shows which client last synced.

**Pros**: Simple, no algorithmic work  
**Cons**: User experience is degraded, defeats the purpose of seamless sync

### 5. Calibration-Based Approach

On first cross-client sync, let the user manually confirm position. Store the offset between the two percentage systems for that book. Apply correction on future syncs.

**Pros**: Precise after calibration  
**Cons**: Requires user action per book, offset may not be linear

---

## Relevant Files

### PWA (epub.js)

| File | Purpose |
|------|---------|
| [resources/js/hooks/useEpubReader.ts](resources/js/hooks/useEpubReader.ts) | Reader initialization, location generation, relocated event, percentage calculation |
| [resources/js/hooks/usePositionSync.ts](resources/js/hooks/usePositionSync.ts) | Local-first sync, multi-device detection, server fetch |
| [resources/js/pages/ReaderPage.tsx](resources/js/pages/ReaderPage.tsx) | Reader UI, settings panel, progress bar |
| [resources/js/services/offlineDb.ts](resources/js/services/offlineDb.ts) | IndexedDB storage for offline positions |
| [resources/js/types/epub.d.ts](resources/js/types/epub.d.ts) | TypeScript types for epub.js (Location, Locations API) |

### KOReader Plugin

| File | Purpose |
|------|---------|
| [koreader_plugin/varbook.koplugin/main.lua](koreader_plugin/varbook.koplugin/main.lua) | Plugin main: percentage calc (L80-91), xpointer (L95-100), sync logic (L166-290) |
| [koreader_plugin/varbook.koplugin/varbook_api.lua](koreader_plugin/varbook.koplugin/varbook_api.lua) | HTTP client for Varbook API |
| [koreader_plugin/varbook.koplugin/varbook_db.lua](koreader_plugin/varbook.koplugin/varbook_db.lua) | Local SQLite queue for unsynced positions |

### Backend

| File | Purpose |
|------|---------|
| [app/Http/Controllers/Api/BookController.php](app/Http/Controllers/Api/BookController.php) | Web progress endpoints (getProgress L207, updateProgress L243) |
| [app/Http/Controllers/Api/VarbookController.php](app/Http/Controllers/Api/VarbookController.php) | KOReader plugin endpoints (getProgress, batchProgress) |
| [app/Services/ReadingSessionService.php](app/Services/ReadingSessionService.php) | processSyncEvent: stores progress + raw_position |
| [app/Models/BookSyncIdentifier.php](app/Models/BookSyncIdentifier.php) | Per-client position tracking (raw_position = CFI or XPointer) |
| [app/Services/EpubService.php](app/Services/EpubService.php) | EPUB parsing at import time (potential place for pre-computation) |

### Related Documentation

| File | Purpose |
|------|---------|
| [docs/epub-position-sync-issue.md](docs/epub-position-sync-issue.md) | epub.js CFI imprecision issue (same-client, separate problem) |

---

## Key Constraints

1. **epub.js is a black box** for location generation -- we can configure the chars-per-location parameter but not the algorithm itself
2. **KOReader's CREngine** percentage is based on rendered layout, which we cannot reproduce server-side without the full rendering engine
3. **The EPUB file is identical** on both clients -- same content, same spine order, same text. Only the interpretation of "percentage" differs
4. Both clients already store **native position formats** (CFI/XPointer) in `book_sync_identifiers.raw_position`, but these are only useful for same-client navigation
5. The server has access to the EPUB file at import time and could pre-compute reference data
