# EPUB Position Sync Issue

## Problem Summary

When reopening a book, the reader displays a position **2-5 pages behind** where the user actually was. This happens consistently across sessions.

## Technical Details

### What Happens

1. User reads to position X (e.g., 58.79%)
2. CFI is saved: `epubcfi(/6/86!/4[x9782207138595-44]/2/136/1:0)`
3. User closes book
4. User reopens book
5. Server returns correct CFI: `/2/136/1:0`
6. `rendition.display(cfi)` is called
7. epub.js displays position `/2/116/1:0` instead (20 elements earlier!)
8. User is now at ~58.2% instead of 58.79%

### Root Cause

**epub.js `display(cfi)` does not navigate precisely to the requested CFI.** It rounds to "page boundaries" or block-level elements. This is by design - epub.js shows complete pages, not partial content.

Console logs confirmed:
```
[Varbook] Navigating to CFI: epubcfi(/6/86!/4[x9782207138595-44]/2/136/1:0)
[Varbook] Displayed at CFI: epubcfi(/6/86!/4[x9782207138595-44]/2/116/1:0)
```

## Solutions Attempted

### 1. Increase Progress Precision ✓ (Kept)
**Commit:** `70047e6`

Changed decimal precision from (5,2) to (8,5) to store more precise percentages.
- Before: 58.41 (2 decimals)
- After: 58.41209 (5 decimals)

**Result:** Helps with precision loss but doesn't fix navigation.

### 2. Skip Save After Restore ✓ (Kept)
**Commit:** Various

Don't save position immediately after loading from server to avoid overwriting good position with bad one.

```typescript
if (skipSaveCountRef.current > 0) {
    skipSaveCountRef.current--;
    return;
}
```

**Result:** Prevents making the problem worse, but doesn't fix navigation.

### 3. Use Percentage-Only Navigation ✗
**Commits:** `41a2bf2`, `ef158e3`

Tried using only progress percentage with `cfiFromPercentage()` instead of storing CFI.

**Result:** Same imprecision. `percentageFromCfi(cfiFromPercentage(X))` doesn't equal X.

### 4. Generate Locations Before Navigation ✗
**Commit:** `fe11589`

Generate locations synchronously before calling `display(cfi)`.

**Result:** Slower loading, no improvement in precision.

### 5. Increase Location Precision ✗
**Commit:** `1cd85dd`

Changed location generation from 2048 to 512 characters per location.

**Result:** Slower generation, minimal improvement.

### 6. Initialize Rendition First ✗
**Commit:** `c468684`

Call `display()` first to initialize, then `display(cfi)` to navigate.

**Result:** No improvement.

### 7. Wait for 'displayed' Event ✗
**Commit:** `e868b53`

Use promise with `rendition.once('displayed')` to ensure display is complete.

**Result:** Confirmed the CFI mismatch via console logs but didn't fix it.

### 8. Advance Pages After Display ✗
**Commit:** `4bed095`

After display, call `next()` repeatedly until reaching saved progress.

**Result:** Jumps too many pages, unreliable.

## Potential Solutions Not Yet Tried

### 1. Scrolled Document Mode
Use `flow: 'scrolled-doc'` instead of paginated mode. Might allow more precise positioning via scroll offset.

### 2. Store Scroll Position
In addition to CFI, store the scroll offset within the current view. After navigation, restore scroll position.

### 3. Different EPUB Library
Consider alternatives:
- [foliate-js](https://github.com/johnfactotum/foliate-js) - More modern, might handle CFI better
- [Readium](https://readium.org/) - Industry standard

### 4. Accept Limitation
Document that position sync has ~2-3 page tolerance and let users manually adjust.

## Current State

The reader works with:
- Fast loading (locations generated in background)
- Skip save after restore (prevents regression)
- 5 decimal precision for progress

But position restoration loses 2-5 pages per session due to epub.js limitation.

## Relevant Files

- `resources/js/hooks/useEpubReader.ts` - Main reader logic
- `resources/js/hooks/usePositionSync.ts` - Position save/load
- `app/Http/Controllers/Api/BookController.php` - Server-side position storage
- `app/Models/BookSyncIdentifier.php` - Position data model

## Related Commits (Feb 26, 2026)

```
34347b4 Revert to fast loading (locations in background)
fe11589 Try generating locations BEFORE navigation
4bed095 Fix: advance pages after display to reach saved position
e868b53 Debug: add console logs + wait for displayed event
c468684 Fix: initialize rendition before CFI navigation
588b332 Revert to CFI-based navigation (fast loading)
1cd85dd Increase location precision (2048 → 512 chars per location)
ef158e3 Fix: skip save after position restore (epub.js location inconsistency)
41a2bf2 Switch to progress-only position sync (no CFI for navigation)
b46f9b2 Fix: skip first relocated event after position restore
0176388 Fix position overwrite when restoring from server
70047e6 Fix reading position precision loss causing pages to be skipped
```
