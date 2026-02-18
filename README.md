# BookShelf

A self-hosted Laravel application for managing personal EPUB libraries with multi-device reading position sync. Serves books via OPDS and synchronizes reading progress via WebDAV for Moon+ Reader.

## Features

- **EPUB Library Management**: Upload, organize, and manage your EPUB collection
- **Automatic Metadata Extraction**: Title, author, description, cover image extracted from EPUB files
- **Reading Progress Tracking**: Track reading progress and total reading time per book
- **Reading Sessions**: Detailed history of reading sessions with duration and progress
- **OPDS Catalog**: Browse and download books from any OPDS-compatible reader
- **WebDAV Sync**: Sync reading positions with Moon+ Reader Pro
- **Multi-user Support**: Each user has an isolated library
- **Admin Dashboard**: Manage users and view statistics
- **Dark Theme UI**: Modern, responsive interface inspired by streaming platforms

## Requirements

- PHP 8.2+
- MySQL 8.0+ or MariaDB 10.6+
- Composer
- Node.js 18+ (for building assets)
- PHP Extensions: `mbstring`, `xml`, `dom`, `gd`, `zip`, `pdo_mysql`

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/bookshelf.git
cd bookshelf
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
APP_NAME=BookShelf
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bookshelf
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SESSION_DRIVER=database

# BookShelf Configuration
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
php artisan bookshelf:create-admin
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
    root /var/www/bookshelf/public;

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

## Moon+ Reader Configuration

Moon+ Reader Pro supports both OPDS (for browsing/downloading books) and WebDAV (for syncing reading positions).

### OPDS Setup (Browse & Download Books)

1. Open Moon+ Reader Pro
2. Go to **Menu** → **Net Library** → **OPDS catalogs**
3. Tap **+** to add a new catalog
4. Enter the following:
   - **Name**: BookShelf (or any name you prefer)
   - **URL**: `https://your-domain.com/opds`
   - **Username**: Your BookShelf email
   - **Password**: Your BookShelf password
5. Tap **OK** to save

You can now browse your library, search books, and download them directly to Moon+ Reader.

#### OPDS Endpoints

| Endpoint | Description |
|----------|-------------|
| `/opds` | Root catalog |
| `/opds/all` | All books (paginated) |
| `/opds/by-author` | Browse by author |
| `/opds/by-author/{author}` | Books by specific author |
| `/opds/search?q={query}` | Search by title or author |

### WebDAV Setup (Sync Reading Positions)

WebDAV sync allows Moon+ Reader to save and restore your reading position across devices.

1. Open Moon+ Reader Pro
2. Go to **Menu** → **Miscellaneous** → **Sync reading positions**
3. Select **WebDAV** as the sync method
4. Enter the following:
   - **WebDAV URL**: `https://your-domain.com/webdav`
   - **Username**: Your BookShelf email
   - **Password**: Your BookShelf password
5. Tap **Test** to verify the connection
6. Enable **Auto sync** for automatic position syncing

#### How WebDAV Sync Works

- Moon+ Reader automatically syncs your reading position on every page turn
- BookShelf groups these syncs into reading sessions (configurable gap: 10 minutes default)
- Reading time is calculated and tracked per book
- Progress percentage is updated in real-time
- When progress reaches 95% (configurable), the book is marked as finished

#### Troubleshooting WebDAV

- Ensure your server supports HTTPS (required for Moon+ Reader)
- Check that HTTP Basic Auth is working: `curl -u email:password https://your-domain.com/webdav`
- Verify the WebDAV URL ends with `/webdav` (no trailing slash)
- If using a reverse proxy, ensure it passes `Authorization` headers

## Usage

### Library Management

- **Upload Books**: Drag and drop EPUB files onto the library page
- **View Details**: Click on a book card to see full metadata and reading history
- **Download**: Download the original EPUB file from the book detail page
- **Delete**: Remove books from your library (with confirmation)

### Search & Filter

- Use the search bar to find books by title or author
- Filter by status: All, Reading, Finished, Not Started
- Sort by: Recent, Title, Author, Progress

### Reading Sessions

Each book's detail page shows a history of reading sessions:
- Date and time of the session
- Duration (e.g., "45 min")
- Progress change (e.g., "32% → 45%")
- Client used (Moon+ Reader, KOReader, etc.)

## Admin Commands

```bash
# Create a new admin user
php artisan bookshelf:create-admin

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

- **Framework**: Laravel 12
- **Frontend**: Blade + Livewire + Alpine.js + Tailwind CSS
- **Database**: MySQL/MariaDB
- **WebDAV**: sabre/dav
- **EPUB Parsing**: kiwilan/php-ebook
- **Authentication**: Laravel Breeze

## API Authentication

| Protocol | Auth Method | Used By |
|----------|-------------|---------|
| Web UI | Session (cookie) | Browser |
| OPDS | HTTP Basic Auth | Moon+ Reader, etc. |
| WebDAV | HTTP Basic Auth | Moon+ Reader |

## Roadmap

### Phase 2 (Planned)
- KOReader support via kosync API
- PDF support
- Metadata editing from UI

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
