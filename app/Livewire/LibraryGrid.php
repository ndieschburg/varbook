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

    /**
     * Get books currently being read (progress > 0, not finished)
     * Ordered by last reading session
     */
    protected function getCurrentlyReading()
    {
        $query = Book::where('user_id', Auth::id())
            ->where('progress', '>', 0)
            ->where('is_finished', false);

        // Apply search filter
        if ($this->search) {
            $query->where(function ($q) {
                $q->where('title', 'like', "%{$this->search}%")
                    ->orWhere('author', 'like', "%{$this->search}%");
            });
        }

        // Order by most recent reading activity
        return $query->orderBy('updated_at', 'desc')->get();
    }

    /**
     * Get library books (not currently reading)
     */
    protected function getLibraryBooks()
    {
        $query = Book::where('user_id', Auth::id());

        // Exclude currently reading books (unless filtering specifically)
        if (!$this->filterStatus) {
            $query->where(function ($q) {
                $q->where('progress', 0)
                    ->orWhere('is_finished', true);
            });
        }

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

        return $query->paginate(20);
    }

    public function render()
    {
        $currentlyReading = $this->getCurrentlyReading();
        $books = $this->getLibraryBooks();

        // Hide "Currently Reading" section when filtering by status
        $showCurrentlyReading = !$this->filterStatus && $currentlyReading->isNotEmpty();

        return view('livewire.library-grid', [
            'currentlyReading' => $currentlyReading,
            'showCurrentlyReading' => $showCurrentlyReading,
            'books' => $books,
        ]);
    }
}
