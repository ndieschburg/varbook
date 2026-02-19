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

    <!-- Books Grid -->
    @if ($books->count() > 0)
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            @foreach ($books as $book)
                <a href="{{ route('books.show', $book) }}"
                   wire:navigate
                   class="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-900/50">
                    <!-- Cover -->
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

                        <!-- Status Badge -->
                        <div class="absolute top-2 right-2">
                            @if ($book->is_finished)
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white">
                                    {{ __('Finished') }}
                                </span>
                            @elseif ($book->progress > 0)
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-600 text-white">
                                    {{ number_format($book->progress, 0) }}%
                                </span>
                            @endif
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="p-3">
                        <h3 class="font-medium text-slate-100 text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                            {{ $book->title }}
                        </h3>
                        <p class="text-slate-400 text-xs mt-1 line-clamp-1">
                            {{ $book->author ?? __('Unknown Author') }}
                        </p>

                        <!-- Progress Bar -->
                        <div class="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 rounded-full transition-all"
                                 style="width: {{ $book->progress }}%"></div>
                        </div>

                        <!-- Stats -->
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

        <!-- Pagination -->
        <div class="mt-8">
            {{ $books->links() }}
        </div>
    @else
        <!-- Empty State -->
        <div class="text-center py-16">
            <svg class="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-slate-300">{{ __('No books yet') }}</h3>
            <p class="mt-2 text-slate-500">{{ __('Upload your first EPUB to get started.') }}</p>
        </div>
    @endif
</div>
