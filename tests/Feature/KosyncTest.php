<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Models\ReadingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class KosyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Book $book;

    protected string $plainPassword = 'password123';

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt($this->plainPassword),
            'kosync_password_hash' => Hash::make(md5($this->plainPassword)),
        ]);

        $this->book = Book::factory()->create([
            'user_id' => $this->user->id,
            'file_hash' => 'abc123def456789012345678901234ab',
            'koreader_file_hash' => 'koreader_partial_hash_abcdef1234',
            'progress' => 0,
        ]);
    }

    // ==========================================
    // User Registration Tests
    // ==========================================

    public function test_user_registration_is_disabled(): void
    {
        $response = $this->postJson('/api/kosync/users/create', [
            'username' => 'newuser@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Registration disabled. Please register via the web interface.',
            ]);
    }

    // ==========================================
    // User Authentication Tests
    // ==========================================

    public function test_auth_with_valid_credentials_returns_username(): void
    {
        $response = $this->getJson('/api/kosync/users/auth', [
            'x-auth-user' => 'test@example.com',
            'x-auth-key' => md5($this->plainPassword),
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'username' => 'test@example.com',
            ]);
    }

    public function test_auth_with_invalid_password_returns_unauthorized(): void
    {
        $response = $this->getJson('/api/kosync/users/auth', [
            'x-auth-user' => 'test@example.com',
            'x-auth-key' => md5('wrongpassword'),
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthorized',
            ]);
    }

    public function test_auth_with_nonexistent_user_returns_unauthorized(): void
    {
        $response = $this->getJson('/api/kosync/users/auth', [
            'x-auth-user' => 'nonexistent@example.com',
            'x-auth-key' => md5($this->plainPassword),
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthorized',
            ]);
    }

    public function test_auth_without_headers_returns_unauthorized(): void
    {
        $response = $this->getJson('/api/kosync/users/auth');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthorized',
            ]);
    }

    public function test_auth_with_plain_password_fails(): void
    {
        // KOReader always sends md5(password), plain password should fail
        $response = $this->getJson('/api/kosync/users/auth', [
            'x-auth-user' => 'test@example.com',
            'x-auth-key' => $this->plainPassword,
        ]);

        $response->assertStatus(401);
    }

    public function test_auth_fails_when_kosync_hash_not_set(): void
    {
        $userWithoutHash = User::factory()->create([
            'email' => 'nohash@example.com',
            'password' => bcrypt('password123'),
            'kosync_password_hash' => null,
        ]);

        $response = $this->getJson('/api/kosync/users/auth', [
            'x-auth-user' => 'nohash@example.com',
            'x-auth-key' => md5('password123'),
        ]);

        $response->assertStatus(401);
    }

    // ==========================================
    // Healthcheck Tests
    // ==========================================

    public function test_healthcheck_returns_ok(): void
    {
        $response = $this->getJson('/api/kosync/healthcheck');

        $response->assertStatus(200)
            ->assertJson(['state' => 'OK']);
    }

    // ==========================================
    // Progress Update Tests (PUT)
    // ==========================================

    public function test_update_progress_requires_authentication(): void
    {
        $response = $this->putJson('/api/kosync/syncs/progress', [
            'document' => $this->book->koreader_file_hash,
            'progress' => '45.5',
        ]);

        $response->assertStatus(401);
    }

    public function test_update_progress_with_valid_request(): void
    {
        $response = $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '45.5',
                'device' => 'KOReader',
                'device_id' => 'test-device-123',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'document',
                'timestamp',
            ])
            ->assertJson([
                'document' => $this->book->koreader_file_hash,
            ]);

        // Verify book progress was updated
        $this->book->refresh();
        $this->assertEquals(45.5, $this->book->progress);

        // Verify sync identifier was created
        $this->assertDatabaseHas('book_sync_identifiers', [
            'book_id' => $this->book->id,
            'client' => 'koreader',
            'external_identifier' => $this->book->koreader_file_hash,
        ]);

        // Verify reading session was created
        $this->assertDatabaseHas('reading_sessions', [
            'book_id' => $this->book->id,
            'client' => 'koreader',
        ]);
    }

    public function test_update_progress_with_percentage_field(): void
    {
        $response = $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '0.75',
                'percentage' => 0.75,
            ]);

        $response->assertStatus(200);

        // Percentage 0.75 should be converted to 75%
        $this->book->refresh();
        $this->assertEquals(75.0, $this->book->progress);
    }

    public function test_update_progress_for_nonexistent_document(): void
    {
        $response = $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => 'nonexistenthash12345678901234ab',
                'progress' => '45.5',
            ]);

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Document not found',
            ]);
    }

    public function test_update_progress_creates_reading_session(): void
    {
        $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '25.0',
            ]);

        $session = ReadingSession::where('book_id', $this->book->id)
            ->where('client', 'koreader')
            ->first();

        $this->assertNotNull($session);
        $this->assertEquals(0, $session->progress_before);
        $this->assertEquals(25.0, $session->progress_after);
    }

    public function test_multiple_progress_updates_within_gap_continue_session(): void
    {
        // First update
        $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '25.0',
            ]);

        $sessionCount = ReadingSession::where('book_id', $this->book->id)->count();
        $this->assertEquals(1, $sessionCount);

        // Second update within session gap (default 10 minutes)
        $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '30.0',
            ]);

        // Should still be one session (continued)
        $sessionCount = ReadingSession::where('book_id', $this->book->id)->count();
        $this->assertEquals(1, $sessionCount);

        $session = ReadingSession::where('book_id', $this->book->id)->first();
        $this->assertEquals(30.0, $session->progress_after);
    }

    public function test_update_progress_marks_book_finished_at_threshold(): void
    {
        $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $this->book->koreader_file_hash,
                'progress' => '96.0', // Above default 95% threshold
            ]);

        $this->book->refresh();
        $this->assertTrue($this->book->is_finished);
    }

    // ==========================================
    // Progress Retrieval Tests (GET with route param)
    // ==========================================

    public function test_get_progress_requires_authentication(): void
    {
        $response = $this->getJson('/api/kosync/syncs/progress/' . $this->book->koreader_file_hash);

        $response->assertStatus(401);
    }

    public function test_get_progress_returns_document_progress(): void
    {
        // Set up some progress
        $this->book->update(['progress' => 45.5]);

        BookSyncIdentifier::create([
            'book_id' => $this->book->id,
            'client' => 'koreader',
            'external_identifier' => $this->book->koreader_file_hash,
            'last_sync_at' => now(),
            'last_progress' => 45.5,
            'raw_position' => '45.5',
        ]);

        $response = $this->withKosyncAuth()
            ->getJson('/api/kosync/syncs/progress/' . $this->book->koreader_file_hash);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'document',
                'progress',
                'percentage',
                'device',
                'device_id',
                'timestamp',
            ])
            ->assertJson([
                'document' => $this->book->koreader_file_hash,
                'progress' => '45.5',
                'percentage' => 0.455,
            ]);
    }

    public function test_get_progress_for_nonexistent_document(): void
    {
        $response = $this->withKosyncAuth()
            ->getJson('/api/kosync/syncs/progress/nonexistenthash12345678901234ab');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Document not found',
            ]);
    }

    public function test_get_progress_returns_book_progress_when_no_sync_identifier(): void
    {
        $this->book->update(['progress' => 30.0]);

        $response = $this->withKosyncAuth()
            ->getJson('/api/kosync/syncs/progress/' . $this->book->koreader_file_hash);

        $response->assertStatus(200)
            ->assertJson([
                'document' => $this->book->koreader_file_hash,
                'percentage' => 0.30,
            ]);
    }

    // ==========================================
    // Fallback to file_hash Tests
    // ==========================================

    public function test_update_progress_falls_back_to_file_hash(): void
    {
        // Book without koreader_file_hash should still work via file_hash
        $bookNoKoreaderHash = Book::factory()->create([
            'user_id' => $this->user->id,
            'file_hash' => 'fallback_full_hash_abcdef12345678',
            'koreader_file_hash' => null,
            'progress' => 0,
        ]);

        $response = $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => 'fallback_full_hash_abcdef12345678',
                'progress' => '50.0',
            ]);

        $response->assertStatus(200);

        $bookNoKoreaderHash->refresh();
        $this->assertEquals(50.0, $bookNoKoreaderHash->progress);
    }

    // ==========================================
    // Cross-User Security Tests
    // ==========================================

    public function test_cannot_access_other_users_books(): void
    {
        $otherUser = User::factory()->create();
        $otherBook = Book::factory()->create([
            'user_id' => $otherUser->id,
            'file_hash' => 'other123hash456789012345678901ab',
            'koreader_file_hash' => 'other_koreader_hash_abcdef123456',
        ]);

        // Try to update progress on other user's book
        $response = $this->withKosyncAuth()
            ->putJson('/api/kosync/syncs/progress', [
                'document' => $otherBook->koreader_file_hash,
                'progress' => '50.0',
            ]);

        $response->assertStatus(404);

        // Try to get progress on other user's book
        $response = $this->withKosyncAuth()
            ->getJson('/api/kosync/syncs/progress/' . $otherBook->koreader_file_hash);

        $response->assertStatus(404);
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    protected function withKosyncAuth(): static
    {
        return $this->withHeaders([
            'x-auth-user' => $this->user->email,
            'x-auth-key' => md5($this->plainPassword),
        ]);
    }
}
