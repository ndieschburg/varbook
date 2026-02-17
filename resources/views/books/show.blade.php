<x-app-layout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Back Link -->
        <a href="{{ route('library') }}" wire:navigate
           class="inline-flex items-center text-slate-400 hover:text-slate-100 mb-6 transition-colors">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Library
        </a>

        <!-- Book Header -->
        <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div class="md:flex">
                <!-- Cover -->
                <div class="md:w-64 md:flex-shrink-0">
                    <div class="aspect-[2/3] bg-slate-700">
                        @if ($book->cover_url)
                            <img src="{{ $book->cover_url }}"
                                 alt="{{ $book->title }}"
                                 class="w-full h-full object-cover">
                        @else
                            <div class="w-full h-full flex items-center justify-center">
                                <svg class="h-24 w-24 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        @endif
                    </div>
                </div>

                <!-- Info -->
                <div class="p-6 flex-1">
                    <div class="flex items-start justify-between">
                        <div>
                            <h1 class="text-2xl font-bold text-slate-100">{{ $book->title }}</h1>
                            <p class="text-lg text-slate-400 mt-1">{{ $book->author ?? 'Unknown Author' }}</p>
                        </div>

                        <!-- Status Badge -->
                        @if ($book->is_finished)
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-600 text-white">
                                <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Finished
                            </span>
                        @elseif ($book->progress > 0)
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-600 text-white">
                                Reading
                            </span>
                        @else
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-600 text-slate-300">
                                Not Started
                            </span>
                        @endif
                    </div>

                    <!-- Description -->
                    @if ($book->description)
                        <p class="mt-4 text-slate-300 text-sm leading-relaxed line-clamp-4">
                            {{ $book->description }}
                        </p>
                    @endif

                    <!-- Progress -->
                    <div class="mt-6">
                        <div class="flex items-center justify-between text-sm mb-2">
                            <span class="text-slate-400">Progress</span>
                            <span class="text-slate-100 font-medium">{{ number_format($book->progress, 1) }}%</span>
                        </div>
                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 rounded-full transition-all"
                                 style="width: {{ $book->progress }}%"></div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div class="bg-slate-700/50 rounded-lg p-3">
                            <p class="text-slate-400 text-xs">Reading Time</p>
                            <p class="text-slate-100 font-medium mt-1">{{ $book->formatted_reading_time }}</p>
                        </div>
                        <div class="bg-slate-700/50 rounded-lg p-3">
                            <p class="text-slate-400 text-xs">File Size</p>
                            <p class="text-slate-100 font-medium mt-1">{{ $book->formatted_file_size }}</p>
                        </div>
                        <div class="bg-slate-700/50 rounded-lg p-3">
                            <p class="text-slate-400 text-xs">Language</p>
                            <p class="text-slate-100 font-medium mt-1">{{ $book->language ?? 'N/A' }}</p>
                        </div>
                        <div class="bg-slate-700/50 rounded-lg p-3">
                            <p class="text-slate-400 text-xs">Added</p>
                            <p class="text-slate-100 font-medium mt-1">{{ $book->created_at->format('M d, Y') }}</p>
                        </div>
                    </div>

                    <!-- Metadata -->
                    <div class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        @if ($book->publisher)
                            <div>
                                <span class="text-slate-400">Publisher:</span>
                                <span class="text-slate-300 ml-1">{{ $book->publisher }}</span>
                            </div>
                        @endif
                        @if ($book->isbn)
                            <div>
                                <span class="text-slate-400">ISBN:</span>
                                <span class="text-slate-300 ml-1">{{ $book->isbn }}</span>
                            </div>
                        @endif
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 flex flex-wrap gap-3">
                        <a href="{{ route('books.download', $book) }}"
                           class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download EPUB
                        </a>

                        <form action="{{ route('books.destroy', $book) }}" method="POST"
                              x-data
                              x-on:submit.prevent="if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) $el.submit()">
                            @csrf
                            @method('DELETE')
                            <button type="submit"
                                    class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                                <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reading Sessions -->
        <div class="mt-8">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">Reading Sessions</h2>

            @if ($book->readingSessions->count() > 0)
                <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-slate-700">
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            @foreach ($book->readingSessions as $session)
                                <tr class="hover:bg-slate-700/50 transition-colors">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {{ $session->started_at->format('M d, Y H:i') }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {{ $session->formatted_duration }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {{ $session->progress_change }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                                            {{ $session->client_label }}
                                        </span>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @else
                <div class="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                    <svg class="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-4 text-sm font-medium text-slate-300">No reading sessions yet</h3>
                    <p class="mt-2 text-sm text-slate-500">Open this book in Moon+ Reader to start tracking your progress.</p>
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
