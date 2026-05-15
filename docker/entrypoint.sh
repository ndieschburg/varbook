#!/bin/bash
set -e

cd /var/www/html

# Build .env from Docker environment variables
# This ensures Laravel has a single source of truth
cat > .env <<EOF
APP_NAME=${APP_NAME:-Varbook}
APP_ENV=${APP_ENV:-production}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost:8080}
ASSET_URL=${ASSET_URL:-/}
APP_KEY=${APP_KEY:-}

DB_CONNECTION=${DB_CONNECTION:-sqlite}
DB_HOST=${DB_HOST:-}
DB_PORT=${DB_PORT:-}
DB_DATABASE=${DB_DATABASE:-/var/www/html/database/database.sqlite}
DB_USERNAME=${DB_USERNAME:-}
DB_PASSWORD=${DB_PASSWORD:-}

SESSION_DRIVER=${SESSION_DRIVER:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}
CACHE_STORE=${CACHE_STORE:-file}

SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS:-localhost:8080}

BOOKSHELF_MAX_UPLOAD_SIZE_MB=${BOOKSHELF_MAX_UPLOAD_SIZE_MB:-50}
BOOKSHELF_MAX_SESSION_HOURS=${BOOKSHELF_MAX_SESSION_HOURS:-4}
BOOKSHELF_SESSION_GAP_MINUTES=${BOOKSHELF_SESSION_GAP_MINUTES:-10}
BOOKSHELF_FINISHED_THRESHOLD=${BOOKSHELF_FINISHED_THRESHOLD:-95}
EOF

chown www-data:www-data .env

# Generate APP_KEY if not set
if ! grep -q "APP_KEY=base64:" .env; then
    php8.4 artisan key:generate --force
fi

# SQLite: create database file if needed
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    echo "Using SQLite database: $DB_FILE"

    if [ ! -f "$DB_FILE" ]; then
        touch "$DB_FILE"
        chown www-data:www-data "$DB_FILE"
    fi
else
    echo "Waiting for ${DB_CONNECTION} database..."
    until php8.4 artisan db:monitor --databases="${DB_CONNECTION}" > /dev/null 2>&1; do
        sleep 2
    done
    echo "Database is ready."
fi

# Run startup tasks
php8.4 artisan migrate --force
php8.4 artisan storage:link --force 2>/dev/null || true
php8.4 artisan route:cache
php8.4 artisan view:cache

# Fix permissions
chown -R www-data:www-data storage bootstrap/cache database

echo "Varbook is ready!"

exec "$@"
