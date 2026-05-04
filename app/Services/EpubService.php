<?php

namespace App\Services;

use App\Models\Book;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use Kiwilan\Ebook\Ebook;

class EpubService
{
    public function processUpload(UploadedFile $file, User $user): Book
    {
        $fileHash = md5_file($file->getRealPath());
        $fileSize = $file->getSize();
        $originalFilename = $file->getClientOriginalName();

        // Check if book already exists for this user
        $existingBook = Book::where('user_id', $user->id)
            ->where('file_hash', $fileHash)
            ->first();

        if ($existingBook) {
            throw new \Exception('This book already exists in your library.');
        }

        // Copy to temp file with original extension (required by kiwilan/php-ebook)
        $extension = $file->getClientOriginalExtension();
        $tempPath = sys_get_temp_dir() . '/' . $fileHash . ($extension ? '.' . $extension : '');
        copy($file->getRealPath(), $tempPath);

        try {
            // Parse EPUB metadata
            $ebook = Ebook::read($tempPath);
            $metadata = $this->extractMetadata($ebook);

            // Store the EPUB file
            $storagePath = $this->storeEpub($file, $user->id, $fileHash);

            // Extract and store cover
            $coverPath = $this->extractCover($ebook, $user->id, $fileHash);

            // Calculate KOReader-compatible partial MD5 hash
            $koreaderHash = $this->calculateKoreaderHash($tempPath);

            // Create book record
            return Book::create([
                'user_id' => $user->id,
                'title' => $metadata['title'] ?? pathinfo($originalFilename, PATHINFO_FILENAME),
                'author' => $metadata['author'],
                'description' => $metadata['description'],
                'language' => $metadata['language'],
                'publisher' => $metadata['publisher'],
                'isbn' => $metadata['isbn'],
                'filename' => $originalFilename,
                'storage_path' => $storagePath,
                'cover_path' => $coverPath,
                'file_hash' => $fileHash,
                'koreader_file_hash' => $koreaderHash,
                'file_size' => $fileSize,
                'progress' => 0,
                'total_reading_seconds' => 0,
                'is_finished' => false,
            ]);
        } finally {
            // Clean up temp file
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }

    protected function extractMetadata(Ebook $ebook): array
    {
        $authors = $ebook->getAuthors();
        $authorNames = [];

        if ($authors) {
            foreach ($authors as $author) {
                $authorNames[] = $author->getName();
            }
        }

        $identifiers = $ebook->getIdentifiers();
        $isbn = null;

        if ($identifiers) {
            foreach ($identifiers as $identifier) {
                $value = $identifier->getValue();
                $cleanedIsbn = preg_replace('/[^0-9X]/i', '', $value);
                if (preg_match('/^(978|979)?\d{9}[\dX]$/i', $cleanedIsbn)) {
                    $isbn = $cleanedIsbn;
                    break;
                }
            }
        }

        return [
            'title' => $ebook->getTitle(),
            'author' => !empty($authorNames) ? implode(', ', $authorNames) : null,
            'description' => $ebook->getDescription(),
            'language' => $ebook->getLanguage(),
            'publisher' => $ebook->getPublisher(),
            'isbn' => $isbn,
        ];
    }

    protected function storeEpub(UploadedFile $file, int $userId, string $fileHash): string
    {
        $path = config('bookshelf.books_path') . "/{$userId}";
        $filename = "{$fileHash}.epub";

        Storage::putFileAs($path, $file, $filename);

        return "{$path}/{$filename}";
    }

    protected function extractCover(Ebook $ebook, int $userId, string $fileHash): ?string
    {
        $cover = $ebook->getCover();
        $contents = $cover?->getContents();

        // Fallback: extract cover directly from ZIP when php-ebook fails
        if (!$contents) {
            $contents = $this->extractCoverFromZip($ebook->getPath());
        }

        if (!$contents) {
            return null;
        }

        $extension = $this->getImageExtension($contents);
        $path = config('bookshelf.covers_path') . "/{$userId}";
        $filename = "{$fileHash}.{$extension}";
        $fullPath = "{$path}/{$filename}";

        Storage::disk('public')->put($fullPath, $contents);

        return $fullPath;
    }

    /**
     * Extract cover image directly from EPUB ZIP archive.
     *
     * Handles cases where php-ebook fails to find the cover, such as when
     * the OPF manifest uses a non-standard id (e.g. "img1" instead of "cover").
     * Resolves the <meta name="cover" content="..."> reference and falls back
     * to searching for common cover filenames.
     */
    protected function extractCoverFromZip(string $epubPath): ?string
    {
        $zip = new \ZipArchive();
        if ($zip->open($epubPath) !== true) {
            return null;
        }

        try {
            $opfPath = $this->findOpfPath($zip);
            if (!$opfPath) {
                return null;
            }

            $opfContent = $zip->getFromName($opfPath);
            if (!$opfContent) {
                return null;
            }

            $opfDir = dirname($opfPath);
            $opfDir = $opfDir === '.' ? '' : $opfDir . '/';

            $coverHref = $this->findCoverHrefFromOpf($opfContent);
            if ($coverHref) {
                $coverFullPath = $opfDir . $coverHref;
                $contents = $zip->getFromName($coverFullPath);
                if ($contents) {
                    return $contents;
                }
            }

            // Last resort: search for common cover filenames
            $candidates = ['cover.jpg', 'cover.jpeg', 'cover.png', 'Cover.jpg', 'Cover.jpeg', 'Cover.png'];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                $basename = basename($name);
                if (in_array($basename, $candidates)) {
                    $contents = $zip->getFromIndex($i);
                    if ($contents) {
                        return $contents;
                    }
                }
            }

            return null;
        } finally {
            $zip->close();
        }
    }

    /**
     * Find the OPF file path from the container.xml in the EPUB archive.
     */
    protected function findOpfPath(\ZipArchive $zip): ?string
    {
        $container = $zip->getFromName('META-INF/container.xml');
        if (!$container) {
            return null;
        }

        $xml = @simplexml_load_string($container);
        if (!$xml) {
            return null;
        }

        $xml->registerXPathNamespace('c', 'urn:oasis:names:tc:opendocument:xmlns:container');
        $rootfiles = $xml->xpath('//c:rootfile/@full-path');

        return $rootfiles[0] ? (string) $rootfiles[0] : null;
    }

    /**
     * Parse the OPF XML to find the cover image href.
     *
     * Resolves the <meta name="cover" content="item-id"> reference by looking
     * up the corresponding manifest item. Also checks for items with "cover"
     * in the id or properties as a fallback.
     */
    protected function findCoverHrefFromOpf(string $opfContent): ?string
    {
        $xml = @simplexml_load_string($opfContent);
        if (!$xml) {
            return null;
        }

        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        // Strategy 1: Follow <meta name="cover" content="item-id"> to manifest item
        $xml->registerXPathNamespace('opf', 'http://www.idpf.org/2007/opf');
        $coverMeta = $xml->xpath('//opf:meta[@name="cover"]/@content');
        if (!empty($coverMeta)) {
            $coverId = (string) $coverMeta[0];
            $items = $xml->xpath("//opf:manifest/opf:item[@id='{$coverId}']/@href");
            if (!empty($items)) {
                $href = (string) $items[0];
                $ext = strtolower(pathinfo($href, PATHINFO_EXTENSION));
                if (in_array($ext, $imageExtensions)) {
                    return $href;
                }
            }
        }

        // Strategy 2: Look for manifest items with properties="cover-image" (EPUB3)
        $coverImage = $xml->xpath('//opf:manifest/opf:item[@properties="cover-image"]/@href');
        if (!empty($coverImage)) {
            return (string) $coverImage[0];
        }

        return null;
    }

    /**
     * Calculate the partial MD5 hash matching KOReader's algorithm.
     *
     * KOReader samples 12 blocks of 1024 bytes at exponentially increasing
     * offsets (1024 << (2*i) for i from -1 to 10), then computes the MD5
     * of the concatenated blocks. This avoids reading the entire file and
     * remains stable even if data is appended (e.g., PDF annotations).
     *
     * @see https://github.com/koreader/koreader/discussions/14448
     */
    public function calculateKoreaderHash(string $filePath): string
    {
        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            return md5_file($filePath);
        }

        $fileSize = filesize($filePath);
        $sample = '';
        $blockSize = 1024;

        for ($i = -1; $i <= 10; $i++) {
            $shift = 2 * $i;
            // LuaJIT's lshift masks shift count to 5 bits (mod 32).
            // For i=-1: lshift(1024, -2) = lshift(1024, 30) = 0 (32-bit overflow)
            $effectiveShift = $shift & 0x1F;
            $offset = ($blockSize << $effectiveShift) & 0xFFFFFFFF;
            if ($offset >= $fileSize) {
                break;
            }

            fseek($handle, $offset);
            $data = fread($handle, $blockSize);
            if ($data === false) {
                break;
            }
            $sample .= $data;
        }

        fclose($handle);

        return md5($sample);
    }

    protected function getImageExtension(string $contents): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($contents);

        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'jpg',
        };
    }

    public function deleteBook(Book $book): void
    {
        // Delete EPUB file
        if ($book->storage_path && Storage::exists($book->storage_path)) {
            Storage::delete($book->storage_path);
        }

        // Delete cover image
        if ($book->cover_path && Storage::disk('public')->exists($book->cover_path)) {
            Storage::disk('public')->delete($book->cover_path);
        }

        // Delete database record
        $book->delete();
    }

    public function getEpubPath(Book $book): string
    {
        return Storage::path($book->storage_path);
    }

    /**
     * Import an epub from a file path (used for WebDAV uploads).
     */
    public function importFromPath(string $filePath, string $originalFilename, User $user): ?Book
    {
        if (!file_exists($filePath)) {
            return null;
        }

        $fileHash = md5_file($filePath);
        $fileSize = filesize($filePath);

        // Check if book already exists for this user
        $existingBook = Book::where('user_id', $user->id)
            ->where('file_hash', $fileHash)
            ->first();

        if ($existingBook) {
            // Book already exists, no need to import again
            return $existingBook;
        }

        // Parse EPUB metadata
        $ebook = Ebook::read($filePath);
        $metadata = $this->extractMetadata($ebook);

        // Store the EPUB file
        $storagePath = $this->storeEpubFromPath($filePath, $user->id, $fileHash);

        // Extract and store cover
        $coverPath = $this->extractCover($ebook, $user->id, $fileHash);

        // Calculate KOReader-compatible partial MD5 hash
        $koreaderHash = $this->calculateKoreaderHash($filePath);

        // Create book record
        return Book::create([
            'user_id' => $user->id,
            'title' => $metadata['title'] ?? pathinfo($originalFilename, PATHINFO_FILENAME),
            'author' => $metadata['author'],
            'description' => $metadata['description'],
            'language' => $metadata['language'],
            'publisher' => $metadata['publisher'],
            'isbn' => $metadata['isbn'],
            'filename' => $originalFilename,
            'storage_path' => $storagePath,
            'cover_path' => $coverPath,
            'file_hash' => $fileHash,
            'koreader_file_hash' => $koreaderHash,
            'file_size' => $fileSize,
            'progress' => 0,
            'total_reading_seconds' => 0,
            'is_finished' => false,
        ]);
    }

    protected function storeEpubFromPath(string $filePath, int $userId, string $fileHash): string
    {
        $path = config('bookshelf.books_path') . "/{$userId}";
        $filename = "{$fileHash}.epub";
        $fullPath = "{$path}/{$filename}";

        Storage::put($fullPath, file_get_contents($filePath));

        return $fullPath;
    }
}
