<?php

namespace Tests\Feature\Api;

use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_their_books(): void
    {
        $user = User::factory()->create();
        Book::factory()->count(3)->for($user)->create();
        Book::factory()->count(2)->create(); // Other user's books

        $response = $this->actingAs($user)
            ->getJson('/api/books');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'title', 'author', 'progress', 'status']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_user_can_search_books(): void
    {
        $user = User::factory()->create();
        Book::factory()->for($user)->create(['title' => 'The Great Gatsby']);
        Book::factory()->for($user)->create(['title' => 'Another Book']);

        $response = $this->actingAs($user)
            ->getJson('/api/books?search=Gatsby');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'The Great Gatsby');
    }

    public function test_user_can_filter_books_by_status(): void
    {
        $user = User::factory()->create();
        Book::factory()->for($user)->create(['progress' => 0, 'is_finished' => false]);
        Book::factory()->for($user)->reading()->create();
        Book::factory()->for($user)->finished()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/books?status=reading');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_user_can_view_their_book(): void
    {
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create();

        $response = $this->actingAs($user)
            ->getJson("/api/books/{$book->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $book->id)
            ->assertJsonPath('data.title', $book->title);
    }

    public function test_user_cannot_view_another_users_book(): void
    {
        $user = User::factory()->create();
        $otherBook = Book::factory()->create();

        $response = $this->actingAs($user)
            ->getJson("/api/books/{$otherBook->id}");

        $response->assertForbidden();
    }

    public function test_user_can_delete_their_book(): void
    {
        Storage::fake();
        $user = User::factory()->create();
        $book = Book::factory()->for($user)->create([
            'storage_path' => 'books/test.epub',
        ]);

        $response = $this->actingAs($user)
            ->deleteJson("/api/books/{$book->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('books', ['id' => $book->id]);
    }

    public function test_user_cannot_delete_another_users_book(): void
    {
        $user = User::factory()->create();
        $otherBook = Book::factory()->create();

        $response = $this->actingAs($user)
            ->deleteJson("/api/books/{$otherBook->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('books', ['id' => $otherBook->id]);
    }
}
