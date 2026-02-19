<?php

use App\Livewire\Actions\Logout;
use Livewire\Volt\Component;

new class extends Component
{
    public function logout(Logout $logout): void
    {
        $logout();

        $this->redirect('/', navigate: true);
    }
}; ?>

<nav x-data="{ open: false }" class="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <!-- Left: Logo -->
            <div class="flex items-center">
                <a href="{{ route('library') }}" wire:navigate class="flex items-center space-x-2">
                    <svg class="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span class="text-xl font-bold text-slate-100">BookShelf</span>
                </a>
            </div>

            <!-- Center: Search (on larger screens) -->
            <div class="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div class="relative w-full" x-data="{ search: '' }">
                    <input type="text"
                           x-model="search"
                           @keydown.enter="if(search) window.location.href = '{{ route('library') }}?search=' + encodeURIComponent(search)"
                           placeholder="{{ __('Search books...') }}"
                           class="w-full bg-slate-700 border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 pl-10 pr-4">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Right: User Menu -->
            <div class="hidden sm:flex sm:items-center sm:space-x-4">
                @if(auth()->user()->isAdmin())
                    <a href="{{ route('admin.users') }}" wire:navigate
                       class="text-slate-400 hover:text-slate-100 px-3 py-2 text-sm font-medium transition-colors {{ request()->routeIs('admin.*') ? 'text-indigo-400' : '' }}">
                        {{ __('Admin') }}
                    </a>
                @endif

                <!-- Language Selector -->
                <x-dropdown align="right" width="32">
                    <x-slot name="trigger">
                        <button class="flex items-center space-x-1 text-slate-400 hover:text-slate-100 transition-colors px-2 py-1">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            <span class="text-xs font-medium uppercase">{{ app()->getLocale() }}</span>
                        </button>
                    </x-slot>

                    <x-slot name="content">
                        <x-dropdown-link :href="route('locale.switch', 'en')" class="{{ app()->getLocale() === 'en' ? 'bg-slate-700' : '' }}">
                            {{ __('English') }}
                        </x-dropdown-link>
                        <x-dropdown-link :href="route('locale.switch', 'fr')" class="{{ app()->getLocale() === 'fr' ? 'bg-slate-700' : '' }}">
                            {{ __('French') }}
                        </x-dropdown-link>
                        <x-dropdown-link :href="route('locale.switch', 'es')" class="{{ app()->getLocale() === 'es' ? 'bg-slate-700' : '' }}">
                            {{ __('Spanish') }}
                        </x-dropdown-link>
                    </x-slot>
                </x-dropdown>

                <x-dropdown align="right" width="48">
                    <x-slot name="trigger">
                        <button class="flex items-center space-x-2 text-slate-400 hover:text-slate-100 transition-colors">
                            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                                {{ strtoupper(substr(auth()->user()->name, 0, 1)) }}
                            </div>
                            <span class="text-sm font-medium" x-data="{{ json_encode(['name' => auth()->user()->name]) }}" x-text="name" x-on:profile-updated.window="name = $event.detail.name"></span>
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </x-slot>

                    <x-slot name="content">
                        <x-dropdown-link :href="route('profile')" wire:navigate>
                            {{ __('Profile') }}
                        </x-dropdown-link>

                        <button wire:click="logout" class="w-full text-start">
                            <x-dropdown-link>
                                {{ __('Log Out') }}
                            </x-dropdown-link>
                        </button>
                    </x-slot>
                </x-dropdown>
            </div>

            <!-- Mobile menu button -->
            <div class="-me-2 flex items-center sm:hidden">
                <button @click="open = ! open" class="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700 focus:outline-none transition">
                    <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path :class="{'hidden': open, 'inline-flex': ! open }" class="inline-flex" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        <path :class="{'hidden': ! open, 'inline-flex': open }" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <div :class="{'block': open, 'hidden': ! open}" class="hidden sm:hidden bg-slate-800 border-t border-slate-700">
        <!-- Mobile Search -->
        <div class="px-4 py-3">
            <div class="relative" x-data="{ search: '' }">
                <input type="text"
                       x-model="search"
                       @keydown.enter="if(search) window.location.href = '{{ route('library') }}?search=' + encodeURIComponent(search)"
                       placeholder="{{ __('Search books...') }}"
                       class="w-full bg-slate-700 border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 pl-10 pr-4">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
        </div>

        <div class="pt-2 pb-3 space-y-1 border-t border-slate-700">
            <x-responsive-nav-link :href="route('library')" :active="request()->routeIs('library')" wire:navigate>
                {{ __('Library') }}
            </x-responsive-nav-link>

            @if(auth()->user()->isAdmin())
                <x-responsive-nav-link :href="route('admin.users')" :active="request()->routeIs('admin.*')" wire:navigate>
                    {{ __('Admin') }}
                </x-responsive-nav-link>
            @endif
        </div>

        <div class="pt-4 pb-1 border-t border-slate-700">
            <div class="px-4">
                <div class="font-medium text-base text-slate-100" x-data="{{ json_encode(['name' => auth()->user()->name]) }}" x-text="name" x-on:profile-updated.window="name = $event.detail.name"></div>
                <div class="font-medium text-sm text-slate-400">{{ auth()->user()->email }}</div>
            </div>

            <div class="mt-3 space-y-1">
                <x-responsive-nav-link :href="route('profile')" wire:navigate>
                    {{ __('Profile') }}
                </x-responsive-nav-link>

                <button wire:click="logout" class="w-full text-start">
                    <x-responsive-nav-link>
                        {{ __('Log Out') }}
                    </x-responsive-nav-link>
                </button>
            </div>

            <!-- Mobile Language Selector -->
            <div class="mt-3 pt-3 border-t border-slate-700">
                <div class="px-4 flex items-center space-x-2">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <a href="{{ route('locale.switch', 'en') }}" class="px-2 py-1 text-sm {{ app()->getLocale() === 'en' ? 'text-indigo-400 font-medium' : 'text-slate-400' }}">EN</a>
                    <span class="text-slate-600">|</span>
                    <a href="{{ route('locale.switch', 'fr') }}" class="px-2 py-1 text-sm {{ app()->getLocale() === 'fr' ? 'text-indigo-400 font-medium' : 'text-slate-400' }}">FR</a>
                    <span class="text-slate-600">|</span>
                    <a href="{{ route('locale.switch', 'es') }}" class="px-2 py-1 text-sm {{ app()->getLocale() === 'es' ? 'text-indigo-400 font-medium' : 'text-slate-400' }}">ES</a>
                </div>
            </div>
        </div>
    </div>
</nav>
