# Debug Session: Pivot resolvePivot Navigation Bug

## Context

BookShelf = Laravel + React SPA + KOReader plugin. Cross-device reading sync via "pivot" format: `{spine_index, spine_href, spine_percent}`.

- Web (epub.js) extracts spine_index from `book.spine.get(href).index`
- KOReader extracts spine_index from XPointer `DocFragment[N]` → `N - 1`
- Both clients report the SAME spine_index at the same position (confirmed)

## What works

- **OPF parsing works**: `getDocumentFileContent("META-INF/container.xml")` → OPF path → OPF XML (38011 bytes)
- **Spine mapping is correct**: `total_frags=238, spine_count=238, offset=0` (1:1 mapping)
- **extractPivot is correct** on both sides (web and KOReader agree on spine_index)
- **DocFragment selection is correct**: `spine_index=76 → DocFragment[77]` (1:1, confirmed)

## The Bug: pixel-to-page conversion in resolvePivot

In `koreader_plugin/varbook.koplugin/main.lua`, function `resolvePivot()` (around line 516-520):

```lua
local target_pos = start_pos + (end_pos - start_pos) * pivot.spine_percent
local page_count = self.ui.document:getPageCount()
local target_page = math.floor(target_pos / doc_height * page_count)  -- BUG
```

This formula assumes pages are linearly distributed across `doc_height` pixels. They are NOT in CREngine (margins, inter-fragment gaps, images, page breaks cause non-linear distribution).

### Proof from logs (crash.log, 05/10/26-22:49:39):

```
resolvePivot spine_index= 76 → DocFragment[77] target_page= 732 / 1862
CreDocument: goto page 732 flow 0
page update 39.31 % xpointer=/body/DocFragment[73]/body/div/h1/text().0
```

KOReader computed target_page=732 for DocFragment[77], but page 732 is actually in **DocFragment[73]** — 4 fragments off!

## The Fix

Replace the linear interpolation with a **binary search** using `getPageXPointer(page)`:

```lua
function Varbook:resolvePivot(pivot)
    -- ... (DocFragment selection code stays the same, it works correctly) ...
    local frag_n = mapping.frag_for_spine[pivot.spine_index] or (pivot.spine_index + 1)

    -- Binary search for the first page of DocFragment[frag_n]
    local page_count = self.ui.document:getPageCount()
    local lo, hi = 1, page_count
    while lo < hi do
        local mid = math.floor((lo + hi) / 2)
        local xp = self.ui.document:getPageXPointer(mid)
        local frag = tonumber(xp:match("DocFragment%[(%d+)%]") or "0")
        if frag < frag_n then
            lo = mid + 1
        else
            hi = mid
        end
    end
    -- lo = first page of DocFragment[frag_n]

    -- Binary search for the last page of DocFragment[frag_n]
    local lo2, hi2 = lo, page_count
    while lo2 < hi2 do
        local mid = math.floor((lo2 + hi2 + 1) / 2)
        local xp = self.ui.document:getPageXPointer(mid)
        local frag = tonumber(xp:match("DocFragment%[(%d+)%]") or "0")
        if frag <= frag_n then
            lo2 = mid
        else
            hi2 = mid - 1
        end
    end
    -- lo2 = last page of DocFragment[frag_n]

    -- Apply spine_percent within the page range
    local pages_in_frag = lo2 - lo + 1
    local target_page = lo + math.floor(pages_in_frag * pivot.spine_percent)
    target_page = math.max(lo, math.min(lo2, target_page))

    local target_xp = self.ui.document:getPageXPointer(target_page)
    self.ui:handleEvent(Event:new("GotoXPointer", target_xp))
    return true
end
```

Performance: 2 × log2(1862) ≈ 22 calls to `getPageXPointer`. Each is O(1) in CREngine. Total ~20ms. Acceptable (only runs on cross-client sync).

## Same fix needed in computeSpinePercent

`computeSpinePercent()` uses the same pixel-based approach to compute the ratio within a DocFragment. This should also be changed to page-based counting for consistency with how epub.js computes spine_percent (page-based: `(page - 1) / (total - 1)`).

```lua
function Varbook:computeSpinePercent(xpointer, frag_index)
    local frag_n = frag_index + 1
    -- Same binary search to find first/last pages of the fragment
    -- Then: current_page = page of xpointer (via binary search or getPageXPointer scan)
    -- spine_percent = (current_page - first_page) / max(1, last_page - first_page)
end
```

## Files to modify

- `koreader_plugin/varbook.koplugin/main.lua` — `resolvePivot()` (line ~449) and `computeSpinePercent()` (line ~371)

## What NOT to change

- The spine mapping logic (`getSpineMapping`, `readOpfContent`, `parseSpineFromOpf`) — all correct
- The `extractPivot` logic — correct
- The DocFragment selection in `resolvePivot` — correct
- Server-side code — no changes needed
- Web-side code — no changes needed

## Key APIs available in KOReader

| API | Returns | Used for |
|-----|---------|----------|
| `getPageCount()` | Total pages (int) | Binary search bounds |
| `getPageXPointer(page)` | XPointer string at page N | Finding which DocFragment a page belongs to |
| `isXPointerInDocument(xp)` | Boolean | Checking if DocFragment exists |
| `getPosFromXPointer(xp)` | Y pixel position (int) | **DO NOT USE for page calculation** |
| `getDocumentFileContent(path)` | Raw file bytes from EPUB ZIP | Reading OPF |
| `handleEvent(Event:new("GotoXPointer", xp))` | Navigate to XPointer | Final navigation |

## Test data for validation

After fix, this sync should navigate to DocFragment[77] (not [73]):
- Server pivot: `spine_index=76, spine_href="Text/Section2007.xhtml", spine_percent=0.2857, source=web`
- Expected: page ~800+ (in DocFragment[77]), NOT page 732 (DocFragment[73])
