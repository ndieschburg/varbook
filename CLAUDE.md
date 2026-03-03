# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookShelf is a self-hosted Laravel 12 + React SPA application for managing personal EPUB libraries with multi-device reading position synchronization. It features an integrated EPUB reader with offline PWA support, serves books via OPDS, and syncs reading progress with Moon+ Reader Pro (WebDAV) and KOReader (kosync API).

**Production URL**: https://bookshelf.hophop.be (automatic deployment via Gitea CI/CD on push to main)

## Development Commands

```bash
# One-time setup
composer run-script setup

# Development mode (runs artisan serve, queue, logs, vite concurrently)
composer run-script dev

# Run tests with coverage
composer run-script test

# Single test
php artisan test --filter=TestName

# Build frontend assets
npm run build

# Create admin user
php artisan bookshelf:create-admin
```

## Architecture

### Request Flow

```
React SPA (/library, /stats, /books, /read)  → Sanctum (cookie auth) → JSON API
OPDS API (/opds/*)                           → HTTP Basic Auth → OpdsController (XML/Atom)
WebDAV API (/webdav/*)                       → HTTP Basic Auth → SabreDAV virtual filesystem
kosync API (/api/kosync/*)                   → Custom header auth → KosyncController
```

### Frontend Structure (React SPA)

```
resources/js/
├── app.tsx                    # Entry point + React Router
├── types/                     # TypeScript interfaces
│   ├── book.ts               # Book, ReadingSession
│   ├── user.ts               # User
│   └── api.ts                # API response types, UserStats
├── api/
│   ├── client.ts             # Axios + Sanctum CSRF
│   └── hooks/                # TanStack Query hooks
│       ├── useAuth.ts        # Login, logout, user
│       ├── useBooks.ts       # CRUD books, progress, sessions
│       ├── useAdmin.ts       # Admin user management
│       └── useStats.ts       # Reading statistics
├── contexts/
│   └── AuthContext.tsx       # Auth state management
├── components/
│   ├── layout/               # Header, Layout
│   ├── ui/                   # Button, LoadingSpinner, Badge, etc.
│   ├── icons/                # Centralized SVG icon components
│   └── ProtectedRoute.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── LibraryPage.tsx       # Book grid with filters
│   ├── BookDetailPage.tsx    # Metadata + sessions
│   ├── ReaderPage.tsx        # epub.js reader
│   ├── StatsPage.tsx         # Reading statistics
│   ├── ProfilePage.tsx       # Profile & password
│   └── admin/UsersPage.tsx
├── hooks/                    # Custom hooks
│   ├── useOfflineBook.ts     # IndexedDB book storage
│   └── useOfflineSync.ts     # Offline progress queue
├── services/
│   └── offlineDb.ts          # Dexie IndexedDB wrapper
└── i18n/index.ts             # i18next config
```

### API Routes (`routes/api.php`)

```
POST   /api/login                    → AuthController@login
POST   /api/logout                   → AuthController@logout
GET    /api/user                     → AuthController@user
PUT    /api/user/locale              → AuthController@updateLocale
PUT    /api/user/profile-information → AuthController@updateProfile
PUT    /api/user/password            → AuthController@updatePassword

GET    /api/stats                    → StatsController@index

GET    /api/books                    → BookController@index
POST   /api/books                    → BookController@store (upload)
GET    /api/books/{id}               → BookController@show
DELETE /api/books/{id}               → BookController@destroy
GET    /api/books/{id}/download      → BookController@download
GET    /api/books/{id}/cover         → BookController@cover
GET    /api/books/{id}/sessions      → BookController@sessions
GET    /api/books/{id}/progress      → BookController@getProgress
PUT    /api/books/{id}/progress      → BookController@updateProgress
POST   /api/books/{id}/progress/batch→ BookController@batchProgress (PWA sync)

# Admin routes (middleware: admin)
GET    /api/admin/users              → Admin\UserController@index
POST   /api/admin/users              → Admin\UserController@store
PUT    /api/admin/users/{id}         → Admin\UserController@update
DELETE /api/admin/users/{id}         → Admin\UserController@destroy
GET    /api/admin/stats              → Admin\StatsController@index
```

### kosync API (KOReader)

```
POST   /api/kosync/users/auth        → Authenticate (x-auth-user/x-auth-key headers)
GET    /api/kosync/syncs/progress    → Get position (document param)
PUT    /api/kosync/syncs/progress    → Update position
```

### Key Services

- **EpubService** (`app/Services/EpubService.php`) - EPUB parsing, metadata extraction, cover handling
- **ReadingSessionService** (`app/Services/ReadingSessionService.php`) - Session aggregation, statistics calculation
- **WebDav/** (`app/Services/WebDav/`) - Virtual filesystem for Moon+ Reader sync
- **SettingsService** (`app/Services/SettingsService.php`) - Dynamic settings with user overrides

### Settings System

Migration-driven settings with three-tier value resolution: **User override > System value > Default value**.

#### Database Schema

```
settings_definitions     # Setting metadata (key, type, category, default, options, validation)
settings_values          # Actual values (system-level: user_id=NULL, user override: user_id=X)
```

#### Adding New Settings (via migrations)

```php
use App\Services\SettingsManager;

// In migration up():
SettingsManager::define('reader.new_setting', [
    'category' => 'reader',              // general, reader, library, appearance
    'type' => 'number',                  // text, textarea, number, checkbox, select, multiselect, color
    'label_en' => 'New Setting',
    'description_en' => 'Description here',
    'default_value' => 16,
    'validation_rules' => ['min' => 8, 'max' => 72, 'step' => 1],
    'is_user_overridable' => true,       // false = admin only
    'sort_order' => 100,
]);

// For select/multiselect types:
SettingsManager::define('reader.theme', [
    'category' => 'reader',
    'type' => 'select',
    'label_en' => 'Theme',
    'default_value' => 'dark',
    'options' => [
        ['value' => 'light', 'label_en' => 'Light'],
        ['value' => 'dark', 'label_en' => 'Dark'],
    ],
    'is_user_overridable' => true,
    'sort_order' => 10,
]);

// In migration down():
SettingsManager::remove('reader.new_setting');
```

#### Using Settings in PHP Code

```php
use App\Facades\Settings;

// Get setting (resolves user > system > default)
$fontSize = Settings::get('reader.font_size');              // No user context
$fontSize = Settings::get('reader.font_size', $userId);     // With user context

// Using global helper (uses auth()->id() automatically)
$fontSize = setting('reader.font_size');

// Set system value (admin)
Settings::setSystem('reader.font_size', 18);

// Set user override
Settings::setUser('reader.font_size', $userId, 20);

// Reset user override
Settings::resetUser('reader.font_size', $userId);

// Validate before saving
$result = Settings::validateValue('reader.font_size', $value);
if (!$result['valid']) { /* handle $result['errors'] */ }
```

#### Settings Categories (config/bookshelf.php)

```php
'settings_categories' => [
    'general' => ['label' => 'General', 'icon' => 'settings', 'sort' => 1],
    'reader' => ['label' => 'EPUB Reader', 'icon' => 'book-open', 'sort' => 2],
    'library' => ['label' => 'Library', 'icon' => 'library', 'sort' => 3],
    'appearance' => ['label' => 'Appearance', 'icon' => 'palette', 'sort' => 4],
],
```

#### Settings API Endpoints

```
# User settings (only user-overridable)
GET    /api/settings              → SettingsController@index
PUT    /api/settings/{key}        → SettingsController@update (key: reader_font_size)
DELETE /api/settings/{key}        → SettingsController@destroy (reset to default)

# Admin settings (all settings)
GET    /api/admin/settings        → Admin\SettingsController@index
PUT    /api/admin/settings/{key}  → Admin\SettingsController@update
```

Note: In URLs, dots in keys are replaced with underscores (e.g., `reader.font_size` → `reader_font_size`).

#### Frontend Components

- `resources/js/pages/SettingsPage.tsx` - User settings page with tabs
- `resources/js/pages/admin/SettingsPage.tsx` - Admin system settings
- `resources/js/components/settings/SettingField.tsx` - Auto-renders input by type
- `resources/js/api/hooks/useSettings.ts` - TanStack Query hooks

#### Translations for Settings

```json
// lang/{en,fr,es}.json
{
  "settings.category.reader": "EPUB Reader",
  "settings.reader.font_size": "Font size",
  "settings.reader.font_size_description": "Default font size in pixels",
  "settings.options.reader.theme.dark": "Dark"
}
```

#### Current Settings

##### General Settings (Admin only)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `general.max_upload_size_mb` | number | 50 | Maximum EPUB file size in MB |
| `general.session_gap_minutes` | number | 10 | Max gap between syncs to consider same reading session |
| `general.max_session_hours` | number | 4 | Max hours for a single reading session before auto-closing |
| `general.finished_threshold` | number | 95 | Progress percentage to mark book as finished |
| `general.progress_logging` | checkbox | false | Log all progress sync calls for debugging |

##### Reader Settings (User overridable, stored in localStorage)

These settings are device-specific and stored in the browser's localStorage, not synced via the settings API.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `reader.font_size` | number | 16 | Font size in pixels for EPUB content |
| `reader.font_family` | select | system | Font family (system, serif, sans-serif, monospace) |
| `reader.theme` | select | dark | Reader color theme (light, dark, sepia) |
| `reader.line_height` | number | 1.6 | Line spacing multiplier |
| `reader.debug_mode` | checkbox | false | Expose epub.js objects to browser console |

##### Library Settings (User overridable, synced via API)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `library.default_sort` | select | recent | Default sort order (recent, title, author, progress) |
| `library.cards_per_row` | number | 4 | Number of book cards per row on desktop (2-8) |
| `library.show_reading_time` | checkbox | true | Show reading time on book cards |
| `library.show_progress_bar` | checkbox | true | Show progress bar on book cards |

##### Appearance Settings (User overridable, synced via API)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `appearance.accent_color` | color | #6366f1 | Primary accent color (buttons, links, highlights) |
| `appearance.ui_theme` | select | dark | Application theme (light, dark, system) |

#### Appearance Implementation

The appearance settings use CSS variables and Tailwind for dynamic theming:

```css
/* resources/css/app.css */
:root {
    --color-accent: #6366f1;
    --color-accent-rgb: 99, 102, 241;
}

/* Use in components */
.bg-accent { background-color: var(--color-accent); }
.text-accent { color: var(--color-accent); }
```

The `useAppearance` hook (`resources/js/hooks/useAppearance.ts`) applies settings:
- Sets `--color-accent` CSS variable from `appearance.accent_color`
- Toggles `dark` class on `<html>` based on `appearance.ui_theme`
- Supports system preference detection when theme is set to "system"

### Reading Session Logic

- Position syncs within 10-minute gap = same session (configurable via `general.session_gap_minutes` setting)
- Books marked finished at 95% progress (configurable via `general.finished_threshold` setting)
- Sessions capped at 4 hours max (configurable via `general.max_session_hours` setting)

### Storage Paths

- EPUBs: `storage/app/books/{user_id}/{hash}.epub`
- Covers: `storage/app/public/covers/{user_id}/{hash}.{ext}`
- WebDAV locks: `storage/app/webdav-locks.dat`

## Internationalization

**All user-facing strings MUST be translated in all 3 languages: en, es, fr**

- Backend: Translation files in `lang/{en,es,fr}.json`. Use `__('key')` in controllers.
- Frontend: Uses `react-i18next`. Call `t('key')` in components. Translations loaded from same JSON files.

## Tech Stack

### Backend
- Laravel 12, PHP 8.2+, MySQL 8.0+
- Laravel Sanctum for SPA authentication
- kiwilan/php-ebook for EPUB parsing
- sabre/dav for WebDAV server

### Frontend
- React 18 + TypeScript
- React Router 7 for navigation
- TanStack Query for data fetching
- react-i18next for translations
- Tailwind CSS 4
- Vite 7 with PWA plugin
- epub.js for EPUB rendering
- Dexie for IndexedDB (offline storage)

### PWA Features
- Installable as standalone app
- Offline reading with cached EPUBs
- Background sync for reading progress
- Service worker with Workbox

## Calibre Plugin

Python plugin in `calibre_plugin_bookshelf/` for uploading books from Calibre desktop. Build with `./build.sh`.
