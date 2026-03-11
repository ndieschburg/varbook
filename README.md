# Varbook

A self-hosted Laravel + React application for managing personal EPUB libraries with multi-device reading position sync. Features an integrated EPUB reader with offline PWA support, OPDS catalog, WebDAV sync for Moon+ Reader, and kosync API for KOReader.

## Features

- **EPUB Library Management**: Upload, organize, and manage your EPUB collection
- **Integrated EPUB Reader**: Read books directly in the browser with epub.js
- **PWA Support**: Install as a standalone app, read offline with cached books
- **Automatic Metadata Extraction**: Title, author, description, cover image extracted from EPUB files
- **Reading Progress Tracking**: Track reading progress and total reading time per book
- **Reading Sessions**: Detailed history of reading sessions with duration and progress
- **Multi-Device Sync**: Sync reading positions across devices
- **OPDS Catalog**: Browse and download books from any OPDS-compatible reader
- **WebDAV Sync**: Sync reading positions with Moon+ Reader Pro
- **KOReader Support**: Sync reading positions with KOReader via kosync API
- **Multi-user Support**: Each user has an isolated library
- **Admin Dashboard**: Manage users and view statistics
- **Dark Theme UI**: Modern, responsive interface with Tailwind CSS

## Requirements

- PHP 8.2+
- MySQL 8.0+ or MariaDB 10.6+
- Composer
- Node.js 18+ (for building assets)
- PHP Extensions: `mbstring`, `xml`, `dom`, `gd`, `zip`, `pdo_mysql`

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/ndieschburg/varbook.git
cd varbook
```

### 2. Install dependencies

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
```

### 3. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your database credentials and application URL:

```env
APP_NAME=Varbook
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=varbook
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SESSION_DRIVER=database

# Sanctum SPA domains (for cookie auth)
SANCTUM_STATEFUL_DOMAINS=your-domain.com

# Varbook Configuration
BOOKSHELF_MAX_SESSION_HOURS=4
BOOKSHELF_SESSION_GAP_MINUTES=10
BOOKSHELF_FINISHED_THRESHOLD=95
BOOKSHELF_MAX_UPLOAD_SIZE_MB=50
```

### 4. Run migrations

```bash
php artisan migrate --force
```

### 5. Set permissions

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 6. Create admin user

```bash
php artisan varbook:create-admin
```

### 7. Optimize for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Web Server Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/varbook/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 100M;
}
```

## Usage

### Web Interface

Access the application at your configured URL. The React SPA provides:

- **Library**: Browse, search, filter, and upload books
- **Book Detail**: View metadata, reading sessions, download or delete
- **Reader**: Integrated EPUB reader with progress sync
- **Stats**: Reading statistics, charts, and session history
- **Profile**: Update name, email, and password
- **Admin**: User management (admin only)

### PWA Installation

Varbook can be installed as a Progressive Web App:

1. Open the site in Chrome/Edge/Safari
2. Click "Install" in the address bar or browser menu
3. The app will be available as a standalone application
4. Books can be downloaded for offline reading

### Offline Sync

When reading offline, your reading positions are stored locally and automatically synced when you come back online:

- Positions are saved to IndexedDB while offline
- On reconnection, all queued positions are batch-synced to the server
- Local positions take priority to prevent overwriting recent offline reading with old server data

**Debug Mode**: Enable "Debug mode" in Settings > EPUB Reader to see detailed logs for offline sync operations (`[NetworkState]`, `[OfflineDB]`, `[PositionSync]`, `[OfflineSync]`) in the browser console.

### Search & Filter

- Use the search bar to find books by title or author
- Filter by status: All, Reading, Finished, Not Started
- Sort by: Recent, Title, Author, Progress

### Reading Sessions

Each book's detail page shows a history of reading sessions:
- Date and time of the session
- Duration (e.g., "45 min")
- Progress change (e.g., "32% → 45%")
- Client used (Web Reader, Moon+ Reader, KOReader, etc.)

## Moon+ Reader Configuration

Moon+ Reader Pro supports both OPDS (for browsing/downloading books) and WebDAV (for syncing reading positions).

### OPDS Setup (Browse & Download Books)

1. Open Moon+ Reader Pro
2. Go to **Menu** → **Net Library** → **OPDS catalogs**
3. Tap **+** to add a new catalog
4. Enter the following:
   - **Name**: Varbook (or any name you prefer)
   - **URL**: `https://your-domain.com/opds`
   - **Username**: Your Varbook email
   - **Password**: Your Varbook password
5. Tap **OK** to save

#### OPDS Endpoints

| Endpoint | Description |
|----------|-------------|
| `/opds` | Root catalog |
| `/opds/all` | All books (paginated) |
| `/opds/by-author` | Browse by author |
| `/opds/by-author/{author}` | Books by specific author |
| `/opds/search?q={query}` | Search by title or author |

### WebDAV Setup (Sync Reading Positions)

1. Open Moon+ Reader Pro
2. Go to **Menu** → **Miscellaneous** → **Sync reading positions**
3. Select **WebDAV** as the sync method
4. Enter the following:
   - **WebDAV URL**: `https://your-domain.com/webdav`
   - **Username**: Your Varbook email
   - **Password**: Your Varbook password
5. Tap **Test** to verify the connection
6. Enable **Auto sync** for automatic position syncing

## KOReader Configuration

KOReader syncs reading positions using the kosync protocol.

### kosync Setup

1. Open KOReader
2. Go to **Tools** → **Progress sync**
3. Select **Custom sync server**
4. Enter the following:
   - **Server URL**: `https://your-domain.com/api/kosync`
   - **Username**: Your Varbook email
   - **Password**: Your Varbook password
5. Tap **Login** to authenticate

### How kosync Works

- KOReader syncs position on book open/close and periodically
- Varbook tracks these as reading sessions
- Progress is calculated from the position data
- Same session grouping logic as WebDAV (10-minute gap)

## API Reference

### Authentication

| Protocol | Auth Method | Used By |
|----------|-------------|---------|
| Web SPA | Sanctum (cookie) | Browser |
| OPDS | HTTP Basic Auth | Moon+ Reader, etc. |
| WebDAV | HTTP Basic Auth | Moon+ Reader |
| kosync | Header auth (`x-auth-user`, `x-auth-key`) | KOReader |

### JSON API Endpoints

All endpoints require Sanctum authentication (cookie-based for SPA).

```
POST   /api/login                    # Login, returns user
POST   /api/logout                   # Logout
GET    /api/user                     # Current user
PUT    /api/user/locale              # Update locale preference
PUT    /api/user/profile-information # Update name/email
PUT    /api/user/password            # Change password

GET    /api/stats                    # Reading statistics

GET    /api/books                    # List books (with filters)
POST   /api/books                    # Upload new book (multipart)
GET    /api/books/{id}               # Get book details
DELETE /api/books/{id}               # Delete book
GET    /api/books/{id}/download      # Download EPUB
GET    /api/books/{id}/cover         # Get cover image
GET    /api/books/{id}/sessions      # Reading sessions
GET    /api/books/{id}/progress      # Get progress
PUT    /api/books/{id}/progress      # Update progress
POST   /api/books/{id}/progress/batch# Batch sync (PWA offline)

# Admin only
GET    /api/admin/users              # List users
POST   /api/admin/users              # Create user
PUT    /api/admin/users/{id}         # Update user
DELETE /api/admin/users/{id}         # Delete user
GET    /api/admin/stats              # Global statistics
```

## Admin Commands

```bash
# Create a new admin user
php artisan varbook:create-admin

# Clear application cache
php artisan optimize:clear

# Rebuild cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `BOOKSHELF_MAX_SESSION_HOURS` | 4 | Maximum duration for a single reading session |
| `BOOKSHELF_SESSION_GAP_MINUTES` | 10 | Maximum gap between syncs to stay in the same session |
| `BOOKSHELF_FINISHED_THRESHOLD` | 95 | Progress percentage to mark a book as finished |
| `BOOKSHELF_MAX_UPLOAD_SIZE_MB` | 50 | Maximum EPUB file size for upload |

## Tech Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.2+)
- **Database**: MySQL/MariaDB
- **Auth**: Laravel Sanctum (SPA), HTTP Basic (OPDS/WebDAV)
- **WebDAV**: sabre/dav
- **EPUB Parsing**: kiwilan/php-ebook

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: React Router 7
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite 7
- **i18n**: react-i18next
- **EPUB Reader**: epub.js
- **Offline Storage**: Dexie (IndexedDB)
- **PWA**: vite-plugin-pwa + Workbox

## Calibre Plugin

A Calibre plugin is available for uploading books directly from Calibre desktop.

Location: `calibre_plugin_varbook/`

Build with:
```bash
cd calibre_plugin_varbook
./build.sh
```

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
