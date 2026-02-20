<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Book>
 */
class BookFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'description' => fake()->paragraph(),
            'language' => fake()->randomElement(['en', 'fr', 'es']),
            'publisher' => fake()->company(),
            'isbn' => fake()->isbn13(),
            'filename' => fake()->word() . '.epub',
            'storage_path' => 'books/' . Str::random(40) . '.epub',
            'cover_path' => null,
            'file_hash' => md5(Str::random(32)),
            'file_size' => fake()->numberBetween(100000, 10000000),
            'progress' => 0,
            'total_reading_seconds' => 0,
            'is_finished' => false,
        ];
    }

    /**
     * Indicate that the book is currently being read.
     */
    public function reading(): static
    {
        return $this->state(fn (array $attributes) => [
            'progress' => fake()->numberBetween(1, 94),
            'total_reading_seconds' => fake()->numberBetween(300, 36000),
            'is_finished' => false,
        ]);
    }

    /**
     * Indicate that the book has been finished.
     */
    public function finished(): static
    {
        return $this->state(fn (array $attributes) => [
            'progress' => 100,
            'is_finished' => true,
            'total_reading_seconds' => fake()->numberBetween(3600, 72000),
        ]);
    }
}
