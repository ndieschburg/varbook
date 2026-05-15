# =============================================================================
# Stage 1: Build frontend assets
# =============================================================================
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./
COPY resources/ resources/
COPY public/ public/

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
FROM php:8.2-fpm-bookworm AS runtime

ARG UID=1000
ARG GID=1000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libxml2-dev \
    libonig-dev \
    libmagickwand-dev \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_sqlite \
        mbstring \
        xml \
        gd \
        zip \
        opcache \
        pcntl \
    && pecl install imagick && docker-php-ext-enable imagick \
    && apt-get purge -y --auto-remove libmagickwand-dev \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

# PHP production configuration
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini "$PHP_INI_DIR/conf.d/99-bookshelf.ini"
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-bookshelf.conf

# Nginx configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/bookshelf.conf

# Create app user
RUN groupmod -g ${GID} www-data && usermod -u ${UID} www-data

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
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache database

# Entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/bookshelf.conf"]
