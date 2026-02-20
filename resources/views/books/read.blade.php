<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#1e293b">

    <title>{{ $book->title }} - {{ config('app.name') }}</title>

    @vite(['resources/css/app.css', 'resources/js/reader/index.js'])

    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    </script>
</head>
<body class="bg-slate-900 overflow-hidden">
    <div id="reader-app" class="h-screen flex flex-col">
        {{-- Top Bar --}}
        <header id="reader-header" class="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between transition-transform duration-300">
            {{-- Back Button --}}
            <a href="{{ route('books.show', $book) }}"
               class="flex items-center text-slate-400 hover:text-slate-100 transition-colors">
                <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span class="hidden sm:inline">{{ __('Back') }}</span>
            </a>

            {{-- Book Title --}}
            <div class="flex-1 text-center px-4">
                <h1 class="text-slate-100 font-medium text-sm sm:text-base truncate">{{ $book->title }}</h1>
                <p class="text-slate-400 text-xs truncate">{{ $book->author ?? __('Unknown Author') }}</p>
            </div>

            {{-- Controls --}}
            <div class="flex items-center gap-2">
                {{-- TOC Button --}}
                <button id="toc-toggle" class="p-2 text-slate-400 hover:text-slate-100 transition-colors" title="{{ __('Table of Contents') }}">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                </button>

                {{-- Theme Button --}}
                <button id="theme-toggle" class="p-2 text-slate-400 hover:text-slate-100 transition-colors" title="{{ __('Theme') }}">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </button>
            </div>
        </header>

        {{-- Reader Container --}}
        <main class="flex-1 bg-slate-800 relative overflow-hidden">
            {{-- EPUB Render Target --}}
            <div id="reader-container" class="absolute inset-0"></div>

            {{-- Loading Overlay --}}
            <div id="reader-loading" class="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
                <div class="text-center">
                    <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="mt-4 text-slate-400">{{ __('Loading book...') }}</p>
                </div>
            </div>
        </main>

        {{-- Bottom Bar --}}
        <footer id="reader-footer" class="bg-slate-800 border-t border-slate-700 px-4 py-3 transition-transform duration-300">
            {{-- Progress Bar --}}
            <div class="flex items-center gap-4">
                <button id="prev-page" class="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div class="flex-1">
                    <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div id="reader-progress-bar" class="h-full bg-indigo-500 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>

                <span id="reader-progress-text" class="text-slate-400 text-sm min-w-[4rem] text-center">0%</span>

                <button id="next-page" class="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </footer>

        {{-- TOC Sidebar (hidden by default) --}}
        <aside id="toc-sidebar" class="fixed inset-y-0 left-0 w-80 max-w-[80vw] bg-slate-800 border-r border-slate-700 transform -translate-x-full transition-transform duration-300 z-50">
            <div class="h-full flex flex-col">
                <div class="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-slate-100">{{ __('Table of Contents') }}</h2>
                    <button id="toc-close" class="p-2 text-slate-400 hover:text-slate-100">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav id="toc-list" class="flex-1 overflow-y-auto p-4">
                    {{-- TOC items populated by JavaScript --}}
                </nav>
            </div>
        </aside>

        {{-- Settings Panel (hidden by default) --}}
        <div id="theme-panel" class="fixed bottom-20 right-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 hidden z-50 w-64">
            {{-- Theme --}}
            <h3 class="text-sm font-medium text-slate-400 mb-3">{{ __('Theme') }}</h3>
            <div class="flex gap-2 mb-4">
                <button data-theme="light" class="theme-btn w-10 h-10 rounded-lg bg-white border-2 border-slate-600 hover:border-indigo-500" title="{{ __('Light') }}"></button>
                <button data-theme="dark" class="theme-btn w-10 h-10 rounded-lg bg-slate-800 border-2 border-slate-600 hover:border-indigo-500" title="{{ __('Dark') }}"></button>
                <button data-theme="sepia" class="theme-btn w-10 h-10 rounded-lg bg-[#f4ecd8] border-2 border-slate-600 hover:border-indigo-500" title="{{ __('Sepia') }}"></button>
            </div>

            {{-- Font Size --}}
            <h3 class="text-sm font-medium text-slate-400 mb-3">{{ __('Font Size') }}</h3>
            <div class="flex items-center gap-3 mb-4">
                <button id="font-size-decrease" class="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xl font-bold transition-colors">−</button>
                <span id="font-size-display" class="flex-1 text-center text-slate-300 font-medium">100%</span>
                <button id="font-size-increase" class="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xl font-bold transition-colors">+</button>
            </div>

            {{-- Font Family --}}
            <h3 class="text-sm font-medium text-slate-400 mb-3">{{ __('Font') }}</h3>
            <div class="grid grid-cols-2 gap-2">
                <button data-font="default" class="font-btn px-3 py-2 rounded-lg border-2 border-slate-600 hover:border-indigo-500 text-slate-300 text-sm transition-colors">{{ __('Default') }}</button>
                <button data-font="serif" class="font-btn px-3 py-2 rounded-lg border-2 border-slate-600 hover:border-indigo-500 text-slate-300 text-sm transition-colors" style="font-family: Georgia, serif;">Serif</button>
                <button data-font="sans" class="font-btn px-3 py-2 rounded-lg border-2 border-slate-600 hover:border-indigo-500 text-slate-300 text-sm transition-colors" style="font-family: system-ui, sans-serif;">Sans</button>
                <button data-font="mono" class="font-btn px-3 py-2 rounded-lg border-2 border-slate-600 hover:border-indigo-500 text-slate-300 text-sm transition-colors" style="font-family: monospace;">Mono</button>
            </div>
        </div>

        {{-- Overlay for sidebars --}}
        <div id="overlay" class="fixed inset-0 bg-black/50 hidden z-40"></div>
    </div>

    <script type="module">
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize reader
            const reader = window.BookshelfReader.init({
                bookId: {{ $book->id }},
                epubUrl: '{{ route('books.epub', $book) }}',
                container: '#reader-container',
                apiBaseUrl: '/api/books',
            });

            // Store reference for cleanup
            window.currentReader = reader;

            // Navigation buttons
            document.getElementById('prev-page')?.addEventListener('click', () => reader.prevPage());
            document.getElementById('next-page')?.addEventListener('click', () => reader.nextPage());

            // TOC toggle
            const tocSidebar = document.getElementById('toc-sidebar');
            const overlay = document.getElementById('overlay');

            document.getElementById('toc-toggle')?.addEventListener('click', async () => {
                tocSidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');

                // Populate TOC if not already done
                const tocList = document.getElementById('toc-list');
                if (tocList.children.length === 0) {
                    const toc = await reader.getToc();
                    tocList.innerHTML = toc.map(item => `
                        <button class="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors" data-href="${item.href}">
                            ${item.label}
                        </button>
                    `).join('');

                    tocList.querySelectorAll('button').forEach(btn => {
                        btn.addEventListener('click', () => {
                            reader.goTo(btn.dataset.href);
                            tocSidebar.classList.add('-translate-x-full');
                            overlay.classList.add('hidden');
                        });
                    });
                }
            });

            document.getElementById('toc-close')?.addEventListener('click', () => {
                tocSidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            });

            overlay?.addEventListener('click', () => {
                tocSidebar.classList.add('-translate-x-full');
                document.getElementById('theme-panel')?.classList.add('hidden');
                overlay.classList.add('hidden');
            });

            // Theme toggle
            const themePanel = document.getElementById('theme-panel');
            document.getElementById('theme-toggle')?.addEventListener('click', () => {
                themePanel.classList.toggle('hidden');
            });

            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    reader.themeManager.applyTheme(btn.dataset.theme);
                });
            });

            // Font size controls
            document.getElementById('font-size-decrease')?.addEventListener('click', () => {
                reader.themeManager.decreaseFontSize();
            });
            document.getElementById('font-size-increase')?.addEventListener('click', () => {
                reader.themeManager.increaseFontSize();
            });

            // Font family controls
            document.querySelectorAll('.font-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    reader.themeManager.setFontFamily(btn.dataset.font);
                });
            });

            // Save position before leaving
            window.addEventListener('beforeunload', () => {
                reader.destroy();
            });
        });
    </script>
</body>
</html>
