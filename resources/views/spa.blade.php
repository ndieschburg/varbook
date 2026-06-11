<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'Varbook') }}</title>

    <!-- OpenGraph / Twitter Card -->
    <meta property="og:title" content="Varbook — Your books, everywhere">
    <meta property="og:description" content="Self-hosted EPUB library with cross-device reading sync. Read on your e-reader, pick up where you left off in the browser.">
    <meta property="og:image" content="{{ url('og-image.png') }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="{{ config('app.url') }}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">

    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="icon" href="/pwa-icons/favicon-32.png" type="image/png" sizes="32x32">
    <link rel="icon" href="/pwa-icons/favicon-16.png" type="image/png" sizes="16x16">

    <!-- PWA -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0f172a">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="/pwa-icons/apple-touch-icon.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=atkinson-hyperlegible:400,400i,700|crimson-pro:400,400i,700|eb-garamond:400,400i,700|inter:400,500,600,700|literata:400,400i,700|lora:400,400i,700|merriweather:400,400i,700|open-sans:400,400i,700" rel="stylesheet" />
    <!-- OpenDyslexic for accessibility -->
    <link href="https://fonts.cdnfonts.com/css/opendyslexic" rel="stylesheet" />

    <!-- Scripts -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])

    <!-- PWA Service Worker Registration -->
    @production
    <script src="/build/registerSW.js"></script>
    @endproduction
</head>
<body class="font-sans antialiased bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div id="app"></div>
</body>
</html>
