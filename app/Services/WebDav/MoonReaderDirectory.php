<?php

namespace App\Services\WebDav;

use App\Models\User;
use Sabre\DAV\Collection;
use Sabre\DAV\ICollection;

class MoonReaderDirectory extends Collection implements ICollection
{
    protected User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function getName(): string
    {
        return '';
    }

    public function getChildren(): array
    {
        // Return Apps directory for Moon+ Reader sync and Books directory for book downloads
        return [
            new VirtualDirectory($this->user, 'Apps', 'Apps'),
            new BooksDirectory($this->user),
        ];
    }

    public function getChild($name): VirtualDirectory|MoonReaderFile|MoonReaderDataFile|BooksDirectory
    {
        // If requesting Books directory, return the books listing
        if ($name === 'Books') {
            return new BooksDirectory($this->user);
        }

        // Position sync files (.po, .pos) - handled by MoonReaderFile
        if (preg_match('/\.(po|pos)$/i', $name)) {
            return new MoonReaderFile($name, null, $this->user, $name);
        }

        // All other data files - stored as binary data
        if (preg_match('/\.(sync|id|sorts|json|png|jpg|jpeg|gif|epub)$/i', $name)) {
            return new MoonReaderDataFile($name, $this->user, $name);
        }

        // Otherwise return a virtual directory
        return new VirtualDirectory($this->user, $name, $name);
    }

    public function childExists($name): bool
    {
        // Always return true to allow navigation/creation
        return true;
    }

    public function createFile($name, $data = null): ?string
    {
        // Position sync files (.po, .pos) - handled by MoonReaderFile
        if (preg_match('/\.(po|pos)$/i', $name)) {
            $file = new MoonReaderFile($name, null, $this->user, $name);
        } else {
            // All other files - stored as binary data
            $file = new MoonReaderDataFile($name, $this->user, $name);
        }

        $file->put($data);
        return null;
    }

    public function createDirectory($name): void
    {
        // Virtual directories are created on demand, nothing to do
    }
}
