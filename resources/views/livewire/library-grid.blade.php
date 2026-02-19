<div>
    <!-- Filters Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <!-- Search -->
        <div class="relative flex-1 max-w-md">
            <input type="text"
                   wire:model.live.debounce.300ms="search"
                   placeholder="{{ __('Search by title or author...') }}"
                   class="w-full bg-slate-800 border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 pl-10 pr-4">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </div>

        <!-- Filters & Sort -->
        <div class="flex items-center gap-3">
            <!-- Status Filter -->
            <select wire:model.live="filterStatus"
                    class="bg-slate-800 border-slate-700 rounded-lg text-slate-100 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">{{ __('All Status') }}</option>
                <option value="not_started">{{ __('Not Started') }}</option>
                <option value="reading">{{ __('Reading') }}</option>
                <option value="finished">{{ __('Finished') }}</option>
            </select>

            <!-- Sort -->
            <select wire:model.live="sortBy"
                    class="bg-slate-800 border-slate-700 rounded-lg text-slate-100 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="created_at">{{ __('Recent') }}</option>
                <option value="title">{{ __('Title') }}</option>
                <option value="author">{{ __('Author') }}</option>
                <option value="progress">{{ __('Progress') }}</option>
            </select>

            <!-- Sort Direction -->
            <button wire:click="setSort('{{ $sortBy }}')"
                    class="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors">
                @if ($sortDirection === 'asc')
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                @else
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                @endif
            </button>
        </div>
    </div>

    {{-- Currently Reading Section --}}
    @if ($showCurrentlyReading)
        <div class="mb-10">
            {{-- Section Header --}}
            <div class="flex items-center gap-3 mb-4">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-slate-100">{{ __('Continue Reading') }}</h2>
                    <p class="text-xs text-slate-400">{{ __('Pick up where you left off') }}</p>
                </div>
            </div>

            {{-- Currently Reading Cards - Horizontal Scroll --}}
            <div class="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                @foreach ($currentlyReading as $book)
                    <a href="{{ route('books.show', $book) }}"
                       wire:navigate
                       class="group flex-shrink-0 w-72 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/5 hover:scale-[1.02]">
                        <div class="flex gap-4 p-4">
                            {{-- Cover --}}
                            <div class="flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden bg-slate-700 shadow-lg">
                                @if ($book->cover_url)
                                    <img src="{{ $book->cover_url }}"
                                         alt="{{ $book->title }}"
                                         class="w-full h-full object-cover">
                                @else
                                    <div class="w-full h-full flex items-center justify-center">
                                        <svg class="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                @endif
                            </div>

                            {{-- Info --}}
                            <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                    <h3 class="font-medium text-slate-100 text-sm line-clamp-2 group-hover:text-amber-400 transition-colors">
                                        {{ $book->title }}
                                    </h3>
                                    <p class="text-slate-400 text-xs mt-1 line-clamp-1">
                                        {{ $book->author ?? __('Unknown Author') }}
                                    </p>
                                </div>

                                <div class="mt-2">
                                    {{-- Progress Bar --}}
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                                                 style="width: {{ $book->progress }}%"></div>
                                        </div>
                                        <span class="text-xs font-medium text-amber-400">{{ number_format($book->progress, 0) }}%</span>
                                    </div>

                                    {{-- Stats --}}
                                    <div class="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        <span class="flex items-center gap-1">
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {{ $book->formatted_reading_time }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a>
                @endforeach
            </div>
        </div>
    @endif

    {{-- Library Section --}}
    <div>
        {{-- Section Header --}}
        @if ($showCurrentlyReading)
            <div class="flex items-center gap-3 mb-4">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-slate-100">{{ __('Library') }}</h2>
                    <p class="text-xs text-slate-400">{{ __('Your complete collection') }}</p>
                </div>
            </div>
        @endif

        {{-- Books Grid --}}
        @if ($books->count() > 0)
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                @foreach ($books as $book)
                    <a href="{{ route('books.show', $book) }}"
                       wire:navigate
                       class="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-900/50">
                        {{-- Cover --}}
                        <div class="aspect-[2/3] bg-slate-700 relative overflow-hidden">
                            @if ($book->cover_url)
                                <img src="{{ $book->cover_url }}"
                                     alt="{{ $book->title }}"
                                     class="w-full h-full object-cover">
                            @else
                                <div class="w-full h-full flex items-center justify-center">
                                    <svg class="h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                            @endif

                            {{-- Status Badge --}}
                            <div class="absolute top-2 right-2">
                                @if ($book->is_finished)
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white shadow-lg">
                                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                        </svg>
                                        {{ __('Finished') }}
                                    </span>
                                @elseif ($book->progress > 0)
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-600 text-white shadow-lg">
                                        {{ number_format($book->progress, 0) }}%
                                    </span>
                                @endif
                            </div>
                        </div>

                        {{-- Info --}}
                        <div class="p-3">
                            <h3 class="font-medium text-slate-100 text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                                {{ $book->title }}
                            </h3>
                            <p class="text-slate-400 text-xs mt-1 line-clamp-1">
                                {{ $book->author ?? __('Unknown Author') }}
                            </p>

                            {{-- Progress Bar --}}
                            <div class="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div class="h-full {{ $book->is_finished ? 'bg-emerald-500' : 'bg-indigo-500' }} rounded-full transition-all"
                                     style="width: {{ $book->progress }}%"></div>
                            </div>

                            {{-- Stats --}}
                            <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
                                <span class="flex items-center gap-1">
                                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {{ $book->formatted_reading_time }}
                                </span>
                            </div>
                        </div>
                    </a>
                @endforeach
            </div>

            {{-- Pagination --}}
            <div class="mt-8">
                {{ $books->links() }}
            </div>
        @else
            {{-- Empty State --}}
            <div class="text-center py-16">
                <svg class="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-slate-300">{{ __('No books yet') }}</h3>
                <p class="mt-2 text-slate-500">{{ __('Upload your first EPUB to get started.') }}</p>
            </div>
        @endif
    </div>
</div>
