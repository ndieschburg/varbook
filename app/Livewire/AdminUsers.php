<?php

namespace App\Livewire;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Livewire\Attributes\Validate;
use Livewire\Component;
use Livewire\WithPagination;

class AdminUsers extends Component
{
    use WithPagination;

    public bool $showCreateModal = false;
    public bool $showEditModal = false;
    public bool $showDeleteModal = false;

    public ?int $editingUserId = null;
    public ?int $deletingUserId = null;

    #[Validate('required|string|max:255')]
    public string $name = '';

    #[Validate('required|email|max:255')]
    public string $email = '';

    #[Validate('nullable|string|min:8')]
    public string $password = '';

    public bool $is_admin = false;

    public function openCreateModal(): void
    {
        $this->reset(['name', 'email', 'password', 'is_admin', 'editingUserId']);
        $this->showCreateModal = true;
    }

    public function openEditModal(int $userId): void
    {
        $user = User::findOrFail($userId);
        $this->editingUserId = $userId;
        $this->name = $user->name;
        $this->email = $user->email;
        $this->password = '';
        $this->is_admin = $user->is_admin;
        $this->showEditModal = true;
    }

    public function openDeleteModal(int $userId): void
    {
        $this->deletingUserId = $userId;
        $this->showDeleteModal = true;
    }

    public function createUser(): void
    {
        $this->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        User::create([
            'name' => $this->name,
            'email' => $this->email,
            'password' => Hash::make($this->password),
            'is_admin' => $this->is_admin,
        ]);

        $this->reset(['name', 'email', 'password', 'is_admin']);
        $this->showCreateModal = false;

        session()->flash('message', 'User created successfully.');
    }

    public function updateUser(): void
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $this->editingUserId,
        ];

        if ($this->password) {
            $rules['password'] = 'string|min:8';
        }

        $this->validate($rules);

        $user = User::findOrFail($this->editingUserId);
        $user->name = $this->name;
        $user->email = $this->email;
        $user->is_admin = $this->is_admin;

        if ($this->password) {
            $user->password = Hash::make($this->password);
        }

        $user->save();

        $this->reset(['name', 'email', 'password', 'is_admin', 'editingUserId']);
        $this->showEditModal = false;

        session()->flash('message', 'User updated successfully.');
    }

    public function deleteUser(): void
    {
        $user = User::findOrFail($this->deletingUserId);

        // Delete all user's books and related data
        foreach ($user->books as $book) {
            app(\App\Services\EpubService::class)->deleteBook($book);
        }

        $user->delete();

        $this->deletingUserId = null;
        $this->showDeleteModal = false;

        session()->flash('message', 'User deleted successfully.');
    }

    public function closeModals(): void
    {
        $this->showCreateModal = false;
        $this->showEditModal = false;
        $this->showDeleteModal = false;
        $this->reset(['name', 'email', 'password', 'is_admin', 'editingUserId', 'deletingUserId']);
    }

    public function render()
    {
        return view('livewire.admin-users', [
            'users' => User::withCount('books')
                ->orderBy('created_at', 'desc')
                ->paginate(20),
        ]);
    }
}
