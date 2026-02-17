<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'BookShelf') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans antialiased bg-slate-900 text-slate-100">
        <div class="min-h-screen flex flex-col">
            <livewire:layout.navigation />

            <!-- Page Content -->
            <main class="flex-1">
                {{ $slot }}
            </main>

            <!-- Footer -->
            <footer class="py-4 text-center text-slate-500 text-sm border-t border-slate-800">
                <p>BookShelf v1.0</p>
            </footer>
        </div>

        <!-- Toast Notifications -->
        <div x-data="{ show: false, message: '', type: 'success' }"
             x-on:toast.window="show = true; message = $event.detail.message; type = $event.detail.type || 'success'; setTimeout(() => show = false, 3000)"
             x-show="show"
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0 transform translate-y-2"
             x-transition:enter-end="opacity-100 transform translate-y-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100 transform translate-y-0"
             x-transition:leave-end="opacity-0 transform translate-y-2"
             class="fixed bottom-4 right-4 z-50"
             style="display: none;">
            <div :class="{
                'bg-emerald-600': type === 'success',
                'bg-red-600': type === 'error',
                'bg-amber-600': type === 'warning'
            }" class="px-4 py-3 rounded-lg shadow-lg text-white">
                <span x-text="message"></span>
            </div>
        </div>
    </body>
</html>
