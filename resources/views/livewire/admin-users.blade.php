<div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-slate-100">Users Management</h2>
        <button wire:click="openCreateModal"
                class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create User
        </button>
    </div>

    <!-- Flash Messages -->
    @if (session()->has('message'))
        <div class="mb-4 p-4 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-400">
            {{ session('message') }}
        </div>
    @endif

    <!-- Users Table -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table class="w-full">
            <thead>
                <tr class="border-b border-slate-700">
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Books</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
                @foreach ($users as $user)
                    <tr class="hover:bg-slate-700/50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                                    {{ strtoupper(substr($user->name, 0, 1)) }}
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-slate-100">{{ $user->name }}</div>
                                    <div class="text-sm text-slate-400">{{ $user->email }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                            {{ $user->books_count }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            @if ($user->is_admin)
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
                                    Admin
                                </span>
                            @else
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                                    User
                                </span>
                            @endif
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                            {{ $user->created_at->format('M d, Y') }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button wire:click="openEditModal({{ $user->id }})"
                                    class="text-indigo-400 hover:text-indigo-300 mr-3">
                                Edit
                            </button>
                            @if ($user->id !== auth()->id())
                                <button wire:click="openDeleteModal({{ $user->id }})"
                                        class="text-red-400 hover:text-red-300">
                                    Delete
                                </button>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <div class="mt-6">
        {{ $users->links() }}
    </div>

    <!-- Create/Edit Modal -->
    @if ($showCreateModal || $showEditModal)
        <div class="fixed inset-0 z-50 overflow-y-auto" x-data x-init="document.body.classList.add('overflow-hidden')" x-on:close-modal.window="document.body.classList.remove('overflow-hidden')">
            <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div class="fixed inset-0 transition-opacity bg-slate-900/75" wire:click="closeModals"></div>

                <div class="relative z-10 w-full max-w-md p-6 mx-auto bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                    <h3 class="text-lg font-medium text-slate-100 mb-4">
                        {{ $showCreateModal ? 'Create User' : 'Edit User' }}
                    </h3>

                    <form wire:submit="{{ $showCreateModal ? 'createUser' : 'updateUser' }}">
                        <div class="space-y-4">
                            <div>
                                <label for="name" class="block text-sm font-medium text-slate-300">Name</label>
                                <input type="text" id="name" wire:model="name"
                                       class="mt-1 block w-full bg-slate-700 border-slate-600 rounded-lg text-slate-100 focus:ring-indigo-500 focus:border-indigo-500">
                                @error('name') <span class="text-sm text-red-400">{{ $message }}</span> @enderror
                            </div>

                            <div>
                                <label for="email" class="block text-sm font-medium text-slate-300">Email</label>
                                <input type="email" id="email" wire:model="email"
                                       class="mt-1 block w-full bg-slate-700 border-slate-600 rounded-lg text-slate-100 focus:ring-indigo-500 focus:border-indigo-500">
                                @error('email') <span class="text-sm text-red-400">{{ $message }}</span> @enderror
                            </div>

                            <div>
                                <label for="password" class="block text-sm font-medium text-slate-300">
                                    Password {{ $showEditModal ? '(leave blank to keep current)' : '' }}
                                </label>
                                <input type="password" id="password" wire:model="password"
                                       class="mt-1 block w-full bg-slate-700 border-slate-600 rounded-lg text-slate-100 focus:ring-indigo-500 focus:border-indigo-500">
                                @error('password') <span class="text-sm text-red-400">{{ $message }}</span> @enderror
                            </div>

                            <div class="flex items-center">
                                <input type="checkbox" id="is_admin" wire:model="is_admin"
                                       class="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500">
                                <label for="is_admin" class="ml-2 text-sm text-slate-300">Administrator</label>
                            </div>
                        </div>

                        <div class="mt-6 flex justify-end space-x-3">
                            <button type="button" wire:click="closeModals"
                                    class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                                Cancel
                            </button>
                            <button type="submit"
                                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                                {{ $showCreateModal ? 'Create' : 'Update' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    @endif

    <!-- Delete Confirmation Modal -->
    @if ($showDeleteModal)
        <div class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div class="fixed inset-0 transition-opacity bg-slate-900/75" wire:click="closeModals"></div>

                <div class="relative z-10 w-full max-w-md p-6 mx-auto bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                    <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-900/50 rounded-full mb-4">
                        <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h3 class="text-lg font-medium text-slate-100 text-center">Delete User</h3>
                    <p class="mt-2 text-sm text-slate-400 text-center">
                        Are you sure you want to delete this user? This action cannot be undone.
                        All books and reading data will be permanently deleted.
                    </p>

                    <div class="mt-6 flex justify-center space-x-3">
                        <button type="button" wire:click="closeModals"
                                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                            Cancel
                        </button>
                        <button type="button" wire:click="deleteUser"
                                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                            Delete User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    @endif
</div>
