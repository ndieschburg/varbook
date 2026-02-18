<?php

namespace App\Livewire;

use App\Services\EpubService;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\Validate;
use Livewire\Component;
use Livewire\WithFileUploads;

class BookUploader extends Component
{
    use WithFileUploads;

    #[Validate(['files.*' => 'required|file|extensions:epub|max:51200'])]
    public array $files = [];

    public array $uploadProgress = [];
    public array $uploadErrors = [];
    public array $uploadSuccess = [];
    public bool $isUploading = false;

    public function updatedFiles(): void
    {
        $this->validate();
        $this->processUploads();
    }

    public function processUploads(): void
    {
        $this->isUploading = true;
        $this->uploadErrors = [];
        $this->uploadSuccess = [];

        $epubService = app(EpubService::class);
        $user = Auth::user();

        foreach ($this->files as $index => $file) {
            try {
                $book = $epubService->processUpload($file, $user);
                $this->uploadSuccess[] = [
                    'filename' => $file->getClientOriginalName(),
                    'title' => $book->title,
                ];
            } catch (\Exception $e) {
                $this->uploadErrors[] = [
                    'filename' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ];
            }
        }

        $this->files = [];
        $this->isUploading = false;

        if (!empty($this->uploadSuccess)) {
            $this->dispatch('books-uploaded');
        }
    }

    public function clearMessages(): void
    {
        $this->uploadErrors = [];
        $this->uploadSuccess = [];
    }

    public function render()
    {
        return view('livewire.book-uploader');
    }
}
