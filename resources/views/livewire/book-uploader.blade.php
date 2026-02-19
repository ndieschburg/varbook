<div class="mb-6">
    <!-- Drop Zone -->
    <div x-data="{
            isDragging: false,
            handleDrop(e) {
                this.isDragging = false;
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    @this.uploadMultiple('files', files);
                }
            }
        }"
         x-on:dragover.prevent="isDragging = true"
         x-on:dragleave.prevent="isDragging = false"
         x-on:drop.prevent="handleDrop($event)"
         :class="{ 'border-indigo-500 bg-indigo-500/10': isDragging }"
         class="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center transition-colors hover:border-slate-500">

        <div class="flex flex-col items-center space-y-4">
            <div class="p-4 bg-slate-800 rounded-full">
                <svg class="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>

            <div>
                <p class="text-slate-300 font-medium">{{ __('Drag & drop EPUB files here') }}</p>
                <p class="text-slate-500 text-sm mt-1">{{ __('or click to browse') }}</p>
            </div>

            <label class="cursor-pointer">
                <input type="file"
                       wire:model="files"
                       accept=".epub"
                       multiple
                       class="hidden">
                <span class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                    {{ __('Select Files') }}
                </span>
            </label>
        </div>

        <!-- Loading indicator -->
        <div wire:loading wire:target="files" class="mt-4">
            <div class="flex items-center justify-center space-x-2 text-indigo-400">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ __('Uploading...') }}</span>
            </div>
        </div>
    </div>

    <!-- Success Messages -->
    @if (count($uploadSuccess) > 0)
        <div class="mt-4 p-4 bg-emerald-900/50 border border-emerald-700 rounded-lg">
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="text-emerald-400 font-medium">{{ __('Upload Successful') }}</h4>
                    <ul class="mt-2 text-sm text-emerald-300 space-y-1">
                        @foreach ($uploadSuccess as $success)
                            <li>{{ $success['title'] }}</li>
                        @endforeach
                    </ul>
                </div>
                <button wire:click="clearMessages" class="text-emerald-400 hover:text-emerald-300">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    @endif

    <!-- Error Messages -->
    @if (count($uploadErrors) > 0)
        <div class="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="text-red-400 font-medium">{{ __('Upload Failed') }}</h4>
                    <ul class="mt-2 text-sm text-red-300 space-y-1">
                        @foreach ($uploadErrors as $error)
                            <li>{{ $error['filename'] }}: {{ $error['error'] }}</li>
                        @endforeach
                    </ul>
                </div>
                <button wire:click="clearMessages" class="text-red-400 hover:text-red-300">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    @endif

    @error('files.*')
        <p class="mt-2 text-sm text-red-400">{{ $message }}</p>
    @enderror
</div>
