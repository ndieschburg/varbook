# BookShelf — Specifications

## Overview

Self-hosted Laravel application for managing personal EPUB libraries with multi-device reading position sync. Serves books via OPDS and synchronizes reading progress via WebDAV (Moon+ Reader) and kosync (KOReader).

---

## Phase 1 — Core Features

### 1. Authentication & User Management

**Admin user**
- Created via artisan seeder or CLI command (`php artisan bookshelf:create-admin`)
- Can create, edit, deactivate and delete users
- Can view all users' libraries and stats (read-only)

**Regular users**
- Login with email/password
- Each user has an isolated library (books, positions, stats)
- Can manage their own books only

**Tech notes**
- Laravel Breeze or Fortify for auth scaffolding
- Middleware `admin` for admin-only routes
- Users table: `id`, `name`, `email`, `password`, `is_admin`, `timestamps`

---

### 2. Book Management

**Upload**
- Drag & drop zone on the library page (multiple files supported)
- Accepts EPUB files only (Phase 1)
- On upload:
  - Extract metadata from EPUB (title, author, description, language, publisher, ISBN) using a PHP EPUB parser (e.g. `kiwilan/php-ebook`)
  - Extract cover image and store as thumbnail
  - Store EPUB in user's private storage directory: `storage/books/{user_id}/{hash}.epub`
  - Create database record

**Library view**
- Grid of book cards (responsive, 3-4 columns)
- Each card displays:
  - Cover image (fallback placeholder if none)
  - Title & author
  - Reading progress bar (percentage)
  - Total reading time (formatted: `12h 34m`)
  - Status badge: `Not started` | `Reading (42%)` | `Finished ✓`

**Book detail view** (click on card)
- Full metadata: title, author, description, language, publisher, ISBN, file size, upload date
- Reading progress (percentage + visual bar)
- Total reading time
- **Reading sessions list** (table, most recent first):
  - Date/time
  - Duration of the session
  - Progress at start → progress at end
  - Device/client identifier (Moon+, KOReader, etc.)
- Download button
- Delete button (with confirmation)

**Tech notes**
- Books table: `id`, `user_id`, `title`, `author`, `description`, `language`, `publisher`, `isbn`, `filename`, `cover_path`, `file_hash`, `file_size`, `progress` (float 0-100), `total_reading_seconds` (int), `is_finished` (bool), `timestamps`
- Reading sessions table: `id`, `book_id`, `started_at`, `ended_at`, `duration_seconds`, `progress_before`, `progress_after`, `client` (string: 'moon', 'koreader', 'web'), `raw_payload` (JSON, for debugging), `timestamps`

---

### 3. OPDS Catalog (Book Distribution)

Implements OPDS 1.2 (Atom/XML feed) so Moon+ Reader (and any OPDS client) can browse and download books.

**Endpoints**
```
GET /opds                        → Root catalog (links to subcatalogs)
GET /opds/all                    → All books (paginated, 20/page)
GET /opds/by-author              → Authors list
GET /opds/by-author/{author}     → Books by author
GET /opds/search?q={query}       → Search by title/author
GET /opds/book/{id}/download     → EPUB file download (acquisition link)
```

**Auth**
- HTTP Basic Auth (required by most OPDS clients including Moon+)
- Validates against the same user credentials
- Each user only sees their own books

**Tech notes**
- Responses: `Content-Type: application/atom+xml`
- Each book entry includes:
  - `<title>`, `<author>`, `<summary>`
  - Acquisition link (`rel="http://opds-spec.org/acquisition"`, `type="application/epub+zip"`)
  - Cover image link (`rel="http://opds-spec.org/image"`)
  - Pagination via `rel="next"` links
- No external dependency needed — generate XML via Blade templates or simple PHP

---

### 4. WebDAV Server (Moon+ Reader Sync)

Moon+ Reader Pro syncs reading positions by writing/reading files on a WebDAV server. The app stores a file per book containing the current position.

**Endpoint**
```
/webdav/{user_path}/...
```

**Implementation**
- Use `sabre/dav` package integrated into Laravel
- Virtual filesystem backed by database (no actual files on disk for sync data)
- Auth: HTTP Basic Auth (same user credentials)
- Each user has an isolated virtual directory

**Moon+ sync behavior**
- Moon+ writes files like `{book_identifier}.json` or `.pos` files to the WebDAV share
- On each write (PUT request), the server:
  1. Parses the position data from the uploaded content
  2. Calculates reading time delta since last sync
  3. Updates `books.progress` (percentage)
  4. Increments `books.total_reading_seconds`
  5. Creates a new entry in `reading_sessions`
  6. Identifies the book by matching filename/hash against the user's library

**Matching Moon+ files to books**
- Moon+ identifies books by filename or internal identifier
- Store a mapping table or use fuzzy matching on book title/filename
- `book_sync_identifiers` table: `id`, `book_id`, `client`, `external_identifier`, `timestamps`

**Tech notes**
- `sabre/dav` handles PROPFIND, GET, PUT, DELETE, MKCOL etc.
- Custom backend class implementing `Sabre\DAV\ICollection` and `Sabre\DAV\IFile`
- Laravel route: `Route::any('/webdav/{path}', WebDavController::class)->where('path', '.*')`

---

### 5. Reading Time Calculation & Session Grouping

Moon+ Reader syncs automatically on every page turn (or at a configurable interval), generating many PUT requests per reading session. The server must group these into coherent reading sessions.

**Session grouping logic — on each sync event (WebDAV PUT or future kosync):**

1. Retrieve the last sync record for this book+user from `book_sync_identifiers`
2. Calculate delta: `now - last_sync_at`
3. **If delta ≤ SESSION_GAP_MINUTES (default: 10 min)** → same session:
   - Find the current open session (`reading_sessions` where `ended_at` is most recent and delta from `ended_at` ≤ gap)
   - Update `reading_sessions.ended_at = now`
   - Recalculate `reading_sessions.duration_seconds = ended_at - started_at`
   - Update `reading_sessions.progress_after` from sync payload
4. **If delta > SESSION_GAP_MINUTES** → new session:
   - Create new `reading_sessions` record:
     - `started_at = now`
     - `ended_at = now`
     - `duration_seconds = 0`
     - `progress_before` = current book progress
     - `progress_after` = new progress from sync payload
     - `client = 'moon'` (or 'koreader' in Phase 2)
5. **In both cases:**
   - Update `book_sync_identifiers.last_sync_at = now`
   - Update `book_sync_identifiers.last_progress` from sync payload
   - Update `books.progress` from sync payload
   - Recalculate `books.total_reading_seconds` = SUM of all `reading_sessions.duration_seconds` for this book
   - If progress ≥ FINISHED_THRESHOLD (default: 95%) → set `books.is_finished = true`

**Sanity cap:** if a single session exceeds MAX_SESSION_HOURS (default: 4h), close it and start a new one on next sync. This prevents runaway sessions if Moon+ syncs once, the user falls asleep, and syncs again hours later.

**Edge cases:**
- First sync ever for a book: create new session with `duration_seconds = 0`
- Moon+ may sync the same progress multiple times (no page change): update `last_sync_at` but don't inflate reading time (check that progress actually changed before extending session duration, or accept minimal time inflation as negligible)

---

## Phase 2 — KOReader Support (Future)

### kosync API

Implements the KOReader sync protocol (REST API).

**Endpoints**
```
POST   /kosync/users/create       → Register (username, password)
POST   /kosync/users/auth         → Login
PUT    /kosync/syncs/progress     → Update reading progress
GET    /kosync/syncs/progress     → Get reading progress
```

**Behavior**
- KOReader identifies books by MD5 hash of the file
- On PUT progress: same logic as WebDAV — update progress, calculate reading time, create session
- Auth: custom header `x-auth-user` + `x-auth-key`

**Tech notes**
- `book_sync_identifiers` table reused with `client = 'koreader'` and `external_identifier = md5_hash`
- Matching: compute MD5 of stored EPUBs at upload time, store in `books.file_hash`

---

## Database Schema Summary

```
users
├── id
├── name
├── email
├── password
├── is_admin (boolean, default: false)
├── created_at
└── updated_at

books
├── id
├── user_id (FK → users)
├── title
├── author
├── description (nullable)
├── language (nullable)
├── publisher (nullable)
├── isbn (nullable)
├── filename (original filename)
├── storage_path (path relative to storage)
├── cover_path (nullable)
├── file_hash (MD5, for kosync matching)
├── file_size (bytes)
├── progress (float, 0.00 → 100.00)
├── total_reading_seconds (int, default: 0)
├── is_finished (boolean, default: false)
├── created_at
└── updated_at

reading_sessions
├── id
├── book_id (FK → books)
├── started_at (datetime)
├── ended_at (datetime)
├── duration_seconds (int)
├── progress_before (float)
├── progress_after (float)
├── client (string: 'moon', 'koreader', 'web')
├── raw_payload (JSON, nullable)
├── created_at
└── updated_at

book_sync_identifiers
├── id
├── book_id (FK → books)
├── client (string: 'moon', 'koreader')
├── external_identifier (string)
├── last_sync_at (datetime)
├── last_progress (float)
├── created_at
└── updated_at
```

---

## UI / Frontend

### Design System

**Overall aesthetic**: Dark theme, minimal, modern. Inspired by streaming platforms (Plex, Jellyfin) and BookLore. Focus on book covers as the primary visual element.

**Color palette**:
- Background: slate-900 (`#0f172a`) / slate-800 (`#1e293b`)
- Cards: slate-800 with subtle border slate-700
- Accent: indigo-500 (`#6366f1`) for buttons, progress bars, active states
- Text: slate-100 (primary), slate-400 (secondary)
- Success: emerald-500 (finished badge)
- Warning: amber-500 (reading badge)

**Typography**: Inter (Google Fonts) — clean, modern, highly readable

**Border radius**: `rounded-xl` on cards, `rounded-lg` on buttons/inputs

**Transitions**: subtle hover animations on cards (slight scale + shadow lift)

---

### Layout

**Header** (fixed top):
- Left: App logo/name "BookShelf"
- Center: Search bar (instant search with Livewire, filters on title/author)
- Right: User avatar dropdown (Settings, Logout) + Admin link if admin

**No sidebar**. Full-width content area. Clean and spacious.

**Footer**: minimal — version number, link to GitHub repo

---

### Pages

#### Login page
- Centered card on a dark background
- Email + password fields
- Subtle gradient or blurred book covers as background decoration

#### Library (main page)
- **Top bar**: Sort options (recent, title, author, progress) + filter (reading, finished, not started) + grid/list toggle
- **Drag & drop zone**: Full-width dashed border area at the top, collapsible. Shows upload progress with file names and percentage. Appears prominently when empty library, discreet otherwise.
- **Book grid**: Responsive CSS grid (2 cols mobile, 3 cols tablet, 4-5 cols desktop)

#### Book card component
```
┌─────────────────────┐
│                     │
│    [Cover Image]    │
│     (aspect 2:3)    │
│                     │
├─────────────────────┤
│ Title (truncated)   │
│ Author (muted)      │
│ ━━━━━━━━░░░░ 64%    │  ← progress bar (indigo)
│ ⏱ 3h 21m read      │
│ 🏷 Reading          │  ← status badge
└─────────────────────┘
```
- Hover: slight scale (1.02), shadow elevation, subtle glow
- Badge colors: `Not started` (slate), `Reading` (amber), `Finished` (emerald)
- Progress bar integrated into card, thin, below title/author
- Clicking opens book detail

#### Book detail page
- Two-column layout (cover left, info right) on desktop. Stacked on mobile.
- Left: Large cover image with subtle shadow
- Right:
  - Title (large), Author
  - Metadata block: language, publisher, ISBN, file size, upload date
  - Progress bar (larger) + percentage + "Finished" badge if applicable
  - Total reading time (prominent)
  - Action buttons: Download EPUB, Delete (with modal confirmation)
- Below: **Reading sessions table**
  - Columns: Date, Duration, Progress (before → after), Client
  - Sorted by most recent first
  - Paginated (10 per page)
  - Empty state: "No reading sessions yet. Open this book in Moon+ Reader to start tracking."

#### Admin: Users page
- Table: Name, Email, Books count, Total reading time, Created at, Actions
- Actions: Edit, Deactivate, Delete (with confirmation)
- "Create user" button → modal or inline form (name, email, password, is_admin toggle)

---

### Interactive Components (Livewire + Alpine.js)

- **Drag & drop upload**: Alpine.js for drag events and file selection, Livewire for upload processing and progress feedback. Toast notifications on success/error.
- **Library grid**: Livewire component with real-time search, sort, and filter without page reload.
- **Book detail sessions**: Livewire paginated table.
- **Delete confirmation**: Alpine.js modal.
- **Toast notifications**: Alpine.js based, auto-dismiss, bottom-right corner. Used for: upload success, upload error, book deleted, etc.

---

### Responsive Breakpoints

- Mobile (< 640px): Single column cards, stacked book detail
- Tablet (640-1024px): 2-3 column grid
- Desktop (> 1024px): 4-5 column grid, side-by-side book detail

---

## Tech Stack

- **Framework**: Laravel 11+
- **PHP**: 8.2+
- **Database**: SQLite (single file, simple deployment) — switchable to MySQL/MariaDB
- **WebDAV**: `sabre/dav` via Composer
- **EPUB parsing**: `kiwilan/php-ebook` via Composer
- **Frontend**: Blade + Livewire (for drag & drop, dynamic cards) or Blade + Alpine.js
- **Storage**: Local filesystem (`storage/books/{user_id}/`)
- **Auth**: Laravel Breeze (simple, Blade-based)

---

## API Authentication Summary

| Protocol | Auth Method          | Used By      |
|----------|----------------------|--------------|
| Web UI   | Session (cookie)     | Browser      |
| OPDS     | HTTP Basic Auth      | Moon+, etc.  |
| WebDAV   | HTTP Basic Auth      | Moon+        |
| kosync   | Custom headers       | KOReader     |

---

## Configuration (.env)

```
BOOKSHELF_MAX_SESSION_HOURS=4          # Cap for a single reading session
BOOKSHELF_SESSION_GAP_MINUTES=10       # Max gap between syncs to stay in same session
BOOKSHELF_FINISHED_THRESHOLD=95        # Progress % to mark as finished
BOOKSHELF_MAX_UPLOAD_SIZE_MB=50        # Max EPUB file size
```

---

## Artisan Commands

```bash
php artisan bookshelf:create-admin     # Create admin user interactively
php artisan bookshelf:rehash-books     # Recompute MD5 hashes for all books (Phase 2 prep)
php artisan bookshelf:stats            # Display global stats (users, books, reading time)
```

---

## Out of Scope (Phase 1)

- PDF support
- In-browser EPUB reader
- Social features / sharing between users
- Metadata editing from the UI (auto-extracted only)
- Email notifications
- Mobile app (relies on Moon+ / KOReader as clients)