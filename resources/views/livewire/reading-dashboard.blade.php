<div class="space-y-8">
    {{-- Header with Period Selector --}}
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-100">{{ __('Reading Stats') }}</h1>
            <p class="text-slate-400 text-sm mt-1">{{ __('Track your reading journey') }}</p>
        </div>

        <div class="flex items-center gap-2 bg-slate-800 rounded-xl p-1">
            @foreach (['week' => __('Week'), 'month' => __('Month'), 'year' => __('Year'), 'all' => __('All')] as $key => $label)
                <button wire:click="setPeriod('{{ $key }}')"
                        class="px-4 py-2 text-sm font-medium rounded-lg transition-all {{ $period === $key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-100' }}">
                    {{ $label }}
                </button>
            @endforeach
        </div>
    </div>

    {{-- Stats Cards --}}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {{-- Total Reading Time --}}
        <div class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 shadow-xl shadow-indigo-500/20">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-indigo-200 text-sm font-medium">{{ __('Reading Time') }}</p>
                    <p class="text-3xl font-bold text-white mt-1">{{ $stats['totalTime'] }}</p>
                    <p class="text-indigo-200 text-xs mt-1">~{{ number_format($stats['pagesEstimate']) }} {{ __('pages') }}</p>
                </div>
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>

        {{-- Books Finished --}}
        <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 shadow-xl shadow-emerald-500/20">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-emerald-200 text-sm font-medium">{{ __('Books Finished') }}</p>
                    <p class="text-3xl font-bold text-white mt-1">{{ $stats['booksFinished'] }}</p>
                    <p class="text-emerald-200 text-xs mt-1">{{ __('of') }} {{ $stats['totalBooks'] }} {{ __('total') }}</p>
                </div>
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>

        {{-- Currently Reading --}}
        <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-xl shadow-amber-500/20">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-amber-100 text-sm font-medium">{{ __('Currently Reading') }}</p>
                    <p class="text-3xl font-bold text-white mt-1">{{ $stats['currentlyReading'] }}</p>
                    <p class="text-amber-100 text-xs mt-1">{{ __('books in progress') }}</p>
                </div>
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
            </div>
        </div>

        {{-- Reading Streak --}}
        <div class="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 shadow-xl shadow-rose-500/20">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-rose-200 text-sm font-medium">{{ __('Reading Streak') }}</p>
                    <p class="text-3xl font-bold text-white mt-1">{{ $stats['streak'] }} <span class="text-lg">{{ __('days') }}</span></p>
                    <p class="text-rose-200 text-xs mt-1">{{ $stats['sessionsCount'] }} {{ __('sessions') }}</p>
                </div>
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                </div>
            </div>
        </div>
    </div>

    {{-- Activity Heatmap --}}
    <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 class="text-lg font-semibold text-slate-100 mb-4">{{ __('Reading Activity') }}</h2>
        <p class="text-slate-400 text-sm mb-4">{{ __('Last 6 months') }}</p>

        <div class="overflow-x-auto">
            <div class="flex gap-1 min-w-max">
                @foreach ($activityHeatmap as $week)
                    <div class="flex flex-col gap-1">
                        @foreach ($week as $day)
                            <div class="w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-indigo-400 cursor-pointer
                                @switch($day['level'])
                                    @case(0) bg-slate-700 @break
                                    @case(1) bg-emerald-900 @break
                                    @case(2) bg-emerald-700 @break
                                    @case(3) bg-emerald-500 @break
                                    @case(4) bg-emerald-400 @break
                                @endswitch"
                                 title="{{ $day['date'] }}: {{ $day['formatted'] ?: __('No reading') }}">
                            </div>
                        @endforeach
                    </div>
                @endforeach
            </div>
        </div>

        {{-- Legend --}}
        <div class="flex items-center justify-end gap-2 mt-4 text-xs text-slate-400">
            <span>{{ __('Less') }}</span>
            <div class="w-3 h-3 rounded-sm bg-slate-700"></div>
            <div class="w-3 h-3 rounded-sm bg-emerald-900"></div>
            <div class="w-3 h-3 rounded-sm bg-emerald-700"></div>
            <div class="w-3 h-3 rounded-sm bg-emerald-500"></div>
            <div class="w-3 h-3 rounded-sm bg-emerald-400"></div>
            <span>{{ __('More') }}</span>
        </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
        {{-- Monthly Trend --}}
        <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">{{ __('Monthly Trend') }}</h2>

            <div class="space-y-3">
                @php $maxHours = collect($monthlyTrend)->max('hours') ?: 1; @endphp
                @foreach ($monthlyTrend as $month)
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-400 w-8">{{ $month['month'] }}</span>
                        <div class="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all flex items-center justify-end pr-2"
                                 style="width: {{ max(($month['hours'] / $maxHours) * 100, 2) }}%">
                                @if ($month['hours'] > 0)
                                    <span class="text-xs text-white font-medium">{{ $month['hours'] }}h</span>
                                @endif
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        {{-- Reading by Day of Week --}}
        <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">{{ __('Reading by Day') }}</h2>

            <div class="flex items-end justify-between h-40 gap-2">
                @foreach ($readingByDay as $day)
                    <div class="flex-1 flex flex-col items-center gap-2">
                        <div class="w-full bg-slate-700 rounded-t-lg relative overflow-hidden" style="height: {{ max($day['percentage'], 5) }}%">
                            <div class="absolute inset-0 bg-gradient-to-t from-indigo-600 to-purple-500"></div>
                        </div>
                        <span class="text-xs text-slate-400">{{ $day['day'] }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
        {{-- Top Books --}}
        <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">{{ __('Most Read Books') }}</h2>

            <div class="space-y-4">
                @forelse ($topBooks as $index => $book)
                    <a href="{{ route('books.show', $book['id']) }}" wire:navigate class="flex items-center gap-4 group">
                        <span class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                            @if ($index === 0) bg-amber-500 text-amber-900
                            @elseif ($index === 1) bg-slate-400 text-slate-900
                            @elseif ($index === 2) bg-amber-700 text-amber-100
                            @else bg-slate-600 text-slate-300
                            @endif">
                            {{ $index + 1 }}
                        </span>

                        <div class="w-10 h-14 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                            @if ($book['cover_url'])
                                <img src="{{ $book['cover_url'] }}" alt="" class="w-full h-full object-cover">
                            @endif
                        </div>

                        <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-medium text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                                {{ $book['title'] }}
                            </h3>
                            <p class="text-xs text-slate-400 truncate">{{ $book['author'] }}</p>
                        </div>

                        <div class="text-right">
                            <p class="text-sm font-medium text-slate-100">{{ $book['reading_time'] }}</p>
                            <p class="text-xs text-slate-400">{{ number_format($book['progress'], 0) }}%</p>
                        </div>
                    </a>
                @empty
                    <p class="text-slate-400 text-sm text-center py-4">{{ __('No reading data yet') }}</p>
                @endforelse
            </div>
        </div>

        {{-- Recent Sessions --}}
        <div class="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">{{ __('Recent Sessions') }}</h2>

            <div class="space-y-3">
                @forelse ($recentSessions as $session)
                    <a href="{{ route('books.show', $session['book_id']) }}" wire:navigate
                       class="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors group">
                        <div class="min-w-0">
                            <h3 class="text-sm font-medium text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                                {{ $session['book_title'] }}
                            </h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-slate-400">{{ $session['started_at'] }}</span>
                                <span class="text-xs text-slate-500">•</span>
                                <span class="text-xs text-slate-400">{{ $session['client'] }}</span>
                            </div>
                        </div>

                        <div class="text-right flex-shrink-0 ml-4">
                            <p class="text-sm font-medium text-emerald-400">{{ $session['duration'] }}</p>
                            <p class="text-xs text-slate-400">{{ $session['progress_change'] }}</p>
                        </div>
                    </a>
                @empty
                    <p class="text-slate-400 text-sm text-center py-4">{{ __('No sessions yet') }}</p>
                @endforelse
            </div>
        </div>
    </div>
</div>
