# BookShelf — Migration Plan

## Context

The application currently runs on Laravel + Livewire/Blade with:
- User management (admin + regular users)
- Book upload with drag & drop + EPUB metadata extraction
- Library grid with cover cards, progress, reading time
- Book detail with reading sessions
- OPDS catalog
- WebDAV server (sabre/dav) for Moon+ Reader sync
- In-browser EPUB reader (Epub.js)
- i18n (en/fr)

## Migration Goals

1. Implement kosync API (KOReader reading position sync)
2. Transform the entire frontend from Livewire/Blade to React SPA
3. Use kosync as the internal sync protocol for the web reader
4. Implement PWA with offline reading capability

## Guiding Principles

- **Backend stays Laravel** — existing logic, models, migrations untouched
- **One step at a time** — each step produces a working application
- **API-first** — build API endpoints before React consumes them
- **No big bang** — Livewire and React can coexist during migration via separate routes

---

## Step 1 — Implement kosync API (0.5 day)

**Goal**: Add KOReader-compatible sync endpoints. This will also serve as the sync protocol for the web reader later.

### Tasks

1.1. Create `KosyncController` with 4 endpoints:
```
POST   /api/kosync/users/create      → Register
POST   /api/kosync/users/auth         → Authenticate
PUT    /api/kosync/syncs/progress     → Update progress
GET    /api/kosync/syncs/progress     → Get progress
```

1.2. Auth via custom headers (`x-auth-user`, `x-auth-key`) as per kosync spec

1.3. Book matching: KOReader identifies books by MD5 hash → match against `books.file_hash`

1.4. On PUT progress:
- Find or create `book_sync_identifiers` record (client: `koreader`)
- Apply session grouping logic (same as WebDAV)
- Create/update `reading_sessions` entry
- Update `books.progress` and `books.total_reading_seconds`

1.5. Write tests for all 4 endpoints

### Verification
- Configure KOReader (or simulate with curl) to point to the kosync endpoint
- Verify positions are saved and reading sessions are created

---

## Step 2 — Build Laravel API layer (1.5 days)

**Goal**: Expose all backend functionality as JSON API endpoints. Livewire/Blade still works in parallel.

### Tasks

2.1. **Auth API** (Laravel Sanctum SPA mode):
```
POST   /api/login                    → Login, return token
POST   /api/logout                   → Revoke token
GET    /api/user                     → Current user profile
PUT    /api/user/locale              → Update locale preference
```

2.2. **Admin API**:
```
GET    /api/admin/users              → List all users
POST   /api/admin/users              → Create user
PUT    /api/admin/users/{id}         → Update user
DELETE /api/admin/users/{id}         → Delete user
GET    /api/admin/stats              → Global stats (users, books, total reading time)
```

2.3. **Books API**:
```
GET    /api/books                    → List user's books (with filters, sort, search)
POST   /api/books                    → Upload EPUB (multipart)
GET    /api/books/{id}               → Book detail + metadata
DELETE /api/books/{id}               → Delete book
GET    /api/books/{id}/download      → Download EPUB file
GET    /api/books/{id}/cover         → Cover image
GET    /api/books/{id}/sessions      → Reading sessions (paginated)
```

2.4. **Reading sync API** (internal kosync-compatible for web reader):
```
PUT    /api/books/{id}/progress      → Update reading position
GET    /api/books/{id}/progress      → Get current position
```

This endpoint uses the same session grouping logic as kosync/WebDAV but accepts a JSON payload with:
```json
{
  "progress": 42.5,
  "position": "epubcfi(/6/14!/4/2/1:0)",
  "timestamp": "2026-02-20T14:30:00Z",
  "client": "web"
}
```

2.5. **API Resource classes** for consistent JSON responses:
- `BookResource` / `BookCollection`
- `UserResource`
- `ReadingSessionResource`

2.6. Add `Accept: application/json` middleware for all `/api` routes

### Verification
- Test all endpoints with curl / Postman / Pest
- Livewire frontend still works (untouched)

---

## Step 3 — React SPA scaffolding (1 day)

**Goal**: Set up the React project inside Laravel and implement the app shell with routing and auth.

### Tasks

3.1. **Setup**:
- Install React + React Router + TypeScript via Vite (already in Laravel)
- Install Tailwind CSS (reuse existing config)
- Install dependencies: `axios`, `react-query` (TanStack Query), `react-dropzone`, `epubjs`
- Create entry point: `resources/js/app.tsx`
- Laravel catch-all route: `Route::get('/{any}', SpaController::class)->where('any', '.*')` (exclude `/api`, `/opds`, `/webdav`, `/kosync`)

3.2. **App shell**:
- Dark theme layout (header, main content area)
- React Router setup with routes:
  - `/login`
  - `/library`
  - `/book/:id`
  - `/read/:id`
  - `/admin/users` (admin only)
  - `/stats` (Phase 4)
- Auth context (React Context + Sanctum)
- Protected route wrapper
- i18n setup with `react-i18next` (load existing translation keys)

3.3. **API client layer**:
- Axios instance with base URL, Sanctum CSRF cookie handling
- TanStack Query hooks: `useBooks()`, `useBook(id)`, `useUser()`, etc.
- Error handling (401 → redirect to login, toast on errors)

3.4. **Shared components**:
- `Header` (logo, search, user dropdown, language switcher)
- `Toast` notification system
- `LoadingSpinner`
- `ProgressBar` component
- `Badge` component (Not started / Reading / Finished)
- `ConfirmModal`

### Verification
- Login works via Sanctum
- Empty library page renders
- Navigation works between routes

---

## Step 4 — Migrate Library & Book views to React (1.5 days)

**Goal**: Recreate all Livewire views as React components.

### Tasks

4.1. **Login page**:
- Email + password form
- Language selector
- Dark theme centered card

4.2. **Library page** (`/library`):
- Search bar (debounced, queries API)
- Sort options (recent, title, author, progress)
- Filter (all, reading, finished, not started)
- Drag & drop upload zone (`react-dropzone`)
  - Multiple file support
  - Upload progress per file
  - Auto-refresh library grid on completion
- Book card grid (responsive: 2/3/4/5 cols)
  - Cover image with lazy loading
  - Title, author
  - Progress bar + percentage
  - Reading time
  - Status badge
  - Hover animation (scale + shadow)

4.3. **Book detail page** (`/book/:id`):
- Two-column layout (cover + metadata)
- Progress bar, reading time, status
- Action buttons: Read, Download, Delete
- Reading sessions table (paginated via TanStack Query)
- "Read" button → navigates to `/read/:id`

4.4. **Admin users page** (`/admin/users`):
- Users table with stats
- Create user modal
- Edit / deactivate / delete actions

### Verification
- Full feature parity with Livewire version
- All CRUD operations work
- Upload works with progress feedback
- Responsive on mobile/tablet/desktop

---

## Step 5 — Migrate EPUB reader to React (1 day)

**Goal**: Move the Epub.js reader into a React component with reading position sync.

### Tasks

5.1. **Reader component** (`/read/:id`):
- Full-screen layout (no header/footer, immersive)
- Epub.js integration via React ref
- Controls overlay (tap to show/hide):
  - Top bar: book title, back button, settings icon
  - Bottom bar: progress slider, current page/chapter
  - Settings panel: font size, theme (light/dark/sepia), font family
- Page navigation: tap left/right edges, swipe, arrow keys
- Table of contents sidebar (slide-in)

5.2. **Position sync**:
- On page change: save position locally (in-memory + IndexedDB)
- Debounced API call (every 30 seconds or on significant progress change)
- Call `PUT /api/books/{id}/progress` with:
  - `progress` (percentage)
  - `position` (EPUB CFI)
  - `timestamp` (local time)
  - `client: 'web'`
- On reader open: `GET /api/books/{id}/progress` → restore position

5.3. **Reading time tracking**:
- Local timer starts when reader opens
- Pauses on visibility change (`document.hidden`)
- Pauses after inactivity (no page turn for 5 minutes)
- Sends accumulated time with each sync

### Verification
- Reader opens, displays EPUB correctly
- Position saved and restored across sessions
- Reading sessions appear in book detail
- Timer pauses when switching tabs or idle

---

## Step 6 — PWA implementation (1.5 days)

**Goal**: Make the app installable and functional offline.

### Tasks

6.1. **PWA manifest** (`public/manifest.json`):
```json
{
  "name": "BookShelf",
  "short_name": "BookShelf",
  "start_url": "/library",
  "display": "standalone",
  "theme_color": "#0f172a",
  "background_color": "#0f172a",
  "icons": [...]
}
```

6.2. **Service Worker** (using Workbox via `vite-plugin-pwa`):
- **Precache**: App shell (HTML, CSS, JS, fonts, icons)
- **Runtime cache strategies**:
  - API responses (`/api/books`): StaleWhileRevalidate
  - Cover images: CacheFirst (long TTL)
  - EPUB files: CacheFirst (explicit user action to download for offline)
- **Offline fallback**: Show cached library when offline

6.3. **Offline book download**:
- "Download for offline" button on each book card and detail page
- Stores EPUB in IndexedDB (Cache API has size limits for large files)
- Visual indicator on card: downloaded / not downloaded
- Storage management page: see cached books, total size, remove cached books

6.4. **Offline reading**:
- Reader checks IndexedDB first, then network
- Position changes saved to IndexedDB queue
- Reading timer runs locally, sessions stored in IndexedDB

6.5. **Background sync** (on reconnection):
- Listen to `online` event
- Flush all queued position updates to API
- Send reading sessions with original local timestamps
- Server processes them chronologically (not by receive time)
- Clear synced entries from IndexedDB
- Show toast: "Reading progress synced"

6.6. **Sync queue data structure** (IndexedDB):
```javascript
{
  id: auto,
  book_id: 123,
  type: 'progress_update',
  payload: {
    progress: 42.5,
    position: 'epubcfi(...)',
    timestamp: '2026-02-20T14:30:00Z',
    duration_seconds: 1800,
    client: 'web'
  },
  synced: false,
  created_at: '2026-02-20T14:30:00Z'
}
```

6.7. **API adjustment** for batch sync:
```
POST /api/books/{id}/progress/batch    → Accept array of progress updates
```
Server processes each entry using its `timestamp` field (not server receive time) for accurate session grouping.

### Verification
- App installable on Android (Add to Home Screen)
- Library browsable offline (cached books and covers)
- Downloaded books readable without network
- Reading sessions queued offline
- Sessions synced correctly on reconnection
- No data loss after extended offline period

---

## Step 7 — Cleanup & remove Livewire (0.5 day)

**Goal**: Remove the old frontend code.

### Tasks

7.1. Remove Livewire components and Blade views
7.2. Remove Livewire/Breeze packages from `composer.json`
7.3. Remove old CSS/JS assets
7.4. Update `routes/web.php` — only keep SPA catch-all + non-SPA routes (OPDS, WebDAV, kosync)
7.5. Update documentation / README
7.6. Final testing pass on all features

---

## Summary

| Step | Description | Duration | Cumulative |
|------|-------------|----------|------------|
| 1 | kosync API | 0.5 day | 0.5 day |
| 2 | Laravel API layer | 1.5 days | 2 days |
| 3 | React SPA scaffolding | 1 day | 3 days |
| 4 | Migrate Library & Book views | 1.5 days | 4.5 days |
| 5 | Migrate EPUB reader | 1 day | 5.5 days |
| 6 | PWA implementation | 1.5 days | 7 days |
| 7 | Cleanup | 0.5 day | **7.5 days** |

**Total estimated: 7-8 working days**

### Key risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB storage limits on some browsers | Large libraries may not fit offline | Show storage usage, let user choose which books to cache |
| Service Worker cache invalidation | Users see stale data | Versioned precache + StaleWhileRevalidate for API |
| Epub.js rendering differences vs Moon+ | Position mismatch between clients | Use EPUB CFI as universal position format |
| Offline session timestamps | Clock drift between devices | Accept server-side, validate timestamp sanity |
| Moon+ WebDAV `.po` format changes | Sync breaks silently | Keep WebDAV as secondary, web reader as primary |

### Post-migration state

- **Laravel**: Pure API backend + OPDS + WebDAV + kosync
- **React**: SPA/PWA frontend, installable, offline-capable
- **Sync protocols**: WebDAV (Moon+), kosync (KOReader), internal API (web reader)
- **Offline**: Full reading experience without network
- **Livewire**: Removed entirely
