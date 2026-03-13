<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_verification_screen_can_be_rendered(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->get('/verify-email');

        $response->assertStatus(200);
    }

    public function test_email_can_be_verified(): void
    {
        $user = User::factory()->unverified()->create();

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $response->assertRedirect('/library?verified=1');
    }

    public function test_email_is_not_verified_with_invalid_hash(): void
    {
        $user = User::factory()->unverified()->create();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1('wrong-email')]
        );

        $this->actingAs($user)->get($verificationUrl);

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_unauthenticated_user_can_verify_email_and_is_logged_in(): void
    {
        $user = User::factory()->unverified()->create();

        Event::fake();

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // User is NOT authenticated
        $this->assertGuest();

        $response = $this->get($verificationUrl);

        // Email should be verified
        Event::assertDispatched(Verified::class);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());

        // User should be automatically logged in
        $this->assertAuthenticated();
        $this->assertEquals($user->id, auth()->id());

        // Should redirect to library
        $response->assertRedirect('/library?verified=1');
    }

    public function test_unauthenticated_user_with_already_verified_email_is_logged_in(): void
    {
        $user = User::factory()->create(); // Already verified

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // User is NOT authenticated
        $this->assertGuest();

        $response = $this->get($verificationUrl);

        // User should be automatically logged in
        $this->assertAuthenticated();
        $this->assertEquals($user->id, auth()->id());

        // Should redirect to library with already flag
        $response->assertRedirect('/library?verified=1&already=1');
    }

    public function test_unauthenticated_user_cannot_verify_with_invalid_signature(): void
    {
        $user = User::factory()->unverified()->create();

        // Create URL without valid signature
        $invalidUrl = "/verify-email/{$user->id}/" . sha1($user->email);

        $response = $this->get($invalidUrl);

        // Should fail with 403
        $response->assertStatus(403);

        // Email should NOT be verified
        $this->assertFalse($user->fresh()->hasVerifiedEmail());

        // User should NOT be authenticated
        $this->assertGuest();
    }
}
