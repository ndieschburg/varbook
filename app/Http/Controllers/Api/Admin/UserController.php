<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreUserRequest;
use App\Http\Requests\Api\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\EpubService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(
        protected EpubService $epubService
    ) {}

    /**
     * GET /api/admin/users
     * List all users with book counts
     */
    public function index(): JsonResponse
    {
        $users = User::withCount('books')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * POST /api/admin/users
     * Create new user
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        return response()->json([
            'message' => __('User created successfully'),
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * GET /api/admin/users/{user}
     * Get user details
     */
    public function show(User $user): UserResource
    {
        $user->loadCount('books');

        return new UserResource($user);
    }

    /**
     * PUT /api/admin/users/{user}
     * Update user
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if (isset($validated['is_admin'])) {
            $user->is_admin = $validated['is_admin'];
        }

        $user->save();

        return response()->json([
            'message' => __('User updated successfully'),
            'user' => new UserResource($user),
        ]);
    }

    /**
     * DELETE /api/admin/users/{user}
     * Delete user and all their books
     */
    public function destroy(User $user): JsonResponse
    {
        // Prevent self-deletion
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => __('Cannot delete your own account'),
            ], 422);
        }

        // Delete all user's books and related data
        foreach ($user->books as $book) {
            $this->epubService->deleteBook($book);
        }

        $user->delete();

        return response()->json([
            'message' => __('User deleted successfully'),
        ]);
    }
}
