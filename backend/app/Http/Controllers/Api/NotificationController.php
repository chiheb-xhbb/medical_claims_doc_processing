<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // Returns the current user's notifications, latest first.
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = max(1, min((int) $request->query('per_page', 10), 20));

        $notifications = AppNotification::query()
            ->with([
                'actor:id,name,email',
                'dossier:id,numero_dossier,status',
            ])
            ->where('user_id', $user->id)
            ->latest()
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json($notifications);
    }

    // Lightweight endpoint used by the navbar bell badge.
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = AppNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    // Marks a single notification as read, but only if it belongs to the current user.
    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $user = $request->user();

        if ((int) $notification->user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to access this notification.',
            ], 403);
        }

        if (! $notification->is_read) {
            $notification->is_read = true;
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $notification->fresh([
                'actor:id,name,email',
                'dossier:id,numero_dossier,status',
            ]),
        ]);
    }

    // Marks all unread notifications as read for the current user only.
    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        AppNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }
}