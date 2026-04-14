<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($admin instanceof JsonResponse) {
            return $admin;
        }

        $search = trim((string) $request->query('search', ''));
        $role = $request->query('role');
        $status = $request->query('status');
        $perPage = max(1, min((int) $request->query('per_page', 10), 50));

        $allowedRoles = array_map(
            fn (UserRole $case) => $case->value,
            UserRole::cases()
        );

        $query = User::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when(in_array($role, $allowedRoles, true), function ($q) use ($role) {
                $q->where('role', $role);
            })
            ->when(in_array($status, ['active', 'inactive'], true), function ($q) use ($status) {
                $q->where('is_active', $status === 'active');
            })
            ->latest();

        $users = $query->paginate($perPage);

        $users->getCollection()->transform(function (User $user) {
            return $this->formatUser($user);
        });

        return response()->json($users, 200);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($admin instanceof JsonResponse) {
            return $admin;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in($this->roleValues())],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($admin instanceof JsonResponse) {
            return $admin;
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in($this->roleValues())],
        ]);

        $newRole = UserRole::from($validated['role']);

        $updatedUser = DB::transaction(function () use ($admin, $user, $newRole) {
            /** @var User $target */
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($admin->id === $target->id && $target->role === UserRole::ADMIN && $newRole !== UserRole::ADMIN) {
                return response()->json([
                    'message' => 'You cannot remove your own admin role.',
                ], 422);
            }

            if ($target->role === UserRole::ADMIN && $newRole !== UserRole::ADMIN && $target->is_active) {
                $activeAdminCount = User::query()
                    ->where('role', UserRole::ADMIN)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->count();

                if ($activeAdminCount <= 1) {
                    return response()->json([
                        'message' => 'You cannot downgrade the last active admin.',
                    ], 422);
                }
            }

            if ($target->role !== $newRole) {
                $target->role = $newRole;
                $target->save();
            }

            return $target->fresh();
        });

        if ($updatedUser instanceof JsonResponse) {
            return $updatedUser;
        }

        return response()->json([
            'message' => 'User role updated successfully.',
            'user' => $this->formatUser($updatedUser),
        ], 200);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($admin instanceof JsonResponse) {
            return $admin;
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        DB::transaction(function () use ($user, $validated) {
            /** @var User $target */
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            $target->password = Hash::make($validated['password']);
            $target->save();

            $target->tokens()->delete();
        });

        return response()->json([
            'message' => 'Password reset successfully.',
        ], 200);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAdmin($request);

        if ($admin instanceof JsonResponse) {
            return $admin;
        }

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $shouldBeActive = (bool) $validated['is_active'];

        $updatedUser = DB::transaction(function () use ($admin, $user, $shouldBeActive) {
            /** @var User $target */
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($admin->id === $target->id && ! $shouldBeActive) {
                return response()->json([
                    'message' => 'You cannot deactivate your own account.',
                ], 422);
            }

            if ($target->role === UserRole::ADMIN && $target->is_active && ! $shouldBeActive) {
                $activeAdminCount = User::query()
                    ->where('role', UserRole::ADMIN)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->count();

                if ($activeAdminCount <= 1) {
                    return response()->json([
                        'message' => 'You cannot deactivate the last active admin.',
                    ], 422);
                }
            }

            if ((bool) $target->is_active !== $shouldBeActive) {
                $target->is_active = $shouldBeActive;
                $target->save();

                if (! $shouldBeActive) {
                    $target->tokens()->delete();
                }
            }

            return $target->fresh();
        });

        if ($updatedUser instanceof JsonResponse) {
            return $updatedUser;
        }

        return response()->json([
            'message' => 'User status updated successfully.',
            'user' => $this->formatUser($updatedUser),
        ], 200);
    }

    private function requireAdmin(Request $request): User|JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user || $user->role !== UserRole::ADMIN) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return $user;
    }

    private function roleValues(): array
    {
        return array_map(
            fn (UserRole $case) => $case->value,
            UserRole::cases()
        );
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->value ?? $user->role,
            'is_active' => (bool) $user->is_active,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}