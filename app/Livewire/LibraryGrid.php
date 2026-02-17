<?php

namespace App\Livewire;

use App\Models\Book;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\On;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

class LibraryGrid extends Component
{
    use WithPagination;

    #[Url]
    public string $search = '';

    #[Url]
    public string $sortBy = 'created_at';

    #[Url]
    public string $sortDirection = 'desc';

    #[Url]
    public string $filterStatus = '';

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function updatedFilterStatus(): void
    {
        $this->resetPage();
    }

    public function setSort(string $field): void
    {
        if ($this->sortBy === $field) {
            $this->sortDirection = $this->sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            $this->sortBy = $field;
            $this->sortDirection = 'asc';
        }
        $this->resetPage();
    }

    #[On('books-uploaded')]
    public function refreshBooks(): void
    {
        $this->resetPage();
    }

    public function render()
    {
        $query = Book::where('user_id', Auth::id());

        // Apply search filter
        if ($this->search) {
            $query->where(function ($q) {
                $q->where('title', 'like', "%{$this->search}%")
                    ->orWhere('author', 'like', "%{$this->search}%");
            });
        }

        // Apply status filter
        if ($this->filterStatus) {
            match ($this->filterStatus) {
                'not_started' => $query->where('progress', 0)->where('is_finished', false),
                'reading' => $query->where('progress', '>', 0)->where('is_finished', false),
                'finished' => $query->where('is_finished', true),
                default => null,
            };
        }

        // Apply sorting
        $query->orderBy($this->sortBy, $this->sortDirection);

        return view('livewire.library-grid', [
            'books' => $query->paginate(20),
        ]);
    }
}
