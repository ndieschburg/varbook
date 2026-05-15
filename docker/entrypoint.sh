#!/bin/bash
set -e

cd /var/www/html

# Determine database driver (default: sqlite)
DB_CONNECTION="${DB_CONNECTION:-sqlite}"

if [ "$DB_CONNECTION" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    echo "Using SQLite database: $DB_FILE"

    # Create SQLite file if it doesn't exist
    if [ ! -f "$DB_FILE" ]; then
        touch "$DB_FILE"
        chown www-data:www-data "$DB_FILE"
    fi
else
    # Wait for external database to be ready
    echo "Waiting for $DB_CONNECTION database..."
    until php artisan db:monitor --databases="$DB_CONNECTION" > /dev/null 2>&1; do
        sleep 2
    done
    echo "Database is ready."
fi

# First-run setup
if [ ! -f storage/.docker-initialized ]; then
    echo "First run detected, running setup..."

    # Generate app key if not set
    if [ -z "$APP_KEY" ]; then
        php artisan key:generate --force
    fi

    touch storage/.docker-initialized
fi

# Always run on startup
php artisan migrate --force
php artisan storage:link --force 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Fix permissions after cache generation
chown -R www-data:www-data storage bootstrap/cache database

echo "BookShelf is ready!"

exec "$@"
