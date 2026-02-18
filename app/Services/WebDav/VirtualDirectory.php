<?php

namespace App\Services\WebDav;

use App\Models\User;
use Sabre\DAV\Collection;
use Sabre\DAV\ICollection;

class VirtualDirectory extends Collection implements ICollection
{
    protected User $user;
    protected string $name;
    protected string $path;

    public function __construct(User $user, string $name, string $path = '')
    {
        $this->user = $user;
        $this->name = $name;
        $this->path = $path;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getChildren(): array
    {
        // Return empty array - children are created on demand
        return [];
    }

    public function getChild($name): VirtualDirectory|MoonReaderFile
    {
        $fullPath = $this->path ? "{$this->path}/{$name}" : $name;

        // If it looks like a file (has extension), return a file
        if (preg_match('/\.(po|pos|json|sync)$/i', $name)) {
            return new MoonReaderFile($name, null, $this->user, $fullPath);
        }

        // Otherwise return a directory
        return new VirtualDirectory($this->user, $name, $fullPath);
    }

    public function childExists($name): bool
    {
        // Always return true to allow navigation/creation
        return true;
    }

    public function createFile($name, $data = null): ?string
    {
        $fullPath = $this->path ? "{$this->path}/{$name}" : $name;
        $file = new MoonReaderFile($name, null, $this->user, $fullPath);
        $file->put($data);
        return null;
    }

    public function createDirectory($name): void
    {
        // Virtual directories are created on demand, nothing to do
    }
}
