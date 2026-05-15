# =============================================================================
# Stage 1: Build frontend assets
# =============================================================================
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY resources/ resources/
COPY public/ public/
COPY lang/ lang/

RUN npm run build

# =============================================================================
# Stage 2: Install PHP dependencies
# =============================================================================
FROM composer:2 AS composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --no-progress

COPY . .
RUN composer dump-autoload --optimize

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM debian:bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# Install PHP 8.4, Nginx, Supervisor — all pre-compiled Debian packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates apt-transport-https lsb-release curl gnupg \
    && curl -fsSL https://packages.sury.org/php/apt.gpg | gpg --dearmor -o /usr/share/keyrings/sury-php.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/sury-php.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    php8.4-fpm \
    php8.4-cli \
    php8.4-mysql \
    php8.4-sqlite3 \
    php8.4-mbstring \
    php8.4-xml \
    php8.4-gd \
    php8.4-zip \
    php8.4-opcache \
    php8.4-curl \
    php8.4-imagick \
    && apt-get purge -y --auto-remove ca-certificates apt-transport-https lsb-release curl gnupg \
    && rm -rf /var/lib/apt/lists/*

# PHP production configuration
COPY docker/php.ini /etc/php/8.4/cli/conf.d/99-bookshelf.ini
COPY docker/php.ini /etc/php/8.4/fpm/conf.d/99-bookshelf.ini
COPY docker/php-fpm.conf /etc/php/8.4/fpm/pool.d/zz-bookshelf.conf

# Nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/bookshelf.conf

WORKDIR /var/www/html

# Copy application code
COPY --from=composer /app /var/www/html
COPY --from=frontend /app/public/build /var/www/html/public/build

# Remove dev files
RUN rm -rf tests node_modules .env.example calibre_plugin_bookshelf docker

# Ensure storage and cache directories exist with correct permissions
RUN mkdir -p \
    storage/app/private/books \
    storage/app/public/covers \
    storage/app/public/locks \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    database \
    /run/php \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache database

# Entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/bookshelf.conf"]
