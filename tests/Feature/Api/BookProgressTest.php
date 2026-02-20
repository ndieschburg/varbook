<?php

namespace Tests\Feature\Api;

use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_reading_progress(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create(['progress' => 42.5]);

        BookSyncIdentifier::create([
            'book_id' => $book->id,
            'client' => 'web',
            'external_identifier' => $book->file_hash,
            'last_sync_at' => now(),
            'last_progress' => 42.5,
            'raw_position' => 'epubcfi(/6/14!/4/2/1:0)',
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/books/{$book->id}/progress");

        $response->assertOk()
            ->assertJsonPath('data.progress', 42.5)
            ->assertJsonPath('data.position', 'epubcfi(/6/14!/4/2/1:0)');
    }

    public function test_user_can_update_reading_progress(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create(['progress' => 0]);

        $response = $this->actingAs($user)
            ->putJson("/api/books/{$book->id}/progress", [
                'progress' => 25.5,
                'position' => 'epubcfi(/6/14!/4/2/1:0)',
                'client' => 'web',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.progress', 25.5);

        $this->assertDatabaseHas('books', [
            'id' => $book->id,
            'progress' => 25.5,
        ]);
    }

    public function test_updating_progress_creates_reading_session(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create(['progress' => 0]);

        $this->actingAs($user)
            ->putJson("/api/books/{$book->id}/progress", [
                'progress' => 25.5,
                'client' => 'web',
            ]);

        $this->assertDatabaseHas('reading_sessions', [
            'book_id' => $book->id,
            'client' => 'web',
        ]);
    }

    public function test_user_cannot_update_progress_of_another_users_book(): void
    {
        $user = User::factory()->create();
        $otherBook = Book::factory()->create();

        $response = $this->actingAs($user)
            ->putJson("/api/books/{$otherBook->id}/progress", [
                'progress' => 50,
            ]);

        $response->assertForbidden();
    }

    public function test_book_marked_finished_at_threshold(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create(['progress' => 0]);

        $this->actingAs($user)
            ->putJson("/api/books/{$book->id}/progress", [
                'progress' => 96, // Above 95% threshold
            ]);

        $this->assertDatabaseHas('books', [
            'id' => $book->id,
            'is_finished' => true,
        ]);
    }
}
