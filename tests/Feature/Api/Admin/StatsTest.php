<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_get_stats(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();

        Book::factory()->for($user)->create([
            'progress' => 50,
            'is_finished' => false,
            'total_reading_seconds' => 3600,
        ]);
        Book::factory()->for($user)->create([
            'progress' => 100,
            'is_finished' => true,
            'total_reading_seconds' => 7200,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/stats');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'total_users',
                    'total_books',
                    'total_reading_time',
                    'total_reading_seconds',
                    'total_sessions',
                    'books_finished',
                    'books_reading',
                ],
            ])
            ->assertJsonPath('data.total_users', 2)
            ->assertJsonPath('data.total_books', 2)
            ->assertJsonPath('data.books_finished', 1)
            ->assertJsonPath('data.books_reading', 1)
            ->assertJsonPath('data.total_reading_seconds', 10800);
    }

    public function test_non_admin_cannot_get_stats(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $response = $this->actingAs($user)
            ->getJson('/api/admin/stats');

        $response->assertForbidden();
    }

    public function test_stats_includes_reading_time_formatted(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Book::factory()->for($admin)->create([
            'total_reading_seconds' => 7200, // 2 hours
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/stats');

        $response->assertOk()
            ->assertJsonPath('data.total_reading_time', '2h 0m');
    }

    public function test_unauthenticated_cannot_get_stats(): void
    {
        $response = $this->getJson('/api/admin/stats');

        $response->assertUnauthorized();
    }
}
