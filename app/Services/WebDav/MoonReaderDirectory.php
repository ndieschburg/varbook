<?php

namespace App\Services\WebDav;

use App\Models\User;
use Sabre\DAV\Collection;
use Sabre\DAV\Exception\NotFound;

class MoonReaderDirectory extends Collection
{
    protected User $user;
    protected array $children = [];

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function getName(): string
    {
        return 'webdav';
    }

    public function getChildren(): array
    {
        // Return a virtual file for each sync identifier
        $syncIdentifiers = $this->user->books()
            ->with('syncIdentifiers')
            ->get()
            ->pluck('syncIdentifiers')
            ->flatten();

        $children = [];
        foreach ($syncIdentifiers as $syncId) {
            $children[] = new MoonReaderFile(
                $syncId->external_identifier,
                $syncId->book,
                $this->user
            );
        }

        return $children;
    }

    public function getChild($name): MoonReaderFile
    {
        // Find the sync identifier by external identifier
        $syncIdentifier = \App\Models\BookSyncIdentifier::where('external_identifier', $name)
            ->whereHas('book', function ($query) {
                $query->where('user_id', $this->user->id);
            })
            ->with('book')
            ->first();

        if ($syncIdentifier) {
            return new MoonReaderFile(
                $syncIdentifier->external_identifier,
                $syncIdentifier->book,
                $this->user
            );
        }

        // If not found, create a new virtual file for potential new sync
        return new MoonReaderFile($name, null, $this->user);
    }

    public function childExists($name): bool
    {
        // Always return true to allow creation of new files
        return true;
    }

    public function createFile($name, $data = null): ?string
    {
        $file = new MoonReaderFile($name, null, $this->user);
        $file->put($data);
        return null;
    }

    public function createDirectory($name): void
    {
        // Moon+ Reader doesn't create directories, ignore
    }
}
